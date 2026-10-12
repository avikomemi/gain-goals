// מעקב כאב הבוהן — גאוט ובוניון באותה כף רגל שמאל.
// אבי (12.10.26): "כמעט תמיד יש לי כאב. אם הבוהן חוטפת מכה או שיש עליה לחץ,
// הכאב מתגבר והיא מתנפחת בצורה תדירה." כאב רציף אינו התקף, ולכן דיווח-אירוע
// בודד לא אומר כלום — מה שקובע הוא המגמה לאורך שבועות, וזה גם מה שהרופא צריך.
import { DB, ToeEntry, today } from './store';

export const TOE_MAX = 10;

const dayBack = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

export const toeToday = (db: DB): ToeEntry | undefined => db.toe.find(t => t.date === today());

/** כל הרישומים ב-N הימים האחרונים, מהישן לחדש. */
export function toeWindow(db: DB, days: number): ToeEntry[] {
  const from = dayBack(days - 1);
  return db.toe.filter(t => t.date >= from).sort((a, b) => a.date.localeCompare(b.date));
}

/** ממוצע הכאב בחלון. null כשאין ולו רישום אחד — ממוצע של כלום אינו 0. */
export function toeAvg(db: DB, days: number): number | null {
  const w = toeWindow(db, days);
  if (!w.length) return null;
  return Math.round((w.reduce((a, t) => a + t.level, 0) / w.length) * 10) / 10;
}

/** השבוע האחרון מול הקודם. delta חיובי = החמרה. */
export function toeTrend(db: DB): { now: number; prev: number; delta: number } | null {
  const recent = toeWindow(db, 7);
  const older = db.toe.filter(t => t.date >= dayBack(13) && t.date < dayBack(6));
  if (recent.length < 3 || older.length < 3) return null;   // פחות מזה זה רעש, לא מגמה
  const avg = (a: ToeEntry[]) => a.reduce((x, t) => x + t.level, 0) / a.length;
  const now = Math.round(avg(recent) * 10) / 10;
  const prev = Math.round(avg(older) * 10) / 10;
  return { now, prev, delta: Math.round((now - prev) * 10) / 10 };
}

/** ימים רצופים (עד היום אחורה) שבהם הכאב היה ברמה מסוימת ומעלה. */
export function toeStreak(db: DB, atLeast: number): number {
  const by = new Map(db.toe.map(t => [t.date, t.level]));
  let n = 0;
  for (let i = 0; ; i++) {
    const lvl = by.get(dayBack(i));
    if (lvl == null || lvl < atLeast) break;
    n++;
  }
  return n;
}

/** כמה מהימים האחרונים בכלל דווחו — בלי זה הממוצע מטעה. */
export function toeCoverage(db: DB, days: number): number {
  return toeWindow(db, days).length;
}

/** סיכום קצר לרופא המעקב: טווח, ממוצע, וכמה ימים גרועים. */
export function toeReport(db: DB, days = 30): string | null {
  const w = toeWindow(db, days);
  if (w.length < 5) return null;
  const levels = w.map(t => t.level);
  const avg = Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10;
  const bad = levels.filter(l => l >= 5).length;
  const free = levels.filter(l => l === 0).length;
  return `${w.length} ימים שדווחו מתוך ${days}: ממוצע ${avg}/10, טווח ${Math.min(...levels)}-${Math.max(...levels)}, `
    + `${bad} ימים ברמה 5+, ${free} ימים ללא כאב כלל.`;
}
