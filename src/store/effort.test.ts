// עומס אימון — זמן, עצימות וקלוריות. נתונים סינתטיים בלבד.
import { describe, expect, it } from 'vitest';
import { hydrate } from './store';
import { workoutMinutes, workoutKcal, workoutRpe, effortOf, intensityLabel, currentKg } from './effort';

const sets = (n: number, reps: number, done = true) => Array.from({ length: n }, () => ({ reps, done }));
const wk = (over = {}) => ({
  id: 'w1', date: '2026-09-25', routine: 'P' as const, loc: 'home' as const, stoppedEarly: false,
  exercises: [{ id: 'p-deadbug', name: 'Dead Bug', sets: sets(3, 10) }],
  ...over,
});
const db = (over = {}) => hydrate({ startDate: '2026-08-21', weights: [{ date: '2026-09-20', kg: 90 }], ...over });

describe('משך האימון', () => {
  it('סופר עבודה + מנוחה, ומוסיף חימום וגמישות', () => {
    // 3 סטים × (10 חזרות × 3 שנ' = 30, בגבול המינימום 20→30) + 60 שנ' מנוחה של p-deadbug = 270 שנ' = 4.5 → 5 + 10
    expect(workoutMinutes(db(), wk())).toBe(15);
  });

  it('סטים שלא בוצעו לא נספרים', () => {
    expect(workoutMinutes(db(), wk({ exercises: [{ id: 'p-deadbug', name: 'x', sets: sets(3, 10, false) }] }))).toBe(0);
  });

  it('תרגיל שדולג לא נספר', () => {
    expect(workoutMinutes(db(), wk({ exercises: [{ id: 'p-deadbug', name: 'x', sets: sets(3, 10), skipped: true }] }))).toBe(0);
  });

  it('זמן מנוחה אישי גובר על ברירת המחדל של התרגיל', () => {
    const long = workoutMinutes(db({ restByEx: { 'p-deadbug': 180 } }), wk());
    expect(long).toBeGreaterThan(workoutMinutes(db(), wk()));
  });
});

describe('עצימות', () => {
  it('ממוצעת את ה-RPE שדווח בלבד', () => {
    const w = wk({ exercises: [
      { id: 'a', name: 'a', sets: sets(3, 10), rpe: 6 },
      { id: 'b', name: 'b', sets: sets(3, 10), rpe: 8 },
      { id: 'c', name: 'c', sets: sets(3, 10) },   // בלי דיווח — לא נכנס לממוצע
    ] });
    expect(workoutRpe(w)).toBe(7);
  });

  it('בלי דיווח מחזירה null, לא אפס', () => {
    expect(workoutRpe(wk())).toBeNull();
    expect(intensityLabel(null)).toBe('לא דווח');
  });

  it('תווית לפי המאמץ', () => {
    expect(intensityLabel(6)).toBe('קל');
    expect(intensityLabel(7)).toBe('בינוני');
    expect(intensityLabel(8)).toBe('נמרץ');
    expect(intensityLabel(10)).toBe('מקסימלי');
  });
});

describe('קלוריות', () => {
  it('גדלות עם המאמץ', () => {
    const easy = workoutKcal(db(), wk({ exercises: [{ id: 'p-deadbug', name: 'x', sets: sets(3, 10), rpe: 6 }] }));
    const hard = workoutKcal(db(), wk({ exercises: [{ id: 'p-deadbug', name: 'x', sets: sets(3, 10), rpe: 9 }] }));
    expect(hard).toBeGreaterThan(easy);
  });

  it('גדלות עם המשקל', () => {
    const light = workoutKcal(db({ weights: [{ date: '2026-09-20', kg: 70 }] }), wk());
    const heavy = workoutKcal(db({ weights: [{ date: '2026-09-20', kg: 110 }] }), wk());
    expect(heavy).toBeGreaterThan(light);
  });

  it('אימון ריק = אפס, לא NaN', () => {
    expect(workoutKcal(db(), wk({ exercises: [] }))).toBe(0);
  });

  it('טווח שפוי לאימון פיזיו מלא', () => {
    // 8 תרגילים × 3 סטים × 10 חזרות, מאמץ 6 — צריך לצאת מאות בודדות, לא אלפים
    const w = wk({ exercises: ['p-deadbug','p-sideplank','p-boxsquat','p-birddog','p-sldl','p-hiplift','p-bandwalk','p-woodchop']
      .map(id => ({ id, name: id, sets: sets(3, 10), rpe: 6 })) });
    const k = workoutKcal(db(), w);
    expect(k).toBeGreaterThan(150);
    expect(k).toBeLessThan(500);
  });
});

describe('סיכום עומס', () => {
  it('מסכם כמה אימונים ביחד', () => {
    const e = effortOf(db(), [wk(), wk({ id: 'w2' })]);
    expect(e.workouts).toBe(2);
    expect(e.minutes).toBe(30);
    expect(e.kcal).toBeGreaterThan(0);
  });

  it('בלי שקילה נופל ליעד המשקל', () => {
    expect(currentKg(hydrate({ startDate: '2026-08-21' }))).toBe(85);
  });
});
