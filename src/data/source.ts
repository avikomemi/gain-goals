// ---------------------------------------------------------------------------
// המקור. שלוש השגרות כפי שנכתבו, מילה במילה.
//
// הן נכתבו על ידי מאמן כושר שמכיר את המצב של אבי — הגב, הברכיים, הגיל —
// והן הגיעו לכאן דרך הפרומפט ל-Lovable מ-27.8.26. הקובץ ההוא נדרס מאז,
// והמקור היחיד היה אובייקט git (20d8339:README.md) שצריך לחפור אליו.
//
// זו בדיוק הסיבה שהקובץ הזה קיים. בספטמבר נעשה מעבר "חזרה למקור" שהחזיר את
// בלוק הגב העליון ואת שני פריטי החימום שנשמטו — והבדיקות שננעלו אז כיסו את
// בלוק הגמישות של A ואת החימום בלבד. לא את תרגילי הליבה של A, ולא את C.
// לכן שלוש סטיות גדולות שרדו את האודיט: קפיצת קופסה שהפכה לתרגיל שאינו
// קפיצה, Drop Jump שנמחק, ו-Leg Press שהוחלף בבוקס סקוואט עם 50 ק"ג.
// ב-13.11 נבנה טיימר טמפו לתרגיל שאינו במקור, בלי שאיש פתח את המקור.
//
// מכאן: כל פער בין התוכנית לבין הקובץ הזה חייב להופיע ב-DEVIATIONS, עם
// תאריך, מי החליט, ולמה. פער שלא מוצהר מפיל את הבדיקה. פער מוצהר שעדיין
// לא הוכרע מסומן 'open' וממשיך להופיע עד שאבי מכריע בו.
//
// ====== ההיגיון שמתחת לתוכנית ======
// ראו source.md לניתוח המלא. בקצרה, חמישה עקרונות שחוזרים בכל שלוש השגרות:
//
// 1. אפס עומס צירי. אין בכל התוכנית ולו תנועה אחת של עומס דו-צדדי על עמוד
//    השדרה: אין סקוואט עם מוט, אין דדליפט, אין לחיצת חזה. כל תנועת פלג גוף
//    תחתון היא חד-צדדית או חסומה (פיסטול לקופסה, סטפ-אפ, קוסאק, לג-פרס עם
//    גב נתמך). פלג הגוף העליון נעשה בתלייה — עמוד שדרה במתיחה, לא בדחיסה.
//    שני התרגילים היחידים שמותר להוסיף להם משקל הם מתח ומקבילים, כלומר
//    דווקא אלה שבהם הגוף תלוי. זו ההחלטה העקבית ביותר בכל התוכנית.
//
// 2. המאמן לא כותב "להימנע". הוא כותב מינון. 'do not go hard and low' על
//    לג-פרס, 'do not arch lower back' על סווינג, 'stick the landing' פעמיים.
//    התנועה נשארת — משתנה אחד נחסם. זה ההפך ממחיקת תרגיל.
//
// 3. החימום הוא תוכנית הגמישות. שמונת הפריטים אינם חימום כללי: כל אחד מהם
//    מכוון למגבלה. בייבי-מייקרס היא ישיבת הסקוואט העמוק, ג'פרסון הוא כיפוף
//    עמוד שדרה חוליה-חוליה בעומס, דיסלוקיישן הוא טווח הכתף, ופרס+סקוואט
//    באחיזה רחבה הוא קרסול, ירך, גב עליון וכתף במבחן אחד. המאמן שם את
//    עבודת הגמישות לפני האימון, שלוש פעמים בשבוע, ולא כנספח בסוף.
//
// 4. 'Max set + 2 sets' הוא מנגנון, לא ניסוח. סט מקסימלי אחד מודד איפה אתה
//    היום, ושני סטי המשך קלים יותר בונים נפח. הוא מווסת את עצמו בלי שום
//    שדה RPE. באפליקציה הוא נכתב כמחרוזת יעד ומעולם לא קיבל סלוט משלו.
//
// 5. שלושת תרגילי הקפיצה הם רצף הוראה אחד, לא שלושה תרגילים: ספיגה
//    (drop lands) → הפקה (box jump) → ספיגה והפקה מהר (drop jump), והחזרות
//    יורדות ככל שהעצימות עולה. מחיקת שניים מהם לא משאירה שליש מהגירוי.
// ---------------------------------------------------------------------------

import { RoutineKey } from './program';

export interface SourceEx {
  name: string;              // כלשונו במקור
  prescription: string;      // כלשונו במקור
  cue?: string;              // ההערה של המאמן, כלשונה
}

export interface SourceRoutine {
  n: 1 | 2 | 3;
  title: string;
  maps: RoutineKey;          // למה הוא מתאים באפליקציה
  exercises: SourceEx[];
  tail?: { title: string; items: string[] };
}

/**
 * החימום, משותף לשלוש השגרות. כלשונו, עם ביטוי לזיהוי הפריט בחימום של
 * האפליקציה — שכתוב בעברית, ולכן התאמה מטושטשת עליו שברירית ולא נכונה.
 */
export const SOURCE_WARMUP: { text: string; match: RegExp }[] = [
  { text: '2-3 min cardio (run/bike/row/rope)', match: /cardio/i },
  { text: '10m = 1 lunge + rotation/side band', match: /lunge \+ rotation/i },
  { text: '10m = 1 long lunge + reach up (hands to ceiling)', match: /long lunge|reach up/i },
  { text: '10 cat/cow', match: /cat\/cow/i },
  { text: '10 Russian Baby Makers', match: /baby ?makers/i },
  { text: '10 Jefferson curls (add weight if possible)', match: /jefferson/i },
  { text: '10 shoulder dislocation (PVC)', match: /dislocation/i },
  { text: '10 press + squat (very wide grip)', match: /press \+ squat/i },
];

export const SOURCE: SourceRoutine[] = [
  {
    n: 1, title: 'Strength (KB) + Plyometrics', maps: 'A',
    exercises: [
      { name: 'Single KB press', prescription: '3x6-8', cue: 'free arm performs opposite motion' },
      { name: 'KB swing', prescription: '3x10', cue: 'do not arch lower back, exhale forcefully' },
      { name: 'Drop lands', prescription: '3x3-4 @ 30-45cm', cue: 'stick the landing' },
      { name: 'Box jump', prescription: '3x3-4 @ 30-45cm', cue: 'triple extension (hip-knee-ankle)' },
      { name: 'Drop jump', prescription: '3-4x2-3 @ 15-20cm', cue: 'land in split position, stick the landing' },
      { name: 'FLOW', prescription: 'play with movements' },
    ],
    tail: {
      title: 'Thoracic mobility',
      items: [
        'Bended half kneeling archers stretch — 10 reps each side',
        'Quadruped T-spine rotation — 10 reps each side',
        'Prayers pose to upward dog passes — 10 passes',
      ],
    },
  },
  {
    n: 2, title: 'Calisthenics Lower', maps: 'C',
    exercises: [
      { name: 'Single Pistol Squat', prescription: '3x4-6 @45cm' },
      { name: 'Forward Step Up', prescription: '3x4-6 @45cm' },
      { name: 'Sideways Step Up', prescription: '3x4-6 @45cm' },
      { name: 'Cossack Squat', prescription: '3x6-8', cue: 'add weight if easy' },
      { name: 'Leg Press', prescription: '3x8', cue: 'do not go hard and low' },
    ],
  },
  {
    n: 3, title: 'Calisthenics Upper', maps: 'B',
    exercises: [
      { name: 'Pull-ups', prescription: '1 set max (weighted if possible) + 2 sets x 5-10' },
      { name: 'Dips', prescription: '1 set max (weighted if possible) + 2 sets x 5-10' },
      { name: 'Lever', prescription: '3-5 min play' },
      { name: 'Toes to Bar', prescription: '3-4x3-8' },
      { name: 'Single Arm Alternating Wide Deficit Push-ups', prescription: '3x12-16', cue: 'side to side' },
      { name: 'Bodyweight Triceps Extension', prescription: '3x10-15' },
      { name: 'Australian Pull-ups', prescription: '3x10-15' },
    ],
  },
];

export type DevKind = 'substitution' | 'removal' | 'addition' | 'dose';

export interface Deviation {
  kind: DevKind;
  routine: RoutineKey | 'warmup';
  source?: string;           // הפריט במקור (ל-addition אין)
  app?: string;              // מזהה התרגיל באפליקציה (ל-removal אין)
  what: string;              // מה השתנה, בשורה
  status: 'approved' | 'open';
  decided?: string;          // תאריך ההכרעה
  why: string;
}

/**
 * כל פער בין התוכנית למקור. 'open' = מוצהר אך לא הוכרע — ממשיך להופיע.
 * הבדיקה מפילה פער שלא מופיע כאן. היא אינה מפילה 'open': המטרה היא
 * שהפער יהיה גלוי, לא שהוא ייעלם.
 */
export const DEVIATIONS: Deviation[] = [
  // ---- אימון A (Routine 1) ----
  { kind: 'substitution', routine: 'A', source: 'KB swing', app: 'a-hinge',
    what: 'סווינג שתי ידיים 3×10 → דד-סטופ סינגל-ארם 3×5-8',
    status: 'approved', decided: '2026-11-16',
    why: 'אבי: "זה אותו הדבר". המכון החדש מוגבל ל-24 ק"ג והוא כבר עושה סינגל-ארם; דד-סטופ מקשה בלי להוסיף קילו, וכל חזרה היא איפוס תנוחה. דגש המאמן "do not arch" נשמר במלואו.' },
  { kind: 'substitution', routine: 'A', source: 'Box jump', app: 'a-plyo',
    what: 'קפיצת קופסה 30-45 ס"מ → Explosive Step-Up 15-20 ס"מ, שאינו קפיצה',
    status: 'approved', decided: '2026-11-16',
    why: 'אבי החליט להשאיר את הקפיצות בחוץ. ⚠️ לתיעוד: המאמן לא מוחק תנועות אלא ממנן אותן, ולכן דפוס המקור היה קופסה נמוכה עם "stick the landing" ולא החלפה בתרגיל אחר. ההחלטה של אבי, מודעת.' },
  { kind: 'removal', routine: 'A', source: 'Drop jump',
    what: 'נמחק מהאימון לחלוטין',
    status: 'approved', decided: '2026-11-16',
    why: 'אבי: "משאירים בחוץ". ⚠️ זהו השלישי ברצף הקפיצות (ספיגה → הפקה → ספיגה והפקה מהר); בלעדיו ובלי קפיצת הקופסה לא נותר גירוי פליאומטרי באימון שנקרא Explosive Power.' },
  { kind: 'substitution', routine: 'A', source: 'Drop lands', app: 'a-land',
    what: 'נחיתה דו-רגלית מ-30-45 ס"מ 3×3-4 → נחיתה חד-רגלית 4×5 מ-15 ס"מ, עם נעילה של 3 שניות',
    status: 'approved', decided: '2026-11-17',
    why: 'רגל אחת נשארת: עם הברכיים של אבי, להוסיף גובה לתרגיל דו-רגלי הוא צעד אחורה ואז צעד מסוכן קדימה. הגובה חוזר כמשתנה נרשם (אבי מעריך 15 ס"מ היום, ועד כה זה לא נרשם כלל), ו-"stick the landing" של המאמן נכנס ליעד כנעילה של 3 שניות. השער הוא איכות ולא מספר: נדנוד או צעד תיקון עוצרים את ההעלאה.' },
  { kind: 'addition', routine: 'A', app: 'a-squat',
    what: 'Tempo Squat — אינו במקור',
    status: 'approved', decided: '2026-11-16',
    why: 'אבי: "נשארים". סקוואט בטמפו איטי עם משקל קל הוא הדרך היחידה באימון הזה להעמיס על הברך בלי עומס צירי, ולכן הוא עקבי עם עיקרון 1 של המקור גם אם אינו כתוב בו.' },
  { kind: 'addition', routine: 'A', app: 'a-pyramid',
    what: 'Push-Up Pyramid / Energy Burst — אינו במקור',
    status: 'approved', decided: '2026-11-16',
    why: 'אבי: "נשארים". פיניישר קונדישן; נכנס ב-23.9 במקום Intervals (Row/Bike) שבוצע פעם אחת ונזנח. המקור אינו כולל עבודת קונדישן כלל.' },

  // ---- אימון B (Routine 3) ----
  { kind: 'dose', routine: 'B', source: 'Pull-ups', app: 'b-pull',
    what: '"סט מקס אחד + 2×5-10" → 3×5-10 עם משקל. טווח החזרות של סטי ההמשך נשמר; רק סט המקס ירד',
    status: 'approved', decided: '2026-11-16',
    why: 'אבי בחר במשקל על פני סט המקס, ואת סט המקס הוא עושה אקראית באימון אחר. זו בחירה מודעת בין שני מנגנוני התקדמות: המקור מווסת דרך מדידה חוזרת, ואבי מווסת דרך עומס. ⚠️ המחיר הוא שאות ההתקדמות האוטומטי של המקור לא קיים כאן, ולכן דיווח המאמץ הוא התחליף היחיד.' },
  { kind: 'dose', routine: 'B', source: 'Dips', app: 'b-dip',
    what: '"סט מקס אחד + 2×5-10" → 3×5-10 עם משקל. טווח החזרות של סטי ההמשך נשמר; רק סט המקס ירד',
    status: 'approved', decided: '2026-11-16',
    why: 'אותה בחירה כמו במתח. ⚠️ כאן המחיר כבר השתלם פעם אחת: 3×12 ב-+21 ק"ג גררו נסיגה ל-15 ק"ג לאורך חמישה אימונים, ואף אחד לא עצר אותה. בלי סט מקס, דיווח המאמץ הוא מה שאמור לתפוס את זה.' },
  { kind: 'substitution', routine: 'B', source: 'Lever', app: 'b-lever',
    what: '"3-5 דקות משחק" → סולם ארבעה שלבים עם שער בשניות',
    status: 'approved', decided: '2026-11-15',
    why: 'אבי לא הצליח לבצע; חמישה אימונים על 2 שניות. היעד בכל שלב נשאר "מקס שניות" ולא מספר חזרות, כדי לשמור על "play" של המקור.' },
  { kind: 'substitution', routine: 'B', source: 'Toes to Bar', app: 'b-t2b',
    what: 'סולם ארבעה שלבים לירידה; העלייה והיעד המקורי לא השתנו',
    status: 'approved', decided: '2026-11-23',
    why: 'אבי מבצע את התרגיל — הפער הוא באקסצנטרי בלבד: "קצב הירידה הוא לא בשליטה שלי כרגע". ב-15.11 נרשמה לו ירידה של 3 שניות ברגל ישרה כאילו זה מתג, וזה המנוף הארוך ביותר באזור שהתרגיל מסומן בו (גב תחתון). ⚠️ אבל רגל שנופלת חופשי מעמיסה על הגב יותר מירידה מבוקרת, ולכן הפתרון אינו לוותר על השליטה אלא לקצר אליה את המנוף: זווית הברך בירידה, ואחריה הטווח. העלייה זהה בכל השלבים, והשלב האחרון הוא היעד של המקור כלשונו.' },
  { kind: 'substitution', routine: 'B', source: 'Australian Pull-ups', app: 'b-row',
    what: '3×10-15 → רגליים מוגבהות, עצירה 2 שניות, 3×8-12',
    status: 'approved', decided: '2026-11-15',
    why: 'עמד על 3×15 עשרה שבועות. ⚠️ לתיעוד: במקור זה התרגיל האחרון ברשימה, כלומר כנראה פיניישר נפח ולא תרגיל כוח.' },
  { kind: 'addition', routine: 'B', app: 'b-mu',
    what: 'Negative Muscle-Up — אינו במקור',
    status: 'approved', decided: '2026-09-29',
    why: 'הוצע להוריד כי אינו במקור ואבי אינו מצליח אותו; אבי ביקש להשאיר וצילם ניסיון.' },

  // ---- אימון C (Routine 2) ----
  { kind: 'substitution', routine: 'C', source: 'Leg Press', app: 'c-box',
    what: 'לג-פרס → בוקס סקוואט',
    status: 'approved', decided: '2026-11-16',
    why: 'אבי: "לא רוצה לג-פרס במכונה. עברנו לתרגיל אחר במקום." הבוקס סקוואט שומר על כוונת המקור בטווח — הקופסה היא ה-"do not go low" — ומוסיף עבודת יציבות שאין במכונה.' },
  // הפער שנותר אינו זהות התרגיל אלא איפה יושב המשקל, וזו שאלה אחרת שלא
  // נשאלה עד כה. ערבבתי בין השתיים כשהצגתי, וזו הפרדה ולא חזרה להחלטה.
  { kind: 'dose', routine: 'C', source: 'Leg Press', app: 'c-box',
    what: 'הבוקס סקוואט נטען 50 ק"ג על הגב — מוט 20 ועוד 15 בכל צד',
    status: 'open',
    why: '⚠️ התנועה היחידה בכל שלוש השגרות שמפרה את עיקרון 1. תיקון להערכה קודמת שנמסרה כאן: גובלט אינו פותר אותה. כל משקל מוחזק דוחס את עמוד השדרה, גם מלפנים; הייחוד של הלג-פרס הוא שהגב נתמך והכוח עובר דרך הרגליים למשענת. אבי ויתר על מכונה, ולכן אין אפשרות שמסירה את העומס — רק ממזערת. ⚠️ זהו גם התרגיל היחיד ב-C שהתקדם (8→10), כלומר המקום היחיד שבו העומס על העמוד עולה עם הזמן.' },
  { kind: 'dose', routine: 'C', source: 'Forward Step Up', app: 'c-step',
    what: 'גובה 30 ס"מ במקום 45',
    status: 'approved', decided: '2026-11-16',
    why: 'אבי: "תשאיר איך שזה. אם ארצה, אשנה." ⚠️ לתיעוד: במקור שלושת תרגילי הרגליים חולקים גובה אחד (45), כך שאפשר להשוות ביניהם ולהתקדם בגובה כמשתנה יחיד. ב-30 הקשר הזה שבור, והגובה חדל להיות משתנה התקדמות.' },
  { kind: 'dose', routine: 'C', source: 'Sideways Step Up', app: 'c-step-lat',
    what: 'גובה 30 ס"מ במקום 45',
    status: 'approved', decided: '2026-11-16',
    why: 'אבי: "תשאיר איך שזה. אם ארצה, אשנה." ⚠️ כאן זה חשוב כפליים: העלייה הצידית היא היציבות הצידית של הברך, והיא נמדדת בגובה.' },
  { kind: 'addition', routine: 'C', app: 'c-ham',
    what: 'Nordic Curl — אינו במקור',
    status: 'approved', decided: '2026-11-16',
    why: 'אבי: "נורדיק, תשאיר". המסטרינג חזק הוא מה ששומר על הברך, וזה רלוונטי לו ישירות. ⚠️ משתנה ההתקדמות שלו אינו חזרות אלא זמן הירידה והטווח עד נקודת השבירה, ושניהם לא נרשמו — ולכן 3×6 שבעה אימונים.' },

  // ---- חימום ----
  { kind: 'addition', routine: 'warmup', app: '⚠️ שכבה יבשה על הגב',
    what: 'נוסף לחימום — כלל לבוש, לא תרגיל',
    status: 'approved', decided: '2026-11-23',
    why: 'אבי מזיע הרבה בכוונה: "אם אני בלעדיו ומזיע — הגב שלי נתפס ומתעקם", ולכן הסוויטשירט נשאר. מה שכן התברר הוא שהטריגר אינו היעדר שכבה אלא שכבה רטובה שמתקררת — כותנה ספוגה הופכת לקומפרס קר על הגב התחתון בדיוק כשעוצרים בין סטים, כלומר הסוויטשירט הרטוב מייצר את מה שהוא בא למנוע, רק מאוחר יותר באימון.' },
  { kind: 'addition', routine: 'warmup', app: 'Bird Dog ×8',
    what: 'נוסף לחימום — מדף הפיזיותרפיה, לא מהמקור',
    status: 'approved', decided: '2026-11-16',
    why: 'אבי: "תחזיר את הרוסיאן והלונג והכל. זה חימום." שני הפריטים המקוריים חזרו, ושתי התוספות מדף הפיזיו נשארות לצידם ולא במקומם. החימום מונה עשרה פריטים.' },
  { kind: 'addition', routine: 'warmup', app: 'Glute Bridge ×12',
    what: 'נוסף לחימום — מדף הפיזיותרפיה, לא מהמקור',
    status: 'approved', decided: '2026-11-16',
    why: 'אבי: "זה חימום". הפעלת ישבן לפני עבודת ציר ירכיים, לצד הפריטים המקוריים שחזרו ולא במקומם.' },
];

/** הפערים שעוד לא הוכרעו — מה שצריך להישאר מול העיניים. */
export const openDeviations = (): Deviation[] => DEVIATIONS.filter(d => d.status === 'open');
