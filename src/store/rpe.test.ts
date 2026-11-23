// מאמץ פר-סט. אבי, 23.11: "יש סטים שבהם יש כשל."
// מה שנשבר כאן = הווטו ב-prescribe קורא מספר שגוי, ואבי מקבל הוראה להעלות
// אחרי סט שהגיע לכשל, או נבלם אחרי שלושה סטים קלים.
import { describe, expect, it } from 'vitest';
import { exEffort, exRpe, fades } from './rpe';
import { ExLog } from './store';

const ex = (rpes: (number | undefined)[], exRpeVal?: number): ExLog => ({
  id: 'x', name: 'X', rpe: exRpeVal,
  sets: rpes.map(r => ({ reps: 8, done: true, rpe: r })),
});

describe('שיא ופתיחה — שני מספרים, לא ממוצע', () => {
  it('השיא הוא הסט הקשה, הפתיחה היא הראשון', () => {
    const f = exEffort(ex([7, 8, 10]))!;
    expect(f.peak).toBe(10);
    expect(f.opener).toBe(7);
    expect(f.reported).toBe(3);
  });

  it('ממוצע היה מוחק בדיוק את ההבדל שבגללו פיצלנו', () => {
    // 7·8·10 ו-8·8·8 הם אותו ממוצע (8.3 מול 8) ומצב אחר לגמרי:
    // באחד סט הגיע לכשל, בשני אף אחד לא התקרב.
    const spread = exEffort(ex([7, 8, 10]))!;
    const flat = exEffort(ex([8, 8, 8]))!;
    expect(spread.peak).toBeGreaterThan(flat.peak);
    expect(spread.opener).toBeLessThan(flat.opener);
  });

  it('דעיכה = פתיחה קלה וסיום קשה, ולא עומס גבוה', () => {
    expect(fades(exEffort(ex([7, 8, 10])))).toBe(true);
    expect(fades(exEffort(ex([9, 9, 9])))).toBe(false);   // כבד מההתחלה, לא דעיכה
    expect(fades(exEffort(ex([8, 8, 9])))).toBe(false);   // פער של 1 אינו דעיכה
  });
});

describe('דיווח חלקי ורשומות ישנות', () => {
  it('סטים בלי דיווח פשוט לא נספרים', () => {
    const f = exEffort(ex([undefined, 9, undefined]))!;
    expect(f.peak).toBe(9);
    expect(f.reported).toBe(1);
    expect(f.sets).toBe(3);
  });

  it('בלי שום דיווח — null, ולא אפס ולא עשר', () => {
    // הקוד הישן השתמש ב-(rpe ?? 10), ולכן חוסר דיווח נקרא כמאמץ מקסימלי
    // וענף ההעלאה לא יכול היה לרוץ לעולם.
    expect(exEffort(ex([undefined, undefined]))).toBeNull();
    expect(exRpe(ex([undefined]))).toBeUndefined();
  });

  it('רשומה ישנה עם מספר אחד לתרגיל עדיין נקראת', () => {
    const f = exEffort(ex([undefined, undefined], 8))!;
    expect(f.peak).toBe(8);
    expect(f.opener).toBe(8);
    expect(f.reported).toBe(1);
  });

  it('הסטים גוברים על המספר הישן שברמת התרגיל', () => {
    expect(exEffort(ex([6, 6], 10))!.peak).toBe(6);
  });

  it('סט שלא הושלם אינו נספר', () => {
    const e: ExLog = { id: 'x', name: 'X', sets: [{ reps: 8, done: true, rpe: 7 }, { reps: 8, done: false, rpe: 10 }] };
    expect(exEffort(e)!.peak).toBe(7);
  });
});
