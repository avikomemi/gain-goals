// ההוראה לאימון הבא. מה שנשבר כאן = אבי מקבל הוראה להעלות משהו שאסור,
// או לא מקבל הוראה בכלל ונשאר על אותו מספר עוד חודשיים.
//
// הנתונים כאן סינתטיים (הריפו ציבורי), אבל כל מקרה הוא מקרה אמיתי שתועד:
// המקבילים שירדו מ-21 ל-15, אצבעות לבר בתקרת היעד, והבוקס סקוואט עם 50.
import { describe, expect, it } from 'vitest';
import { prescribe, prescribeOne, repRange } from './prescribe';
import { progressReport } from './progress';
import { DB, WorkoutLog } from './store';
import { PROGRAM, routineByKey, ExerciseDef } from '../data/program';

const TODAY = '2026-11-17';
const ex = (id: string): ExerciseDef =>
  PROGRAM.flatMap(r => r.exercises).find(e => e.id === id)!;

type S = { reps: number[]; weight?: number; rpe?: number; params?: Record<string, number> };
const wk = (date: string, id: string, s: S, routine = 'B'): WorkoutLog => ({
  id: date + id, date, routine: routine as WorkoutLog['routine'], loc: 'gym',
  exercises: [{ id, name: ex(id).name, rpe: s.rpe, params: s.params, sets: s.reps.map(r => ({ reps: r, done: true, weight: s.weight })) }],
});
const mk = (workouts: WorkoutLog[], over: Partial<DB> = {}): DB => ({ workouts, injuries: [], ...over } as unknown as DB);
const one = (db: DB, id: string) =>
  prescribeOne(db, ex(id), 'gym', progressReport(db, 1).find(p => p.id === id), TODAY);

describe('טווח החזרות מהיעד', () => {
  it('קורא טווח, מספר בודד, ומתעלם ממה שאינו מספרי', () => {
    expect(repRange('3×8-12 · עצירה 2 שניות')).toEqual({ min: 8, max: 12 });
    expect(repRange('3×8')).toEqual({ min: 8, max: 8 });
    expect(repRange('3-4×3-8')).toEqual({ min: 3, max: 8 });
    expect(repRange('3× מקס שניות')).toBeNull();
    expect(repRange('5 × ירידה של 10 שניות')).toBeNull();   // אין חזרות אחרי ×
  });
});

describe('בסיס ונסיגה', () => {
  it('פעם ראשונה — קובעים בסיס, בלי הוראה', () => {
    const p = one(mk([wk('2026-11-01', 'b-dip', { reps: [12, 12, 12], weight: 21 })]), 'b-dip');
    expect(p.action).toBe('base');
  });

  it('נסיגה במשקל — בונים חזרות על המשקל החדש, לא חוזרים לישן', () => {
    // המקרה האמיתי: 3×12/12/12 @21 → 2×12/11 @15 לאורך שבעה אימונים.
    const db = mk([
      wk('2026-09-02', 'b-dip', { reps: [12, 12, 12], weight: 21 }),
      wk('2026-10-21', 'b-dip', { reps: [8, 6, 6], weight: 20 }),
      wk('2026-11-07', 'b-dip', { reps: [12, 11], weight: 15 }),
    ]);
    const p = one(db, 'b-dip');
    expect(p.action).toBe('rebuild');
    expect(p.text).toContain('15');
    expect(p.text).toContain('לא חוזרים ל-21');
  });

  it('עלייה — ממשיכים, בלי לשנות כלום', () => {
    const db = mk([
      wk('2026-09-02', 'b-pull', { reps: [7, 7, 7], weight: 15 }),
      wk('2026-10-21', 'b-pull', { reps: [8, 6, 6], weight: 15 }),
      wk('2026-11-07', 'b-pull', { reps: [9, 7, 5], weight: 15 }),
    ]);
    expect(one(db, 'b-pull').action).toBe('hold');
  });
});

describe('תקוע — איזה משתנה זז, ובאיזה סדר', () => {
  const stuck = (id: string, s: S, routine = 'B') =>
    mk(['2026-09-02', '2026-09-20', '2026-10-10', '2026-11-01'].map(d => wk(d, id, s, routine)));

  it('לא ממהרים: פעם אחת על אותו מספר אינה "תקוע"', () => {
    const db = mk([
      wk('2026-10-10', 'b-tri', { reps: [10, 10, 10] }),
      wk('2026-11-01', 'b-tri', { reps: [10, 10, 10] }),
    ]);
    expect(one(db, 'b-tri').action).toBe('hold');
  });

  it('חזרות בתוך הטווח — מוסיפים חזרה אחת', () => {
    // BW Triceps: 3×10 מול יעד 3×10-15. יש מרווח, ואיש לא העלה עשרה שבועות.
    const p = one(stuck('b-tri', { reps: [10, 10, 10] }), 'b-tri');
    expect(p.action).toBe('up');
    expect(p.text).toContain('10 → 11');
    expect(p.text).toContain('15');
  });

  it('בתקרת היעד — זו תקרת ההוראה, לא תקרת אבי', () => {
    // אצבעות לבר עמד על 3×8 מול יעד 3-8 עשרה שבועות. אין לאן להעלות בתוך
    // היעד, ולכן ההוראה היא גרסה אחרת ולא עוד חזרה.
    const t2b = { ...ex('b-t2b'), target: '3-4×3-8', harder: 'גרסה קשה יותר' };
    const db = stuck('b-t2b', { reps: [8, 8, 8] });
    const p = prescribeOne(db, t2b, 'gym', progressReport(db, 1).find(x => x.id === 'b-t2b'), TODAY);
    expect(p.action).toBe('ceiling');
    expect(p.why).toContain('3-4×3-8');
  });

  it('גובה לפני חזרות — זה המינון שהמאמן כתב', () => {
    const db = stuck('a-land', { reps: [5, 5, 5, 5], params: { dropH: 15 } }, 'A');
    const p = one(db, 'a-land');
    expect(p.action).toBe('up');
    expect(p.text).toContain('15 → 20');
  });

  it('בפיסטול הקופסה יורדת כדי להקשות, לא עולה', () => {
    // בלי raise:-1 ההוראה הייתה "קופסה 45 → 50", כלומר להקל ולקרוא לזה התקדמות.
    const db = stuck('c-pistol', { reps: [6, 6, 6], params: { boxH: 45 } }, 'C');
    const p = one(db, 'c-pistol');
    expect(p.text).toContain('45 → 40');
  });
});

describe('הווטו הוא מנגנון, לא מחרוזת תיאור', () => {
  const stuck4 = (id: string, s: S, routine: string, over: Partial<DB> = {}) =>
    mk(['2026-09-02', '2026-09-20', '2026-10-10', '2026-11-01'].map(d => wk(d, id, s, routine)), over);

  it('כאב טרי באזור של התרגיל בולם כל העלאה', () => {
    const db = stuck4('b-tri', { reps: [10, 10, 10] }, 'B', {
      injuries: [{ date: '2026-11-10', area: ex('b-tri').area!, level: 4, what: 'כאב תוך אימון' }],
    });
    const p = one(db, 'b-tri');
    expect(p.veto).toContain('מאיה');
    expect(p.veto).toContain('4/10');
    expect(p.text).toContain('10 → 11');   // ההוראה נשארת גלויה לצד הווטו
  });

  it('כאב ישן אינו בולם', () => {
    const db = stuck4('b-tri', { reps: [10, 10, 10] }, 'B', {
      injuries: [{ date: '2026-08-01', area: ex('b-tri').area!, level: 5, what: 'כאב' }],
    });
    expect(one(db, 'b-tri').veto).toBeUndefined();
  });

  it('מאמץ 9 בולם; מאמץ 8 לא; וחוסר דיווח לעולם לא עוצר', () => {
    const at = (rpe?: number) => one(stuck4('b-tri', { reps: [10, 10, 10], rpe }, 'B'), 'b-tri');
    expect(at(9).veto).toContain('9');
    expect(at(8).veto).toBeUndefined();
    // התנאי הישן היה (rpe ?? 10) <= 8, ולכן בלי דיווח אי אפשר היה להתקדם כלל.
    expect(at(undefined).veto).toBeUndefined();
    expect(at(undefined).action).toBe('up');
  });

  it('בבוקס סקוואט המשקל חסום — ההוראה היא טמפו, והווטו נקוב בשם', () => {
    const db = stuck4('c-box', { reps: [8, 8, 8], weight: 50, params: { boxH: 40 } }, 'C');
    // הפרמטר הראשון הוא גובה הקופסה; מנטרלים אותו כדי להגיע לענף המשקל.
    const noParam = { ...ex('c-box'), params: undefined };
    const p = prescribeOne(db, noParam, 'gym', progressReport(db, 1).find(x => x.id === 'c-box'), TODAY);
    expect(p.action).toBe('ceiling');
    expect(p.veto).toContain('מאיה');
    expect(p.veto).toContain('עמוד השדרה');
    expect(p.text).not.toMatch(/52\.5|להעלות משקל/);
  });
});

describe('שלב בסולם — ההוראה היא השער', () => {
  it('מחזיר את השער של השלב הנוכחי ולא המלצת חזרות', () => {
    const db = mk(
      ['2026-09-02', '2026-10-10', '2026-11-01'].map(d => wk(d, 'b-lever', { reps: [2, 2] })),
      { stageByEx: { 'b-lever': 0 } },
    );
    const p = one(db, 'b-lever');
    expect(p.action).toBe('gate');
    expect(p.text).toContain('30 שניות');
  });
});

describe('אימון שלם', () => {
  it('מחזיר הוראה לכל תרגיל, בסדר התוכנית', () => {
    const out = prescribe(mk([]), 'B', 'gym', TODAY);
    expect(out.map(p => p.id)).toEqual(routineByKey('B')!.exercises.map(e => e.id));
    expect(out.every(p => p.text.length > 5 && p.by.length > 1)).toBe(true);
  });

  it('לכל שלוש השגרות יש הוראות, וכולן נושאות ראיה', () => {
    for (const k of ['A', 'B', 'C'] as const) {
      const out = prescribe(mk([]), k, 'gym', TODAY);
      expect(out.length).toBeGreaterThan(0);
      for (const p of out) expect(p.why.length, `${k}/${p.id}`).toBeGreaterThan(3);
    }
  });
});

describe('פרמטר שאינו משתנה התקדמות', () => {
  it('בבוקס סקוואט לא ממליצים לגעת בגובה הקופסה', () => {
    // הבאג שנתפס בהרצה: ההוראה הייתה "קופסה 40 → 45", כלומר להגביה ולקרוא
    // לזה התקדמות. הגבהה שם מקלה, והנמכה נוגדת את "do not go low" של המאמן.
    const db = mk(['2026-09-02', '2026-09-20', '2026-10-10', '2026-11-01'].map(d =>
      wk(d, 'c-box', { reps: [8, 8, 8], weight: 50, params: { boxH: 40 } }, 'C')));
    const p = one(db, 'c-box');
    expect(p.text).not.toContain('40 → 45');
    expect(p.text).not.toContain('גובה קופסה');
    expect(p.action).toBe('ceiling');
    expect(p.veto).toContain('עמוד השדרה');
  });

  it('גובה הקופסה בפיסטול כן משתנה, ובכיוון הנכון', () => {
    const db = mk(['2026-09-02', '2026-09-20', '2026-10-10', '2026-11-01'].map(d =>
      wk(d, 'c-pistol', { reps: [6, 6, 6], params: { boxH: 45 } }, 'C')));
    expect(one(db, 'c-pistol').text).toContain('45 → 40');
  });
});

describe('הווטו קורא מאמץ פר-סט', () => {
  const wkR = (date: string, id: string, reps: number[], rpes: (number|undefined)[], routine = 'B'): WorkoutLog => ({
    id: date + id, date, routine: routine as WorkoutLog['routine'], loc: 'gym',
    exercises: [{ id, name: ex(id).name, sets: reps.map((r, i) => ({ reps: r, done: true, rpe: rpes[i] })) }],
  });
  const four = (id: string, reps: number[], rpes: (number|undefined)[]) =>
    mk(['2026-09-02', '2026-09-20', '2026-10-10', '2026-11-01'].map(d => wkR(d, id, reps, rpes)));

  it('סט אחד שהגיע לכשל בולם, גם כששניים לפניו היו קלים', () => {
    // זה בדיוק המקרה שאבי תיאר. מספר אחד לתרגיל היה מסתיר אותו.
    const p = one(four('b-tri', [10, 10, 10], [6, 7, 10]), 'b-tri');
    expect(p.veto).toBeTruthy();
    expect(p.veto).toContain('10');
  });

  it('דעיכה מנוסחת כמנוחה, לא כעומס', () => {
    const p = one(four('b-tri', [10, 10, 10], [7, 8, 10]), 'b-tri');
    expect(p.veto).toContain('מנוחה');
    expect(p.veto).toContain('עייפות מצטברת');
  });

  it('כבד מההתחלה מנוסח אחרת — זה כן עומס', () => {
    const p = one(four('b-tri', [10, 10, 10], [9, 9, 9]), 'b-tri');
    expect(p.veto).toContain('בסט הקשה');
    expect(p.veto).not.toContain('עייפות מצטברת');
  });

  it('שלושה סטים קלים אינם בולמים', () => {
    expect(one(four('b-tri', [10, 10, 10], [6, 7, 8]), 'b-tri').veto).toBeUndefined();
  });

  it('דיווח חלקי: מה שדווח נספר, מה שחסר לא עוצר', () => {
    expect(one(four('b-tri', [10, 10, 10], [undefined, undefined, 10]), 'b-tri').veto).toBeTruthy();
    expect(one(four('b-tri', [10, 10, 10], [undefined, undefined, undefined]), 'b-tri').veto).toBeUndefined();
  });
});
