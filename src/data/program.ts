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
  tips?: string[];         // טיפים משתנים בקול הצוות — מוצג אחד לכל אימון, מתחלף (סעיף 5)
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
      { id: 'a-land', name: 'Single-Leg Landing Drill', target: '4×5', setsDefault: 4, repsDefault: 5, area: 'ברך', note: 'נחיתה רכה ושקטה — מוקדם באימון, כשהגוף חם',
        tips: ['מאיה: נחיתה שקטה — אם שומעים "בום", הברך סופגת במקום השריר. רך = נכון.', 'נעה: ברך מעל אצבע 2, לא נופלת פנימה. זו היציבות ששומרת על המיניסקוס.', 'רז: דמיין נחיתת חתול — קליטה, לא עצירה. בדיוק המנגנון של בעיטה שנוחתת.', 'עמית: מוקדם באימון, כשהגוף חם. נחיתה על גוף קר זה הטריגר של הגב.'] },
      { id: 'a-plyo', name: 'Explosive Step-Up', target: '3×3-4', setsDefault: 3, repsDefault: 4, area: 'ברך', gym: { note: 'קופסה 15-20 ס"מ בלבד (ברכיים!)' }, home: { name: 'Broad Jump + Stick', note: 'קצר ומבוקר, נעל את הנחיתה' },
        tips: ['עמית: קופסה נמוכה, 15-20 ס"מ בלבד — נפיצות, לא גובה. הברכיים לפני האגו.', 'טל: כל הכוח בדחיפה למעלה, ירידה מבוקרת. לא קופצים חזרה למטה.', 'נעה: הכוח מהעקב של הרגל העובדת — משם, לא מהאצבעות.', 'מאיה: כאב ברך? מורידים גובה או עוברים ל-Broad Jump קצר. בלי גבורה.'] },
      { id: 'a-press', name: 'Overhead Press', target: '3×6-8', setsDefault: 3, repsDefault: 8, weighted: true, area: 'כתף', gym: { name: 'Single KB Press', note: 'יד חופשית בתנועה הפוכה' }, home: { name: 'Pike Push-Up', note: 'התקדמות הדרגתית' },
        tips: ['רז: אגרוף סגור, שורש כף יד ישר — כמו מכת אגרוף כלפי מעלה.', 'נעה: צלעות סגורות, בלי קשת בגב. הכוח מהכתף, לא מהגב התחתון.', 'עמית: יד חופשית בתנועה הפוכה — מייצב את הליבה ומחקה תנועה קרבית.', 'טל: נשיפה בדחיפה למעלה, שאיפה בירידה. הנשימה היא חצי מהכוח.'] },
      { id: 'a-hinge', name: 'Explosive Hinge', target: '3×10', setsDefault: 3, repsDefault: 10, weighted: true, area: 'גב תחתון', gym: { name: 'KB Swing', note: '⚠️ גב ניטרלי — בלי קשת בסיום' }, home: { name: 'Backpack Swing', note: 'אותם דגשים' },
        tips: ['נעה: זה ציר ירכיים, לא סקוואט. הישבן אחורה, הגב ישר כמו סרגל.', 'מאיה: בלי קשת בסוף! הכוח מהישבן, נועלים בטן — הגב נשאר ניטרלי.', 'רז: הקטלבל צף מתנופת הירכיים, לא מהידיים. גיוס תנע נקי.', 'עמית: חם ורחוק מהמזגן. תנועת גב מתפרצת על גוף קר = השבתה.'] },
      { id: 'a-squat', name: 'Tempo Squat', target: '3×5', setsDefault: 3, repsDefault: 5, weighted: true, area: 'ברך', gym: { name: 'Tempo Goblet Squat' }, home: { note: 'איטי, גו זקוף, תיק אם קל' },
        tips: ['עמית: איטי בירידה, 3 שניות, שליטה מלאה. הטמפו הוא האימון, לא המשקל.', 'נעה: עקבים דבוקים לרצפה, גו זקוף. עומק עד כמה שהברך שקטה.', 'מאיה: ברך מעל האצבעות, לא פנימה. עצירה לפני כל כאב.', 'טל: נשיפה בדחיפה למעלה — דוחפים את הרצפה, לא רק קמים.'] },
      { id: 'a-energy', name: 'Energy Burst', target: '4×30 שנ\'', setsDefault: 4, repsDefault: 30, timeBased: true, gym: { name: 'Intervals (Row/Bike)', note: '30 שנ\' חזק / 30 קל — מחליף ברפי' }, home: { name: 'Shadow Boxing Rounds', note: 'קומבינציות מהירות — מחליף ברפי' },
        tips: ['טל: 30 שניות חזק זה חזק — אם יכולת לדבר, לא נתת הכל.', 'רז: אגרוף צללים — קומבינציות, לא סתם תנועה. רגליים כל הזמן.', 'ד"ר ארז: עין על הדופק. חזק זה טוב, סחרחורת זה עצירה.', 'עמית: זה מחליף את הברפי — כל האנרגיה, אפס עומס על גב וברכיים.'] },
      { id: 'a-flow', name: 'FLOW', target: '3 סבבים', setsDefault: 3, repsDefault: 1, note: 'משחק תנועה על הקרקע — מעברים, גלגולים, קימות',
        tips: ['נעה: זה משחק, לא מבחן. מעברים רכים בין תנוחות — הגוף לומד לזרום.', 'רז: קימות וגלגולים — בדיוק היכולת שמצילה בקרקע. איכות מעל מהירות.', 'עמית: אין "נכון" אחד. תקשיב לגוף, תמצא את המעברים שלך.'] },
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
      { id: 'b-pull', name: 'Pull-Ups', target: '3× (מקס + 2×5-10)', setsDefault: 3, repsDefault: 8, area: 'כתף', note: 'עם משקל אם אפשר', gym: { name: 'Pull-Ups' }, home: { name: 'Ring Pull-Ups', note: 'אחיזה ניטרלית — עדין לכתפיים' },
        tips: ['רז: שכמות למטה לפני המרפקים — משיכה נקייה.', 'עמית: סט מקס נקי, ואז 2 סטים של 5-10. איכות מעל כמות.', 'טל: ירידה מבוקרת 2-3 שניות — שם נבנה חצי מהשריר.'] },
      { id: 'b-dip', name: 'Dips', target: '3× (מקס + 2×5-10)', setsDefault: 3, repsDefault: 8, area: 'כתף', note: 'עם משקל אם אפשר', gym: { name: 'Dips' }, home: { name: 'Ring Dips / Negatives', note: 'התחל משליליים איטיים' },
        tips: ['מאיה: ירידה עד 90 מעלות — לא נמוך יותר, שומרים כתף.', 'רז: נעל את התחתית, דחוף מתפרץ למעלה.', 'עמית: אין כוח? שליליים איטיים 3-4 שניות.'] },
      { id: 'b-mu', name: 'Negative Muscle-Up', target: '3×5', setsDefault: 3, repsDefault: 5, area: 'כתף', note: 'תרגול שלילי למאסל-אפ — איטי ומבוקר', home: { name: 'Ring/Bar Negatives' },
        tips: ['עמית: כל התרגיל הוא הירידה — איטי ובשליטה מלאה.', 'רז: מעבר נקי מעל המוט, בלי לזרוק את הגוף.', 'מאיה: כתף מתלוננת? עצור — זה תרגול מתקדם.'] },
      { id: 'b-lever', name: 'Lever', target: '3-5 דקות משחק', setsDefault: 1, repsDefault: 1, area: 'גב תחתון', note: 'שחק עם התנועה',
        tips: ['נעה: שחק עם התנועה — טאק, ומתקדם רק כשהליבה שולטת.', 'מאיה: בלי להעמיס את הגב — טווח נוח, בלי להישבר לקשת.', 'רז: איזומטרי — נשימה רגועה, ליבה נעולה.'] },
      { id: 'b-t2b', name: 'Toes to Bar', target: '3-4×3-8', setsDefault: 3, repsDefault: 6, area: 'גב תחתון',
        tips: ['מאיה: מבוקר, בלי נדנוד — נדנוד מעמיס את הגב.', 'נעה: מתחילים מהטיית אגן, הרגליים עולות מהליבה.', 'עמית: 5 נקיות עדיף על 10 עם תנופה.'] },
      { id: 'b-push', name: 'Single-Arm Alt. Wide Deficit Push-Ups', target: '3×12-16', setsDefault: 3, repsDefault: 14, area: 'כתף', note: 'צד לצד', home: { name: 'Ring Push-Ups', note: 'ליבה חזקה, גוף ישר' },
        tips: ['נעה: גוף ישר כמו קרש — בטן וישבן נעולים.', 'רז: צד לצד — העברת משקל מבוקרת בין הידיים.', 'טל: ירידה מבוקרת, דחיפה מתפרצת.'] },
      { id: 'b-tri', name: 'BW Triceps Extension', target: '3×10-15', setsDefault: 3, repsDefault: 12, area: 'מרפק',
        tips: ['רז: מרפקים צמודים, התנועה מהמרפק בלבד.', 'עמית: טווח מלא ואיטי — בלי לנעול בכוח בסוף.', 'נעה: ליבה נעולה, בלי קשת בגב.'] },
      { id: 'b-row', name: 'Australian Pull-Ups', target: '3×10-15', setsDefault: 3, repsDefault: 12, area: 'גב עליון', gym: { name: 'Australian Pull-Ups' }, home: { name: 'Ring Rows', note: 'רגליים קדימה = קשה יותר' },
        tips: ['נעה: מושכים עם המרפקים לכיס האחורי, שכמות נסגרות.', 'עמית: רגליים קדימה = קשה יותר. משחקים עם הזווית.', 'רז: גוף קשיח כמו קרש כל החזרה.'] },
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
      { id: 'c-pistol', name: 'Box Pistol Squat', target: '3×4-6', setsDefault: 3, repsDefault: 5, area: 'ברך', note: '⚠️ קופסה גבוהה — טווח חלקי בלבד (מיניסקוס)', gym: { name: 'Pistol to High Box' }, home: { name: 'Pistol to Chair' }, params: [{ key: 'boxH', label: 'גובה קופסה', unit: 'ס"מ', step: 5, def: 45 }],
        tips: ['מאיה: גובה הקופסה הוא הבלם שלך — כל עקצוץ בברך, מעלים ס"מ. קדוש.', 'מאיה: קופסה גבוהה = פחות כיפוף ברך = בטוח למיניסקוס. טווח חלקי בכוונה.', 'נעה: הברך עוקבת אחרי האצבע, לא נופלת פנימה. יד קדימה למשקל נגדי.', 'עמית: יורד עד הקופסה, נוגע קליל, קם. לא מתיישב, לא צונח.'] },
      { id: 'c-step', name: 'Front Step-Up', target: '3×5-6 לרגל', setsDefault: 3, repsDefault: 6, weighted: true, area: 'ברך', home: { name: 'Front Step-Up (Stairs / Stool)' }, params: [{ key: 'stepH', label: 'גובה מדרגה', unit: 'ס"מ', step: 5, def: 30 }],
        tips: ['נעה: כל הכוח מהרגל שעל המדרגה — הרגל התחתונה לא עוזרת בדחיפה.', 'עמית: ירידה איטית ומבוקרת — שם הברך לומדת יציבות.', 'רז: זה הבסיס לבעיטה — רגל אחת יציבה שנושאת את כל הגוף.', 'מאיה: גובה מדרגה שבו הברך שקטה. כואב? מורידים גובה.'] },
      { id: 'c-step-lat', name: 'Lateral Step-Up', target: '3×5-6 לרגל', setsDefault: 3, repsDefault: 6, weighted: true, area: 'ברך', note: 'עלייה מהצד — יציבות לברכיים ולבעיטות', home: { name: 'Lateral Step-Up (Stairs / Stool)' }, params: [{ key: 'stepH', label: 'גובה מדרגה', unit: 'ס"מ', step: 5, def: 30 }],
        tips: ['נעה: עלייה מהצד — הברך נשארת מעל כף הרגל, לא קורסת פנימה.', 'רז: יציבות צידית = ההגנה של הברך בבעיטות ובתנועה צידית.', 'עמית: איטי ונקי. הצד החלש יגלה את עצמו — שם עובדים.', 'מאיה: זווית צידית עדינה למיניסקוס — עוצרים לפני כל תחושה חדה.'] },
      { id: 'c-cossack', name: 'Cossack Squat', target: '3×6-8', setsDefault: 3, repsDefault: 7, area: 'ברך', note: 'טווח שליטה — בלי עומק מקסימלי', gym: { note: 'עם משקל אם קל' }, home: { note: 'משקל גוף / תיק' },
        tips: ['נעה: טווח שליטה בלבד — יורדים עד כמה שהגב ישר והברך שקטה.', 'מאיה: בלי עומק מקסימלי. הברך של אבי אוהבת טווח בינוני ונקי.', 'עמית: עקב הרגל הישרה על הרצפה. זו מתיחה וכוח באותה תנועה.'] },
      { id: 'c-box', name: 'Box Squat', target: '3×8', setsDefault: 3, repsDefault: 8, weighted: true, area: 'גב תחתון', note: 'גב ניטרלי, לא חזק ונמוך', gym: { note: 'מוט / קטלבל' }, home: { name: 'To Couch — Slow Tempo' }, params: [{ key: 'boxH', label: 'גובה קופסה', unit: 'ס"מ', step: 5, def: 40 }],
        tips: ['נעה: יושבים אחורה לקופסה, גב ניטרלי — ציר ירכיים, לא נפילה.', 'מאיה: לא חזק ולא נמוך — הקופסה מגדירה את העומק הבטוח לגב.', 'עמית: נגיעה קלה בקופסה, לא מנוחה מלאה. שליטה כל הדרך.', 'רז: קימה מתפרצת מהקופסה — כוח דחיפה נקי מהישבן.'] },
      { id: 'c-ham', name: 'Hamstrings', target: '3×6-8', setsDefault: 3, repsDefault: 7, area: 'ברך', gym: { name: 'Nordic Curl', note: 'איטי ומבוקר' }, home: { name: 'Nordic (Couch Anchor) / SL Bridge' },
        tips: ['נעה: ירידה איטית ככל שאפשר — השליליים הם כל התרגיל.', 'מאיה: המסטרינג חזק = ברך מוגנת. זה השריר ששומר על המיניסקוס.', 'עמית: לא מגיעים רחוק? ידיים עוזרות בתחתית ודוחפות חזרה. מטפסים בהדרגה.'] },
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
