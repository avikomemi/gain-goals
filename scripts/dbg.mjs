import { chromium } from 'playwright';
const base = process.env.TARGET || 'http://localhost:4174/gain-goals/';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(base, { waitUntil: 'domcontentloaded' });
console.log('location.href =', await p.evaluate(() => location.href));
console.log('document.baseURI =', await p.evaluate(() => document.baseURI));
for (const u of ['assets/index-CPTGZfZD.js', '/gain-goals/assets/index-CPTGZfZD.js']) {
  const r = await p.evaluate(async (url) => {
    try { const res = await fetch(url); const t = await res.text(); return { url, status: res.status, len: t.length, head: t.slice(0, 60) }; }
    catch (e) { return { url, err: String(e) }; }
  }, u);
  console.log(JSON.stringify(r));
}
await b.close();
