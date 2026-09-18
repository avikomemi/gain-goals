// היעדים של אבי — במקום אחד, ושלו לקבוע.
// עד כה הם היו קבועים בקוד בשישה מקומות (הילה, הסקירה, הדשבורד, היומן, הטרנדים),
// כך שכל שינוי דרש קומיט. מכאן: מספר אחד בכל מסך, והוא בא מהטבלה הזאת.
import { DB } from './store';

export interface Goals {
  weightKg: number;        // משקל יעד
  paceGr: number;          // קצב ירידה גרם/שבוע — עם גאוט, מהר מדי זה טריגר
  protein: number;         // גרם ליום
  kcal: number;            // קלוריות ליום (יעד מרכזי; הטווח המוצג הוא ±100)
  fat: number;             // גרם ליום
  workouts: number;        // אימונים בשבוע
  weighIns: number;        // שקילות בשבוע — פחות מזה ואי אפשר למדוד מגמה
  waterMl: number;         // מ"ל ליום
  sleepMin: number;        // דקות שינה ללילה
}

// ברירות המחדל שנקבעו באינטייק (21.8). מי שלא נגע — ממשיך איתן.
export const DEFAULT_GOALS: Goals = {
  weightKg: 85, paceGr: 400, protein: 135, kcal: 1900, fat: 65,
  workouts: 3, weighIns: 3, waterMl: 2000, sleepMin: 360,
};

// גבולות שפויים — כדי שסליידר או אצבע לא יקבעו יעד מסוכן
export const GOAL_LIMITS: Record<keyof Goals, { min: number; max: number; step: number; label: string; unit: string }> = {
  weightKg: { min: 60, max: 150, step: 1, label: 'משקל יעד', unit: 'ק"ג' },
  paceGr: { min: 100, max: 900, step: 50, label: 'קצב ירידה', unit: "גר'/שבוע" },
  protein: { min: 60, max: 250, step: 5, label: 'חלבון', unit: "גר'/יום" },
  kcal: { min: 1200, max: 3500, step: 50, label: 'קלוריות', unit: 'קק"ל/יום' },
  fat: { min: 30, max: 150, step: 5, label: 'שומן', unit: "גר'/יום" },
  workouts: { min: 1, max: 7, step: 1, label: 'אימונים', unit: 'בשבוע' },
  weighIns: { min: 1, max: 7, step: 1, label: 'שקילות', unit: 'בשבוע' },
  waterMl: { min: 500, max: 4000, step: 250, label: 'מים', unit: 'מ"ל/יום' },
  sleepMin: { min: 240, max: 540, step: 15, label: 'שינה', unit: 'שעות' },
};

/** היעדים בפועל: מה שאבי קבע, ומה שלא — ברירת המחדל. waterGoal הישן ממשיך לעבוד. */
export function getGoals(db: DB): Goals {
  return {
    ...DEFAULT_GOALS,
    ...(db.waterGoal ? { waterMl: db.waterGoal } : {}),   // מיגרציה מהשדה הישן
    ...(db.goals || {}),
  };
}

export const clampGoal = (k: keyof Goals, v: number) => {
  const l = GOAL_LIMITS[k];
  return Math.max(l.min, Math.min(l.max, Math.round(v / l.step) * l.step));
};

/** תצוגה: דקות שינה כ-6:00, השאר כמספר */
export const goalText = (k: keyof Goals, v: number) =>
  k === 'sleepMin' ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` : String(v);

// ד"ר ארז: ירידה מהירה מ-1% ממשקל הגוף בשבוע היא טריגר גאוט. אזהרה, לא חסימה.
export const paceWarning = (g: Goals, currentKg?: number) =>
  currentKg && g.paceGr > currentKg * 10 ? `${g.paceGr} גר' לשבוע זה מעל 1% ממשקל הגוף — ד"ר ארז מזהיר: ירידה מהירה היא טריגר להתקף גאוט.` : null;
