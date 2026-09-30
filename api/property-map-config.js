export default function handler(req,res){
  res.setHeader('Cache-Control','public, s-maxage=300');
  if(req.method!=='GET')return res.status(405).json({error:'Methode nicht erlaubt'});
  // A website-restricted Maps JavaScript key is intentionally public to browsers.
  const key=String(process.env.GOOGLE_MAPS_BROWSER_KEY||'').trim();
  return res.status(200).json({key:key.startsWith('AIza')?key:''});
}
