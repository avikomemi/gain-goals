// האם אבי נעשה חזק יותר — השאלה שאף אחד במערכת לא שאל.
//
// הסקירה השבועית מודדת נוכחות: כמה אימונים, כמה שקילות, כמה ימי יומן. אף מדד
// בה לא בודק ביצועים, ולכן 14 תרגילים עמדו במקום חודשיים וחצי בלי שאיש העיר.
//
// --- למה הקובץ הזה קיים ולא סקריפט חד-פעמי ---
// הניתוח הזה נעשה פעם אחת כסקריפט זמני, ונפלו בו שתי טעויות שהפכו שיפור לנסיגה.
// שתיהן מאותו מקור: סכימת חזרות על פני סטים.
//
//   Box Squat:  3×8/8/8 @50  →  2×10/8 @50
//
// הסכום יורד מ-24 ל-18 ו"מכריז" ירידה. בפועל הסט הטוב עלה מ-8 ל-10 חזרות,
// ורק מספר הסטים ירד. אלה שני שינויים מנוגדים שהסקלר מיזג לאחד — ואז שיקר.
//
// לכן: הכיוון כאן לעולם לא נקבע ממספר אחד. הוא נקבע משני מדדים נפרדים —
// הסט הטוב ביותר והנפח הכולל — וכשהם סותרים זה את זה התשובה היא 'mixed'
// ולא הכרעה שרירותית. זה גם מה שמונע מ-prescribe, שתיבנה מעל הקובץ הזה,
// להוריד משקל על סמך שיפור.

import { DB, WorkoutLog, ExLog } from './store';

export type Dir = 'up' | 'down' | 'same' | 'mixed' | 'variant';

export interface Perf {
  date: string;
  sets: number;              // סטים שהושלמו בפועל
  reps: number[];            // חזרות בכל סט שהושלם
  weight: number;            // המשקל הכבד ביותר בסט שהושלם (0 = משקל גוף)
  topSet: number;            // החזרות בסט הטוב ביותר
  volume: number;            // סך החזרות × משקל (או סך החזרות במשקל גוף)
  name: string;              // שם הגרסה שבוצעה — שינוי שלו הוא תרגיל אחר
}

export interface ExProgress {
  id: string;
  name: string;              // שם הגרסה האחרונה
  times: number;             // כמה פעמים בוצע
  first: Perf;
  last: Perf;
  dir: Dir;
  why: string;               // הסבר קריא, כולל הצורה המלאה של שני הקצוות
}

/** הצורה המלאה כמחרוזת: 3×8/8/8 @50. לעולם לא מקצרים למספר אחד. */
export const shape = (p: Perf): string =>
  `${p.sets}×${p.reps.join('/')}` + (p.weight ? ` @${p.weight}` : '');

function perfOf(w: WorkoutLog, e: ExLog): Perf | null {
  const done = e.sets.filter(s => s.done);
  if (!done.length) return null;
  const reps = done.map(s => s.reps);
  const weight = Math.max(...done.map(s => s.weight || 0));
  return {
    date: w.date,
    sets: done.length,
    reps,
    weight,
    topSet: Math.max(...reps),
    // משקל גוף: הנפח הוא החזרות עצמן. אחרת חזרות × משקל.
    volume: weight ? reps.reduce((a, b) => a + b, 0) * weight : reps.reduce((a, b) => a + b, 0),
    name: e.name,
  };
}

/** הכיוון — משני מדדים, לא מאחד. ראו ההערה בראש הקובץ. */
export function dirOf(first: Perf, last: Perf): { dir: Dir; why: string } {
  const fs = shape(first), ls = shape(last);
  if (first.name !== last.name)
    return { dir: 'variant', why: `גרסה אחרת: "${first.name}" ← "${last.name}". לא השוואה.` };

  if (last.weight !== first.weight) {
    const d = +(last.weight - first.weight).toFixed(2);
    return d > 0
      ? { dir: 'up', why: `משקל +${d} ק"ג (${fs} ← ${ls})` }
      : { dir: 'down', why: `משקל ${d} ק"ג (${fs} ← ${ls})` };
  }

  const topD = last.topSet - first.topSet;
  const volD = last.volume - first.volume;
  if (topD === 0 && volD === 0) return { dir: 'same', why: `ללא שינוי (${fs})` };
  // שני המדדים מסכימים → כיוון ברור. סותרים → 'mixed', וזו התשובה הכנה.
  if (topD >= 0 && volD >= 0) return { dir: 'up', why: `סט טוב ${first.topSet}→${last.topSet}, נפח ${first.volume}→${last.volume} (${fs} ← ${ls})` };
  if (topD <= 0 && volD <= 0) return { dir: 'down', why: `סט טוב ${first.topSet}→${last.topSet}, נפח ${first.volume}→${last.volume} (${fs} ← ${ls})` };
  return {
    dir: 'mixed',
    why: topD > 0
      ? `הסט הטוב עלה ${first.topSet}→${last.topSet}, אבל הנפח ירד ${first.volume}→${last.volume} — פחות סטים (${fs} ← ${ls})`
      : `הנפח עלה ${first.volume}→${last.volume}, אבל הסט הטוב ירד ${first.topSet}→${last.topSet} (${fs} ← ${ls})`,
  };
}

/** דוח התקדמות לכל תרגיל. minTimes — כמה פעמים צריך שבוצע כדי שתהיה מגמה. */
export function progressReport(db: DB, minTimes = 3, since?: string): ExProgress[] {
  const byId = new Map<string, { name: string; perfs: Perf[] }>();
  for (const w of [...(db.workouts || [])].sort((a, b) => a.date.localeCompare(b.date))) {
    if (w.routine === 'P') continue;   // דף הפיזיו אינו חלק מהסבב ולא נמדד כהתקדמות
    if (since && w.date < since) continue;
    for (const e of w.exercises) {
      if (e.skipped) continue;
      const p = perfOf(w, e);
      if (!p) continue;
      const cur = byId.get(e.id) || { name: e.name, perfs: [] };
      cur.name = e.name;
      cur.perfs.push(p);
      byId.set(e.id, cur);
    }
  }
  const out: ExProgress[] = [];
  for (const [id, { name, perfs }] of byId) {
    if (perfs.length < minTimes) continue;
    const first = perfs[0], last = perfs[perfs.length - 1];
    const { dir, why } = dirOf(first, last);
    out.push({ id, name, times: perfs.length, first, last, dir, why });
  }
  const order: Dir[] = ['down', 'same', 'mixed', 'variant', 'up'];
  return out.sort((a, b) => order.indexOf(a.dir) - order.indexOf(b.dir) || b.times - a.times);
}

/** סיכום בשורה אחת — מה שהסקירה השבועית תציג. */
export function progressSummary(db: DB, minTimes = 3, since?: string): { total: number; up: number; down: number; same: number; mixed: number; variant: number } {
  const r = progressReport(db, minTimes, since);
  const n = (d: Dir) => r.filter(x => x.dir === d).length;
  return { total: r.length, up: n('up'), down: n('down'), same: n('same'), mixed: n('mixed'), variant: n('variant') };
}
