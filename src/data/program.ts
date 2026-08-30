// FitLog IL — תוכנית ABC v2 (אושרה ע"י אבי)
// כל תרגיל: גרסת חדר כושר + גרסת בית שקולות. בטיחות: גב (בלט+ליסתזיס), ברכיים (אין מיניסקוס ימין, קרע שמאל), גאוט.

export type Loc = 'home' | 'gym';

// פרמטר מותאם לתרגיל מעבר למשקל (למשל גובה קופסה/מדרגה) — לתיעוד ולניתוח תנועה בעתיד
export interface ExParam {
  key: string;             // מזהה יציב לשמירה
  label: string;           // תווית בעברית
  unit?: string;           // יחידה (ס"מ וכו')
  step?: number;           // צעד הכפתורים ± (ברירת מחדל 1)
  def?: number;            // ערך התחלתי אם אין היסטוריה
}

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
  params?: ExParam[];      // פרמטרים מותאמים (גובה קופסה/מדרגה וכו') — סעיף 5
}

export interface RoutineDef {
  key: 'A' | 'B' | 'C';
  name: string;
  icon: string;
  focus: string;
  why: string;             // מה האימון משיג ואיך הוא מתחבר למטרות של אבי
  flexTitle: string;
  warmup: string[];
  exercises: ExerciseDef[];
  flexibility: { name: string; dose: string }[];
  finisher?: { name: string; dose: string; note: string };
}

export const WARMUP_COMMON = [
  'Light Cardio 2-3 ד\' — Jump Rope / Run / Shadow Boxing',
  'Lunge + Rotation · 10 מטר',
  'Cat/Cow עדין ×10',
  'Bird Dog ×8 לכל צד (גב ניטרלי)',
  'Glute Bridge ×12',
  'Shoulder Dislocations ×10',
];

export const PROGRAM: RoutineDef[] = [
  {
    key: 'A',
    name: 'Explosive Power',
    icon: '🏋️',
    focus: 'שימור שריר בגירעון + מערכת עצבים צעירה. הפליאומטריה מיד אחרי החימום — כשהגוף חם!',
    why: 'Explosive Power = כוח מהיר: לייצר הרבה כוח בשבריר שנייה (קפיצה, דחיקה מתפרצת). בגיל 49 זו היכולת הראשונה שנעלמת אם לא מאמנים אותה — והיא בדיוק מה שמגן על הברכיים בנחיתות, נותן מהירות לקרב מגע, ושומר על השריר בזמן החיטוב.',
    flexTitle: 'גמישות A · ירכיים',
    warmup: WARMUP_COMMON,
    exercises: [
      { id: 'a-land', name: 'Single-Leg Landing Drill', target: '4×5', setsDefault: 4, repsDefault: 5, area: 'ברך', note: 'נחיתה רכה ושקטה — מוקדם באימון, כשהגוף חם' },
      { id: 'a-plyo', name: 'Explosive Step-Up', target: '3×3-4', setsDefault: 3, repsDefault: 4, area: 'ברך', gym: { note: 'קופסה 15-20 ס"מ בלבד (ברכיים!)' }, home: { name: 'Broad Jump + Stick', note: 'קצר ומבוקר, נעל את הנחיתה' } },
      { id: 'a-press', name: 'Overhead Press', target: '3×6-8', setsDefault: 3, repsDefault: 8, weighted: true, area: 'כתף', gym: { name: 'Single KB Press', note: 'יד חופשית בתנועה הפוכה' }, home: { name: 'Pike Push-Up', note: 'התקדמות הדרגתית' } },
      { id: 'a-hinge', name: 'Explosive Hinge', target: '3×10', setsDefault: 3, repsDefault: 10, weighted: true, area: 'גב תחתון', gym: { name: 'KB Swing', note: '⚠️ גב ניטרלי — בלי קשת בסיום' }, home: { name: 'Backpack Swing', note: 'אותם דגשים' } },
      { id: 'a-squat', name: 'Tempo Squat', target: '3×5', setsDefault: 3, repsDefault: 5, weighted: true, area: 'ברך', gym: { name: 'Tempo Goblet Squat' }, home: { note: 'איטי, גו זקוף, תיק אם קל' } },
      { id: 'a-energy', name: 'Energy Burst', target: '4×30 שנ\'', setsDefault: 4, repsDefault: 30, timeBased: true, gym: { name: 'Intervals (Row/Bike)', note: '30 שנ\' חזק / 30 קל — מחליף ברפי' }, home: { name: 'Shadow Boxing Rounds', note: 'קומבינציות מהירות — מחליף ברפי' } },
      { id: 'a-flow', name: 'FLOW', target: '3 סבבים', setsDefault: 3, repsDefault: 1, note: 'משחק תנועה על הקרקע — מעברים, גלגולים, קימות' },
    ],
    flexibility: [
      { name: '90/90 Hip Switch', dose: '8 לכל צד' },
      { name: 'Couch Stretch', dose: '45-60 שנ\' לצד' },
      { name: 'Slow Cossack (ROM)', dose: '6 לכל צד' },
    ],
    finisher: { name: 'Shadow Boxing Rounds 🔥', dose: '3×2 ד\' / מנוחה 1 ד\'', note: 'אופציונלי — שמירה על חדות לקרב מגע' },
  },
  {
    key: 'B',
    name: 'Upper Body',
    icon: '💪',
    focus: 'משיכה ודחיקה בכל הכיוונים — מסת שריר, יציבה, כוח לקרב מגע ולטבעות.',
    why: 'מסת שריר עליונה היא המנוע של החיטוב (שריר שורף קלוריות גם במנוחה) והבסיס לעבודה על הטבעות שבדרך. משיכה ודחיקה מאוזנות = כתפיים בריאות ויציבה טובה מול שעות מחשב.',
    flexTitle: 'גמישות B · כתפיים ובית חזה',
    warmup: [...WARMUP_COMMON, 'Scapula Pulls ×8'],
    exercises: [
      { id: 'b-pull', name: 'Vertical Pull', target: '3× מקס+3-8', setsDefault: 3, repsDefault: 6, area: 'כתף', gym: { name: 'Pull-Ups' }, home: { name: 'Ring Pull-Ups', note: 'אחיזה ניטרלית — עדין לכתפיים' } },
      { id: 'b-dip', name: 'Vertical Push', target: '3×3-8', setsDefault: 3, repsDefault: 6, area: 'כתף', gym: { name: 'Dips' }, home: { name: 'Ring Dips / Negatives', note: 'התחל משליליים איטיים' } },
      { id: 'b-row', name: 'Row', target: '3×8-12', setsDefault: 3, repsDefault: 10, area: 'גב עליון', gym: { name: 'Australian Pull-Ups' }, home: { name: 'Ring Rows', note: 'רגליים קדימה = קשה יותר' } },
      { id: 'b-push', name: 'Horizontal Push', target: '3×10-15', setsDefault: 3, repsDefault: 12, area: 'כתף', gym: { name: 'Wide Deficit Push-Ups' }, home: { name: 'Ring Push-Ups', note: 'ליבה חזקה, גוף ישר' } },
      { id: 'b-core', name: 'Hanging Core', target: '3×5-10', setsDefault: 3, repsDefault: 8, area: 'גב תחתון', gym: { name: 'Hanging Knee Raises', note: 'מבוקר, בלי נדנוד' }, home: { name: 'Ring Knee Raises' } },
      { id: 'b-hold', name: 'Support Hold', target: '3×15-25 שנ\'', setsDefault: 3, repsDefault: 20, timeBased: true, area: 'כתף', gym: { name: 'Parallel Bar Hold' }, home: { name: 'Ring Support Hold', note: 'זרועות ישרות, טבעות צמודות' } },
    ],
    flexibility: [
      { name: 'Quadruped T-Spine Rotation', dose: '10 לכל צד' },
      { name: 'Child Pose + Lat Reach', dose: '30-45 שנ\' לצד' },
      { name: 'Doorway Chest Stretch', dose: '30-45 שנ\'' },
    ],
  },
  {
    key: 'C',
    name: 'Lower Body',
    icon: '🦵',
    focus: 'רגליים חזקות בלי להעמיס על עמוד השדרה. חד-רגלי = יציבות לבעיטות.',
    why: 'הרגליים הן קבוצת השריר הגדולה בגוף — האימון שמזיז הכי הרבה בחיטוב. עבודה חד-רגלית בונה יציבות לברכיים (בלי מיניסקוס ימין, קרע שמאל) ובסיס לבעיטות — בלי בר כבד על עמוד השדרה.',
    flexTitle: 'גמישות C · המסטרינג וגב',
    warmup: WARMUP_COMMON,
    exercises: [
      { id: 'c-pistol', name: 'Box Pistol Squat', target: '3×4-6', setsDefault: 3, repsDefault: 5, area: 'ברך', note: '⚠️ קופסה גבוהה — טווח חלקי בלבד (מיניסקוס)', gym: { name: 'Pistol to High Box' }, home: { name: 'Pistol to Chair' }, params: [{ key: 'boxH', label: 'גובה קופסה', unit: 'ס"מ', step: 5, def: 45 }] },
      { id: 'c-step', name: 'Front Step-Up', target: '3×5-6 לרגל', setsDefault: 3, repsDefault: 6, weighted: true, area: 'ברך', home: { name: 'Front Step-Up (Stairs / Stool)' }, params: [{ key: 'stepH', label: 'גובה מדרגה', unit: 'ס"מ', step: 5, def: 30 }] },
      { id: 'c-step-lat', name: 'Lateral Step-Up', target: '3×5-6 לרגל', setsDefault: 3, repsDefault: 6, weighted: true, area: 'ברך', note: 'עלייה מהצד — יציבות לברכיים ולבעיטות', home: { name: 'Lateral Step-Up (Stairs / Stool)' }, params: [{ key: 'stepH', label: 'גובה מדרגה', unit: 'ס"מ', step: 5, def: 30 }] },
      { id: 'c-cossack', name: 'Cossack Squat', target: '3×6-8', setsDefault: 3, repsDefault: 7, area: 'ברך', note: 'טווח שליטה — בלי עומק מקסימלי', gym: { note: 'עם משקל אם קל' }, home: { note: 'משקל גוף / תיק' } },
      { id: 'c-box', name: 'Box Squat', target: '3×8', setsDefault: 3, repsDefault: 8, weighted: true, area: 'גב תחתון', note: 'גב ניטרלי, לא חזק ונמוך', gym: { note: 'מוט / קטלבל' }, home: { name: 'To Couch — Slow Tempo' }, params: [{ key: 'boxH', label: 'גובה קופסה', unit: 'ס"מ', step: 5, def: 40 }] },
      { id: 'c-ham', name: 'Hamstrings', target: '3×6-8', setsDefault: 3, repsDefault: 7, area: 'ברך', gym: { name: 'Nordic Curl', note: 'איטי ומבוקר' }, home: { name: 'Nordic (Couch Anchor) / SL Bridge' } },
    ],
    flexibility: [
      { name: 'Supine Hamstring (Strap)', dose: '45-60 שנ\' לרגל' },
      { name: 'Figure-4 Piriformis', dose: '45 שנ\' לצד' },
      { name: 'Calf + Ankle (חשוב לגאוט)', dose: '30-45 שנ\' לרגל' },
    ],
    finisher: { name: 'Shadow Boxing Rounds 🔥', dose: '3×2 ד\' / מנוחה 1 ד\'', note: 'אופציונלי' },
  },
];

// "יום גב רגיש" — כשכאב גב 4+
export const SENSITIVE_BACK_DAY = [
  'הליכה 20-30 דקות',
  'Cat/Cow עדין ×10',
  'Bird Dog ×8 לכל צד',
  'Glute Bridge ×12',
  'Side Plank קצר לכל צד',
  'Figure-4 Piriformis + Child Pose',
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
