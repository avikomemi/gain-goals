// מאמץ פר-סט. אבי, 23.11: "נראה לי שרמת הקושי צריכה להיות פר סט. יש סטים
// שבהם יש כשל."
//
// הוא צודק, וזה נוגע ישירות ל-prescribe. עד כה היה מספר אחד לתרגיל, ושלושה
// סטים של 8 נראו זהים לסט ראשון של 7 וסט שלישי של 10 — שהם מצב אחר לגמרי.
// הראשון אומר "יש מרווח", השני אומר "הגעת לקצה בסט האחרון".
//
// שתי קריאות שונות, בכוונה:
//   peak  — הסט הקשה ביותר. זה מה שבולם. אם סט אחד הגיע ל-9, לא מעלים.
//   opener — הסט הראשון. זה מה שאומר אם יש מרווח: סט פתיחה קל פירושו
//            שהעומס נמוך, גם אם הסט האחרון נשבר מעייפות מצטברת.
// מיזוג שלהם לממוצע היה מוחק בדיוק את ההבדל שבגללו הפיצול נעשה.

import { ExLog } from './store';

export interface ExEffort {
  peak: number;          // הסט הקשה ביותר
  opener: number;        // הסט הראשון שדווח
  reported: number;      // כמה סטים דווחו
  sets: number;          // כמה סטים הושלמו
}

/** המאמץ בתרגיל, מהסטים. נופל ל-rpe הישן ברמת התרגיל ברשומות ישנות. */
export function exEffort(e: ExLog): ExEffort | null {
  const done = (e.sets || []).filter(s => s.done);
  const vals = done.map(s => s.rpe).filter((r): r is number => typeof r === 'number');
  if (!vals.length) {
    if (typeof e.rpe !== 'number') return null;
    // רשומה ישנה: מספר אחד לתרגיל. הוא גם השיא וגם הפתיחה — אין מה לפצל.
    return { peak: e.rpe, opener: e.rpe, reported: 1, sets: done.length };
  }
  return { peak: Math.max(...vals), opener: vals[0], reported: vals.length, sets: done.length };
}

/** מספר אחד לתרגיל, לשימושים שצריכים אחד (עומס אימון, תצוגה). השיא. */
export const exRpe = (e: ExLog): number | undefined => exEffort(e)?.peak;

/** האם הסט האחרון היה קשה בהרבה מהראשון — סימן לעייפות מצטברת ולא לעומס גבוה. */
export const fades = (f: ExEffort | null): boolean =>
  !!f && f.reported >= 2 && f.peak - f.opener >= 2;
