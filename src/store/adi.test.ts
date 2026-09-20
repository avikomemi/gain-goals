// הסקירה השבועית — מתי היא נדרשת ואיזה שבוע היא מסכמת
import { describe, expect, it } from 'vitest';
import { hydrate, weekStartOf, today } from './store';
import { weeklyReviewDue, reviewedWeek, reviewDigest, nextSteps } from './adi';

const day = (back: number) => new Date(Date.now() - back * 864e5).toISOString().slice(0, 10);
const withData = (extra = {}) => hydrate({
  startDate: day(30),
  workouts: [{ date: day(9), routine: 'A', exercises: [] }, { date: day(8), routine: 'B', exercises: [] }, { date: day(2), routine: 'A', exercises: [] }],
  weights: [{ date: day(9), kg: 90 }],
  ...extra,
});

describe('הסקירה השבועית', () => {
  it('פתוחה כל עוד לא נסגרה — לא רק בימי ראשון', () => {
    expect(weeklyReviewDue(withData())).toBe(true);
    expect(nextSteps(withData()).some(s => s.includes('הסקירה השבועית'))).toBe(true);
  });

  it('נסגרת ונעלמת', () => {
    const db = withData({ reviews: [{ weekStart: weekStartOf(today()), stress: 5, decision: 'x', closedAt: today() }] });
    expect(weeklyReviewDue(db)).toBe(false);
    expect(nextSteps(db).some(s => s.includes('הסקירה השבועית'))).toBe(false);
  });

  it('לא מציקה למשתמש בלי נתונים', () => {
    expect(weeklyReviewDue(hydrate({ startDate: today() }))).toBe(false);
  });

  it('מסכמת את השבוע שנסגר, לא את זה שרק התחיל', () => {
    expect(reviewedWeek()).toBe(weekStartOf(day(7)));
    const d = reviewDigest(withData());
    // נספרים רק האימונים שנפלו בשבוע שנסגר. איזה מהם — תלוי ביום בשבוע שבו הטסט רץ,
    // אז הציפייה מחושבת מכל התאריכים ולא מהנחה על יומיים מסוימים.
    const dates = [day(9), day(8), day(2)];
    const belongsToReviewed = dates.filter(x => weekStartOf(x) === reviewedWeek()).length;
    expect(d.workouts).toBe(belongsToReviewed);
    expect(d.workouts).toBeLessThan(dates.length);   // לא כל האימונים — רק של השבוע שנסגר
  });
});
