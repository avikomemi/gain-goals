// מעקב כאב הבוהן — המגמה היא המוצר, לא הדיווח הבודד
import { describe, expect, it } from 'vitest';
import { hydrate, DB } from './store';
import { toeAvg, toeTrend, toeStreak, toeCoverage, toeToday, toeReport } from './toe';
import { toeAlerts } from './adi';

const day = (back: number) => new Date(Date.now() - back * 864e5).toISOString().slice(0, 10);
/** levels[0] = היום, levels[1] = אתמול, ... */
const withToe = (levels: (number | null)[]): DB =>
  hydrate({ startDate: day(60), toe: levels.flatMap((l, i) => (l === null ? [] : [{ date: day(i), level: l }])) });

describe('חישובי הבוהן', () => {
  it('ממוצע של כלום אינו 0', () => {
    expect(toeAvg(hydrate({}), 7)).toBeNull();      // לא 0 — 0 פירושו "יום בלי כאב"
    expect(toeAvg(withToe([0, 0, 0]), 7)).toBe(0);  // וזה באמת אפס
  });

  it('ממוצע וכיסוי בחלון', () => {
    const db = withToe([4, 6, 2, null, 8]);
    expect(toeAvg(db, 7)).toBe(5);        // (4+6+2+8)/4
    expect(toeCoverage(db, 7)).toBe(4);
    expect(toeToday(db)!.level).toBe(4);
  });

  it('רצף נספר רק מהיום אחורה, ונקטע בחור', () => {
    expect(toeStreak(withToe([6, 6, 7]), 5)).toBe(3);
    expect(toeStreak(withToe([6, 2, 7]), 5)).toBe(1);   // אתמול היה 2 — הרצף נקטע
    expect(toeStreak(withToe([6, null, 7]), 5)).toBe(1); // יום חסר קוטע גם הוא
    expect(toeStreak(withToe([3, 3, 3]), 5)).toBe(0);
  });

  it('מגמה דורשת מספיק נתונים בשני השבועות', () => {
    expect(toeTrend(withToe([5, 5, 5]))).toBeNull();                       // אין שבוע קודם
    const db = withToe([7, 7, 7, 7, 7, 7, 7, 3, 3, 3, 3, 3, 3, 3]);
    expect(toeTrend(db)).toEqual({ now: 7, prev: 3, delta: 4 });           // החמרה
  });

  it('דוח לרופא נדרש מינימום ימים', () => {
    expect(toeReport(withToe([5, 5]))).toBeNull();
    const r = toeReport(withToe([0, 2, 5, 6, 0, 3]))!;
    expect(r).toContain('6 ימים שדווחו');
    expect(r).toContain('2 ימים ברמה 5+');
    expect(r).toContain('2 ימים ללא כאב');
  });
});

describe('התרעות הבוהן', () => {
  const texts = (db: DB) => toeAlerts(db).map(a => a.text);

  it('שותקות לגמרי לפני שיש בכלל היסטוריה', () => {
    expect(toeAlerts(hydrate({}))).toEqual([]);
  });

  it('שלושה ימים רצופים בכאב 5+ — התרעה', () => {
    const a = toeAlerts(withToe([6, 5, 7]));
    expect(a).toHaveLength(1);
    expect(a[0].sev).toBe('warn');
    expect(a[0].text).toContain('3 ימים רצופים');
  });

  it('קפיצה שבועית — התרעה עם שני המספרים', () => {
    // מתחת לסף הרצף (5+) בכוונה: שם כלל הרצף גובר, והוא אכן הדחוף מביניהם.
    const db = withToe([4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2]);
    expect(texts(db)[0]).toContain('מ-2 ל-4');
  });

  it('רצף גובר על מגמה כששניהם מתקיימים', () => {
    const db = withToe([7, 7, 7, 7, 7, 7, 7, 3, 3, 3, 3, 3, 3, 3]);
    const a = toeAlerts(db);
    expect(a).toHaveLength(1);
    expect(a[0].text).toContain('ימים רצופים');   // הדחוף קודם
  });

  it('שיפור נאמר גם הוא, ובלי אזהרה', () => {
    const db = withToe([2, 2, 2, 2, 2, 2, 2, 7, 7, 7, 7, 7, 7, 7]);
    const a = toeAlerts(db);
    expect(a[0].sev).toBe('info');
    expect(a[0].text).toContain('ירד');
  });

  it('לכל היותר התרעה אחת', () => {
    expect(toeAlerts(withToe([8, 8, 8, 8, 8, 8, 8, 2, 2, 2, 2, 2, 2, 2])).length).toBeLessThanOrEqual(1);
  });

  it('תזכורת עדינה כשלא דווח היום, ולא כשדווח', () => {
    expect(texts(withToe([null, 2, 2, 1, 2])).join()).toContain('לא דיווחת היום');
    expect(texts(withToe([1, 2, 2, 1, 2]))).toEqual([]);
  });
});
