// Pin only a reviewed, unambiguously assigned Google review URI. No review text is stored here.
export const profileReviewAssignments = {
  'filippo-livera': {
    name: 'Filippo Livera',
    aliases: ['Filippo Livera', 'Herr Livera', 'Herrn Livera'],
    approvedReviewUri: null,
    approvedReviewId: null
  }
};
export function matchesProfile(review, profile) {
  const text = String(review.text || '').normalize('NFKC').toLocaleLowerCase('de-DE');
  return profile.aliases.some(alias => {
    const needle = alias.toLocaleLowerCase('de-DE').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}])${needle}([^\\p{L}]|$)`, 'u').test(text);
  });
}
export function selectProfileReview(reviews, profile) {
  if (!profile.approvedReviewUri && !profile.approvedReviewId) return null;
  return reviews.find(review => ((profile.approvedReviewId && review.id === profile.approvedReviewId) || (profile.approvedReviewUri && review.googleMapsUri === profile.approvedReviewUri)) && matchesProfile(review, profile)) || null;
}
