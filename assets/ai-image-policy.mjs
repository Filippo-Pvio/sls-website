// Dedicated generated-scene collections. Supplied team-scenes, imported
// portraits, listing photographs, video thumbnails and partner logos are excluded.
export const AI_IMAGE_LABEL='KI-generierte Darstellung';
export const AI_IMAGE_PREFIXES=[
 'header-unique','team-local-20261026','local-relaunch-20261026',
 'hero-scenes','buy-hero','sell-hero','search-hero','references-hero',
 'valuation-hero','finance-hero','guides-hero','netzwerk',
 'profile-andreas','profile-dennis','profile-filippo',
 'arne-hero','cueneyt-hero','daniel-hero','daniela-hero','dustin-hero',
 'gina-hero','heiko-hero','jacqueline-hero','kristina-hero','manuela-hero',
 'maximilian-hero','nico-hero','samy-hero','sophia-hero','svea-hero',
 'tanja-hero','uwe-hero','magazin/articles'
];
export function isAiImage(value=''){
 let path;try{path=new URL(value,'https://sls.de').pathname;}catch{return false;}
 return AI_IMAGE_PREFIXES.some(prefix=>path.startsWith('/assets/images/'+prefix+'/'));
}
