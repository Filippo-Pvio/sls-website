const videos = new Set(['qip-kPiTPcA', 'o0hvSO41MOI', 'guoSI4VrK8E', '-Pby-CF9f04', 'maZwZ6Rzwpk']);
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const id = new URL(req.url, 'https://sls.de').searchParams.get('video');
  if (!videos.has(id)) return res.status(404).end();
  try {
    // Use YouTube's own cover, not an unrelated image from our asset library.
    for (const size of ['maxresdefault','hqdefault']) {
      const response = await fetch(`https://i.ytimg.com/vi/${id}/${size}.jpg`, {signal:AbortSignal.timeout(8000)});
      if (response.status === 404) continue;
      if (!response.ok || !(response.headers.get('content-type') || '').startsWith('image/')) break;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 5 * 1024 * 1024) break;
      res.setHeader('Content-Type',response.headers.get('content-type'));
      res.setHeader('Cache-Control','public, max-age=3600, s-maxage=86400');
      res.setHeader('X-Content-Type-Options','nosniff');
      return res.status(200).send(bytes);
    }
  } catch { /* Do not substitute an unrelated photograph. */ }
  return res.status(502).end();
}
