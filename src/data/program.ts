// FitLog IL — תוכנית ABC v2 (אושרה ע"י אבי)
// כל תרגיל: גרסת חדר כושר + גרסת בית שקולות. בטיחות: גב (בלט+ליסתזיס), ברכיים (אין מיניסקוס ימין, קרע שמאל), גאוט.

export type Loc = 'home' | 'gym';

export interface ExerciseDef {
  id: string;
  name: string;            // base Hebrew name
  target: string;          // sets x reps text
  setsDefault: number;
  repsDefault: number;
  weighted?: boolean;      // show weight field
  timeBased?: boolean;
  gym?: { name?: string; note?: string };
  home?: { name?: string; note?: string };
  note?: string;           // shared note
  area?: string;           // body area for pain correlation
}

export interface RoutineDef {
  key: 'A' | 'B' | 'C';
  name: string;
  icon: string;
  focus: string;
  flexTitle: string;
  warmup: string[];
  exercises: ExerciseDef[];
  flexibility: { name: string; dose: string }[];
  finisher?: { name: string; dose: string; note: string };
}

export const WARMUP_COMMON = [
  'קרדיו קל 2-3 ד\' (חבל / ריצה / אגרוף צללים)',
  'לאנג\' + סיבוב · 10 מטר',
  'חתול/פרה עדין ×10',
  'Bird Dog ×8 לכל צד (גב ניטרלי)',
  'גשר ישבן ×12',
  'דיסלוקציות כתף ×10',
];

export const PROGRAM: RoutineDef[] = [
  {
    key: 'A',
    name: 'כוח ונפיצות',
    icon: '🏋️',
    focus: 'שימור שריר בגירעון + מערכת עצבים צעירה. הפליאומטריה מיד אחרי החימום — כשהגוף חם!',
    flexTitle: 'גמישות A · ירכיים',
    warmup: WARMUP_COMMON,
    exercises: [
      { id: 'a-land', name: 'תרגול נחיתה רגל אחת', target: '4×5', setsDefault: 4, repsDefault: 5, area: 'ברך', note: 'נחיתה רכה ושקטה — מוקדם באימון, כשהגוף חם' },
      { id: 'a-plyo', name: 'עליית מדרגה נפיצה', target: '3×3-4', setsDefault: 3, repsDefault: 4, area: 'ברך', gym: { note: 'קופסה 15-20 ס"מ בלבד (ברכיים!)' }, home: { name: 'קפיצה למרחק + נעילה', note: 'קצר ומבוקר, נעל את הנחיתה' } },
      { id: 'a-press', name: 'לחיצה מעל הראש', target: '3×6-8', setsDefault: 3, repsDefault: 8, weighted: true, area: 'כתף', gym: { name: 'לחיצת קטלבל בודד', note: 'יד חופשית בתנועה הפוכה' }, home: { name: 'פייק פוש-אפ / לחיצה בטבעות', note: 'התקדמות הדרגתית' } },
      { id: 'a-hinge', name: 'הינג\' נפיץ', target: '3×10', setsDefault: 3, repsDefault: 10, weighted: true, area: 'גב תחתון', gym: { name: 'סווינג קטלבל', note: '⚠️ גב ניטרלי — בלי קשת בסיום' }, home: { name: 'סווינג עם תיק עמוס', note: 'אותם דגשים' } },
      { id: 'a-squat', name: 'סקוואט טמפו', target: '3×5', setsDefault: 3, repsDefault: 5, weighted: true, area: 'ברך', gym: { name: 'גובלט טמפו' }, home: { note: 'איטי, גו זקוף, תיק אם קל' } },
      { id: 'a-energy', name: 'הוצאת אנרגיה', target: '4×30 שנ\'', setsDefault: 4, repsDefault: 30, timeBased: true, gym: { name: 'אינטרוולים (חתירה/אופניים)', note: '30 שנ\' חזק / 30 קל — מחליף ברפי' }, home: { name: 'אגרוף צללים נפיץ', note: 'קומבינציות מהירות — מחליף ברפי' } },
      { id: 'a-flow', name: 'FLOW — תנועה חופשית', target: '3 סבבים', setsDefault: 3, repsDefault: 1, note: 'משחק תנועה על הקרקע — מעברים, גלגולים, קימות' },
    ],
    flexibility: [
      { name: 'מעברי ירך 90/90', dose: '8 לכל צד' },
      { name: 'מתיחת כופפי ירך (ספה)', dose: '45-60 שנ\' לצד' },
      { name: 'קוזאק איטי לטווח', dose: '6 לכל צד' },
    ],
    finisher: { name: 'סבבי אגרוף צללים 🔥', dose: '3×2 ד\' / מנוחה 1 ד\'', note: 'אופציונלי — שמירה על חדות לקרב מגע' },
  },
  {
    key: 'B',
    name: 'פלג גוף עליון',
    icon: '💪',
    focus: 'משיכה ודחיקה בכל הכיוונים — מסת שריר, יציבה, כוח לקרב מגע ולטבעות.',
    flexTitle: 'גמישות B · כתפיים ובית חזה',
    warmup: [...WARMUP_COMMON, 'משיכות שכמות (מתח/טבעות) ×8'],
    exercises: [
      { id: 'b-pull', name: 'משיכה אנכית', target: '3× מקס+3-8', setsDefault: 3, repsDefault: 6, area: 'כתף', gym: { name: 'מתח' }, home: { name: 'מתח בטבעות', note: 'אחיזה ניטרלית — עדין לכתפיים' } },
      { id: 'b-dip', name: 'דחיקה אנכית', target: '3×3-8', setsDefault: 3, repsDefault: 6, area: 'כתף', gym: { name: 'שקעים במקבילים' }, home: { name: 'שקעים בטבעות / שליליים', note: 'התחל משליליים איטיים' } },
      { id: 'b-row', name: 'חתירה', target: '3×8-12', setsDefault: 3, repsDefault: 10, area: 'גב עליון', gym: { name: 'מתח אוסטרלי' }, home: { name: 'חתירת טבעות', note: 'רגליים קדימה = קשה יותר' } },
      { id: 'b-push', name: 'דחיקה אופקית', target: '3×10-15', setsDefault: 3, repsDefault: 12, area: 'כתף', gym: { name: 'שכיבות דפיסיט רחבות' }, home: { name: 'שכיבות על טבעות', note: 'ליבה חזקה, גוף ישר' } },
      { id: 'b-core', name: 'ליבה בתלייה', target: '3×5-10', setsDefault: 3, repsDefault: 8, area: 'גב תחתון', gym: { name: 'הרמות ברכיים בתלייה', note: 'מבוקר, בלי נדנוד' }, home: { name: 'הרמות ברכיים על טבעות' } },
      { id: 'b-hold', name: 'החזקת תמיכה', target: '3×15-25 שנ\'', setsDefault: 3, repsDefault: 20, timeBased: true, area: 'כתף', gym: { name: 'תמיכה במקבילים' }, home: { name: 'Ring Support Hold', note: 'זרועות ישרות, טבעות צמודות' } },
    ],
    flexibility: [
      { name: 'סיבובי בית חזה על ארבע', dose: '10 לכל צד' },
      { name: 'תנוחת ילד + הושטה צידית', dose: '30-45 שנ\' לצד' },
      { name: 'מתיחת שער (חזה)', dose: '30-45 שנ\'' },
    ],
  },
  {
    key: 'C',
    name: 'פלג גוף תחתון',
    icon: '🦵',
    focus: 'רגליים חזקות בלי להעמיס על עמוד השדרה. חד-רגלי = יציבות לבעיטות.',
    flexTitle: 'גמישות C · המסטרינג וגב',
    warmup: WARMUP_COMMON,
    exercises: [
      { id: 'c-pistol', name: 'סקוואט חד-רגלי לקופסה', target: '3×4-6', setsDefault: 3, repsDefault: 5, area: 'ברך', note: '⚠️ קופסה גבוהה — טווח חלקי בלבד (מיניסקוס)', gym: { name: 'פיסטול לקופסה גבוהה' }, home: { name: 'פיסטול לכיסא' } },
      { id: 'c-step', name: 'עליות מדרגה', target: '3×5-6 לרגל', setsDefault: 3, repsDefault: 6, weighted: true, area: 'ברך', gym: { note: 'קדימה + צד' }, home: { name: 'מדרגות / שרפרף יציב' } },
      { id: 'c-cossack', name: 'קוזאק', target: '3×6-8', setsDefault: 3, repsDefault: 7, area: 'ברך', note: 'טווח שליטה — בלי עומק מקסימלי', gym: { note: 'עם משקל אם קל' }, home: { note: 'משקל גוף / תיק' } },
      { id: 'c-box', name: 'בוקס סקוואט', target: '3×8', setsDefault: 3, repsDefault: 8, weighted: true, area: 'גב תחתון', note: 'גב ניטרלי, לא חזק ונמוך', gym: { note: 'מוט / קטלבל' }, home: { name: 'לספה, טמפו איטי' } },
      { id: 'c-ham', name: 'המסטרינג', target: '3×6-8', setsDefault: 3, repsDefault: 7, area: 'ברך', gym: { name: 'נורדיק קרל', note: 'איטי ומבוקר' }, home: { name: 'נורדיק בעוגן ספה / גשר רגל אחת' } },
    ],
    flexibility: [
      { name: 'המסטרינג בשכיבה (רצועה)', dose: '45-60 שנ\' לרגל' },
      { name: 'פיריפורמיס (מספר 4)', dose: '45 שנ\' לצד' },
      { name: 'תאומים וקרסול (חשוב לגאוט)', dose: '30-45 שנ\' לרגל' },
    ],
    finisher: { name: 'סבבי אגרוף צללים 🔥', dose: '3×2 ד\' / מנוחה 1 ד\'', note: 'אופציונלי' },
  },
];

// "יום גב רגיש" — כשכאב גב 4+
export const SENSITIVE_BACK_DAY = [
  'הליכה 20-30 דקות',
  'חתול/פרה עדין ×10',
  'Bird Dog ×8 לכל צד',
  'גשר ישבן ×12',
  'Side Plank קצר לכל צד',
  'פיריפורמיס + תנוחת ילד',
];

export const KRAV_TAGS = ['ספארינג', 'טכניקה', 'הגנה עצמית', 'נשק', 'קרקע', 'קונדישן'];

export const BODY_AREAS = ['גב תחתון', 'גב עליון', 'ברך ימין', 'ברך שמאל', 'כתף ימין', 'כתף שמאל', 'כף רגל (גאוט)', 'צוואר', 'מרפק', 'אחר'];

export function exName(ex: ExerciseDef, loc: Loc): string {
  return (loc === 'home' ? ex.home?.name : ex.gym?.name) || ex.name;
}
export function exNote(ex: ExerciseDef, loc: Loc): string | undefined {
  const locNote = loc === 'home' ? ex.home?.note : ex.gym?.note;
  return [ex.note, locNote].filter(Boolean).join(' · ') || undefined;
}
