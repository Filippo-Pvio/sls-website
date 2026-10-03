// Pin only a reviewed, unambiguously assigned Google review URI. No review text is stored here.
export const profileReviewAssignments = {
  'filippo-livera': {
    name: 'Filippo Livera',
    aliases: ['Filippo Livera', 'Herr Livera', 'Herrn Livera'],
    approvedReviewUri: 'https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT2xWS2QwOW5UeTFuYUdOWlNUbG9NMFJhZGxsaWIwRRAB!2m1!1s0x0:0xdf996794c2ce85eb!3m1!1s2@1:CAIQACodChtycF9oOlVKd09nTy1naGNZSTloM0Radllib0E%7C0cz7ul-nTba%7C',
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
