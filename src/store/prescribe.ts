// מה לעשות באימון הבא, לכל תרגיל, על סמך מה שבוצע בפועל.
//
// --- למה הקובץ הזה קיים ---
// האפליקציה ידעה להציג כיוון ולא ידעה להורות. direction() חושב ונרנדר כתווית,
// ו-startLive העתיק את הסטים של הפעם הקודמת מילה במילה — כלומר המערכת הייתה
// בנויה כך שלא תתקדם לעולם. ואכן: 13 תרגילים עמדו על אותו מספר חודשיים וחצי.
//
// השכבה שהייתה קיימת נשענה על RPE, שמדווח ב-9% מהתרגילים, ועל התנאי
// (rpe ?? 10) <= 8 — כלומר ענף ה"העלה" לא יכול היה לרוץ בלי דיווח. כאן הבסיס
// הוא סטים וחזרות שהושלמו, שנרשמים ב-100% מהמקרים. RPE נכנס רק כדי *לבלום*,
// לעולם לא כתנאי להתקדמות: מה שחסר לא יעצור, אבל מה שדווח גבוה כן.
//
// --- הווטו ---
// "וטו" הופיע בקוד פעמיים, בשתיהן כמחרוזת תיאור ב-Team.tsx. כאן הוא מנגנון:
// כלל בטיחות שמבטל המלצה להקשות, עם שם של מי שבלם ולמה. ההמלצה לא נעלמת —
// היא מוצגת עם הווטו לידה, כדי שאבי יראה גם מה היה קורה וגם מי עצר אותו.

import { DB, WorkoutLog } from './store';
import { RoutineKey, ExerciseDef, routineByKey, exStage, exStruct, exName, Loc } from '../data/program';
import { progressReport, ExProgress } from './progress';
import { exEffort, ExEffort, fades } from './rpe';

export type Action = 'base' | 'gate' | 'up' | 'hold' | 'rebuild' | 'ceiling';

export interface Prescription {
  id: string;
  name: string;
  action: Action;
  text: string;            // ההוראה עצמה
  why: string;             // הראיה מהנתונים
  by: string;              // מי מהצוות אחראי להוראה
  veto?: string;           // מי בלם ולמה. ההוראה נשארת מוצגת לצידו
}

/** תרגילים שבהם אסור להמליץ על העלאת משקל, ולמה. ראו DEVIATIONS ב-source.ts. */
const WEIGHT_CAP: Record<string, string> = {
  'c-box': 'מאיה: זה התרגיל היחיד בתוכנית שטוען את עמוד השדרה — במקור הוא לג-פרס עם גב נתמך. המשקל מוקפא על 50, מתקדמים בעצירה ובירידה.',
};

const PAIN_DAYS = 21;      // חלון דיווחי כאב שנחשב "טרי"
const STUCK_AT = 2;        // כמה פעמים באותו מספר לפני שמורים להעלות

/** טווח החזרות מתוך מחרוזת היעד. מחזיר null כשהיעד אינו מספרי (שניות/מקס). */
export function repRange(target: string): { min: number; max: number } | null {
  const m = target.match(/×\s*(\d+)(?:\s*-\s*(\d+))?/);
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const max = m[2] ? parseInt(m[2], 10) : min;
  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
}

/** דיווח כאב טרי שנוגע לתרגיל הזה — לפי שם התרגיל או לפי אזור הגוף שלו. */
function freshPain(db: DB, ex: ExerciseDef, name: string, today: string): string | null {
  const from = new Date(new Date(today).getTime() - PAIN_DAYS * 864e5).toISOString().slice(0, 10);
  const hit = (db.injuries || [])
    .filter(i => i.date >= from && i.level >= 3)
    .find(i => i.exercise === name || (!!ex.area && i.area === ex.area));
  if (!hit) return null;
  return `מאיה: דווח כאב ${hit.level}/10 ב${hit.area} (${hit.date.slice(5).split('-').reverse().join('.')}). לא מעלים כלום עד שזה שקט.`;
}

/** המאמץ האחרון שדווח בתרגיל. פר-סט כשיש, ואחרת ה-rpe הישן שברמת התרגיל. */
function lastEffort(db: DB, exId: string): ExEffort | null {
  for (const w of [...(db.workouts || [])].sort((a, b) => b.date.localeCompare(a.date))) {
    const e = w.exercises.find(x => x.id === exId && !x.skipped);
    const f = e && exEffort(e);
    if (f) return f;
  }
  return null;
}

/** כמה פעמים רצופות לאחרונה הצורה הייתה זהה — "תקוע" נמדד מהסוף, לא מהקצוות. */
function sameStreak(db: DB, exId: string): number {
  const shapes: string[] = [];
  for (const w of [...(db.workouts || [])].sort((a, b) => b.date.localeCompare(a.date))) {
    const e = w.exercises.find(x => x.id === exId && !x.skipped);
    if (!e) continue;
    const done = e.sets.filter(s => s.done);
    if (!done.length) continue;
    shapes.push(`${done.length}×${done.map(s => s.reps).join('/')}@${Math.max(...done.map(s => s.weight || 0))}`);
  }
  let n = 0;
  while (n + 1 < shapes.length && shapes[n + 1] === shapes[0]) n++;
  return n;
}

/** ההוראה לתרגיל אחד. יוצא החוצה לבדיקות, ונקרא מ-prescribe. */
export function prescribeOne(db: DB, ex: ExerciseDef, loc: Loc, pr: ExProgress | undefined, today: string): Prescription {
  const stage = db.stageByEx?.[ex.id];
  const name = exName(ex, loc, stage);
  const st = exStruct(ex, loc, stage);
  const base = { id: ex.id, name };
  const pain = freshPain(db, ex, name, today);
  const eff = lastEffort(db, ex.id);
  // RPE בולם בלבד. חסר אינו עוצר — אחרת ענף ההעלאה לא היה רץ לעולם.
  // הבלימה היא לפי הסט הקשה ביותר ולא לפי ממוצע: סט אחד שהגיע לכשל הוא
  // הסיבה לא להעלות, גם אם השניים שלפניו היו קלים.
  // דעיכה (פתיחה קלה, סיום קשה) אינה עומס גבוה אלא עייפות מצטברת, ולכן
  // היא מנוסחת אחרת — מנוחה ארוכה יותר, לא פחות משקל.
  const hardVeto = pain
    ?? (eff && eff.peak >= 9
      ? (fades(eff)
        ? `מאיה: פתחת ב-${eff.opener} וסיימת ב-${eff.peak}. זו עייפות מצטברת ולא עומס גבוה מדי — האריך מנוחה לפני שמעלים.`
        : `מאיה: המאמץ בסט הקשה היה ${eff.peak}. מתייצבים לפני שמעלים.`)
      : undefined);

  if (!pr || pr.times < 2) {
    return { ...base, action: 'base', by: 'עמית',
      text: 'פעם ראשונה או שנייה — קובעים בסיס. מה שיצא, יצא.',
      why: pr ? `בוצע ${pr.times} פעמים` : 'אין היסטוריה' };
  }

  // שלב בסולם: ההוראה היא השער, תמיד.
  const sg = exStage(ex, stage);
  if (sg) {
    return { ...base, action: 'gate', by: 'עמית',
      text: `${sg.target}. עוברים לשלב הבא כש${sg.gate.startsWith('3') ? ': ' : ' '}${sg.gate}`,
      why: `אחרון: ${pr.last.sets}×${pr.last.reps.join('/')}`,
      veto: hardVeto };
  }

  if (pr.dir === 'down') {
    const lost = +(pr.first.weight - pr.last.weight).toFixed(2);
    return { ...base, action: 'rebuild', by: 'עמית',
      text: lost > 0
        ? `נשארים על ${pr.last.weight} ק"ג ובונים חזרות עד שלושה סטים מלאים. לא חוזרים ל-${pr.first.weight} לפני זה.`
        : 'חוזרים למספר שעמדת בו, ומשם לאט.',
      why: pr.why, veto: hardVeto };
  }

  if (pr.dir === 'up') {
    return { ...base, action: 'hold', by: 'עמית',
      text: 'ממשיכים באותו קו — זה עובד.', why: pr.why, veto: hardVeto };
  }

  // 'same' / 'mixed' / 'variant' — כאן מחליטים איזה משתנה להזיז, ובאיזה סדר.
  const streak = sameStreak(db, ex.id);
  if (pr.dir !== 'same' || streak < STUCK_AT) {
    return { ...base, action: 'hold', by: 'עמית',
      text: 'עוד פעם אחת באותו מספר, ואז מעלים.', why: pr.why, veto: hardVeto };
  }

  const range = repRange(st.target);
  const atTop = range && pr.last.topSet >= range.max;
  const why = `${streak + 1} פעמים על ${pr.last.sets}×${pr.last.reps.join('/')}${pr.last.weight ? ` @${pr.last.weight}` : ''}`;

  // סדר המשתנים: פרמטר (גובה) → חזרות בתוך הטווח → טמפו → משקל.
  // הגובה ראשון כי הוא המינון שהמאמן כתב, והמשקל אחרון כי הוא היקר ביותר.
  // raise: 0 = הגדרה ולא משתנה התקדמות (גובה הקופסה בבוקס סקוואט).
  const prm = ex.params?.find(x => (x.raise ?? 1) !== 0);
  if (prm) {
    const dir = prm.raise ?? 1;
    const step = (prm.step ?? 1) * dir;
    const cur = (db.workouts || []).flatMap(w => w.exercises).filter(e => e.id === ex.id).pop()?.params?.[prm.key] ?? prm.def ?? 0;
    return { ...base, action: 'up', by: 'עמית',
      text: `${prm.label}: ${cur} → ${cur + step}${prm.unit ? ' ' + prm.unit : ''}. ${ex.harder ?? ''}`.trim(),
      why, veto: hardVeto };
  }
  if (range && !atTop) {
    return { ...base, action: 'up', by: 'עמית',
      text: `להוסיף חזרה: ${pr.last.topSet} → ${pr.last.topSet + 1} בסט הטוב. היעד הוא ${range.max}.`,
      why, veto: hardVeto };
  }
  if (st.tempoSec) {
    return { ...base, action: 'up', by: 'עמית',
      text: `${st.tempoSec} → ${st.tempoSec + 1} שניות לירידה. ${ex.harder ?? ''}`.trim(), why, veto: hardVeto };
  }
  if (st.weighted) {
    const cap = WEIGHT_CAP[ex.id];
    return { ...base, action: cap ? 'ceiling' : 'up', by: 'עמית',
      text: cap
        ? (ex.harder ?? 'מתקדמים בטמפו ובעצירה, לא במשקל.')
        : `להעלות משקל: ${pr.last.weight} → ${+(pr.last.weight + 2.5).toFixed(1)} ק"ג, ולהוריד חזרה אם צריך.`,
      why, veto: cap ?? hardVeto };
  }
  // בתקרת היעד הכתוב, ואין משתנה אחר. זו תקרת ההוראה ולא תקרת אבי.
  return { ...base, action: 'ceiling', by: 'עמית',
    text: ex.harder ?? 'היעד הכתוב מוצה — צריך גרסה קשה יותר של התרגיל.',
    why: `${why}, והיעד הוא ${st.target}`, veto: hardVeto };
}

/** ההוראות לאימון שלם, בסדר התרגילים. */
export function prescribe(db: DB, routine: RoutineKey, loc: Loc = 'gym', today = new Date().toISOString().slice(0, 10)): Prescription[] {
  const r = routineByKey(routine);
  if (!r) return [];
  const byId = new Map(progressReport(db, 1).map(p => [p.id, p]));
  return r.exercises.map(ex => prescribeOne(db, ex, loc, byId.get(ex.id), today));
}

/** כמה מההוראות הן בעצם "תזיז משהו" — לשורה בסקירה. */
export function prescribeSummary(db: DB, loc: Loc = 'gym'): { up: number; ceiling: number; vetoed: number } {
  const all = (['A', 'B', 'C'] as RoutineKey[]).flatMap(k => prescribe(db, k, loc));
  return {
    up: all.filter(p => p.action === 'up' && !p.veto).length,
    ceiling: all.filter(p => p.action === 'ceiling').length,
    vetoed: all.filter(p => !!p.veto).length,
  };
}

export type { WorkoutLog };
