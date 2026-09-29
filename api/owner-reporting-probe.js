export default function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex,nofollow');
  res.setHeader('Cache-Control','private,no-store');
  return res.status(410).json({error:'Legacy diagnostic retired',report:'/eigentuemer-cockpit-test/owner-report-data.json'});
}
