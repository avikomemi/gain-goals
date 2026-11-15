// סולם השלבים. מה שנשבר כאן = אבי פותח תרגיל עם המספר של תרגיל אחר.
import { describe, expect, it } from 'vitest';
import { PROGRAM, PHYSIO_BACK, FLEX_SESSION, ExerciseDef, exStage, exName, exStruct, exNote, routineByKey, routineLabel, BODY_AREAS } from './program';
import { nextRoutine } from '../store/adi';
import { progressReport } from '../store/progress';
import { DB } from '../store/store';

const ALL: ExerciseDef[] = [...PROGRAM, PHYSIO_BACK].flatMap(r => r.exercises);
const byId = (id: string) => ALL.find(e => e.id === id)!;
const staged = ALL.filter(e => e.stages?.length);

describe('חוזה השלבים', () => {
  it('לכל תרגיל מרובה-שלבים יש לפחות שני שלבים', () => {
    expect(staged.length).toBeGreaterThan(0);
    for (const e of staged) expect(e.stages!.length).toBeGreaterThanOrEqual(2);
  });

  it('לכל שלב יש שער — בלעדיו הסולם הוא רשימת מילים', () => {
    // זה בדיוק מה שהיה ל-Lever: "סולם: תלייה ישרה → טאק → חצי-טאק" בהערה,
    // בלי מספר שקובע מתי עוברים, ולכן חמישה אימונים על אותן 2 שניות.
    for (const e of staged) for (const s of e.stages!) {
      expect(s.gate.trim().length, `${e.id} · ${s.name}`).toBeGreaterThan(5);
      expect(s.gate, `${e.id} · ${s.name}`).toMatch(/\d/);   // שער חייב מספר
      expect(s.name.trim().length).toBeGreaterThan(3);
      expect(s.setsDefault).toBeGreaterThan(0);
      expect(s.repsDefault).toBeGreaterThan(0);
    }
  });

  it('שמות השלבים ייחודיים בתוך התרגיל', () => {
    // progress.ts מסווג לפי שם. שני שלבים באותו שם היו משתווים זה לזה.
    for (const e of staged) {
      const names = e.stages!.map(s => s.name);
      expect(new Set(names).size, e.id).toBe(names.length);
    }
  });
});

describe('exStage — אינדקס מוגן', () => {
  const mu = byId('b-mu');
  it('ברירת המחדל היא השלב הראשון', () => {
    expect(exStage(mu, undefined)!.name).toBe(mu.stages![0].name);
  });
  it('אינדקס מחוץ לתחום נתפס לקצה ולא מפיל', () => {
    // גיבוי ישן או שלב שנמחק מהקוד — לא קורס, לא מחזיר undefined
    expect(exStage(mu, 99)!.name).toBe(mu.stages![mu.stages!.length - 1].name);
    expect(exStage(mu, -5)!.name).toBe(mu.stages![0].name);
  });
  it('תרגיל בלי שלבים מחזיר undefined', () => {
    expect(exStage(byId('b-dip'), 0)).toBeUndefined();
  });
});

describe('השלב גובר על הבסיס ועל גרסת המיקום', () => {
  const mu = byId('b-mu');
  const lever = byId('b-lever');

  it('השם בתצוגה וביומן הוא שם השלב', () => {
    expect(exName(mu, 'gym', 0)).toBe('Muscle-Up · 1 · אחיזה שקרית');
    expect(exName(mu, 'home', 0)).toBe('Muscle-Up · 1 · אחיזה שקרית');   // גם כשיש gym/home
  });

  it('מבנה הסטים נלקח מהשלב', () => {
    const s0 = exStruct(mu, 'gym', 0);
    expect(s0.timeBased).toBe(true);           // תלייה — שניות
    expect(s0.setsDefault).toBe(3);
    const s1 = exStruct(mu, 'gym', 1);
    expect(s1.timeBased).toBeFalsy();          // משיכה גבוהה — חזרות
    expect(s1.target).toBe('3×3-5');
  });

  it("timeBased של השלב גובר גם כשהבסיס הוא true", () => {
    // b-lever הוא timeBased ברמת התרגיל. שלב שהיה מגדיר חזרות חייב לנצח אותו,
    // אחרת 'שניות' היה נדבק לשלב שנמדד בחזרות.
    expect(lever.timeBased).toBe(true);
    for (const [i] of lever.stages!.entries()) expect(exStruct(lever, 'gym', i).timeBased).toBe(true);
    expect(exStruct({ ...lever, stages: [{ ...lever.stages![0], timeBased: false }] }, 'gym', 0).timeBased).toBe(false);
  });

  it('הערת השלב מחליפה את הערת הבסיס', () => {
    // הערת הבסיס מתארת תרגיל אחר — בשלב 1 היא מטעה.
    expect(exNote(lever, 'gym', 0)).toBe(lever.stages![0].note);
    expect(exNote(lever, 'gym', 0)).not.toContain('חצי-טאק');
  });

  it('תרגיל בלי שלבים לא השתנה', () => {
    const dip = byId('b-dip');
    expect(exName(dip, 'gym', 3)).toBe('Dips');
    expect(exStruct(dip, 'gym', 3).target).toBe(dip.target);
  });
});

describe('השלב הראשון מתאים למי שלא מצליח את התרגיל', () => {
  it('Lever מתחיל על הרצפה, בלי עומס על הכתף', () => {
    // 2 שניות בטאק אינן אחזקה. שלב 1 הוא אותה צורת ליבה ל-30 שניות,
    // ועם גב תחתון רגיש — בלי תלייה ובלי יישור של עמוד השדרה.
    expect(byId('b-lever').stages![0].name).toContain('Hollow Body');
    expect(byId('b-lever').stages![0].timeBased).toBe(true);
  });
  it('Muscle-Up מתחיל באחיזה, לא במשיכה', () => {
    expect(byId('b-mu').stages![0].name).toContain('אחיזה');
    expect(byId('b-mu').stages![0].timeBased).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// סקשן הגמישות. 'F' הוא המפתח הרביעי שאינו חלק מסבב ABC, ובכל נקודה שבה
// הסבב או הכיול נוגעים במפתח — הוא חייב להישאר מחוץ להם.
// ---------------------------------------------------------------------------
describe('סקשן גמישות', () => {
  it('נבחר ידנית ואינו חלק מסבב ABC', () => {
    expect(FLEX_SESSION.key).toBe('F');
    expect(PROGRAM.map(r => r.key)).toEqual(['A', 'B', 'C']);
    expect(routineByKey('F')).toBe(FLEX_SESSION);
    expect(routineLabel('F')).toBe('גמישות');
  });

  it('אימון גמישות אינו מקדם ואינו מאפס את הסבב', () => {
    // בלי זה כל יום גמישות היה מחזיר את הסבב ל-A, כמו שקרה פעם עם הפיזיו.
    const wk = (routine: string, date: string) => ({ id: date, date, routine, loc: 'home', exercises: [] });
    const db = { workouts: [wk('A', '2026-01-01'), wk('F', '2026-01-02'), wk('F', '2026-01-03')] } as unknown as DB;
    expect(nextRoutine(db)).toBe('B');
  });

  it('לכל תרגיל יש מזהה ייחודי בכל התוכנית', () => {
    const ids = [...PROGRAM, PHYSIO_BACK, FLEX_SESSION].flatMap(r => r.exercises).map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('אין תרגיל עם משקל בסקשן הגמישות', () => {
    for (const e of FLEX_SESSION.exercises) expect(e.weighted, e.id).toBeFalsy();
  });

  it('לכל תרגיל יש איך-מקשים ואזור גוף', () => {
    // 'קל מדי' בגמישות לא נפתר במשקל אלא בזמן ובטווח — harder הוא חובה כאן.
    for (const e of FLEX_SESSION.exercises) {
      expect(e.harder, e.id).toBeTruthy();
      expect(e.area, e.id).toBeTruthy();
      expect(BODY_AREAS, e.id).toContain(e.area);
      expect(e.tips?.length, e.id).toBeGreaterThan(0);
    }
  });

  it('האחזקות נמדדות בשניות, והסקוואט הוא המדד מהמבחן', () => {
    const squat = FLEX_SESSION.exercises.find(e => e.id === 'f-squat')!;
    expect(squat.timeBased).toBe(true);
    expect(exStruct(squat, 'home').repsDefault).toBe(30);
  });

  it('שמאל מקבלת סט נוסף — שלושה סטים, לא שניים', () => {
    // כתף שמאל גרועה ב-5 ס"מ מימין. זה לא טיפ, זה מספר הסטים.
    const sleeper = FLEX_SESSION.exercises.find(e => e.id === 'f-sleeper')!;
    expect(sleeper.setsDefault).toBe(3);
    expect(sleeper.area).toBe('כתף שמאל');
  });

  it('הסקשן נכנס למדידת ההתקדמות, בניגוד לדף הפיזיו', () => {
    // אחזקה שמתארכת היא התקדמות לכל דבר. הפיזיו מוחרג כי הוא שיקום.
    const mk = (routine: string, date: string, sec: number) => ({
      id: date + routine, date, routine, loc: 'home',
      exercises: [{ id: 'f-squat', name: 'Deep Squat Hold', sets: [{ reps: sec, done: true }] }],
    });
    const db = { workouts: [mk('F', '2026-01-01', 15), mk('F', '2026-01-08', 20), mk('F', '2026-01-15', 30)] } as unknown as DB;
    const r = progressReport(db, 3);
    expect(r).toHaveLength(1);
    expect(r[0].dir).toBe('up');

    const p = { workouts: [mk('P', '2026-01-01', 15), mk('P', '2026-01-08', 20), mk('P', '2026-01-15', 30)] } as unknown as DB;
    expect(progressReport(p, 3)).toEqual([]);
  });
});

describe('תוכן השלב מחליף את תוכן התרגיל', () => {
  it('לכל שלב יש טיפים משלו', () => {
    // טיפ של התרגיל המלא מטעה בשלב מוקדם: "מרפק שמתכופף זה כבר תרגיל אחר"
    // על Hollow Body, "ירידה איטית במעבר" על תלייה סטטית.
    for (const e of staged) for (const s of e.stages!) {
      expect(s.tips?.length, `${e.id} · ${s.name}`).toBeGreaterThan(0);
      expect(s.note, `${e.id} · ${s.name}`).toBeTruthy();
    }
  });

  it('לכל שלב יש לפחות טיפ אחד שלא מגיע מהתרגיל המלא', () => {
    // טיפ מהבסיס שנכון גם לשלב מותר לחזור ("ידיים ישרות ונעולות" נכון גם
    // בתלייה פעילה). מה שאסור הוא שלב שכל התוכן שלו מתאר תרגיל אחר.
    for (const e of staged) {
      const base = new Set(e.tips || []);
      for (const s of e.stages!) {
        expect(s.tips!.some(t => !base.has(t)), `${e.id} · ${s.name}`).toBe(true);
      }
    }
  });
});
