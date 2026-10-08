// רגרסיה לפרסר התזונה של הילה. מה שנשבר כאן = הילה מציגה לאבי מספר לא נכון.
import { describe, expect, it } from 'vitest';
import { estimateFood, mergeFoods, unknownFoods, FoodItem } from './foodDB';
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

describe('גמישות: סלמון, שוקולד ומזונות נפח', () => {
  it('מזוהים עם הערכים שלהם', () => {
    expect(names('סלמון 150 גרם')).toEqual(['סלמון']);
    expect(est('סלמון 150 גרם').total.p).toBe(33);
    expect(names('שוקולד מריר 30 גרם')).toEqual(['שוקולד מריר']);   // מריר גובר על "שוקולד" סתם
    expect(names('שוקולד 25 גרם')).toEqual(['שוקולד חלב']);
    expect(est('מרק ירקות').total.kcal).toBe(105);                   // 300 גר' — נפח, לא קלוריות
    expect(est('פופקורן').notInDB).toEqual([]);
  });
  it('מרק ירקות אינו סלט ירקות', () => {
    expect(names('מרק ירקות 400 גרם')).toEqual(['מרק ירקות']);
  });
});

describe('סוכריה על מקל (מוליפופ)', () => {
  it('סוכריה אחת = 25 קק"ל', () => {
    expect(est('סוכריה על מקל').total.kcal).toBe(25);
    expect(est('3 מוליפופ').total.kcal).toBe(75);
    expect(names('מוליפופ')).toEqual(['סוכריה על מקל']);
  });
});

// דבש + גודל כף/כפית — אבי: "הילה לא מכירה כפית דבש או חצי כפית דבש."
describe('דבש וגודל הכף', () => {
  const kcal = (t: string) => estimateFood(t, foods).total.kcal;
  const line = (t: string) => estimateFood(t, foods).lines[0];

  it('כפית דבש = 7 גרם', () => {
    expect(kcal('כפית דבש')).toBe(21);
    expect(line('כפית דבש').qtyLabel).toBe('1 כפית');
  });

  it('חצי כפית דבש = חצי מזה', () => {
    expect(kcal('חצי כפית דבש')).toBe(11);
    expect(line('חצי כפית דבש').qtyLabel).toBe("3.5ג'");
  });

  it('"דבש" לבד = כפית', () => {
    expect(kcal('דבש')).toBe(21);
  });

  it('כף דבש = שלוש כפיות', () => {
    expect(kcal('כף דבש')).toBe(64);
    expect(line('כף דבש').qtyLabel).toBe('3 כפיות');
  });

  it('2 כפיות דבש', () => {
    expect(kcal('2 כפיות דבש')).toBe(43);
  });

  it('משקל מפורש בגרמים גובר על גודל הכף', () => {
    expect(kcal('דבש 20 גרם')).toBe(61);
  });

  it('הדבש לא בולע את שאר המשפט', () => {
    const e = estimateFood('כפית דבש, 2 פרוסות לחם כוסמין', foods);
    expect(e.lines).toHaveLength(2);
    expect(e.total.kcal).toBe(21 + 148);
  });

  // אותו תיקון מציל פריטי-כף קיימים שנספרו פי-3 יותר מדי
  it('כפית טחינה היא שליש כף, לא כף שלמה', () => {
    expect(kcal('כפית טחינה')).toBe(30);
    expect(kcal('2 כפות טחינה')).toBe(179);
  });

  it('כפית שמן זית', () => {
    expect(kcal('כפית שמן זית')).toBe(40);
  });

  it('"כף טחינה" היא כף אחת, לא מנת ברירת-המחדל של שתיים', () => {
    expect(kcal('כף טחינה')).toBe(89);
    expect(kcal('טחינה')).toBe(179);   // בלי מילת כף — מנת ברירת-המחדל, כמו קודם
  });

  it('חצי כף טחינה', () => {
    expect(kcal('חצי כף טחינה')).toBe(45);
  });
});

// יומן 27.9: "גלידת פיסטוק" נספרה כאגוזים ו"5 עוגיות תמרים" כחמישה תמרים — יחד
// כ-500 קק"ל שלא נספרו. שמות ארוכים חייבים לנצח את השמות שבלועים בתוכם.
describe('גלידה, עוגיות ותה', () => {
  const kcal = (t: string) => estimateFood(t, foods).total.kcal;

  it('גלידת פיסטוק היא גלידה, לא אגוזים', () => {
    const e = estimateFood('גלידת פיסטוק של מקדונלדס', foods);
    expect(e.lines).toHaveLength(1);
    expect(e.lines[0].name).toBe('גלידה');
    expect(e.total.kcal).toBe(290);
  });

  it('"פיסטוק" לבד עדיין אגוזים', () => {
    expect(estimateFood('פיסטוק', foods).lines[0].name).toBe('שקדים');
  });

  it('5 עוגיות תמרים הן עוגיות, לא 5 תמרים', () => {
    const e = estimateFood('5 עוגיות תמרים', foods);
    expect(e.lines).toHaveLength(1);
    expect(e.total.kcal).toBe(504);
  });

  it('"3 תמרים" עדיין תמרים', () => {
    expect(estimateFood('3 תמרים', foods).lines[0].name).toBe('תמר');
  });

  it('תה נספר — ולא בולע מאכלים אחרים', () => {
    expect(kcal('כוס תה')).toBe(2);
    expect(kcal('תה ירוק')).toBe(2);
    // "תה" לבד יושב בתוך "חביתה" ובתוך "פיתה" — לכן רק צירופים מלאים
    expect(estimateFood('חביתה משתי ביצים', foods).lines[0].name).toBe('ביצה');
    expect(estimateFood('פיתה', foods).lines[0].name).toBe('פיתה');
  });

  it('עוגייה גנרית', () => {
    expect(kcal('2 עוגיות')).toBe(188);
  });
});

// חטיף שוקולד-בוטנים מהתווית שאבי צילם (30.9)
describe('קראנץ בוטנים', () => {
  const kcal = (t: string) => estimateFood(t, foods).total.kcal;

  it('בשם שלו, ובשמות הגנריים', () => {
    expect(kcal('קראנץ בוטנים')).toBe(304);
    expect(kcal('קראנץ')).toBe(304);
    expect(kcal('חטיף שוקולד בוטנים')).toBe(304);
    expect(estimateFood('קראנץ בוטנים', foods).lines[0].name).toBe('קראנץ בוטנים');
  });

  it('לא מתפצל לשניים — "בוטנים" נבלע בשם המלא', () => {
    expect(estimateFood('קראנץ בוטנים', foods).lines).toHaveLength(1);
  });

  it('חצי חטיף', () => {
    expect(kcal('חצי קראנץ')).toBe(152);
  });

  it('לא בולע את "בוטנים" ואת "חמאת בוטנים"', () => {
    expect(estimateFood('בוטנים', foods).lines[0].name).toBe('שקדים');
    expect(estimateFood('חמאת בוטנים', foods).lines[0].name).toBe('חמאת בוטנים');
  });

  it('משקל מפורש גובר', () => {
    expect(kcal('קראנץ בוטנים 40 גרם')).toBe(154);
  });
});

// תור המאכלים שלא זוהו — נגזר מהיומן, מרפא את עצמו
// פריט-בדיקה שלעולם לא ייכנס למסד. בעבר השתמשנו במאכלים אמיתיים (קולורבי,
// אמנון) — והם נבלעו ברגע שהמסד גדל, ושברו בדיקות שלא היו קשורות לשינוי.
// חשוב: אסור שיכיל מילת FILLER. הגרסה הראשונה הייתה 'מאכל-בדיקה-שלא-קיים',
// ו'שלא' מכיל את 'של' — ולכן המילה נוקתה והפריט לא דווח כלל.
const SENTINEL = 'מאכל-בדיקה';

describe('ממתינים למסד', () => {
  const d = (back: number) => new Date(Date.now() - back * 864e5).toISOString().slice(0, 10);

  it('אוסף מה שלא זוהה, ומדלג על מה שכן', () => {
    const q = unknownFoods([{ date: d(1), text: 'חזה עוף 200 גרם, ' + SENTINEL }], foods);
    expect(q).toHaveLength(1);
    expect(q[0].text).toContain(SENTINEL);
  });

  it('מאחד חזרות וסופר ימים', () => {
    const q = unknownFoods([
      { date: d(3), text: SENTINEL },
      { date: d(1), text: SENTINEL },
    ], foods);
    expect(q).toHaveLength(1);
    expect(q[0].times).toBe(2);
    expect(q[0].firstSeen).toBe(d(3));
    expect(q[0].lastSeen).toBe(d(1));
  });

  it('מה שחוזר יותר מופיע ראשון', () => {
    const q = unknownFoods([
      { date: d(5), text: 'ירק מוזר אחד' },
      { date: d(4), text: 'ירק מוזר שני' },
      { date: d(3), text: 'ירק מוזר שני' },
    ], foods);
    expect(q[0].text).toContain('שני');
  });

  it('מכבד את טווח התאריכים', () => {
    const entries = [{ date: d(40), text: SENTINEL }];
    expect(unknownFoods(entries, foods, d(21))).toHaveLength(0);
    expect(unknownFoods(entries, foods, d(60))).toHaveLength(1);
  });

  it('נעלם לבד ברגע שהמאכל נכנס למסד', () => {
    const entries = [{ date: d(1), text: 'קראנץ בוטנים' }];
    expect(unknownFoods(entries, foods)).toHaveLength(0);   // כבר במסד
  });

  it('לא נופל על יומן ריק או חסר', () => {
    expect(unknownFoods(undefined, foods)).toEqual([]);
    expect(unknownFoods([{ date: d(1), text: '' }], foods)).toEqual([]);
  });
});

describe('קבבונים', () => {
  const kcal = (t: string) => estimateFood(t, foods).total.kcal;
  const name = (t: string) => estimateFood(t, foods).lines[0].name;

  it('ברבים, ביחיד ובקיצור — אותו פריט', () => {
    expect(name('קבבונים')).toBe('קבבונים');
    expect(name('קבבון')).toBe('קבבונים');   // נו"ן סופית — לא תת-מחרוזת, לכן כינוי נפרד
    expect(name('קבב')).toBe('קבבונים');
  });

  it('סופר יחידות', () => {
    expect(kcal('קבבונים')).toBe(265);     // ברירת מחדל 2
    expect(kcal('3 קבבונים')).toBe(398);
    expect(kcal('קבבונים 200 גרם')).toBe(530);
  });

  it('מסומן גאוט — בשר אדום', () => {
    expect(foods.find(f => f.id === 'kebab')!.gout).toBe('high');
  });

  it('קבבוני הודו הם פריט אחר, בלי דגל גאוט', () => {
    expect(name('קבבוני הודו')).toBe('קבבוני הודו');
    expect(name('4 קבבוני עוף')).toBe('קבבוני הודו');
    expect(foods.find(f => f.id === 'kebab_poultry')!.gout).toBe('ok');
    expect(kcal('קבבוני הודו')).toBeLessThan(kcal('קבבונים'));
  });

  it('לא בולע את הודו ואת הבקר הרגילים', () => {
    expect(name('חזה הודו')).toBe('חזה הודו');
    expect(name('סטייק')).toBe('סטייק');
  });
});

describe('ארוחת מסעדה — עוף בתנור, ממולאים וסלטים', () => {
  const name = (t: string) => estimateFood(t, foods).lines[0].name;
  const kcal = (t: string) => estimateFood(t, foods).total.kcal;

  it('ירך/שוק/כרעיים אינם חזה — פריט נפרד ושמן יותר', () => {
    expect(name('ירך עוף')).toBe('ירך עוף');
    expect(name('שוק עוף')).toBe('ירך עוף');
    expect(name('כרעיים')).toBe('ירך עוף');
    expect(name('עוף בתנור')).toBe('ירך עוף');
    expect(kcal('ירך עוף 200 גרם')).toBeGreaterThan(kcal('חזה עוף 200 גרם'));
  });

  it('לא בולע את חזה העוף, את ההודו ואת השוקולד', () => {
    expect(name('חזה עוף')).toBe('חזה עוף');
    expect(name('עוף')).toBe('חזה עוף');
    expect(name('שניצל')).toBe('חזה עוף');
    expect(name('חזה הודו')).toBe('חזה הודו');
    expect(name('שוקולד')).toBe('שוקולד חלב');   // 'שוק' אינו כינוי בודד בכוונה
    expect(name('שוקולד מריר')).toBe('שוקולד מריר');
  });

  it('ממולא נספר כממולא, לא כירק ריק', () => {
    expect(name('ממולאים')).toBe('ממולאים');
    expect(name('קישואים ממולאים')).toBe('ממולאים');
    expect(name('כרוב ממולא')).toBe('ממולאים');
    expect(name('פלפלים ממולאים')).toBe('ממולאים');
    expect(kcal('3 ממולאים')).toBe(504);
    expect(kcal('קישואים ממולאים')).toBeGreaterThan(5 * kcal('קישוא'));
  });

  it('הירקות החיים נשארים כמו שהם', () => {
    expect(name('קישוא')).toBe('קישוא');
    expect(name('כרוב')).toBe('כרוב');
    expect(name('פלפל')).toBe('פלפל');
  });

  it('עלי גפן, סלט סלק וסחוג נכנסו', () => {
    expect(name('עלי גפן')).toBe('עלי גפן');
    expect(name('סלט סלק')).toBe('סלט סלק');
    expect(name('סחוג')).toBe('סחוג');
    expect(kcal('סלט סלק 100 גרם')).toBeGreaterThan(kcal('סלק 100 גרם'));  // שמן ולימון
  });

  it('סלט סלק לא גונב את סלט הירקות ולא את הסלק החי', () => {
    expect(name('סלט ירקות')).toBe('סלט ירקות');
    expect(name('סלט')).toBe('סלט ירקות');
    expect(name('סלק')).toBe('סלק');
  });

  it('צלחת מסעדה שלמה — כל הפריטים מזוהים', () => {
    const r = estimateFood(
      'ירך עוף 200 גרם, 4 ממולאים, בטטה אפויה 80 גרם, גזר אפוי 80 גרם, סלט ירקות 150 גרם, סלט סלק 100 גרם, כף סחוג',
      foods,
    );
    expect(r.notInDB).toEqual([]);
    expect(r.lines).toHaveLength(7);
    expect(r.total.kcal).toBeGreaterThan(1300);
    expect(r.total.p).toBeGreaterThan(80);
  });

  it('ירק בתנור אינו ירק חי — השמן נספר', () => {
    expect(name('ירקות בתנור')).toBe('ירקות בתנור');
    expect(name('קישואים בתנור')).toBe('ירקות בתנור');
    expect(name('כרוב אפוי')).toBe('ירקות בתנור');
    expect(name('חציל בתנור')).toBe('ירקות בתנור');
    expect(kcal('קישואים בתנור 200 גרם')).toBeGreaterThan(4 * kcal('קישוא 200 גרם'));
    expect(name('קוסא')).toBe('קישוא');   // קוסא = קישוא, והוא עדיין ירק חי
  });

  it('צלחת מסעדה שלמה — כל הפריטים מזוהים', () => {
    const r = estimateFood(
      'ירך עוף 200 גרם, קישואים בתנור 250 גרם, כרוב בתנור 100 גרם, בטטה אפויה 80 גרם, '
      + 'גזר אפוי 80 גרם, סלט ירקות 150 גרם, סלט סלק 100 גרם, כף סחוג',
      foods,
    );
    expect(r.notInDB).toEqual([]);
    expect(r.lines).toHaveLength(8);
    expect(r.total.kcal).toBeGreaterThan(1000);
    expect(r.total.p).toBeGreaterThan(55);
  });
});

describe('אורז שהתבשל בתוך הבשר', () => {
  const name = (t: string) => estimateFood(t, foods).lines[0].name;
  const kcal = (t: string) => estimateFood(t, foods).total.kcal;

  it('סופג שומן — יותר מאורז לבן במים', () => {
    expect(name('אורז מהתבשיל')).toBe('אורז מהתבשיל');
    expect(name('אורז בתנור')).toBe('אורז מהתבשיל');
    expect(name('מילוי אורז')).toBe('אורז מהתבשיל');
    expect(kcal('אורז מהתבשיל 150 גרם')).toBeGreaterThan(kcal('אורז 150 גרם'));
  });

  it('לא בולע את האורז הרגיל', () => {
    expect(name('אורז')).toBe('אורז');
    expect(name('אורז 150 גרם')).toBe('אורז');
  });
});

describe('כינויים חייבים להיות ניתנים-לתפיסה', () => {
  // estimateFood מפצל את הטקסט למקטעים לפני המטצ'ר. כינוי שמכיל מפריד
  // (פסיק, ' עם ', וא"ו חיבור) לא ייתפס לעולם — באג שקט שאין לו שום סימן חיצוני.
  const SEP = /[\n,.·;]+|\s+ו(?!ניל|ופל|יטמין|רוד|רק\s)|\s+עם\s+/;

  it('אף כינוי במסד אינו מכיל מפריד', () => {
    const bad = foods.flatMap(f => f.names.filter(n => SEP.test(n)).map(n => `${f.id}: "${n}"`));
    expect(bad).toEqual([]);
  });

  it('וא"ו של מילה עברית אינה מפרידה, וא"ו חיבור כן', () => {
    expect(estimateFood('גלידת וניל 100 גרם', foods).lines).toHaveLength(1);
    expect(estimateFood('לחם וגבינה', foods).lines).toHaveLength(2);
    expect(estimateFood('יוגורט פרו ואוכמניות', foods).lines).toHaveLength(2);
  });
});

describe('משקה חלבון ביתי', () => {
  const name = (t: string) => estimateFood(t, foods).lines[0].name;
  const line = (t: string) => estimateFood(t, foods).lines[0];
  const ratio = (id: string) => {
    const f = foods.find(x => x.id === id)!;
    return f.per100[0] / f.per100[1];        // קק"ל לכל גרם חלבון
  };

  it('זרעים ואגוזים הם מקור שומן, לא מקור חלבון', () => {
    // זו כל הסיבה שחמאת בוטנים אינה הבסיס הנכון לשייק בחיטוב.
    expect(ratio('skyr')).toBeLessThan(6);          // יוגורט יווני — הטוב שבאוכל אמיתי
    expect(ratio('peanutbutter')).toBeGreaterThan(20);
    expect(ratio('chia')).toBeGreaterThan(ratio('peanutbutter'));   // צ'יה גרועה מחמאת בוטנים
    expect(ratio('flax')).toBeGreaterThan(ratio('peanutbutter'));
    expect(ratio('almondmilk')).toBeGreaterThan(30);  // חלב שקדים = מים בטעם
  });

  it('השייק הביתי אינו סקופ אבקה', () => {
    expect(name('שייק חלבון ביתי')).toBe('שייק חלבון ביתי');
    expect(name('שייק ביתי')).toBe('שייק חלבון ביתי');
    expect(name('משקה חלבון ביתי')).toBe('שייק חלבון ביתי');
    expect(name('שייק חלבון')).toBe('אבקת חלבון');     // הקנוי נשאר הקנוי
    expect(name('סקופ')).toBe('אבקת חלבון');
  });

  it('מספרי השייק תואמים את המתכון שהורכב', () => {
    const l = line('שייק חלבון ביתי');
    expect(l.macro[0]).toBeGreaterThanOrEqual(345);   // ~353 קק"ל
    expect(l.macro[0]).toBeLessThanOrEqual(360);
    expect(l.macro[1]).toBeGreaterThanOrEqual(36);    // ~38 ח'
  });

  it('המתכון המפורט מסתכם כמו הפריט המורכב', () => {
    const r = estimateFood('יוגורט יווני 250 גרם, חלב 150 מל, כף חמאת בוטנים, כפית קקאו', foods);
    expect(r.notInDB).toEqual([]);
    expect(r.total.kcal).toBe(353);
    expect(Math.abs(r.total.kcal - line('שייק חלבון ביתי').macro[0])).toBeLessThanOrEqual(2);
  });

  it('רכיבי השייק מזוהים אחד-אחד, כולל חלב 1%', () => {
    const r = estimateFood('יוגורט יווני 250 גרם, חלב 1% 150 מל, כף חמאת בוטנים, כפית קקאו', foods);
    expect(r.notInDB).toEqual([]);
    expect(r.lines).toHaveLength(4);
    expect(r.lines[1].name).toBe('חלב 1%');
    expect(r.lines[1].macro[0]).toBe(63);             // ה-'1' של 1% לא נקרא ככמות
  });

  it('חלב 1% לא בולע את חלב 3%, וחלב שקדים לא את השקדים', () => {
    expect(name('חלב')).toBe('חלב');
    expect(name('כוס חלב')).toBe('חלב');
    expect(name('חלב שקדים')).toBe('חלב שקדים');
    expect(name('שקדים')).toBe('שקדים');
    expect(name('חלב סויה')).toBe('חלב סויה');
  });
});

describe('תפריט השייקים — כל הגרסאות מתפרסרות', () => {
  const RECIPES: [string, string][] = [
    ['שוקולד-תמר',  'יוגורט יווני 250 גרם, חלב 1% 150 מל, כפית קקאו, תמר אחד, קינמון'],
    ['פירות יער',   'יוגורט יווני 250 גרם, פירות יער 100 גרם, חלב 1% 150 מל'],
    ['תות-דבש',     'יוגורט יווני 250 גרם, תות 150 גרם, חלב 1% 150 מל, כפית דבש'],
    ['וניל-קינמון', 'יוגורט יווני 250 גרם, חלב 1% 150 מל, כפית דבש, קינמון, וניל'],
    ['בוטנים',      'יוגורט יווני 250 גרם, חלב 1% 150 מל, כף חמאת בוטנים, כפית קקאו'],
    ['אייס-קפה',    'יוגורט יווני 250 גרם, קפה שחור, כפית קקאו, קרח'],
    ['מלוח',        'יוגורט יווני 250 גרם, מלפפון 100 גרם, מלח, נענע, קרח'],
  ];

  it.each(RECIPES)('%s — אפס פריטים לא מזוהים, 29+ גרם חלבון', (_label, text) => {
    const r = estimateFood(text, foods);
    expect(r.notInDB).toEqual([]);              // אחרת זה נוחת בתור של הילה
    expect(r.total.p).toBeGreaterThanOrEqual(29);
    expect(r.total.kcal).toBeLessThan(340);     // כל התפריט בתוך התקציב
  });

  it('תבלינים ללא קלוריות אינם נחשבים "מאכל לא מוכר"', () => {
    // 'קינמון'/'וניל'/'נענע'/'קרח' ב-FILLER ולא כפריט של 0 קק"ל:
    // אחרת כל שייק היה מציף את תור "הילה לא מכירה".
    for (const w of ['קינמון', 'וניל', 'נענע', 'מנטה', 'קרח', 'כורכום']) {
      expect(estimateFood(`יוגורט יווני 250 גרם, ${w}`, foods).notInDB).toEqual([]);
    }
  });

  it('פירות יער נכנסו, והתות לא נבלע', () => {
    expect(estimateFood('פירות יער', foods).lines[0].name).toBe('פירות יער');
    expect(estimateFood('פטל', foods).lines[0].name).toBe('פטל');   // הפטל היה כבר במסד — לא נבלע
    expect(estimateFood('תות', foods).lines[0].name).toBe('תות שדה');
    expect(estimateFood('אוכמניות', foods).lines[0].name).toBe('אוכמניות');
  });
});

describe('נס קפה עם חלב — לא כוס חלב', () => {
  it('נספר כקפה עם טיפת חלב, לא ככוס מלאה', () => {
    const r = estimateFood('נס קפה עם חלב', foods);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].name).toBe('קפה בחלב');
    expect(r.total.kcal).toBeLessThan(45);          // היה 149: קפה 5 + כוס חלב 144
  });

  it('כל הניסוחים של אבי מגיעים לאותו פריט', () => {
    for (const t of ['נס קפה עם חלב', 'קפה עם חלב', 'קפה שחור עם חלב', 'קפה בחלב', 'נס קפה בחלב']) {
      expect(estimateFood(t, foods).lines[0].name).toBe('קפה בחלב');
    }
  });

  it('לא בולע את הקפה השחור, את ההפוך ואת כוס החלב', () => {
    expect(estimateFood('נס קפה', foods).lines[0].name).toBe('קפה שחור');
    expect(estimateFood('קפה שחור', foods).lines[0].name).toBe('קפה שחור');
    expect(estimateFood('קפה הפוך', foods).lines[0].name).toBe('קפה הפוך');
    expect(estimateFood('כוס חלב', foods).lines[0].name).toBe('חלב');
    expect(estimateFood('כוס חלב', foods).total.kcal).toBe(144);
  });

  it("' עם ' ממשיך להפריד בין מאכלים — תור הלא-מזוהים לא נפגע", () => {
    const r = estimateFood('חזה עוף 200 גרם עם פירה', foods);
    expect(r.lines.map(l => l.name)).toEqual(['חזה עוף']);
    expect(r.notInDB).toEqual(['פירה']);           // חייב להגיע להילה
  });
});

describe('אמנון ודגים לבנים', () => {
  const name = (t: string) => estimateFood(t, foods).lines[0].name;
  const ratio = (id: string) => { const f = foods.find(x => x.id === id)!; return f.per100[0] / f.per100[1]; };

  it('האמנון מזוהה בכל הניסוחים', () => {
    for (const t of ['פילה אמנון', 'אמנון', 'טילפיה', 'מושט']) expect(name(t)).toBe('פילה אמנון');
    expect(estimateFood('פילה אמנון 200 גרם', foods).total.kcal).toBe(192);
    expect(estimateFood('2 פילה אמנון', foods).total.p).toBe(80);
  });

  it('היחס שלו טוב מחזה עוף ומאבקת חלבון', () => {
    expect(ratio('tilapia')).toBeLessThan(ratio('chicken'));
    expect(ratio('tilapia')).toBeLessThan(ratio('whey'));
  });

  it('דגים לבנים נוספים נכנסו, ואין כינוי "דג" בודד', () => {
    for (const t of ['דניס', 'לברק', 'בורי', 'פילה דג', 'דג לבן']) expect(name(t)).toBe('פילה דג');
    // 'דג' כתת-מחרוזת היה הופך דגני בוקר לדג.
    expect(estimateFood('דגני בוקר', foods).lines).toHaveLength(0);
  });

  it('לא בולע את הטונה ואת הסלמון', () => {
    expect(name('טונה')).toBe('טונה');
    expect(name('סלמון')).toBe('סלמון');
  });
});

it('פריט-הבדיקה אכן לא במסד — וחייב להישאר כך', () => {
  expect(estimateFood(SENTINEL, foods).lines).toHaveLength(0);
  expect(estimateFood(SENTINEL, foods).notInDB).toHaveLength(1);
});
