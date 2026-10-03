import googleReviews from './google-reviews.js';
import {businessReviewsConfigured, loadBusinessReviews} from '../lib/google-profile-reviews.mjs';
import { profileReviewAssignments, matchesProfile, selectProfileReview } from '../config/profile-reviews.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
  const slug = new URL(req.url, 'https://sls.de').searchParams.get('profile');
  const profile = Object.hasOwn(profileReviewAssignments, slug || '') ? profileReviewAssignments[slug] : null;
  if (!profile) return res.status(404).json({error:'Profile not found'});
  let status = 200;
  let data;
  // Reuse the established server-side Google connection; never send its API key to the browser.
  await googleReviews(req, {
    status(code) { status = code; return this; },
    setHeader() {},
    json(body) { data = body; }
  });
  if (status !== 200 || !data) return res.status(503).json({available:false});
  let reviews = Array.isArray(data.reviews) ? data.reviews : [];
  let source = 'google_places';
  let businessConnection = businessReviewsConfigured() ? 'unavailable' : 'not_configured';
  if (businessReviewsConfigured()) {
    try {
      const business = await loadBusinessReviews(data.googleMapsUri);
      reviews = business.reviews;
      data.rating = business.rating; data.userRatingCount = business.count;
      source = 'google_business_profile'; businessConnection = 'connected';
    } catch { /* Keep company rating available, without claiming a full review search. */ }
  }
  const personal = selectProfileReview(reviews, profile);
  res.status(200).json({
    available:true, profileName:profile.name,
    company:{name:data.name, rating:data.rating, count:data.userRatingCount, url:data.googleMapsUri},
    personalReview:personal,
    // Places supplies a limited selection, not the entire review history.
    source, businessConnection,
    personalStatus:personal ? 'assigned' : reviews.some(review => matchesProfile(review, profile)) ? 'approval_required' : source === 'google_places' ? 'limited_selection' : 'no_matching_review'
  });
}
