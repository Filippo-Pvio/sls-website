// Runs in frag-sls, where the existing OpenAI key and company knowledge live.
const send = (res, status, data) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(JSON.stringify(data));
};
function createHandler({ legacy, env = process.env, fetcher = (...args) => fetch(...args) } = {}) {
  return async function handler(req, res) {
    if (req.method === 'GET') return send(res, 200, { version: 'frag-dialogue-1', dialogueEnabled: !!env.OPENAI_API_KEY });
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { error: 'Nur POST erlaubt.' }); }
    if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return send(res, 415, { error: 'Bitte JSON senden.' });
    let body, history, question;
    try {
      let raw;
      if (req.body !== undefined) raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      else {
        const chunks = []; let bytes = 0;
        for await (const chunk of req) { bytes += chunk.length; if (bytes > 32768) throw Error(); chunks.push(Buffer.from(chunk)); }
        raw = Buffer.concat(chunks).toString('utf8');
      }
      if (Buffer.byteLength(raw) > 32768) throw Error();
      body = JSON.parse(raw);
      const { validateConversation } = await import('../lib/sia-conversation.mjs');
      history = validateConversation(body?.history);
      question = typeof body?.question === 'string' ? body.question.trim() : '';
      if (question.length < (history.length ? 1 : 3) || question.length > 1200) throw Error();
    } catch { return send(res, 400, { error: 'Ungültige Frage oder ungültiger Gesprächskontext.' }); }
    try {
      let standalone = question;
      if (env.OPENAI_API_KEY) {
        const { planQuestion, answerGeneral } = await import('../lib/sia-openai.mjs');
        const options = { env, fetcher };
        const plan = await planQuestion(question, history, options);
        if (plan.kind === 'general') return send(res, 200, await answerGeneral(plan.question, options));
        if (plan.kind === 'clarification' || plan.kind === 'offtopic') return send(res, 200, {
          provider: 'OpenAI', kind: plan.kind, reason: plan.kind, sources: [], version: 'frag-dialogue-1',
          answer: plan.kind === 'clarification' ? plan.clarification : 'Ich unterstütze Sie bei Fragen rund um Immobilien. Welches Immobilienthema möchten Sie besprechen?'
        });
        // The unchanged legacy handler accepts at most 1200 characters.
        if (plan.question.length > 1200) throw Error('Invalid company question');
        standalone = plan.question;
      }
      req.body = { question: standalone };
      return await (legacy || require('../lib/legacy-handler.cjs'))(req, res);
    } catch { return send(res, 502, { error: 'SIA konnte gerade keine Antwort abrufen. Bitte versuchen Sie es später erneut.' }); }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
