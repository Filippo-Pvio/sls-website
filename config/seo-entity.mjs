import {origin,organizationId,websiteId} from '../lib/seo.mjs';
export const organization = {
  '@type':'RealEstateAgent','@id':organizationId,name:'SLS Immobilienpartner GmbH',
  alternateName:'SLS Immobilienpartner',url:origin+'/',
  logo:{'@type':'ImageObject','@id':origin+'/#logo',url:origin+'/assets/logo-sls-horizontal-transparent.png'},
  image:origin+'/assets/images/team-scenes/beratung-laptop-1280.webp',
  telephone:'+49 2369 7428020',email:'service@sls.de',
  address:{'@type':'PostalAddress',streetAddress:'Ubierweg 2',postalCode:'46286',addressLocality:'Dorsten',addressCountry:'DE'},
  areaServed:['Ruhrgebiet','Rheinland','Nordrhein-Westfalen'],
  sameAs:['https://www.instagram.com/sls_immobilienpartner/','https://www.linkedin.com/company/sls-immobilienpartner/','https://www.facebook.com/people/SLS-Immobilienpartner/61562917415040/','https://www.youtube.com/@SLSImmobilienpartnerGmbH'],
  contactPoint:{'@type':'ContactPoint',telephone:'+49 2369 7428020',email:'service@sls.de',contactType:'Kundenservice',availableLanguage:'de'}
};
export const website = {'@type':'WebSite','@id':websiteId,url:origin+'/',name:'SLS Immobilienpartner',inLanguage:'de-DE',publisher:{'@id':organizationId}};
export const offices = {
  '/buero-dorsten/':{'@type':'RealEstateAgent','@id':origin+'/buero-dorsten/#office',name:'SLS Immobilienpartner – Büro Dorsten',url:origin+'/buero-dorsten/',parentOrganization:{'@id':organizationId},telephone:organization.telephone,email:organization.email,address:organization.address},
  // Appointment-only rooms are a Place, without claiming a staffed independent branch.
  '/buero-duesseldorf/':{'@type':'Place','@id':origin+'/buero-duesseldorf/#office',name:'SLS Immobilienpartner – Gesprächsräume Düsseldorf',description:'Persönliche Gespräche nach Terminvereinbarung in den genutzten Räumen des Shared Office.',url:origin+'/buero-duesseldorf/',address:{'@type':'PostalAddress',streetAddress:'Königsallee 19',postalCode:'40213',addressLocality:'Düsseldorf',addressCountry:'DE'}}
};
