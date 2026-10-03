import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesProfile, selectProfileReview, profileReviewAssignments} from '../config/profile-reviews.mjs';
import {loadBusinessReviews} from '../lib/google-profile-reviews.mjs';
const profile = profileReviewAssignments['filippo-livera'];
test('personal assignment requires approval and an exact name boundary', () => {
  const r = {id:'one', text:'Danke an Herrn Livera für die Betreuung', googleMapsUri:'https://www.google.com/review/one'};
  assert.equal(matchesProfile(r, profile),true);
  assert.equal(matchesProfile({text:'Herr Liverano war vor Ort'},profile),false);
  assert.equal(selectProfileReview([r],profile),null);
  assert.equal(selectProfileReview([r],{...profile,approvedReviewId:'one'}),r);
  assert.equal(selectProfileReview([{...r,text:'Danke an Herrn Stratmann'}],{...profile,approvedReviewId:'one'}),null);
  assert.equal(selectProfileReview([],{...profile,approvedReviewId:'one'}),null);
});
test('full Google list follows pagination, preserves review text, and maps stars',async () => {
  const calls=[];
  const request=async (url, options) => {
    calls.push(String(url));
    if(calls.length===1) return {ok:true,json:async()=>({access_token:'test-token'})};
    assert.equal(options.headers.Authorization,'Bearer test-token');
    return {ok:true,json:async()=>({averageRating:4.9,totalReviewCount:395,reviews:[{reviewId:String(calls.length),comment:'Danke Herrn Livera!',starRating:'FIVE',reviewer:{displayName:'Kunde'}}],...(calls.length===2?{nextPageToken:'next-page'}:{})})};
  };
  const result=await loadBusinessReviews('https://maps.google.com/?cid=1',{env:{GOOGLE_BUSINESS_LOCATION:'accounts/1/locations/2',GOOGLE_BUSINESS_CLIENT_ID:'client',GOOGLE_BUSINESS_CLIENT_SECRET:'secret',GOOGLE_BUSINESS_REFRESH_TOKEN:'refresh'},request});
  assert.equal(result.reviews.length,2); assert.equal(result.reviews[0].text,'Danke Herrn Livera!');assert.equal(result.reviews[0].rating,5);assert.equal(result.count,395);
  assert.match(calls[2],/pageToken=next-page/);
});
