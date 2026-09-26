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

// גרסת מיקום — יכולה לשנות גם מבנה (לא רק שם/הערה), כדי שחדר ובית יהיו תרגילים שונים באמת
export interface ExVariant { name?: string; note?: string; target?: string; setsDefault?: number; repsDefault?: number; timeBased?: boolean; weighted?: boolean; restDefault?: number }

export interface ExerciseDef {
  id: string;
  name: string;            // base Hebrew name
  target: string;          // sets x reps text
  setsDefault: number;
  repsDefault: number;
  weighted?: boolean;      // show weight field
  timeBased?: boolean;
  restDefault?: number;    // ברירת-מחדל זמן מנוחה לתרגיל (שניות) — נפילה כשאין הגדרה פר-תרגיל של אבי
  gym?: ExVariant;
  home?: ExVariant;
  note?: string;           // shared note
  area?: string;           // body area for pain correlation
  params?: ExParam[];      // פרמטרים מותאמים (גובה קופסה/מדרגה וכו') — סעיף 5
  tips?: string[];         // טיפים משתנים בקול הצוות — מוצג אחד לכל אימון, מתחלף (סעיף 5)
  harder?: string;         // איך מקשים בלי להוסיף עומס — לתרגילי שיקום, שבהם "קל מדי" לא פותרים במשקל
}

// 'P' = דף הפיזיותרפיה. אימון נפרד לחלוטין — לא חלק מסבב ABC, נבחר ידנית.
export type RoutineKey = 'A' | 'B' | 'C' | 'P';

export interface RoutineDef {
  key: RoutineKey;
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
      { id: 'a-pyramid', name: 'Energy Burst', target: '4×30 שנ\'', setsDefault: 4, repsDefault: 30, timeBased: true,
        gym: { name: 'Push-Up Pyramid', target: '8 פירמידות · 1→8', note: 'פירמידה עולה: שכיבה אחת → ג\'אמפינג ג\'ק → 2 שכיבות → ג\'אמפינג ג\'ק → ... עד 8. ג\'אמפינג ג\'ק אחד בין כל מדרגה. 8 פירמידות, 3 דק\' מנוחה ביניהן.', setsDefault: 8, repsDefault: 36, timeBased: false, restDefault: 180 },
        home: { name: 'Shadow Boxing Rounds', note: 'קומבינציות מהירות — מחליף ברפי' },
        tips: ['טל: זה פיניישר — קצב רציף בתוך הפירמידה, הג\'אמפינג ג\'ק שומר דופק. 3 דקות מנוחה בין פירמידה לפירמידה, ואז שוב.', 'רז: שכיבות נקיות, גוף ישר כמו קרש — גם בשלב 8. איכות לפני מספר.', 'מאיה: ג\'אמפינג ג\'ק בנחיתה רכה על כריות כף הרגל, ברכיים רכות. כואב ברך/גב? מהלך צד נמוך במקום קפיצה.', 'עמית: מחליף את האינטרוולים — כל האנרגיה, בלי מכונה. 8 פירמידות זה הרבה; אם נגמר הדלק, עוצרים ביושר.'] },
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

// ===== דף הפיזיותרפיה — אימון נפרד =====
// המרכז לפיזיותרפיה, 22.6.25. אבחנה: LBP (nerve root irritation) — גירוי שורש עצב.
// שמונת התרגילים, הסטים, החזרות והמשקלים הם כפי שנכתבו בדף. לא הוספנו ולא שינינו.
// אבי (25.9.26): "זה אימון נפרד לחלוטין מהשלושה שיש" — לכן הוא לא ב-PROGRAM,
// לא נכנס לסבב ABC, ולא נספר בכיול. בוחרים אותו ידנית ביום שהגב מדבר.
export const PHYSIO_BACK: RoutineDef = {
  key: 'P',
  name: 'שיקום גב',
  icon: '🩹',
  focus: 'שמונת התרגילים מדף הפיזיותרפיה, כלשונם. לימים שהגב התחתון מדבר — תנועה בלי עומס.',
  why: 'זה לא אימון חלופי ולא "אימון מופחת" — זה האימון שנכתב בדיוק למצב הזה, על ידי פיזיותרפיסט שבדק אותך. ארבעה מהתרגילים (Dead Bug, פלאנק צידי, Bird Dog, הרמת אגן) מייצבים את השרירים העמוקים שמחזיקים את הגב התחתון, וזה מה שמוריד את הכאב. הוא לא מחליף את A/B/C — הוא נבחר במקומם ביום שהגב לא מאפשר.',
  flexTitle: 'סיום · שחרור גב',
  warmup: [
    'הליכה 5-10 דקות — להיכנס לתנועה לפני',
    'Cat/Cow עדין ×10',
  ],
  exercises: [
    { id: 'p-deadbug', name: 'Dead Bug', target: '3×10 לכל צד', setsDefault: 3, repsDefault: 10, area: 'גב תחתון', restDefault: 60,
      note: 'הגב התחתון צמוד לרצפה לאורך כל התנועה — זה כל התרגיל',
      harder: '4 שניות לכל כיוון · העקב יורד קרוב יותר לרצפה',
      tips: ['מאיה: אם הגב התחתון מתרומם מהרצפה — הורד את הטווח. התרגיל הוא השטחת הגב, לא ההגעה רחוק.', 'נעה: ברכיים 90 מעלות, יד ורגל נגדיות יורדות לאט. איטי מנצח רחוק.'] },
    { id: 'p-sideplank', name: 'פלאנק צידי עם רוטציה', target: '3×10', setsDefault: 3, repsDefault: 10, area: 'גב תחתון', restDefault: 60,
      note: 'האגן לא צונח. היד העליונה מסתובבת מתחת לגוף וחוזרת',
      harder: 'עצירה של 3 שניות בסיבוב · מכף הרגל במקום מהברך',
      tips: ['נעה: קו ישר קרסול-ירך-כתף. ברגע שהאגן יורד — עוצרים את הסט.', 'מאיה: קשה מדי? על הברך התחתונה במקום על כף הרגל. אותה עבודה, פחות מנוף.'] },
    { id: 'p-boxsquat', name: 'Box Squat', target: '3×12', setsDefault: 3, repsDefault: 12, weighted: true, area: 'גב תחתון', restDefault: 90,
      note: '⚠️ מהדף: 8-9 ק"ג. נוגעים בקופסה, לא נופלים עליה. כאב 4+ — מדלגים על התרגיל הזה',
      params: [{ key: 'boxH', label: 'גובה קופסה', unit: 'ס"מ', step: 5, def: 40 }],
      harder: 'ירידה איטית יותר · עצירה קצרה על הקופסה. משקל רק כשהגב מתחת ל-2',
      tips: ['מאיה: זה אחד משני התרגילים עם משקל בדף. בכאב 4+ הוא יורד — אין סיבה לעמוס על גב שכבר מציק.', 'נעה: הישבן אחורה לקופסה, גב ישר, חזה למעלה. נגיעה ולקום.'] },
    { id: 'p-birddog', name: 'Bird Dog', target: '3×8-10 לכל צד', setsDefault: 3, repsDefault: 10, area: 'גב תחתון', restDefault: 60,
      note: 'יד ורגל נגדיות עד קו ישר עם הגוף — לא גבוה מזה. האגן לא מסתובב',
      harder: 'החזקה של 5 שניות בסוף כל חזרה',
      tips: ['נעה: תאריך את היד והרגל, אל תרים אותן. אורך, לא גובה.', 'מאיה: אם האגן מתהפך — זה כבר לא Bird Dog. תוריד טווח ותשמור על האגן מרובע.'] },
    { id: 'p-sldl', name: 'Single Leg Deadlift', target: '3×8 לכל רגל', setsDefault: 3, repsDefault: 8, weighted: true, area: 'גב תחתון', restDefault: 90,
      note: '⚠️ מהדף: 6 ק"ג. התנועה מהירך, הגב ישר כל הזמן. כאב 4+ — מדלגים על התרגיל הזה',
      harder: 'ירידה איטית יותר · עצירה בתחתית. משקל רק כשהגב מתחת ל-2',
      tips: ['נעה: ציר ירכיים — הישבן אחורה והרגל האחורית עולה כמו מאזניים.', 'מאיה: התרגיל השני עם משקל. בכאב 4+ הוא יורד יחד עם ה-Box Squat.'] },
    { id: 'p-hiplift', name: 'הרמת אגן על רגל אחת', target: '3×10 לכל רגל', setsDefault: 3, repsDefault: 10, area: 'גב תחתון', restDefault: 60,
      note: 'מהדף: כף רגל על קופסה. קו ישר כתף-ירך-ברך, סוחטים ישבן למעלה',
      params: [{ key: 'boxH', label: 'גובה קופסה', unit: 'ס"מ', step: 5, def: 30 }],
      harder: '3 שניות סחיטה למעלה · ירידה איטית',
      tips: ['נעה: הכוח מהישבן, לא מהגב התחתון. אם מרגישים בגב — ירדת נמוך מדי עם האגן או קימרת.', 'מאיה: הישבן החלש הוא הסיבה שהגב עובד במקומו. זה התרגיל שמתקן את זה.'] },
    { id: 'p-bandwalk', name: 'הליכה צידית עם גומייה', target: '3×10 לכל כיוון', setsDefault: 3, repsDefault: 10, area: 'גב תחתון', restDefault: 60,
      note: 'מהדף: גומייה. חצי כפיפת ברכיים, הברכיים לא נופלות פנימה',
      harder: 'גומייה חזקה יותר · ברכיים כפופות יותר · צעד רחב, חזרה קטנה',
      tips: ['נעה: הגומייה מעל הברכיים או על הקרסוליים — צעד רחב, חזרה קטנה. לא לגרור.', 'מאיה: שרירי הישבן הצדדיים מייצבים את האגן בהליכה. חלשים = הגב משלם.'] },
    { id: 'p-woodchop', name: 'Wood Chop', target: '3×10 לכל צד', setsDefault: 3, repsDefault: 10, area: 'גב תחתון', restDefault: 60,
      note: 'מהדף: גומייה. הסיבוב מהגוף, לא מהידיים',
      harder: 'החזרה האיטית היא התרגיל, לא המשיכה',
      tips: ['רז: זו בדיוק תנועת העברת הכוח באלכסון — אותו מנגנון של מכה מסתובבת.', 'מאיה: מבוקר, בלי תנופה. רוטציה מהירה בעומס זה מה שאנחנו נמנעים ממנו.'] },
  ],
  flexibility: [
    { name: 'Figure-4 Piriformis', dose: '45 שנ\' לצד' },
    { name: 'Child Pose', dose: '60 שנ\'' },
    { name: 'ברך לחזה (לסירוגין)', dose: '30 שנ\' לרגל' },
  ],
};

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

// תווית קצרה לאימון בהיסטוריה — ABC לפי האות, הפיזיו בשמו
export const routineLabel = (k: RoutineKey) => (k === 'P' ? PHYSIO_BACK.name : `אימון ${k}`);

// חיפוש לפי מפתח כולל האימון הנפרד — PROGRAM נשאר ABC בלבד כדי שהסבב לא ייגע
export const routineByKey = (k: RoutineKey): RoutineDef | undefined =>
  k === 'P' ? PHYSIO_BACK : PROGRAM.find(r => r.key === k);

export const BODY_AREAS = ['גב תחתון', 'גב עליון', 'ברך ימין', 'ברך שמאל', 'כתף ימין', 'כתף שמאל', 'כף רגל (גאוט)', 'צוואר', 'מרפק', 'אחר'];

export function exName(ex: ExerciseDef, loc: Loc): string {
  return (loc === 'home' ? ex.home?.name : ex.gym?.name) || ex.name;
}
export function exNote(ex: ExerciseDef, loc: Loc): string | undefined {
  const locNote = loc === 'home' ? ex.home?.note : ex.gym?.note;
  return [ex.note, locNote].filter(Boolean).join(' · ') || undefined;
}

// מבנה אפקטיבי פר-מיקום: הגרסה (חדר/בית) גוברת על הבסיס. מאפשר תרגיל שונה בחדר ובבית.
export function exStruct(ex: ExerciseDef, loc: Loc): { setsDefault: number; repsDefault: number; timeBased?: boolean; weighted?: boolean; restDefault?: number; target: string } {
  const v = loc === 'home' ? ex.home : ex.gym;
  return {
    setsDefault: v?.setsDefault ?? ex.setsDefault,
    repsDefault: v?.repsDefault ?? ex.repsDefault,
    timeBased: v?.timeBased ?? ex.timeBased,
    weighted: v?.weighted ?? ex.weighted,
    restDefault: v?.restDefault ?? ex.restDefault,
    target: v?.target ?? ex.target,
  };
}
