// Local runner. Vercel executes api/ask.js directly; it does not need a listening server.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ask = require('./api/ask');
const index = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));
function handler(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (pathname === '/api/ask') return ask(req, res);
  if ((pathname === '/' || pathname === '/index.html') && ['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(req.method === 'HEAD' ? undefined : index);
  }
  if (/^\/quellen\/[a-z0-9-]+\.html$/.test(pathname) && ['GET','HEAD'].includes(req.method)) {
    const file=path.join(__dirname,'public',pathname);
    if(fs.existsSync(file)){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(req.method==='HEAD'?undefined:fs.readFileSync(file));}
  }
  if (/^\/assets\/(Raleway-Variable|PlayfairDisplay-Variable)\.ttf$/.test(pathname) && ['GET','HEAD'].includes(req.method)) {
    res.setHeader('Content-Type','font/ttf');
    return res.end(req.method==='HEAD'?undefined:fs.readFileSync(path.join(__dirname,'public',pathname)));
  }
  res.statusCode = 404;
  res.end('Nicht gefunden');
}
if (require.main === module) {
  http.createServer(handler).listen(process.env.PORT || 3210, '127.0.0.1', () => console.log('Frag SLS lokal gestartet.'));
}
module.exports = handler;
