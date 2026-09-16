import { chromium } from 'playwright';
// בדיקת צליל סוף-טיימר מקצה לקצה (מנוחה + זמן מתיחה).
// הרצה: npm run dev (בטרמינל נפרד) ואז `node scripts/bell-check.mjs`.
// TARGET — כתובת השרת, PW_CHROMIUM — נתיב לדפדפן אם פלייררייט לא מצא אחד.
const URL = process.env.TARGET || 'http://localhost:8080/';
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + (e.stack || e.message).split('\n')[0]));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE.ERROR: ' + m.text().split('\n')[0]); });
let fail = false;
const ok = (c, t) => { console.log(`[${c ? 'ok   ' : 'FAIL '}] ${t}`); if (!c) fail = true; };

// spy on every <audio>.play() before any app code runs
await p.addInitScript(() => {
  window.__plays = [];
  const orig = HTMLMediaElement.prototype.play;
  window.__origPlay = orig;
  HTMLMediaElement.prototype.play = function (...a) { window.__plays.push(this.src); window.__el = this; return orig.apply(this, a); };
});

await p.goto(URL + '#/workout', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);

// --- A. the generated WAV is a real, decodable, audible bell ---
const wav = await p.evaluate(async () => {
  const m = await import('/src/lib/bell.ts');
  await m.primeBell();
  const src = window.__el ? window.__el.src : (window.__plays[0] || '');
  if (!src) return { err: 'no audio element' };
  const buf = await (await fetch(src)).arrayBuffer();
  const ac = new AudioContext();
  const dec = await ac.decodeAudioData(buf.slice(0));
  const d = dec.getChannelData(0);
  // count bursts: windows of 10ms whose peak crosses 0.1
  let bursts = 0, loud = false, peak = 0;
  for (let i = 0; i < d.length; i += Math.round(dec.sampleRate * 0.01)) {
    let w = 0;
    for (let j = i; j < Math.min(d.length, i + dec.sampleRate * 0.01); j++) w = Math.max(w, Math.abs(d[j]));
    peak = Math.max(peak, w);
    if (w > 0.1 && !loud) { bursts++; loud = true; } else if (w <= 0.1) loud = false;
  }
  // first 100ms must be silent (that is what makes the silent priming inaudible)
  let head = 0;
  for (let i = 0; i < dec.sampleRate * 0.1; i++) head = Math.max(head, Math.abs(d[i]));
  return { bytes: buf.byteLength, dur: dec.duration, bursts, peak, head, primed: m.bellReady() };
});
console.log('   wav:', JSON.stringify(wav));
ok(!wav.err && wav.dur > 0.9 && wav.dur < 1.2, `bell wav decodes (${wav.dur?.toFixed(2)}s)`);
ok(wav.bursts === 3, `three beeps (got ${wav.bursts})`);
ok(wav.peak > 0.3, `audible peak (${wav.peak?.toFixed(2)})`);
ok(wav.head < 0.001, 'silent lead-in (priming is inaudible)');
ok(wav.primed === true, 'primeBell marks the element ready');

// --- B. ringBell actually plays ---
const rang = await p.evaluate(async () => {
  const m = await import('/src/lib/bell.ts');
  window.__plays.length = 0;
  const res = await m.ringBell();
  await new Promise(r => setTimeout(r, 250));
  const el = window.__el;
  return { res, plays: window.__plays.length, playing: !!el && el.currentTime > 0 };
});
console.log('   ring:', JSON.stringify(rang));
ok(rang.res === true && rang.plays === 1 && rang.playing, 'ringBell() plays the element');

// --- C. end to end: real workout, 5s rest, bell at the end ---
await p.getByText('בית · בלי ציוד').first().click();
await p.waitForTimeout(300);
await p.getByText('סיימתי חימום').first().click();
await p.waitForTimeout(300);
ok((await p.evaluate(() => document.getElementById('root').innerText)).includes('צליל סוף טיימר'), 'sound-test row on live screen');

p.on('dialog', d => d.accept('5'));
await p.locator('.seg b', { hasText: 'מותאם' }).first().click();
await p.waitForTimeout(300);
await p.evaluate(() => { window.__plays.length = 0; });
await p.locator('.set .ok').first().click();
await p.waitForTimeout(500);
ok((await p.evaluate(() => document.getElementById('root').innerText)).includes('מנוחה:'), 'rest timer started');
const wakeReq = await p.evaluate(() => !!navigator.wakeLock);
console.log(`   wakeLock API present in this browser: ${wakeReq}`);
await p.waitForTimeout(5500);
const end = await p.evaluate(() => ({ plays: window.__plays.length, txt: document.getElementById('root').innerText }));
ok(end.txt.includes('נגמרה המנוחה'), 'rest-done banner');
ok(end.plays === 1, `bell rang once at rest end (plays=${end.plays})`);
ok(!end.txt.includes('הצליל נחסם'), 'no sound-blocked warning after a successful ring');

// --- D. test button works from a click ---
await p.evaluate(() => { window.__plays.length = 0; });
await p.getByText('בדיקת צליל').first().click();
await p.waitForTimeout(600);
ok(await p.evaluate(() => window.__plays.length >= 1), 'test-sound button plays the bell');

// --- E. fallback path: element blocked -> Web Audio still rings ---
const fb = await p.evaluate(async () => {
  const m = await import('/src/lib/bell.ts');
  HTMLMediaElement.prototype.play = () => Promise.reject(new Error('NotAllowedError'));
  const res = await m.ringBell();
  HTMLMediaElement.prototype.play = window.__origPlay;
  return res;
});
ok(fb === true, 'element blocked -> Web Audio fallback still rings');

// --- F. flex phase (the timed-stretch "exercise timer") ---
for (let i = 0; i < 14; i++) {
  const txt = await p.evaluate(() => document.getElementById('root').innerText);
  if (txt.includes('שלב אחרון')) break;
  const next = p.locator('button.cta').last();
  await next.click();
  await p.waitForTimeout(250);
  // the injury/summary screens may intervene
}
const flexTxt = await p.evaluate(() => document.getElementById('root').innerText);
ok(flexTxt.includes('שלב אחרון'), 'reached flex phase');
ok(flexTxt.includes('צליל סוף טיימר'), 'sound-test row on flex screen');
await p.evaluate(() => { window.__plays.length = 0; });
const startBtn = p.locator('button.pill', { hasText: '▶' }).first();
if (await startBtn.count()) {
  await startBtn.click();
  await p.waitForTimeout(400);
  ok((await p.evaluate(() => document.getElementById('root').innerText)).includes('⏱️'), 'stretch timer runs');
} else { console.log('[skip ] no timed stretch in this routine'); }

errs.length = errs.filter(e => !e.includes('ERR_CERT_AUTHORITY_INVALID')).length ? errs.length : 0;
if (errs.length) { console.log('   ' + errs.join('\n   ')); fail = true; }
await b.close();
console.log('\n' + (fail ? 'RESULT: FAIL' : 'RESULT: PASS'));
process.exit(fail ? 1 : 0);
