import { chromium } from 'playwright';

const URL = process.env.TARGET || 'http://localhost:4173/gain-goals/';
const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + (e.stack || e.message).split('\n')[0]));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE.ERROR: ' + m.text().split('\n')[0]); });

let fail = false;
async function check(tag, mustContain) {
  const txt = await p.evaluate(() => (document.getElementById('root')?.innerText || '').trim());
  const white = txt.length === 0;
  const missing = mustContain && !txt.includes(mustContain);
  if (white || missing || errs.length) { fail = true; }
  console.log(`[${white ? 'WHITE' : missing ? 'MISS ' : 'ok   '}] ${tag}${mustContain ? ` (want "${mustContain}")` : ''}`);
  if (errs.length) { console.log('   ' + errs.join('\n   ')); errs.length = 0; }
}

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await check('dashboard');

await p.goto(URL + '#/workout', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
await check('workout pick', 'מה עושים');

await p.getByText('בית · בלי ציוד').first().click();
await p.waitForTimeout(400);
await check('warmup', 'חימום');

await p.getByText('סיימתי חימום').first().click();
await p.waitForTimeout(400);
await check('live', 'מאמץ');

// verify new controls present
await check('rest chooser present', 'זמן מנוחה בין סטים');

// mark first set done -> timer should start
await p.locator('.set .ok').first().click();
await p.waitForTimeout(600);
await check('after mark set (timer)', 'מנוחה');

// remove-set button (item 1) should appear when >1 set
const hasRemove = await p.evaluate(() => (document.getElementById('root')?.innerText || '').includes('הסר סט'));
console.log(`[${hasRemove ? 'ok   ' : 'MISS '}] remove-set button (item 1)`);
if (!hasRemove) fail = true;

// RELOAD -> restore path (the crash scenario)
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
await check('AFTER RELOAD (restore)', 'מאמץ');

// confirm a set stayed marked (restore integrity)
const doneCount = await p.locator('.set.done').count();
console.log(`[${doneCount >= 1 ? 'ok   ' : 'MISS '}] restored marked sets = ${doneCount}`);
if (doneCount < 1) fail = true;

await p.screenshot({ path: 'scripts/repro-shot.png', fullPage: true });
await b.close();
console.log('\n' + (fail ? 'RESULT: FAIL' : 'RESULT: PASS — no white screen, features present, restore works'));
process.exit(fail ? 1 : 0);
