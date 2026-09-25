// עומס אימון — כמה זמן, באיזו עצימות, וכמה קלוריות.
// אבי, 25.9.26 על אימון הפיזיו: "הוא חשוב גם בעצימות שלו וגם קלורית."
// עד כה האפליקציה ספרה אימונים כמספר בלבד — אימון של 20 דקות ואימון של שעה
// נראו זהים. כאן מחשבים אומדן אמיתי, לכל אימון, בלי קשר לסוג שלו.
//
// המודל: זמן מוערך מהסטים (עבודה + מנוחה) → MET לפי מאמץ מדווח → קלוריות לפי משקל.
// זה אומדן, לא מדידה. אין מד דופק ואין מד זמן באימון — לכן המספר מוצג כ"בערך".
import { DB, WorkoutLog } from './store';
import { routineByKey } from '../data/program';
import { getGoals } from './goals';

const DEFAULT_REST = 90;
const OVERHEAD_MIN = 10;      // חימום + בלוק גמישות — לא מתועדים בסטים

/** זמן מנוחה בפועל לתרגיל: הגדרה אישית → ברירת המחדל של התרגיל → הגלובלית → 90 */
function restOf(db: DB, routine: WorkoutLog['routine'], exId: string): number {
  const byEx = db.restByEx?.[exId];
  if (typeof byEx === 'number') return byEx;
  const def = routineByKey(routine)?.exercises.find(e => e.id === exId)?.restDefault;
  return def ?? db.restSec ?? DEFAULT_REST;
}

/** אומדן משך האימון בדקות — מהסטים שסומנו כבוצעו */
export function workoutMinutes(db: DB, w: WorkoutLog): number {
  let sec = 0;
  for (const ex of w.exercises) {
    if (ex.skipped) continue;
    const rest = restOf(db, w.routine, ex.id);
    for (const s of ex.sets) {
      if (!s.done) continue;
      // עבודה: ~3 שניות לחזרה, בגבולות שפויים (סט קצר לא פחות מ-20 שנ', ארוך לא יותר מ-90)
      sec += Math.min(90, Math.max(20, (s.reps || 0) * 3)) + rest;
    }
  }
  if (!sec) return 0;
  return Math.round(sec / 60) + OVERHEAD_MIN;
}

/** המאמץ הממוצע שדווח (RPE). null כשלא דווח כלום. */
export function workoutRpe(w: WorkoutLog): number | null {
  const rs = w.exercises.filter(e => !e.skipped && typeof e.rpe === 'number').map(e => e.rpe as number);
  if (!rs.length) return null;
  return +(rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(1);
}

// MET לאימון התנגדות: קל (~3.5) עד נמרץ (~7.5). מבוסס על טבלאות Ainsworth.
// בלי RPE מדווח מניחים 7 — מה שאבי מדווח ברוב האימונים.
const metOf = (rpe: number) => (rpe <= 6 ? 3.5 : rpe <= 7 ? 5 : rpe <= 8 ? 6 : 7.5);

/** המשקל העדכני לחישוב — השקילה האחרונה, ואם אין, יעד המשקל */
export function currentKg(db: DB): number {
  const last = [...db.weights].sort((a, b) => a.date.localeCompare(b.date)).pop();
  return last?.kg ?? getGoals(db).weightKg;
}

/** אומדן קלוריות לאימון. הנוסחה: MET × 3.5 × ק"ג / 200 = קק"ל לדקה. */
export function workoutKcal(db: DB, w: WorkoutLog): number {
  const min = workoutMinutes(db, w);
  if (!min) return 0;
  const met = metOf(workoutRpe(w) ?? 7);
  return Math.round((met * 3.5 * currentKg(db) / 200) * min);
}

export const intensityLabel = (rpe: number | null): string =>
  rpe == null ? 'לא דווח' : rpe <= 6 ? 'קל' : rpe <= 7.5 ? 'בינוני' : rpe <= 8.5 ? 'נמרץ' : 'מקסימלי';

export interface EffortSummary { workouts: number; minutes: number; kcal: number; rpe: number | null }

/** סיכום עומס לקבוצת אימונים — לשבוע, לחודש, או לכל טווח שהמסך מבקש */
export function effortOf(db: DB, workouts: WorkoutLog[]): EffortSummary {
  const minutes = workouts.reduce((a, w) => a + workoutMinutes(db, w), 0);
  const kcal = workouts.reduce((a, w) => a + workoutKcal(db, w), 0);
  const rpes = workouts.map(workoutRpe).filter((r): r is number => r != null);
  return {
    workouts: workouts.length,
    minutes,
    kcal,
    rpe: rpes.length ? +(rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : null,
  };
}
