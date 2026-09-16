/**
 * שמירה על מסך דלוק בזמן טיימר (מנוחה / זמן תרגיל).
 *
 * בלי זה: המסך נכבה אחרי 30 שניות, הדפדפן מקפיא את הטיימרים, והצלצול פשוט לא
 * קורה עד שמרימים את הטלפון. עם זה: המסך נשאר דלוק כל עוד טיימר רץ ומשתחרר
 * ברגע שהוא נגמר, כדי לא לשרוף סוללה.
 * נתמך ב-Safari 16.4+ ובכרום; בלי תמיכה — פשוט לא קורה כלום.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lock: any = null;
let want = false;
let bound = false;

async function acquire() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wl = (navigator as any).wakeLock;
  if (!wl || lock || document.visibilityState !== 'visible') return;
  try {
    lock = await wl.request('screen');
    lock.addEventListener?.('release', () => { lock = null; });
  } catch { lock = null; /* סוללה נמוכה / לא נתמך */ }
}

/** true בתחילת טיימר, false בסופו/בביטולו. בטוח לקרוא שוב ושוב. */
export function keepAwake(on: boolean) {
  want = on;
  if (!bound && typeof document !== 'undefined') {
    bound = true;
    // חזרה למסך אחרי שהמערכת שחררה את הנעילה (מעבר אפליקציה / מסך כבוי)
    document.addEventListener('visibilitychange', () => { if (want && document.visibilityState === 'visible') void acquire(); });
  }
  if (on) void acquire();
  else if (lock) { try { void lock.release(); } catch { /* כבר שוחרר */ } lock = null; }
}
