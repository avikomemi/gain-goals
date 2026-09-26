// אבי, 26.9.26: "אם אני עובר את מספר הקלוריות היומי, או אם אני מתאמן מעט מדי,
// אני מצפה שמי שרלוונטי מהצוות ייתן אינדיקציה. אחרת מה הטעם במאמנים ובסוכנים
// אם הם לא עושים כלום?" — הבדיקות כאן הן החוזה הזה. נתונים סינתטיים בלבד.
import { describe, expect, it, vi, afterEach } from 'vitest';
import { hydrate } from './store';
import { alerts, dayKcal, weekPace } from './adi';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (back: number) => iso(new Date(Date.now() - back * 864e5));
const base = (over = {}) => hydrate({ startDate: day(40), ...over });
const from = (db: ReturnType<typeof hydrate>, who: string) => alerts(db).filter(a => a.from === who);

afterEach(() => vi.useRealTimers());
/** קובע את היום בשבוע כדי שבדיקות התדירות לא יהיו תלויות במתי הן רצות */
const freezeWeekday = (dow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7));
  d.setHours(12, 0, 0, 0);
  vi.useFakeTimers({ now: d, toFake: ['Date'] });
  return d;
};

describe('הילה מתריעה על קלוריות', () => {
  it('סופרת את היום מתוך יומן האוכל', () => {
    const db = base({ food: [{ date: day(0), text: 'חזה עוף 200 גרם' }] });
    expect(dayKcal(db, day(0))).toBeGreaterThan(200);
    expect(dayKcal(db, day(1))).toBeNull();      // יום בלי רישום הוא null, לא 0
  });

  it('מתריעה כשעברת את היעד היומי', () => {
    // יעד ברירת המחדל 1900 — 1200 גרם חזה עוף עוברים אותו בבירור
    const db = base({ food: [{ date: day(0), text: 'חזה עוף 1200 גרם' }] });
    const a = from(db, 'הילה');
    expect(a.length).toBeGreaterThan(0);
    expect(a[0].sev).toBe('warn');
    expect(a[0].text).toMatch(/מעל היעד/);
  });

  it('שותקת כשאתה בתוך היעד', () => {
    expect(from(base({ food: [{ date: day(0), text: 'חזה עוף 200 גרם' }] }), 'הילה')).toHaveLength(0);
  });

  it('שותקת כשאין רישום בכלל — לא מניחה אפס', () => {
    expect(from(base(), 'הילה')).toHaveLength(0);
  });

  it('מתריעה על ממוצע שבועי חורג, אחרי 3 ימים רשומים', () => {
    const food = [1, 2, 3].map(i => ({ date: day(i), text: 'חזה עוף 1400 גרם' }));   // ~2310 ליום
    const a = from(base({ food }), 'הילה');
    expect(a.some(x => x.text.includes('ממוצע'))).toBe(true);
  });

  it('לא מתריעה על ממוצע עם פחות מ-3 ימים', () => {
    const a = from(base({ food: [{ date: day(1), text: 'חזה עוף 1400 גרם' }] }), 'הילה');
    expect(a.some(x => x.text.includes('ממוצע'))).toBe(false);
  });

  it('היעד נלקח מהיעדים של אבי, לא מקבוע בקוד', () => {
    const food = [{ date: day(0), text: 'חזה עוף 800 גרם' }];   // ~1320 קק"ל
    expect(from(base({ food }), 'הילה')).toHaveLength(0);               // מתחת ל-1900
    expect(from(base({ food, goals: { kcal: 1200 } }), 'הילה').length).toBeGreaterThan(0);
  });
});

describe('עמית מתריע על תדירות אימונים', () => {
  const wkDay = (dow: number) => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() - dow + 7) % 7)); return iso(d); };

  it('מחשב כמה נשאר לעשות מול כמה ימים נשארו', () => {
    freezeWeekday(4);   // חמישי → נשארו יומיים (שישי, שבת)
    const p = weekPace(base());
    expect(p.goal).toBe(3);
    expect(p.daysLeft).toBe(2);
    expect(p.needed).toBe(3);
  });

  it('מתריע כשהיעד כבר לא ייסגר', () => {
    freezeWeekday(5);   // שישי → נשאר יום אחד, צריך 3
    const a = from(base(), 'עמית');
    expect(a.some(x => x.sev === 'warn' && /לא ייסגר/.test(x.text))).toBe(true);
  });

  it('שותק כשאתה בקצב', () => {
    freezeWeekday(4);
    const workouts = [0, 1, 2].map(i => ({ date: wkDay(i), routine: 'A', loc: 'gym', exercises: [], id: `w${i}` }));
    expect(from(base({ workouts }), 'עמית').some(x => /השבוע/.test(x.text))).toBe(false);
  });

  it('לא שופט בשבוע הראשון', () => {
    freezeWeekday(5);
    expect(from(hydrate({ startDate: day(2) }), 'עמית')).toHaveLength(0);
  });

  it('סופר גם אימון שיקום — כל אימון נחשב', () => {
    freezeWeekday(5);
    const workouts = [0, 1, 2].map(i => ({ date: wkDay(i), routine: i === 2 ? 'P' : 'A', loc: 'home', exercises: [], id: `w${i}` }));
    expect(weekPace(base({ workouts })).done).toBe(3);
    expect(from(base({ workouts }), 'עמית').some(x => /לא ייסגר/.test(x.text))).toBe(false);
  });
});

describe('אף בעל תחום לא נדחק החוצה', () => {
  it('קול אחד לכל אדם — ולא יותר', () => {
    const db = base({ food: [0, 1, 2, 3].map(i => ({ date: day(i), text: 'חזה עוף 1400 גרם' })) });
    const owners = alerts(db).map(a => a.from);
    expect(new Set(owners).size).toBe(owners.length);
  });

  it('הילה נשמעת גם כששאר הצוות מדבר', () => {
    // בלי מים (ד"ר ארז), בלי אימונים (עמית) — ועדיין חריגה קלורית
    const db = base({ food: [{ date: day(0), text: 'חזה עוף 1400 גרם' }] });
    expect(alerts(db).some(a => a.from === 'הילה')).toBe(true);
  });
});

describe('סוף השבוע', () => {
  it('בשבת מסכם במקום לדחוף — "נשארו 0 ימים" זה לא מסר', () => {
    freezeWeekday(6);
    const a = from(base(), 'עמית');
    expect(a).toHaveLength(1);
    expect(a[0].sev).toBe('info');
    expect(a[0].text).toMatch(/השבוע נסגר/);
    expect(a[0].text).not.toMatch(/0 ימים/);
  });

  it('ביום אחד שנשאר — לשון יחיד', () => {
    freezeWeekday(5);
    expect(from(base(), 'עמית')[0].text).toMatch(/נשאר יום אחד/);
  });
});
