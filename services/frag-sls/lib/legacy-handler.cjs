const { answerQuestion } = require('../lib/answer');
const MAX_BYTES = 8192;
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  // Vercel may pre-parse JSON. The local HTTP server supplies a stream.
  if (req.body !== undefined) {
    if (Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) > MAX_BYTES) throw { status: 413 };
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw { status: 413 };
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Nur POST erlaubt.' });
  }
  if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return send(res, 415, { error: 'Bitte JSON senden.' });
  let body;
  try { body = await readBody(req); }
  catch (err) { return send(res, err.status === 413 ? 413 : 400, { error: err.status === 413 ? 'Die Anfrage ist zu groß.' : 'Ungültige JSON-Anfrage.' }); }
  if (typeof body?.question !== 'string' || body.question.trim().length < 3 || body.question.trim().length > 1200) {
    return send(res, 400, { error: 'Bitte eine Frage mit 3 bis 1200 Zeichen eingeben.' });
  }
  try { return send(res, 200, await answerQuestion(body.question.trim())); }
  catch { return send(res, 500, { error: 'Die Anfrage konnte nicht verarbeitet werden. Bitte erneut versuchen.' }); }
};
