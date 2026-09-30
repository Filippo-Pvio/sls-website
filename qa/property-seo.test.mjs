import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {objectPath,buildPropertySeo} from '../assets/property-seo.mjs';

const source=readFileSync(new URL('../assets/propstack-preview.js',import.meta.url),'utf8');
function loadSeo(href='https://preview.vercel.app/immobilie/alt-123/?objekt=999'){
  const nodes=new Map();
  const document={title:'',querySelector:selector=>nodes.get(selector)||null,
    querySelectorAll:selector=>selector.split(', ').flatMap(key=>nodes.has(key)?[nodes.get(key)]:[]),
    createElement:()=>({remove(){for(const [key,value] of nodes)if(value===this)nodes.delete(key)}}),
    head:{append(node){nodes.set(node.id?'#'+node.id:node.rel?'link[rel="canonical"]':`meta[name="${node.name}"]`,node)}}};
  document.head.append({name:'robots',content:'noindex,nofollow'});
  const context={URL,Intl,objectPath,buildPropertySeo,document,location:new URL(href),history:{replaceState(){}}};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('(() => {'),source.indexOf('  const sample='))+'globalThis.seo={buildPropertySeo,setSeo,setInactiveSeo,id};})();',context);
  return {...context.seo,document,nodes};
}
const property={id:'123',title:'Wohnung in Düsseldorf',city:'Düsseldorf',type:'Wohnung',reference:'SLS 123',zip:'40217',area:96.51,rooms:2,price:415000,images:['https://example.com/a.jpg']};

test('title avoids repeated location and canonical has no preview/query components',()=>{
  const seo=loadSeo(),result=seo.buildPropertySeo(property);
  assert.equal((result.title.match(/Düsseldorf/g)||[]).length,1);
  assert.match(result.canonical,/^https:\/\/sls.de\/immobilie\/.+-123\/$/);
  assert.equal(seo.id,'123');
  assert.match(result.description,/415.000/);
});
test('structured listing attaches address and type to the property, with numeric EUR offer',()=>{
  const {data}=loadSeo().buildPropertySeo(property);
  assert.equal(data.address,undefined);
  assert.equal(data.mainEntity['@type'],'Apartment');
  assert.equal(data.mainEntity.address.addressLocality,'Düsseldorf');
  assert.equal(data.mainEntity.floorSize.value,96.51);
  assert.equal(data.offers.price,415000);
  assert.equal(data.offers.priceCurrency,'EUR');
  assert.equal(data.mainEntity.address.streetAddress,undefined);
});
test('land uses plot area without inventing residential area or rooms',()=>{
  const {description,data}=loadSeo().buildPropertySeo({id:'4',title:'Baugrundstück',type:'Grundstück',plot:900});
  assert.match(description,/900 m² Grundstück/);
  assert.equal(data.mainEntity['@type'],'Place');
  assert.equal(data.mainEntity.floorSize,undefined);
  assert.equal(data.mainEntity.address,undefined);
  assert.equal(data.offers,undefined);
});
test('missing and invalid data do not produce empty metadata, invalid prices or images',()=>{
  const {title,description,data}=loadSeo().buildPropertySeo({id:'5',title:' ',price:NaN,area:Infinity,rooms:null,images:['javascript:bad']});
  assert.match(title,/Immobilie 5/);
  assert.doesNotMatch(description,/undefined|null|NaN|Infinity/);
  assert.equal(data.offers,undefined);
  assert.equal(data.image,undefined);
});
test('repeated updates retain one canonical/schema; inactive state clears both and preserves noindex',()=>{
  const seo=loadSeo();
  seo.setSeo(property);seo.setSeo(property);
  assert.equal(seo.nodes.size,4);
  assert.equal(seo.nodes.get('meta[name="robots"]').content,'noindex,nofollow');
  seo.setInactiveSeo('Immobilie nicht mehr verfügbar','Dieses Angebot ist nicht mehr verfügbar.');
  assert.equal(seo.nodes.has('link[rel="canonical"]'),false);
  assert.equal(seo.nodes.has('#pp-property-jsonld'),false);
  assert.match(seo.document.title,/nicht mehr verfügbar/);
  assert.equal(seo.nodes.get('meta[name="robots"]').content,'noindex,nofollow');
});
test('demo does not generate active listing markup',()=>{
  const seo=loadSeo('https://preview.vercel.app/immobilien/?demo=1');
  seo.setSeo(property);
  assert.equal(seo.nodes.has('#pp-property-jsonld'),false);
});
