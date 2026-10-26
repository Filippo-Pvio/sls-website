import {readFileSync} from 'node:fs';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const cities=read('content/marktgebiete/cities.json');
const rules=new Map(read('content/marktgebiete/search.json').areas.map(row=>[row.url,row]));
const restored=read('content/seo/restored-cities.json');
const names=new Set([...cities,...restored].map(row=>row.city));
export const marketAreas=[...cities.map(city=>({...city,...rules.get(city.url)})),...restored.map(city=>({city:city.city,url:city.url,regions:city.regions,text:city.text||city.localIntro,source:city.sources?.[0]||city.migrationSource,aliases:city.aliases||[],districts:city.districts||[],nearby:[]}))]
 .map(area=>({...area,nearby:(area.nearby||[]).filter(place=>!names.has(place))}));
