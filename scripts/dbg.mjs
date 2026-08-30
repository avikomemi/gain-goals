import { chromium } from 'playwright';
const URL = process.env.TARGET || 'http://localhost:5055/';
const b = await chromium.launch();
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERROR', (e.stack || e.message).split('\n')[0]));
await p.goto(URL + '#/workout', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await p.getByText('בית · בלי ציוד').first().click();
await p.waitForTimeout(300);
await p.getByText('סיימתי חימום').first().click();
await p.waitForTimeout(300);

let found = false;
for (let i = 0; i < 8; i++) {
  found = await p.evaluate(() => !![...document.querySelectorAll('.stp button')].find(x => x.title === 'משקל גוף בלבד'));
  if (found) break;
  const next = await p.$('button.cta');
  const label = next ? await next.innerText() : '';
  if (!label.includes('התרגיל הבא')) break;
  await next.click();
  await p.waitForTimeout(300);
}
console.log('weighted exercise found:', found);
if (found) {
  await p.evaluate(() => [...document.querySelectorAll('.stp button')].find(x => x.title === 'משקל גוף בלבד').click());
  await p.waitForTimeout(300);
  const ok = await p.evaluate(() => {
    const stp = [...document.querySelectorAll('.stp')].find(s => s.innerText.includes('גוף'));
    return stp ? stp.innerText.replace(/\n/g, ' ') : 'NONE';
  });
  console.log('after toggle, weight cell shows:', JSON.stringify(ok));
  await p.screenshot({ path: 'scripts/repro-shot.png', fullPage: true });
}
await b.close();
