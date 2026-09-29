// "בוא נוודא שזה נשמר" — אבי, 25.9.26.
// אימון הפיזיו הוא הסוג הראשון עם מפתח שאינו A/B/C. הבדיקות כאן מוודאות שהוא
// שורד את המסלול המלא: שמירה → סריאליזציה לענן (JSON) → hydrate בחזרה → ספירה.
import { describe, expect, it } from 'vitest';
import { hydrate, DB, WorkoutLog } from './store';
import { nextRoutine } from './adi';
import { fullReview } from './review';
import { workoutKcal, workoutMinutes, effortOf } from './effort';
import { PHYSIO_BACK, routineByKey, routineLabel, PROGRAM, WARMUP_COMMON } from '../data/program';

const physio = (date: string): WorkoutLog => ({
  id: `p-${date}`, date, routine: 'P', loc: 'home', stoppedEarly: false, flexDone: true,
  exercises: PHYSIO_BACK.exercises.map(ex => ({
    id: ex.id, name: ex.name, rpe: 6,
    sets: Array.from({ length: ex.setsDefault }, () => ({ reps: ex.repsDefault, done: true })),
  })),
});

/** בדיוק מה שקורה מול Supabase: העמודה היא jsonb, כלומר JSON round-trip */
const roundTrip = (db: DB): DB => hydrate(JSON.parse(JSON.stringify(db)));

describe('אימון הפיזיו נשמר', () => {
  const base = hydrate({ startDate: '2026-09-01', weights: [{ date: '2026-09-20', kg: 90 }] });

  it('שורד סריאליזציה לענן וחזרה', () => {
    const saved = roundTrip({ ...base, workouts: [physio('2026-09-25')] });
    expect(saved.workouts).toHaveLength(1);
    expect(saved.workouts[0].routine).toBe('P');
    expect(saved.workouts[0].exercises).toHaveLength(8);
    expect(saved.workouts[0].exercises.every(e => e.sets.every(s => s.done))).toBe(true);
  });

  it('לא מאבד את שאר האימונים', () => {
    const abc: WorkoutLog = { id: 'a1', date: '2026-09-23', routine: 'A', loc: 'gym', exercises: [], stoppedEarly: false };
    const saved = roundTrip({ ...base, workouts: [abc, physio('2026-09-25')] });
    expect(saved.workouts.map(w => w.routine)).toEqual(['A', 'P']);
  });

  it('מזוהה בשם ולא כאות', () => {
    expect(routineLabel('P')).toBe('שיקום גב');
    expect(routineLabel('A')).toBe('אימון A');
    expect(routineByKey('P')).toBe(PHYSIO_BACK);
  });
});

describe('אימון הפיזיו נספר בסטטיסטיקה', () => {
  const db = roundTrip(hydrate({
    startDate: '2026-09-01',
    weights: [{ date: '2026-09-20', kg: 90 }],
    workouts: [physio('2026-09-24'), physio('2026-09-25')],
  }));

  it('נספר כאימון בסקירה', () => {
    const r = fullReview(db, 21);
    const m = r.metrics.find(x => x.label === 'אימונים');
    expect(m?.value.startsWith('2 ')).toBe(true);
  });

  it('מופיע בשורת העומס — דקות וקלוריות', () => {
    const load = fullReview(db, 21).metrics.find(x => x.label === 'עומס אימונים');
    expect(load).toBeTruthy();
    expect(load!.value).toMatch(/\d+ דקות/);
    expect(load!.value).toMatch(/\d+ קק"ל/);
  });

  it('תורם זמן וקלוריות אמיתיים, לא אפס', () => {
    const w = db.workouts[0];
    expect(workoutMinutes(db, w)).toBeGreaterThan(20);
    expect(workoutKcal(db, w)).toBeGreaterThan(100);
    expect(effortOf(db, db.workouts).workouts).toBe(2);
  });

  it('ועדיין לא נוגע בסבב ABC', () => {
    expect(nextRoutine(roundTrip({ ...db, workouts: [
      { id: 'a', date: '2026-09-23', routine: 'A', loc: 'gym', exercises: [], stoppedEarly: false },
      physio('2026-09-25'),
    ] }))).toBe('B');
  });
});

// התוכנית חייבת להישאר נאמנה למקור מ-Lovable. הפריטים האלה נשמטו פעם אחת
// והוחלפו — הבדיקות כאן הן כדי שזה לא יקרה שוב בלי ששמים לב.
describe('נאמנות למקור', () => {
  const A = PROGRAM.find(r => r.key === 'A')!;
  const B = PROGRAM.find(r => r.key === 'B')!;
  const names = (r: typeof A) => r.flexibility.map(f => f.name);

  it('בלוק הגב העליון של המקור נמצא באימון A', () => {
    expect(names(A)).toContain('Bended Half Kneeling Archers');
    expect(names(A)).toContain('Quadruped T-Spine Rotation');
    expect(names(A)).toContain('Prayer → Upward Dog');
  });

  it('הירכיים לא ירדו כשהגב העליון חזר', () => {
    expect(names(A)).toContain('90/90 Hip Switch');
    expect(names(A)).toContain('Couch Stretch');
  });

  it('החימום כולל את שני הפריטים שנשמטו', () => {
    expect(WARMUP_COMMON.some(w => w.includes('Jefferson'))).toBe(true);
    expect(WARMUP_COMMON.some(w => w.includes('Press + Squat'))).toBe(true);
  });

  it('ג׳פרסון קרל מסומן כראשון שיורד — הכלל של אבי', () => {
    const j = WARMUP_COMMON.find(w => w.includes('Jefferson'))!;
    expect(j).toMatch(/הראשון שיורד/);
  });

  it('מאסל-אפ נשאר — אבי ביקש במפורש', () => {
    expect(B.exercises.some(e => e.id === 'b-mu')).toBe(true);
  });

  it('Lever נמדד בשניות ולא בהצלחה/כישלון', () => {
    const lv = B.exercises.find(e => e.id === 'b-lever')!;
    expect(lv.timeBased).toBe(true);
    expect(lv.note).toMatch(/שניות/);
  });

  it('תרגילי הכתף החדשים נכנסו, וכלל האסימטריה איתם', () => {
    expect(names(B)).toContain('Wall Slides');
    expect(names(B)).toContain('Sleeper Stretch');
    expect(names(B).some(n => n.includes('שמאל'))).toBe(true);
  });
});
