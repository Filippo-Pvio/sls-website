const normalise=value=>String(value||'').trim().toLocaleLowerCase('de-DE');
const comparable=(a,b)=>Number(a)>0&&Number(b)>0;
const difference=(a,b)=>Math.abs(Number(a)-Number(b))/Number(a);

// Candidates come exclusively from the existing public marketing feed.
export function similarProperties(current,candidates){
  const seen=new Set([String(current.id)]);
  return candidates.flatMap(candidate=>{
    const id=String(candidate.id||'');
    if(!id||seen.has(id))return [];
    seen.add(id);
    const type=normalise(current.type);
    if(!type||type==='immobilie'||normalise(candidate.type)!==type)return [];
    const sameCity=Boolean(normalise(current.city))&&normalise(current.city)===normalise(candidate.city);
    const samePostalRegion=/^\d{5}$/.test(String(current.zip))&&/^\d{5}$/.test(String(candidate.zip))&&String(current.zip).slice(0,2)===String(candidate.zip).slice(0,2);
    const price=comparable(current.price,candidate.price)?difference(current.price,candidate.price):null;
    const area=comparable(current.area,candidate.area)?difference(current.area,candidate.area):null;
    // Same city: at least one comparable fact, no known major mismatch.
    // Wider postal region: both price and area must be close.
    if(sameCity){
      if((price===null&&area===null)||(price!==null&&price>.35)||(area!==null&&area>.35))return [];
    }else if(!samePostalRegion||price===null||area===null||price>.3||area>.3)return [];
    const roomDistance=comparable(current.rooms,candidate.rooms)?Math.abs(current.rooms-candidate.rooms):2;
    return [{candidate,score:(sameCity?100:50)+(price===null?0:25*(1-price))+(area===null?0:20*(1-area))+5/(1+roomDistance)}];
  }).sort((a,b)=>b.score-a.score||String(a.candidate.id).localeCompare(String(b.candidate.id))).slice(0,3).map(({candidate})=>candidate);
}
