// ---------------------------------------------------------------------------
// נאמנות למקור. הבדיקות הקודמות ננעלו על בלוק הגמישות של A ועל החימום בלבד,
// ולכן שלוש סטיות גדולות שרדו אודיט שלם: קפיצת קופסה שהוחלפה בתרגיל שאינו
// קפיצה, Drop Jump שנמחק, ולג-פרס שהפך לבוקס סקוואט עם 50 ק"ג.
//
// הכלל כאן אינו "התוכנית זהה למקור" — היא לא, ובצדק. הכלל הוא שכל פער מוצהר:
// מה השתנה, מי החליט, מתי, ולמה. פער שלא מוצהר מפיל. פער מוצהר שלא הוכרע
// נשאר 'open' וממשיך להופיע — הבדיקה לא מוחקת אותו ולא מכשירה אותו.
// ---------------------------------------------------------------------------
import { describe, expect, it } from 'vitest';
import { PROGRAM, WARMUP_COMMON, RoutineKey, ExerciseDef } from './program';
import { SOURCE, SOURCE_WARMUP, DEVIATIONS, openDeviations, Deviation } from './source';

const appEx = (k: RoutineKey): ExerciseDef[] => PROGRAM.find(r => r.key === k)!.exercises;
const dev = (f: (d: Deviation) => boolean) => DEVIATIONS.filter(f);

describe('כל פער מול המקור מוצהר', () => {
  for (const r of SOURCE) {
    describe(`Routine ${r.n} · ${r.title} → אימון ${r.maps}`, () => {
      it('כל תרגיל במקור מיושם, או מוצהר כהסרה', () => {
        const implemented = new Set(appEx(r.maps).map(e => e.source).filter(Boolean));
        for (const se of r.exercises) {
          if (implemented.has(se.name)) continue;
          const d = dev(x => x.kind === 'removal' && x.source === se.name && x.routine === r.maps);
          expect(d.length, `"${se.name}" לא מיושם ולא מוצהר כהסרה`).toBe(1);
        }
      });

      it('כל תרגיל באפליקציה מקושר למקור, או מוצהר כתוספת', () => {
        const srcNames = new Set(r.exercises.map(e => e.name));
        for (const e of appEx(r.maps)) {
          if (e.source) {
            expect(srcNames.has(e.source), `${e.id}: source "${e.source}" לא קיים ב-Routine ${r.n}`).toBe(true);
            continue;
          }
          const d = dev(x => x.kind === 'addition' && x.app === e.id && x.routine === r.maps);
          expect(d.length, `${e.id} אינו במקור ואינו מוצהר כתוספת`).toBe(1);
        }
      });

      it('אין שני תרגילים שמממשים את אותו פריט במקור', () => {
        const used = appEx(r.maps).map(e => e.source).filter(Boolean);
        expect(new Set(used).size).toBe(used.length);
      });
    });
  }

  it('כל פריט בחימום המקורי קיים, או מוצהר כהסרה', () => {
    for (const w of SOURCE_WARMUP) {
      if (WARMUP_COMMON.some(a => w.match.test(a))) continue;
      const d = dev(x => x.kind === 'removal' && x.routine === 'warmup' && x.source === w.text);
      expect(d.length, `פריט חימום "${w.text}" לא נמצא ולא מוצהר כהסרה`).toBe(1);
    }
  });

  it('כל פריט בחימום האפליקציה מגיע מהמקור, או מוצהר כתוספת', () => {
    for (const a of WARMUP_COMMON) {
      if (SOURCE_WARMUP.some(w => w.match.test(a))) continue;
      const d = dev(x => x.kind === 'addition' && x.routine === 'warmup' && a.startsWith(x.app!));
      expect(d.length, `פריט חימום "${a}" אינו במקור ואינו מוצהר כתוספת`).toBe(1);
    }
  });
});

describe('רשומת הפער שלמה', () => {
  it('לכל פער יש הסבר, ולכל פער מאושר יש תאריך', () => {
    for (const d of DEVIATIONS) {
      const id = `${d.routine}/${d.source ?? d.app}`;
      expect(d.why.trim().length, id).toBeGreaterThan(20);
      expect(d.what.trim().length, id).toBeGreaterThan(5);
      if (d.status === 'approved') {
        expect(d.decided, `${id}: מאושר בלי תאריך`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        expect(d.decided, `${id}: 'open' עם תאריך הכרעה`).toBeUndefined();
      }
    }
  });

  it('לכל פער יש את השדות שהסוג שלו מחייב', () => {
    for (const d of DEVIATIONS) {
      if (d.kind === 'addition') expect(d.app, JSON.stringify(d)).toBeTruthy();
      else expect(d.source, JSON.stringify(d)).toBeTruthy();
      if (d.kind === 'removal') expect(d.app).toBeUndefined();
    }
  });

  it('אין שתי רשומות מאותו סוג על אותו פריט', () => {
    // פריט אחד יכול לשאת שתי רשומות מסוגים שונים: החלפת התרגיל הוכרעה,
    // ושאלת המינון שבתוכו עדיין פתוחה. אלה שתי החלטות ולא כפילות.
    const keys = DEVIATIONS.map(d => `${d.kind}|${d.routine}|${d.source ?? ''}|${d.app ?? ''}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('הפערים הפתוחים נשארים גלויים', () => {
  it('openDeviations מחזיר בדיוק את מה שלא הוכרע', () => {
    const open = openDeviations();
    expect(open.length).toBeGreaterThan(0);
    expect(open.every(d => d.status === 'open')).toBe(true);
  });

  it('מיקום המשקל בבוקס סקוואט עדיין פתוח ומסומן', () => {
    // זהות התרגיל הוכרעה (אבי לא רוצה מכונה), אבל 50 ק"ג על הגב הם התנועה
    // היחידה בכל שלוש השגרות שמפרה את עיקרון 1 — אין עומס צירי על העמוד.
    const sub = DEVIATIONS.find(d => d.source === 'Leg Press' && d.kind === 'substitution')!;
    expect(sub.status).toBe('approved');
    const load = DEVIATIONS.find(d => d.source === 'Leg Press' && d.kind === 'dose')!;
    expect(load.status).toBe('open');
    expect(load.why).toContain('צירי');
  });

  it('שני פריטי החימום שנשמטו חזרו, ואין עליהם רשומת הסרה', () => {
    expect(DEVIATIONS.some(d => d.routine === 'warmup' && d.kind === 'removal')).toBe(false);
  });
});
