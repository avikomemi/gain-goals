// משקלים עשרוניים בלוג האימון.
//
// הקלט הקודם היה parseInt על raw.replace(/[^0-9]/g, '') — הוא מחק את הנקודה
// והשאיר את הספרות, כך ש"17.5" הפך ל-175. זה לא "אי אפשר להקליד עשרוני":
// זו הזנה שגויה פי עשר, בשקט, בתוך לוג אימון.
//
// שתי ספרות אחרי הנקודה: 1.25 ק"ג היא הצלחת הקטנה ביותר במכון, ו-45 ליברות
// הן 20.41. יותר מזה הוא רעש.

/** חזרות הן מספר שלם — כאן ההתנהגות הישנה נכונה. */
export const clampReps = (raw: string, max = 999): number =>
  Math.min(max, Math.max(0, parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0));

/** מנקה קלט למחרוזת עשרונית תקינה: ספרות, לכל היותר נקודה אחת, שתיים אחריה.
 *  מחזיר מחרוזת ולא מספר, כדי ש"17." באמצע הקלדה לא ייבלע לפני ה-5. */
export function sanitizeWeight(raw: string): string {
  const s = (raw || '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const dot = s.indexOf('.');
  if (dot === -1) return s.slice(0, 3);
  return s.slice(0, dot).slice(0, 3) + '.' + s.slice(dot + 1).replace(/\./g, '').slice(0, 2);
}

export function parseWeight(raw: string, max = 999): number {
  const n = parseFloat(sanitizeWeight(raw));
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(0, Math.round(n * 100) / 100));
}

/** צעד +/− ששומר על העשרוני ולא גורר שגיאת נקודה צפה (18.499999999). */
export const stepWeight = (cur: number | undefined, delta: number, max = 999): number =>
  Math.min(max, Math.max(0, Math.round(((cur || 0) + delta) * 100) / 100));

/** תצוגה: 20 ולא 20.00, 17.5 ולא 17.50. */
export const fmtWeight = (n: number | undefined): string =>
  n === undefined ? '' : String(Math.round(n * 100) / 100);

/** ליברות לק"ג. משקולת מסומנת 45 lb היא 20.41, לא 45 ולא 20. */
export const lbToKg = (lb: number, max = 999): number =>
  Math.min(max, Math.round(lb * 0.45359237 * 100) / 100);
