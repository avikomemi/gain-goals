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

// Back navigation (item 9): advance to next, go back, set must still be marked
const nameBefore = await p.locator('.w-name').first().innerText();
await p.locator('button.cta', { hasText: 'התרגיל הבא' }).first().click();
await p.waitForTimeout(300);
const nameNext = await p.locator('.w-name').first().innerText();
await p.locator('button[title="התרגיל הקודם"]').first().click();
await p.waitForTimeout(300);
const nameBack = await p.locator('.w-name').first().innerText();
const doneAfterBack = await p.locator('.set.done').count();
const backOk = nameNext !== nameBefore && nameBack === nameBefore && doneAfterBack >= 1;
console.log(`[${backOk ? 'ok   ' : 'MISS '}] back-nav: "${nameBefore}" -> "${nameNext}" -> "${nameBack}" done=${doneAfterBack}`);
if (!backOk) fail = true;

// RPE color scale (item 3): click 10, expect danger warning + colored button
await p.locator('.rpe b', { hasText: '10' }).first().click();
await p.waitForTimeout(300);
const rpe10 = await p.evaluate(() => {
  const b = [...document.querySelectorAll('.rpe b')].find(x => x.textContent.trim() === '10');
  const bg = b ? getComputedStyle(b).backgroundColor : '';
  const warn = (document.getElementById('root')?.innerText || '').includes('כואב מאוד');
  return { colored: bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent', warn };
});
console.log(`[${rpe10.colored && rpe10.warn ? 'ok   ' : 'MISS '}] RPE 10 colored=${rpe10.colored} warning=${rpe10.warn}`);
if (!(rpe10.colored && rpe10.warn)) fail = true;

// Pain panel (item 11): open, pick back + level 6 -> expect danger message, then cancel
await p.getByText('משהו כואב').first().click();
await p.waitForTimeout(200);
await p.locator('.tagrow b', { hasText: 'גב תחתון' }).first().click();
await p.locator('.seg b', { hasText: /^6$/ }).first().click();
await p.waitForTimeout(200);
const pain = await p.evaluate(() => ({
  danger: (document.getElementById('root')?.innerText || '').includes('יום גב רגיש'),
  stopBtn: !![...document.querySelectorAll('button')].find(b => b.textContent.includes('עצור את האימון')),
}));
console.log(`[${pain.danger && pain.stopBtn ? 'ok   ' : 'MISS '}] pain panel: 6+ alert=${pain.danger} stop-btn=${pain.stopBtn}`);
if (!(pain.danger && pain.stopBtn)) fail = true;
await p.getByText('ביטול').first().click();
await p.waitForTimeout(200);

// Bodyweight toggle (item 4): only on weighted exercises — non-fatal if current isn't weighted
const bw = await p.evaluate(() => {
  const btn = [...document.querySelectorAll('.stp button')].find(b => b.title === 'משקל גוף בלבד');
  if (!btn) return { present: false };
  btn.click();
  return { present: true };
});
if (bw.present) {
  await p.waitForTimeout(200);
  const bwOk = await p.evaluate(() => (document.getElementById('root')?.innerText || '').includes('גוף'));
  console.log(`[${bwOk ? 'ok   ' : 'MISS '}] bodyweight toggle -> "גוף" shown`);
  if (!bwOk) fail = true;
  // revert so it doesn't affect restore assertion
  await p.evaluate(() => { const r = [...document.querySelectorAll('.stp button')].find(b => b.title === 'חזרה למשקל חיצוני'); r && r.click(); });
} else {
  console.log('[skip ] bodyweight toggle — current exercise is not weighted');
}

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
