import { chromium } from 'playwright';
const URL = process.env.TARGET || 'http://localhost:5055/';
const b = await chromium.launch();
const p = await b.newPage();
let fail = false;
p.on('pageerror', e => { console.log('PAGEERROR', (e.stack || e.message).split('\n')[0]); fail = true; });
await p.goto(URL + '#/workout', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
// start routine C (knee day — has box/step-height params)
await p.locator('.card', { hasText: 'אימון C' }).getByText('בית · בלי ציוד').click();
await p.waitForTimeout(300);
await p.getByText('סיימתי חימום').first().click();
await p.waitForTimeout(400);
const name = await p.locator('.w-name').first().innerText();
const hasParam = await p.evaluate(() => (document.getElementById('root')?.innerText || '').includes('גובה קופסה'));
console.log(`exercise=${JSON.stringify(name)} boxHeight-stepper=${hasParam}`);
if (!hasParam) fail = true;
// bump the box height + and read value
const before = await p.evaluate(() => {
  const row = [...document.querySelectorAll('.spread')].find(s => s.innerText.includes('גובה קופסה'));
  return row ? row.innerText.replace(/\n/g, ' ') : 'NONE';
});
console.log('param row:', JSON.stringify(before));
await p.screenshot({ path: 'scripts/repro-shot.png', fullPage: true });
await b.close();
console.log(fail ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(fail ? 1 : 0);
