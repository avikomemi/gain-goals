// מנוע הסקירה — נתונים סינתטיים בלבד (הריפו ציבורי; התיק האישי לא נכנס לכאן)
import { describe, expect, it } from 'vitest';
import { hydrate } from './store';
import { fullReview } from './review';

const day = (back: number) => new Date(Date.now() - back * 864e5).toISOString().slice(0, 10);
const wk = (date: string, over: Record<string, unknown> = {}) =>
  ({ id: date, date, routine: 'A', loc: 'gym', flexDone: true, stoppedEarly: false, exercises: [{ id: 'x', name: 'x', sets: [] }], ...over });

const base = {
  startDate: day(20),
  calib: { waist: true, bp: true, firstWeight: true, flexTests: true, runs: { A: 2, B: 2, C: 2 }, done: true },
  workouts: [wk(day(18)), wk(day(16)), wk(day(14)), wk(day(11)), wk(day(8)), wk(day(6)), wk(day(4)), wk(day(1))],
  weights: [day(16), day(14), day(11), day(9), day(7), day(4), day(2), day(1)].map((d, i) => ({ date: d, kg: 90 - i * 0.2 })),
  waists: [{ date: day(6), cm: 98 }],
  water: [day(5), day(4), day(3), day(2), day(1)].map(d => ({ date: d, ml: 2000 })),
  food: [day(3), day(2), day(1)].map(d => ({ date: d, text: 'חזה עוף 300 גרם, קוטג 250 גרם, 4 ביצים, טונה 100 גרם, סלט ירקות' })),
  waterGoal: 1500,
};

describe('מנוע הסקירה', () => {
  it('בלי נתונים — לא ממציא סקירה', () => {
    expect(fullReview(hydrate({ startDate: day(1) })).logged).toBe(false);
  });

  it('מזהה את מה שעובד ולא מתריע סתם', () => {
    const r = fullReview(hydrate(base));
    expect(r.wins.some(w => w.includes('מים'))).toBe(true);
    expect(r.flags.filter(f => f.sev === 'red')).toHaveLength(0);
    expect(r.decision).toContain('ממשיכים');
  });

  it('גאוט שמטפס — דגל אדום של ד"ר ארז, והוא גובר על שאר ההחלטות', () => {
    const r = fullReview(hydrate({
      ...base,
      injuries: [
        { date: day(9), area: 'כף רגל (גאוט)', level: 2, what: 'כאב תוך אימון' },
        { date: day(3), area: 'כף רגל (גאוט)', level: 3, what: 'כאב תוך אימון' },
      ],
    }));
    const gout = r.flags.find(f => f.title.includes('גאוט'));
    expect(gout).toMatchObject({ from: 'ד"ר ארז', sev: 'red' });
    expect(gout!.body).toContain('2 → 3');
    expect(r.decision).toContain('בשר אדום');
  });

  it('מצליב פורינים גבוהים מהיומן מול תקופת הכאב', () => {
    const r = fullReview(hydrate({
      ...base,
      food: [{ date: day(2), text: 'סטייק אנטריקוט 300 גרם עם אורז' }],
      injuries: [{ date: day(3), area: 'כף רגל (גאוט)', level: 3, what: 'כאב' }],
    }));
    expect(r.flags.some(f => f.title.includes('פורינים') && f.body.includes('סטייק'))).toBe(true);
  });

  it('מעט שקילות — עדי מתריע, וזו ההחלטה כשאין סכנה רפואית', () => {
    const r = fullReview(hydrate({ ...base, weights: [{ date: day(15), kg: 92 }] }));
    expect(r.flags.some(f => f.from === 'עדי')).toBe(true);
    expect(r.decision).toContain('שקילה 3 פעמים');
  });

  it('שינה קצרה מ-Fitbit עולה כדגל', () => {
    const r = fullReview(hydrate({ ...base, sleep: [1, 2, 3, 4, 5].map(i => ({ date: day(i), minutes: 270 })) }));
    expect(r.flags.some(f => f.title.includes('שינה 4:30'))).toBe(true);
  });

  it('חלבון ומזון הכי קלורי מחושבים מהיומן עצמו', () => {
    const r = fullReview(hydrate({ ...base, food: [{ date: day(1), text: 'במבה 100 גרם, חזה עוף 200 גרם' }] }));
    expect(r.nutrition.top[0].name).toBe('במבה');
    expect(r.nutrition.protein).toBeGreaterThan(60);
  });
});

describe('היעדים של אבי גוברים על ברירת המחדל', () => {
  it('יעד חלבון נמוך יותר → אין דגל, והמדד ירוק', () => {
    const food = [day(3), day(2), day(1)].map(d => ({ date: d, text: 'חזה עוף 200 גרם' }));   // ~62 גר' חלבון ליום
    const strict = fullReview(hydrate({ ...base, food }));
    const mine = fullReview(hydrate({ ...base, food, goals: { protein: 60 } }));
    expect(strict.flags.some(f => f.title.includes('חלבון'))).toBe(true);
    expect(mine.flags.some(f => f.title.includes('חלבון'))).toBe(false);
    expect(mine.metrics.find(m => m.label === 'חלבון')!.target).toBe("60 גר'");
  });

  it('יעד אימונים נמוך → התדירות נחשבת תקינה', () => {
    const few = { ...base, workouts: [wk(day(18)), wk(day(12)), wk(day(6)), wk(day(2))] };   // 1.4 בשבוע
    expect(fullReview(hydrate(few)).flags.some(f => f.title.includes('תדירות'))).toBe(true);
    expect(fullReview(hydrate({ ...few, goals: { workouts: 1 } })).flags.some(f => f.title.includes('תדירות'))).toBe(false);
  });

  it('יעד מים אישי הוא הרף בפועל', () => {
    const r = fullReview(hydrate({ ...base, goals: { waterMl: 2750 } }));
    expect(r.metrics.find(m => m.label === 'מים')!.value).toContain('0/5');   // 2000 מ"ל < 2750
    expect(r.wins.some(w => w.includes('מים'))).toBe(false);
  });

  it('שקילות: היעד קובע מתי עדי מתריע', () => {
    const few = { ...base, weights: [{ date: day(5), kg: 90 }, { date: day(2), kg: 89.8 }] };
    expect(fullReview(hydrate(few)).flags.some(f => f.from === 'עדי')).toBe(true);
    expect(fullReview(hydrate({ ...few, goals: { weighIns: 1 } })).flags.some(f => f.from === 'עדי')).toBe(false);
  });
});

describe('יעילות שינה', () => {
  it('הרבה זמן ער במיטה = דגל נפרד, עם כמה דקות אפשר להחזיר', () => {
    const r = fullReview(hydrate({
      ...base,
      sleep: [1, 2, 3, 4, 5].map(i => ({ date: day(i), minutes: 280, inBed: 420 })),   // 67%
    }));
    const f = r.flags.find(x => x.title.includes('יעילות שינה'));
    expect(f).toMatchObject({ from: 'ד"ר ארז', sev: 'red' });
    expect(f!.body).toContain('140 דקות ער');
    expect(r.metrics.find(m => m.label === 'שינה')!.value).toContain('יעילות 67%');
  });
  it('שינה יעילה — אין דגל יעילות', () => {
    const r = fullReview(hydrate({ ...base, sleep: [1, 2, 3, 4].map(i => ({ date: day(i), minutes: 400, inBed: 420 })) }));
    expect(r.flags.some(x => x.title.includes('יעילות'))).toBe(false);
  });
});
