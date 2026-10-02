import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import ask from '../api/sia-ask.js';
import config from '../api/sia-config.js';
process.env.SIA_LOCAL_PREVIEW = '1';
const root = resolve(import.meta.dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.ttf':'font/ttf', '.webp':'image/webp', '.png':'image/png' };
createServer(async (req,res) => {
 const pathname = new URL(req.url, 'http://localhost').pathname;
 if (pathname === '/api/sia-config') return config(req,res);
 if (pathname === '/api/sia-ask') return ask(req,res);
 if (pathname.startsWith('/api/')) {res.writeHead(404).end();return;}
 let file = resolve(root, '.' + decodeURIComponent(pathname));
 if (!file.startsWith(root + sep) && file !== root) {res.writeHead(403).end();return;}
 if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file,'index.html');
 if (!existsSync(file)) {res.writeHead(404).end();return;}
 res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream'});createReadStream(file).pipe(res);
}).listen(4186,'127.0.0.1',()=>console.log('SIA preview http://127.0.0.1:4186'));
