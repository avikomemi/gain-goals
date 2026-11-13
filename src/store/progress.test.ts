import { describe, expect, it } from 'vitest';
import { progressReport, progressSummary, dirOf, shape, Perf } from './progress';
import { DB, WorkoutLog } from './store';

const perf = (p: Partial<Perf>): Perf => {
  const reps = p.reps ?? [8, 8, 8];
  const weight = p.weight ?? 0;
  return {
    date: p.date ?? '2026-01-01',
    sets: p.sets ?? reps.length,
    reps,
    weight,
    topSet: p.topSet ?? Math.max(...reps),
    volume: p.volume ?? (weight ? reps.reduce((a, b) => a + b, 0) * weight : reps.reduce((a, b) => a + b, 0)),
    name: p.name ?? 'תרגיל',
  };
};

const wk = (date: string, ex: { id: string; name: string; reps: number[]; weight?: number; skipped?: boolean }[]): WorkoutLog => ({
  id: date, date, routine: 'A', loc: 'gym',
  exercises: ex.map(e => ({
    id: e.id, name: e.name, skipped: e.skipped,
    sets: e.reps.map(r => ({ reps: r, done: true, weight: e.weight })),
  })),
});
const db = (workouts: WorkoutLog[]): DB => ({ workouts } as unknown as DB);

describe('כיוון — שני מדדים, לא אחד', () => {
  it('פחות סטים אבל סט טוב יותר אינו ירידה', () => {
    // זו הטעות שנפלה בניתוח הידני: 24 חזרות מול 18 "הכריזו" ירידה, בעוד שהסט
    // הטוב עלה מ-8 ל-10. שני שינויים מנוגדים שסכום אחד מיזג ושיקר עליהם.
    const r = dirOf(perf({ reps: [8, 8, 8], weight: 50 }), perf({ reps: [10, 8], weight: 50 }));
    expect(r.dir).toBe('mixed');
    expect(r.dir).not.toBe('down');
    expect(r.why).toContain('הסט הטוב עלה');
  });

  it('הצורה המלאה מופיעה תמיד בהסבר', () => {
    const r = dirOf(perf({ reps: [8, 8, 8], weight: 50 }), perf({ reps: [10, 8], weight: 50 }));
    expect(r.why).toContain('3×8/8/8 @50');
    expect(r.why).toContain('2×10/8 @50');
  });

  it('משקל גובר על הכל', () => {
    expect(dirOf(perf({ reps: [8], weight: 16 }), perf({ reps: [8], weight: 17.5 })).dir).toBe('up');
    expect(dirOf(perf({ reps: [15], weight: 28 }), perf({ reps: [20], weight: 24 })).dir).toBe('down');
  });

  it('שני המדדים מסכימים → כיוון ברור', () => {
    expect(dirOf(perf({ reps: [10, 10, 8] }), perf({ reps: [10, 10, 10] })).dir).toBe('up');
    expect(dirOf(perf({ reps: [12, 12, 12] }), perf({ reps: [10, 10, 10] })).dir).toBe('down');
    expect(dirOf(perf({ reps: [8, 8, 8] }), perf({ reps: [8, 8, 8] })).dir).toBe('same');
  });

  it('שינוי גרסה אינו התקדמות ואינו נסיגה', () => {
    // KB Swing ← Dead-Stop Single-Arm Swing: 15 חזרות מול 6 אינן נסיגה,
    // הן תרגיל אחר לגמרי. השוואה ביניהם חסרת משמעות.
    const r = dirOf(perf({ reps: [15, 15, 15], weight: 24, name: 'KB Swing' }),
                    perf({ reps: [6, 6, 6], weight: 24, name: 'Dead-Stop Single-Arm Swing' }));
    expect(r.dir).toBe('variant');
    expect(r.why).toContain('גרסה אחרת');
  });

  it('משקל גוף — הנפח הוא החזרות עצמן', () => {
    expect(shape(perf({ reps: [15, 15, 15] }))).toBe('3×15/15/15');
    expect(shape(perf({ reps: [8, 8, 8], weight: 50 }))).toBe('3×8/8/8 @50');
  });
});

describe('דוח התקדמות', () => {
  const sets = (reps: number[], weight?: number) => ({ reps, weight });

  it('מדלג על תרגיל שבוצע פחות מהמינימום', () => {
    const d = db([
      wk('2026-01-01', [{ id: 'x', name: 'X', ...sets([8, 8]) }]),
      wk('2026-01-08', [{ id: 'x', name: 'X', ...sets([8, 8]) }]),
    ]);
    expect(progressReport(d, 3)).toEqual([]);
    expect(progressReport(d, 2)).toHaveLength(1);
  });

  it('מדלג על סטים שלא הושלמו ועל תרגיל שדולג', () => {
    const skipped: WorkoutLog = {
      id: 's', date: '2026-01-15', routine: 'A', loc: 'gym',
      exercises: [{ id: 'x', name: 'X', skipped: true, sets: [{ reps: 99, done: true }] }],
    };
    const d = db([
      wk('2026-01-01', [{ id: 'x', name: 'X', ...sets([8, 8, 8]) }]),
      wk('2026-01-08', [{ id: 'x', name: 'X', ...sets([8, 8, 8]) }]),
      skipped,
      wk('2026-01-22', [{ id: 'x', name: 'X', ...sets([8, 8, 8]) }]),
    ]);
    const r = progressReport(d, 3);
    expect(r).toHaveLength(1);
    expect(r[0].times).toBe(3);          // התרגיל שדולג לא נספר
    expect(r[0].dir).toBe('same');       // ו-99 החזרות שלו לא הגיעו לחישוב
  });

  it('דף הפיזיו אינו נמדד כהתקדמות', () => {
    const p: WorkoutLog = { id: 'p', date: '2026-01-10', routine: 'P', loc: 'home',
      exercises: [{ id: 'p-x', name: 'P', sets: [{ reps: 10, done: true }] }] };
    const d = db([p, p, p]);
    expect(progressReport(d, 1)).toEqual([]);
  });

  it('הנסיגות ראשונות ברשימה', () => {
    const d = db([
      wk('2026-01-01', [
        { id: 'down', name: 'יורד', ...sets([12, 12, 12], 20) },
        { id: 'up', name: 'עולה', ...sets([8, 8, 8], 16) },
        { id: 'flat', name: 'קבוע', ...sets([10, 10, 10]) },
      ]),
      wk('2026-01-08', [
        { id: 'down', name: 'יורד', ...sets([12, 12, 12], 20) },
        { id: 'up', name: 'עולה', ...sets([8, 8, 8], 16) },
        { id: 'flat', name: 'קבוע', ...sets([10, 10, 10]) },
      ]),
      wk('2026-01-15', [
        { id: 'down', name: 'יורד', ...sets([12, 11], 15) },
        { id: 'up', name: 'עולה', ...sets([8, 8, 8], 17.5) },
        { id: 'flat', name: 'קבוע', ...sets([10, 10, 10]) },
      ]),
    ]);
    const r = progressReport(d, 3);
    expect(r.map(x => x.dir)).toEqual(['down', 'same', 'up']);
    expect(progressSummary(d, 3)).toEqual({ total: 3, up: 1, down: 1, same: 1, mixed: 0, variant: 0 });
  });
});
