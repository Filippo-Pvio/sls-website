const stars = {ONE:1, TWO:2, THREE:3, FOUR:4, FIVE:5};
export function businessReviewsConfigured(env = process.env) {
  return ['GOOGLE_BUSINESS_CLIENT_ID','GOOGLE_BUSINESS_CLIENT_SECRET','GOOGLE_BUSINESS_REFRESH_TOKEN','GOOGLE_BUSINESS_LOCATION'].every(key => Boolean(env[key]));
}
export async function loadBusinessReviews(companyUrl, {env = process.env, request = fetch} = {}) {
  const location = env.GOOGLE_BUSINESS_LOCATION;
  if (!/^accounts\/[0-9]+\/locations\/[0-9]+$/.test(location || '')) throw new Error('Invalid Google Business location');
  const tokenResponse = await request('https://oauth2.googleapis.com/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:env.GOOGLE_BUSINESS_CLIENT_ID, client_secret:env.GOOGLE_BUSINESS_CLIENT_SECRET, refresh_token:env.GOOGLE_BUSINESS_REFRESH_TOKEN, grant_type:'refresh_token'}),
    signal:AbortSignal.timeout(8000)
  });
  if (!tokenResponse.ok) throw new Error('Google Business authorization unavailable');
  const token = await tokenResponse.json();
  if (!token.access_token) throw new Error('Missing Google access token');
  const reviews = [];
  let next = '';
  let rating = 0;
  let count = 0;
  const seen = new Set();
  do {
    if (seen.has(next) || seen.size >= 30) throw new Error('Incomplete Google review pagination');
    seen.add(next);
    const url = new URL(`https://mybusiness.googleapis.com/v4/${location}/reviews`);
    url.searchParams.set('pageSize','50'); url.searchParams.set('orderBy','updateTime desc');
    if (next) url.searchParams.set('pageToken',next);
    const response = await request(url, {headers:{Authorization:`Bearer ${token.access_token}`}, signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('Google Business reviews unavailable');
    const page = await response.json();
    rating = page.averageRating; count = page.totalReviewCount;
    for (const review of page.reviews || []) reviews.push({
      id:review.reviewId, author:review.reviewer?.displayName || 'Google-Nutzer', authorUri:'',
      rating:stars[review.starRating] || 0, text:review.comment || '', publishTime:review.createTime || '',
      // The Business Profile API does not supply a public deep link for each review.
      googleMapsUri:companyUrl, individualLink:false
    });
    next = page.nextPageToken || '';
  } while (next);
  return {reviews, rating, count};
}
