/**
 * צלצול סיום טיימר (מנוחה בין סטים / זמן תרגיל).
 *
 * למה מודול שלם ולא שלוש שורות של Web Audio:
 * באייפון — ובמיוחד באפליקציה מותקנת למסך הבית, שזה איך שאבי משתמש — Web Audio
 * יושב בקטגוריית "ambient": מתג ההשתקה הפיזי משתיק אותו לגמרי, בלי שום שגיאה
 * בקוד, וגם ה-AudioContext נכנס ל-suspended ברגע שיוצאים מהאפליקציה ואי אפשר
 * להעיר אותו בלי מחוות משתמש. זו הסיבה הנפוצה ביותר ל"לא שמעתי את הצלצול".
 *
 * לכן ערוץ הצליל הראשי כאן הוא אלמנט <audio> (קטגוריית playback — נשמע גם כשמתג
 * ההשתקה למעלה, בדיוק כמו יוטיוב בספארי), שמחומם מראש במחוות המשתמש הראשונה כדי
 * שאפשר יהיה לנגן אותו אחר כך בלי מחווה. Web Audio נשאר גיבוי, ואחריו רטט.
 */

// הצליל: שלושה ביפים חדים (880 → 1245 → 880) שנשמעים גם מעל מוזיקה.
const RATE = 22050;
const LEAD = 0.15;   // שקט בהתחלה — מאפשר "חימום" שקט של האלמנט (play+pause מיידי)
const BEEPS = [0, 0.3, 0.6].map((at, i) => ({ at: LEAD + at, freq: i === 1 ? 1245 : 880 }));
const DUR = LEAD + 0.9;

let wavUrl: string | null = null;
let el: HTMLAudioElement | null = null;
let ac: AudioContext | null = null;
let primed = false;   // האלמנט נוגן פעם אחת בתוך מחוות משתמש → מותר לנגן אותו מעכשיו
let armed = false;    // מאזיני המחווה כבר נרשמו

/** WAV קצר שנבנה בזמן ריצה — כדי לא לגרור קובץ בינארי לריפו */
function buildWav(): string {
  const n = Math.round(RATE * DUR);
  const view = new DataView(new ArrayBuffer(44 + n * 2));
  const ascii = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  ascii(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); ascii(8, 'WAVE');
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, RATE, true); view.setUint32(28, RATE * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ascii(36, 'data'); view.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let v = 0;
    for (const b of BEEPS) {
      const dt = t - b.at;
      if (dt < 0 || dt > 0.34) continue;
      const env = Math.min(1, dt / 0.005) * Math.exp(-dt * 11); // attack קצר + דעיכה
      v += env * (Math.sin(2 * Math.PI * b.freq * dt) >= 0 ? 0.45 : -0.45); // גל ריבועי = חד, חותך מוזיקה
    }
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true);
  }
  return URL.createObjectURL(new Blob([view.buffer], { type: 'audio/wav' }));
}

function audioEl(): HTMLAudioElement | null {
  if (el || typeof Audio === 'undefined') return el;
  try {
    if (!wavUrl) wavUrl = buildWav();
    el = new Audio(wavUrl);
    el.preload = 'auto';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (el as any).playsInline = true;
    el.load();
  } catch { el = null; }
  return el;
}

function webAudio(): AudioContext | null {
  if (ac) return ac;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) ac = new AC();
  } catch { ac = null; }
  return ac;
}

function vibrate() {
  try { navigator.vibrate?.([220, 120, 260]); } catch { /* לא נתמך (אייפון) */ }
}

/**
 * חימום — חייב להיקרא מתוך מחוות משתמש (לחיצה/נגיעה).
 * מנגן את ה-LEAD השקט של הקובץ ועוצר מיד: לא נשמע כלום, אבל הדפדפן מסמן את
 * האלמנט כ"מורשה" וכל ניגון עתידי (בסוף הטיימר) יעבוד בלי מחווה.
 */
export async function primeBell(): Promise<void> {
  try {
    // ספארי 16.4+: מוציא גם את ה-Web Audio מקטגוריית ambient, כך שלא יושתק במתג
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sess = (navigator as any).audioSession;
    if (sess && sess.type !== 'playback') sess.type = 'playback';
  } catch { /* לא נתמך */ }

  const a = webAudio();
  if (a) {
    try {
      if (a.state === 'suspended') await a.resume();
      // "פתיחת" הקונטקסט באייפון דורשת ניגון בפועל בתוך המחווה — באפר שקט
      const src = a.createBufferSource();
      src.buffer = a.createBuffer(1, 1, a.sampleRate);
      src.connect(a.destination);
      src.start(0);
    } catch { /* אין Web Audio — יש את האלמנט */ }
  }

  const e = audioEl();
  if (!e || primed) return;
  try {
    e.currentTime = 0;
    await e.play();
    e.pause();
    e.currentTime = 0;
    primed = true;
  } catch { primed = false; }
}

/** רישום חד-פעמי: המחווה הראשונה באפליקציה מחממת את הצליל */
export function armBell() {
  if (armed || typeof window === 'undefined') return;
  armed = true;
  const once = () => { void primeBell(); };
  for (const ev of ['pointerdown', 'touchend', 'keydown'] as const) {
    window.addEventListener(ev, once, { once: true, capture: true, passive: true });
  }
  // חזרה לאפליקציה אחרי מסך כבוי/מעבר אפליקציה — הקונטקסט חוזר מ-suspended
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ac?.state === 'suspended') ac.resume().catch(() => { /* יחכה למחווה */ });
  });
}

/** גיבוי: אוסילטורים ישירות, למקרה שהאלמנט נחסם */
function ringWebAudio(): boolean {
  const a = webAudio();
  if (!a) return false;
  try {
    const play = () => {
      for (const b of BEEPS) {
        const osc = a.createOscillator();
        const g = a.createGain();
        osc.type = 'square';
        osc.frequency.value = b.freq;
        const t0 = a.currentTime + (b.at - LEAD);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.6, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
        osc.connect(g); g.connect(a.destination);
        osc.start(t0); osc.stop(t0 + 0.36);
      }
    };
    if (a.state === 'suspended') { a.resume().then(play).catch(() => { /* נשאר ויזואלי */ }); return false; }
    play();
    return true;
  } catch { return false; }
}

/**
 * צלצול. מחזיר false אם שום ערוץ קולי לא הצליח (אז ה-UI מציג הסבר במקום להשתתק).
 * תמיד מרטיט — באנדרואיד זה מציל גם כשהטלפון בכיס.
 */
export async function ringBell(): Promise<boolean> {
  vibrate();
  const e = audioEl();
  if (e) {
    try {
      e.currentTime = 0;
      await e.play();
      return true;
    } catch { /* נחסם (לא חומם / חוסם אוטומטי) — ננסה Web Audio */ }
  }
  return ringWebAudio();
}

/** האם הצליל חומם ומוכן לנגן בסוף הטיימר */
export function bellReady(): boolean { return primed; }
