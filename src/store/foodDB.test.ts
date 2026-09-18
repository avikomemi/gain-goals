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
    expect(est('פירה עם פיתה').notInDB).toEqual(['פירה']);
    expect(names('פירה עם פיתה')).toEqual(['פיתה']);
  });
  it('שקשוקה וחלבון זול נכנסו למאגר', () => {
    for (const t of ['שקשוקה', 'עדשים', 'חזה הודו 200 גרם', 'טופו', 'גרגרי חומוס', 'יוגורט יווני'])
      expect(est(t).notInDB, t).toEqual([]);
    expect(est('חזה הודו 200 גרם').total.p).toBe(58);
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

// ---- השורה האמיתית מהיומן של אבי (17.9) — ארבעה כשלים בבת אחת ----
describe('ספירה מול משקל', () => {
  it('מספר לפני השם הוא מנות, לא גרמים', () => {
    expect(est('3 חזה עוף').lines[0].qty).toBe(450);       // 3 מנות של 150, לא 3 גרם
    expect(est('2 מנות עוף').lines[0].qty).toBe(300);
    expect(est('2 פרוסות גבינה צהובה').lines[0].qty).toBe(60);
  });
  it('מספר אחרי השם הוא משקל', () => {
    expect(est('במבה 50').lines[0].qty).toBe(50);
    expect(est('חזה עוף 200 גרם').lines[0].qty).toBe(200);
  });
  it('ספירה רק כשיש מה לספור — 10 שקדים אינם 10 חופנים', () => {
    expect(est('10 שקדים').lines[0].qty).toBe(10);
  });
  it('מספרים במילים', () => {
    expect(est('שתי במבות').lines[0].qty).toBe(100);
    expect(est('חביתה משתי ביצים').lines[0].qty).toBe(2);
  });
});

describe('שמות שנפלו', () => {
  it('"גבינה" סתם = גבינה לבנה, בלי לבלוע את השאר', () => {
    expect(names('גבינה 125 גרם')).toEqual(['גבינה לבנה']);
    expect(names('גבינה בולגרית 50 גרם')).toEqual(['גבינה בולגרית']);
    expect(names('גבינה צהובה 30 גרם')).toEqual(['גבינה צהובה']);
  });
  it('רבים: במבות, פיתות', () => {
    expect(names('2 פיתות')).toEqual(['פיתה']);   // לא "תות שדה"
    expect(names('שתי במבות')).toEqual(['במבה']);
  });
  it('השורה המלאה של אבי — הכול מזוהה', () => {
    const e = est('יוגורט מולטי 3% שומן, 3 חזה עוף , חצי תפוח אדמה, קערית קטנה שעועית ירוקה. גבינה 125 גרם, 2 פרוסות לחם כוסמין, חביתה משתי ביצים.  שתי במבות');
    expect(e.notInDB).toEqual([]);
    expect(e.lines).toHaveLength(8);
    expect(e.total.kcal).toBe(1890);
  });
});

describe('אגוזים — כל אגוז והערך שלו', () => {
  it('פקאן מזוהה בכל ניסוח, ובערכים שלו (לא של שקד)', () => {
    for (const t of ['אגוזי פקאן', 'פקאן', 'פקאנים', 'אגוז פקאן']) {
      expect(names(t), t).toEqual(['אגוזי פקאן']);
      expect(est(t).total.kcal, t).toBe(193);   // 28 גר' × 691 — שקד היה נותן 162
    }
  });
  it('אגוז מלך נפרד גם הוא', () => {
    expect(est('אגוזי מלך 30 גרם').lines[0].macro[0]).toBe(196);
  });
  it('שקד/קשיו נשארים במאגר הכללי', () => {
    expect(names('שקדים 30 גרם')).toEqual(['שקדים']);
    expect(est('שקדים 30 גרם').total.kcal).toBe(174);
  });
});

describe('פריט-יחידה עם מספר גדול', () => {
  it('"פיתת מחמצת 150" = 150 גרם, לא 150 פיתות', () => {
    const e = est('פיתת מחמצת 150');
    expect(e.lines).toHaveLength(1);             // פיתת מחמצת = פריט אחד, לא פיתה + לחם
    expect(e.lines[0].qtyLabel).toBe("150ג'");
    expect(e.total.kcal).toBe(413);              // לפני התיקון: 11,115 (150 פיתות)
  });
  it('מספר קטן אחרי פריט-יחידה נשאר ספירה', () => {
    expect(est('ביצים 3').lines[0].qty).toBe(3);
    expect(est('פיתה 2').lines[0].qty).toBe(2);
  });
});

describe('מיזוג המאגר', () => {
  it('פריט-זרע מתעדכן גם אם כבר קיים אצל המשתמש (אחרת תיקונים לא מגיעים למכשיר)', () => {
    const stale: FoodItem = { id: 'white5', names: ['לבנה 5'], per100: [98, 9, 4.3, 5], unit: 'g', def: 100 };
    const merged = mergeFoods([stale]);
    const white = merged.find(f => f.id === 'white5')!;
    expect(white.names).toContain('גבינה');          // הכינוי החדש הגיע
    expect(estimateFood('גבינה 125 גרם', merged).lines).toHaveLength(1);
  });
  it('מאכל שאבי הוסיף בעצמו נשמר', () => {
    const mine: FoodItem = { id: 'my-thing', names: ['התבשיל של אשתי'], per100: [200, 10, 20, 8], unit: 'g', def: 300 };
    expect(mergeFoods([mine]).find(f => f.id === 'my-thing')).toEqual(mine);
  });
});

describe('יוגורט ביו (מהתווית שאבי צילם)', () => {
  it('גביע = 134 קק"ל · 10 גר\' חלבון, והאנרגיה מסתדרת עם המאקרו', () => {
    const e = est('יוגורט ביו');
    expect(e.lines[0].qtyLabel).toBe('1 גביע');
    expect(e.lines[0].macro).toEqual([134, 10, 10, 6]);
    const [kcal, p, c, f] = e.lines[0].macro;
    expect(Math.abs(p * 4 + c * 4 + f * 9 - kcal)).toBeLessThan(15);   // התווית עקבית
  });
  it('משקל מפורש עדיין גובר', () => {
    expect(est('יוגורט ביו 100 גרם').total.kcal).toBe(67);
  });
});
