// רגרסיה לפרסר התזונה של הילה. מה שנשבר כאן = הילה מציגה לאבי מספר לא נכון.
import { describe, expect, it } from 'vitest';
import { estimateFood, mergeFoods, FoodItem } from './foodDB';
import { hilaReview } from './hila';

const foods: FoodItem[] = mergeFoods(undefined);
const est = (t: string) => estimateFood(t, foods);
const names = (t: string) => est(t).lines.map(l => l.name);

describe('כמה מאכלים במשפט אחד', () => {
  // הבאג שאבי דיווח עליו: בלי פסיקים נספרה רק "שעועית ירוקה" (השם הארוך ביותר),
  // חזה העוף ותפוח האדמה נעלמו בשקט, והכמות נלקחה מהמספר של השכן.
  const want = ['חזה עוף', 'שעועית ירוקה', 'תפוח אדמה'];
  for (const text of [
    'חזה עוף 200 גרם, שעועית ירוקה 100 גרם, חצי תפוח אדמה',
    'חזה עוף 200 גרם ושעועית ירוקה 100 גרם וחצי תפוח אדמה',
    'חזה עוף 200 גרם שעועית ירוקה 100 גרם חצי תפוח אדמה',
  ]) {
    it(`מזהה שלושה מאכלים: ${text}`, () => {
      const e = est(text);
      expect(e.lines.map(l => l.name)).toEqual(want);
      expect(e.lines.map(l => l.macro[0])).toEqual([330, 31, 65]); // 200ג' עוף · 100ג' שעועית · חצי תפו"א
      expect(e.total.kcal).toBe(426);
      expect(e.total.p).toBe(65);   // 62 עוף + 2 שעועית + 1 תפו"א
    });
  }

  it('כל מאכל מקבל את הכמות שנכתבה לידו, לא של השכן', () => {
    const e = est('אורז 150 גרם וחזה עוף');
    expect(e.lines.map(l => l.qtyLabel)).toEqual(["150ג'", "150ג'"]); // עוף בלי מספר → מנה טיפוסית
    expect(e.total.kcal).toBe(443);
  });

  it('מספר יתום לפני שם שייך למאכל שאחריו', () => {
    expect(est('שעועית ירוקה 100 גרם חצי תפוח אדמה').lines.map(l => l.qty)).toEqual([100, 0.5]);
  });

  it('אותו מאכל בשני כינויים נספר פעם אחת', () => {
    expect(names('לחם מחמצת 2 פרוסות')).toEqual(['פרוסת לחם']);
    expect(est('לחם מחמצת 2 פרוסות').total.kcal).toBe(148);
  });

  it('שם ספציפי גובר על שם כללי שמוכל בו', () => {
    expect(names('פיתה שווארמה')).toEqual(['פיתה שווארמה']);
    expect(names('חצי תפוח אדמה')).toEqual(['תפוח אדמה']);   // לא "תפוח עץ"
    expect(names('קפה הפוך בבוקר')).toEqual(['קפה הפוך']);
    expect(names('חמאת בוטנים כף אחת')).toEqual(['חמאת בוטנים']);
  });
});

describe('כמויות', () => {
  it('מנות × משקל מפורש', () => {
    expect(est('2 מנות פרגית (100 גרם)').total.kcal).toBe(330); // 200 גרם, לא 2 גרם
  });
  it('פריט יחידה נספר ביחידות', () => {
    expect(est('2 תפוחי אדמה').lines[0].qty).toBe(2);
    expect(est('חצי אבוקדו').lines[0].qty).toBe(50); // פריט גרמים → חצי מנה
  });
  it('בלי מספר — מנה טיפוסית', () => {
    expect(est('משקה חלבון').total.p).toBe(25);
  });
});

describe('מה שלא במאגר נאמר בפה מלא', () => {
  it('מדווח על מאכל שלא מזוהה', () => {
    expect(est('שקשוקה עם פיתה').notInDB).toEqual(['שקשוקה']);
  });
  it('לא ממציא מאכלים ממילות זמן', () => {
    expect(names('קוטג בבוקר')).toEqual(['קוטג']);   // "בבוקר" אינו "בקר"
    expect(names('במבה 50 גרם בערב')).toEqual(['במבה']);
  });
});

// ---- המנוע האיכותי של הילה (הערות, לא מספרים) ----
describe('הילה — סיווג', () => {
  it('שעועית ירוקה היא ירק, לא קטנייה ולא מקור חלבון', () => {
    const r = hilaReview('חזה עוף 200 גרם שעועית ירוקה 100 גרם חצי תפוח אדמה', 0, 0);
    expect(r.found).toContain('ירקות/סלט');
    expect(r.found).not.toContain('קטניות');
    expect(r.notes.some(n => n.includes('מקור חלבון אחד'))).toBe(true); // רק העוף
  });
  it('שעועית רגילה עדיין קטנייה', () => {
    expect(hilaReview('אורז עם שעועית לבנה ברוטב עגבניות', 0, 0).found).toContain('קטניות');
  });
});

describe('גבינה לבנה — ניסוחים שאבי כותב', () => {
  it('כל הווריאציות מזוהות כאותו פריט', () => {
    for (const t of ['גבינה לבנה 125 גרם', 'גבינה 5% 125 גרם', 'גבינה 5 אחוז 125 גרם', 'לבנה 5% 125 גרם', 'גבינה רזה 125 גרם']) {
      const e = est(t);
      expect(e.lines.map(l => l.name), t).toEqual(['גבינה לבנה']);
      expect(e.total.kcal, t).toBe(123);   // 125 גרם
      expect(e.notInDB, t).toEqual([]);
    }
  });
  it('אחוז שומן במילים אינו כמות', () => {
    expect(est('גבינה לבנה 9 אחוז').lines[0].qty).toBe(100);  // מנה טיפוסית, לא 9 גרם
    expect(est('קוטג 5 אחוז 250 גרם').lines[0].qty).toBe(250);
  });
  it('גבינה צהובה לא מתבלבלת עם הלבנה', () => {
    expect(names('גבינה צהובה 30 גרם')).toEqual(['גבינה צהובה']);
  });
  it('הילה מסווגת גם את הניסוחים החדשים', () => {
    expect(hilaReview('גבינה 5 אחוז 125 גרם עם ירקות', 0, 0).found).toContain('מוצרי חלב');
  });
});
