const format=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const area=n=>`${new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n)} m²`;
  const slugify=value=>String(value||'immobilie').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,105);
  export const objectPath=p=>`/immobilie/${slugify([p.title,p.city,p.reference].filter(Boolean).join('-'))}-${encodeURIComponent(p.id)}/`;
  const seoText=value=>String(value??'').replace(/\s+/g,' ').trim();
  const seoNumber=value=>typeof value==='number'&&Number.isFinite(value)&&value>0;
  export const buildPropertySeo=p=>{
    const name=seoText(p.title)||[seoText(p.type)||'Immobilie',seoText(p.reference)||seoText(p.id)].filter(Boolean).join(' ');
    const city=seoText(p.city),type=seoText(p.type)||'Immobilie';
    const canonical=`https://sls.de${objectPath(p)}`;
    const title=`${name}${city&&!name.toLocaleLowerCase('de').includes(city.toLocaleLowerCase('de'))?` in ${city}`:''} | SLS Immobilienpartner`;
    const facts=[`${type} kaufen`,city&&`in ${city}`,
      type==='Grundstück'?(seoNumber(p.plot)&&`${area(p.plot)} Grundstück`):(seoNumber(p.area)&&`${area(p.area)} Wohnfläche`),
      seoNumber(p.rooms)&&`${new Intl.NumberFormat('de-DE').format(p.rooms)} Zimmer`,
      seoNumber(p.price)&&format(p.price),seoText(p.reference)&&`Objekt ${seoText(p.reference)}`].filter(Boolean);
    const description=`${facts.join(' · ')}. Jetzt bei SLS Immobilienpartner ansehen.`;
    const propertyType=type==='Wohnung'?'Apartment':type==='Haus'?'House':'Place';
    const property={'@type':propertyType,'@id':`${canonical}#property`,name,
      additionalProperty:[{'@type':'PropertyValue',name:'Objekttyp',value:type}]};
    if(city||seoText(p.zip))property.address={'@type':'PostalAddress',...(city?{addressLocality:city}:{}),...(seoText(p.zip)?{postalCode:seoText(p.zip)}:{}),addressCountry:'DE'};
    if(propertyType!=='Place'){
      if(seoNumber(p.area))property.floorSize={'@type':'QuantitativeValue',value:p.area,unitCode:'MTK'};
      if(seoNumber(p.rooms))property.numberOfRooms=p.rooms;
    }
    if(seoNumber(p.plot))property.additionalProperty.push({'@type':'PropertyValue',name:'Grundstücksfläche',value:p.plot,unitCode:'MTK'});
    const images=(p.images||[]).filter(src=>typeof src==='string'&&/^https:\/\//i.test(src));
    const data={'@context':'https://schema.org','@type':'RealEstateListing','@id':`${canonical}#listing`,name,url:canonical,description,inLanguage:'de-DE',mainEntity:property};
    if(images.length)data.image=images;
    if(seoNumber(p.price))data.offers={'@type':'Offer',url:canonical,price:p.price,priceCurrency:'EUR',availability:'https://schema.org/InStock'};
    return {title,description,canonical,data};
  };
