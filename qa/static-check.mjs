import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const routes = ["index.html", "verkaufen/index.html", "immobilien/index.html", "ueber-uns/index.html", "kontakt/index.html"];
const titles = new Set();
let failures = 0;

function check(condition, message) {
  if (condition) console.log(`PASS ${message}`);
  else { console.error(`FAIL ${message}`); failures += 1; }
}

for (const route of routes) {
  const html = await readFile(join(root, route), "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  check(Boolean(title), `${route}: title vorhanden`);
  check(!titles.has(title), `${route}: eindeutiger title`);
  titles.add(title);
  check(/<meta name="description" content="[^"]+">/.test(html), `${route}: meta description vorhanden`);
  check((html.match(/<h1\b/g) || []).length === 1, `${route}: genau eine H1`);
  check(/<main id="main">/.test(html), `${route}: main landmark vorhanden`);
  check(/data-site-header/.test(html) && /data-site-footer/.test(html), `${route}: header und footer eingebunden`);
  check(/<html lang="de">/.test(html), `${route}: Dokumentsprache gesetzt`);
  for (const match of html.matchAll(/<img\b([^>]+)>/g)) {
    check(/\balt="[^"]*"/.test(match[1]), `${route}: Bild besitzt Alt-Attribut`);
  }
  for (const match of html.matchAll(/href="(\/[^"]*)"/g)) {
    const href = match[1].split("#")[0].split("?")[0];
    if (href.startsWith("//") || href.startsWith("/assets/")) continue;
    const target = href === "/" ? "index.html" : `${href.slice(1)}${href.endsWith("/") ? "index.html" : ""}`;
    try { await stat(join(root, target)); check(true, `${route}: Linkziel ${href || "/"} vorhanden`); }
    catch { check(false, `${route}: Linkziel ${href || "/"} vorhanden`); }
  }
}

for (const asset of ["assets/styles.css", "assets/site.js", "assets/images/hero.webp", "assets/images/interior.webp", "assets/images/consultation.webp", "robots.txt", "sitemap.xml"]) {
  const info = await stat(join(root, asset));
  check(info.size > 0, `${asset}: vorhanden und nicht leer`);
}

const js = await readFile(join(root, "assets/site.js"), "utf8");
for (const href of ["/", "/verkaufen/", "/immobilien/", "/ueber-uns/", "/kontakt/"]) {
  const target = href === "/" ? "index.html" : `${href.slice(1)}index.html`;
  try { await stat(join(root, target)); check(true, `${href}: internes Ziel vorhanden`); }
  catch { check(false, `${href}: internes Ziel vorhanden`); }
  check(js.includes(`\"${href}\"`), `${href}: Navigation enthaelt Route`);
}

const contact = await readFile(join(root, "kontakt/index.html"), "utf8");
for (const id of [...contact.matchAll(/<(?:input|select|textarea)\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1])) {
  check(new RegExp(`<label[^>]+for="${id}"`).test(contact), `kontakt: Label fuer #${id} vorhanden`);
}

process.exitCode = failures ? 1 : 0;
