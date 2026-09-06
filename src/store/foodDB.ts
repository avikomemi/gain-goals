// מסד תזונה אישי — ערכים אמיתיים פר-100-גרם (מקור: Open Food Facts / USDA / תווית),
// זיהוי כמויות מהטקסט החופשי, ותחשיב קלורי מדויק. הטבלה מקומית, מסתנכרנת, וגדלה (שלב 2 — ברקוד).

export interface FoodItem {
  id: string;
  names: string[];                              // כינויים בעברית — התאמה לפי הכלה; הכי ספציפי מנצח
  per100: [number, number, number, number];     // קק"ל, חלבון, פחמ', שומן — פר 100 גר' (או 100 מ"ל למשקאות)
  unit: 'g' | 'unit';                            // g = גרמים; unit = יחידה בדידה (ביצה/פיתה/כף/כוס)
  unitGrams?: number;                            // גרם ליחידה (לפריטי unit) — למתמטיקה ולתצוגה
  unitLabel?: string;                            // תווית יחידה: 'יח' | 'כף' | 'כוס' | 'פרוסה'
  def: number;                                   // כמות ברירת-מחדל כשלא נכתב מספר (גרם ל-g; יחידות ל-unit)
  gout?: 'high' | 'ok';                          // דגל גאוט להערת הילה
  src?: string;                                  // 'OFF' | 'USDA' | 'תווית' | 'הערכה'
}

// ~35 הקבועים של אבי. ערכים ממותגים ששלפנו מ-OFF מסומנים; השאר USDA/תווית מבוססים.
export const SEED_FOODS: FoodItem[] = [
  // ---- חלבון / חלב ----
  { id: 'pro', names: ['יוגורט פרו', 'פרו'], per100: [59, 9, 4, 1], unit: 'g', def: 200, gout: 'ok', src: 'תווית' },
  { id: 'ski', names: ['גבינת סקי', 'סקי'], per100: [100, 6, 5, 5], unit: 'g', def: 150, gout: 'ok', src: 'הערכה' },
  { id: 'cottage', names: ['קוטג'], per100: [95, 11, 1.5, 5], unit: 'g', def: 125, gout: 'ok', src: 'OFF' },
  { id: 'white5', names: ['גבינה לבנה', 'לבנה 5', 'לבנה 3', 'לבנה 9'], per100: [98, 9, 4.3, 5], unit: 'g', def: 100, gout: 'ok', src: 'OFF' },
  { id: 'bulgarit', names: ['בולגרית', 'פטה', 'צפתית', 'פטא'], per100: [130, 11, 2, 9], unit: 'g', def: 50, gout: 'ok', src: 'תווית' },
  { id: 'yellow', names: ['גבינה צהובה', 'צהובה', 'עמק', 'גאודה', 'מוצרלה', 'קשקבל'], per100: [350, 25, 1, 27], unit: 'g', def: 30, gout: 'ok', src: 'USDA' },
  { id: 'egg', names: ['ביצה', 'ביצים', 'חביתה', 'אומלט'], per100: [143, 13, 0.7, 10], unit: 'unit', unitGrams: 50, unitLabel: 'ביצה', def: 2, gout: 'ok', src: 'USDA' },
  { id: 'tuna', names: ['טונה'], per100: [116, 26, 0, 1], unit: 'g', def: 100, gout: 'ok', src: 'USDA' },
  { id: 'chicken', names: ['חזה עוף', 'עוף', 'פרגית', 'שניצל'], per100: [165, 31, 0, 3.6], unit: 'g', def: 150, gout: 'ok', src: 'USDA' },
  { id: 'whey', names: ['אבקת חלבון', 'שייק חלבון', 'וויי', 'פרוטאין', 'סקופ'], per100: [380, 75, 8, 6], unit: 'unit', unitGrams: 30, unitLabel: 'מנה', def: 1, gout: 'ok', src: 'תווית' },

  // ---- פחמימות ----
  { id: 'pita', names: ['פיתה', 'פיתת'], per100: [275, 9, 55, 1.2], unit: 'unit', unitGrams: 60, unitLabel: 'פיתה', def: 1, src: 'USDA' },
  { id: 'bread', names: ['פרוסת לחם', 'לחם מלא', 'לחם', 'מחמצת', 'פרוסה'], per100: [247, 13, 41, 3.4], unit: 'unit', unitGrams: 30, unitLabel: 'פרוסה', def: 2, src: 'USDA' },
  { id: 'rice', names: ['אורז'], per100: [130, 2.7, 28, 0.3], unit: 'g', def: 150, src: 'USDA' },
  { id: 'pasta', names: ['פסטה', 'אטריות', 'נודל'], per100: [157, 5.8, 31, 0.9], unit: 'g', def: 150, src: 'USDA' },
  { id: 'potato', names: ['תפוח אדמה', 'תפו"א', 'תפוא'], per100: [87, 1.9, 20, 0.1], unit: 'g', def: 150, src: 'USDA' },
  { id: 'sweetpotato', names: ['בטטה'], per100: [90, 2, 21, 0.1], unit: 'g', def: 150, src: 'USDA' },
  { id: 'couscous', names: ['קוסקוס', 'פתיתים', 'פתית'], per100: [112, 3.8, 23, 0.2], unit: 'g', def: 150, src: 'USDA' },
  { id: 'oats', names: ['שיבולת שועל', 'קוואקר', 'דייסה'], per100: [389, 17, 66, 7], unit: 'g', def: 40, src: 'USDA' },

  // ---- שומנים / ממרחים ----
  { id: 'tahini', names: ['טחינה'], per100: [595, 17, 21, 54], unit: 'unit', unitGrams: 15, unitLabel: 'כף', def: 2, gout: 'ok', src: 'USDA' },
  { id: 'hummus', names: ['חומוס'], per100: [177, 8, 20, 9], unit: 'unit', unitGrams: 15, unitLabel: 'כף', def: 3, gout: 'ok', src: 'USDA' },
  { id: 'avocado', names: ['אבוקדו', 'גוואקמול', 'גואקמול'], per100: [160, 2, 9, 15], unit: 'g', def: 100, src: 'USDA' },
  { id: 'oliveoil', names: ['שמן זית', 'שמן'], per100: [884, 0, 0, 100], unit: 'unit', unitGrams: 13.5, unitLabel: 'כף', def: 1, src: 'USDA' },
  { id: 'peanutbutter', names: ['חמאת בוטנים'], per100: [588, 25, 20, 50], unit: 'unit', unitGrams: 16, unitLabel: 'כף', def: 1, src: 'USDA' },
  { id: 'nuts', names: ['שקדים', 'אגוזים', 'קשיו', 'בוטנים', 'פיסטוק', 'שקד', 'אגוז'], per100: [579, 21, 22, 50], unit: 'g', def: 28, src: 'USDA' },

  // ---- ירקות / פירות ----
  { id: 'salad', names: ['סלט ירקות', 'סלט', 'ירקות'], per100: [25, 1, 5, 0.2], unit: 'g', def: 200, src: 'USDA' },
  { id: 'tomato', names: ['עגבנייה', 'עגבניה', 'עגבניות'], per100: [18, 0.9, 3.9, 0.2], unit: 'unit', unitGrams: 120, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'apple', names: ['תפוח עץ', 'תפוח '], per100: [52, 0.3, 14, 0.2], unit: 'unit', unitGrams: 180, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'banana', names: ['בננה'], per100: [89, 1.1, 23, 0.3], unit: 'unit', unitGrams: 120, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'date', names: ['תמר', 'תמרים'], per100: [282, 2.5, 75, 0.4], unit: 'unit', unitGrams: 8, unitLabel: 'יח', def: 3, src: 'USDA' },

  // ---- חטיפים / שתייה ----
  { id: 'bamba', names: ['במבה'], per100: [530, 13, 49, 33], unit: 'g', def: 50, src: 'תווית' },
  { id: 'coffee', names: ['קפה שחור', 'קפה', 'אספרסו', 'נס '], per100: [2, 0.1, 0, 0], unit: 'unit', unitGrams: 240, unitLabel: 'כוס', def: 1, src: 'USDA' },
  { id: 'coffeemilk', names: ['קפה הפוך', 'הפוך', 'קפוצ\'ינו', 'לאטה'], per100: [45, 2.4, 3.4, 1.6], unit: 'unit', unitGrams: 200, unitLabel: 'כוס', def: 1, src: 'הערכה' },
  { id: 'cola', names: ['קולה', 'קוקה', 'ספרייט', 'פאנטה'], per100: [42, 0, 10.6, 0], unit: 'unit', unitGrams: 330, unitLabel: 'פחית', def: 1, src: 'USDA' },
  { id: 'coladiet', names: ['זירו', 'דיאט', 'לייט'], per100: [0.4, 0, 0, 0], unit: 'unit', unitGrams: 330, unitLabel: 'פחית', def: 1, src: 'USDA' },
];

// מיזוג: הטבלה של אבי + כל פריט-זרע שעוד לא קיים אצלו (לפי id). לא דורס עריכות שלו.
export function mergeFoods(userFoods: FoodItem[] | undefined): FoodItem[] {
  const list = Array.isArray(userFoods) ? userFoods.filter(f => f && f.id) : [];
  const have = new Set(list.map(f => f.id));
  for (const s of SEED_FOODS) if (!have.has(s.id)) list.push(s);
  return list;
}

export interface FoodLine { name: string; qty: number; qtyLabel: string; macro: [number, number, number, number] }
export interface FoodEstimate { lines: FoodLine[]; total: { kcal: number; p: number; c: number; f: number }; notInDB: string[] }

const FILLER = ['עם', 'של', 'ללא', 'בלי', 'סוכר', 'מלח', 'שמן', 'בבוקר', 'בערב', 'בצהריים', 'קופסא', 'קופסה', 'גרם', 'גר', "ג'", 'כוס', 'בקבוק', 'מים', 'קצת', 'הרבה', 'ועוד', 'גדול', 'קטן'];

// כמה מהפריט הזה — מספר צמוד, "x2", או "חצי"; אחרת ברירת-המחדל
function parseQty(seg: string, food: FoodItem): number {
  const s = seg.replace(/\d+(\.\d+)?\s*%/g, ''); // מנקה אחוזי שומן ("5%") שלא ייחשבו ככמות
  const mult = s.match(/[x×X]\s*(\d+(\.\d+)?)/);
  if (mult) return parseFloat(mult[1]);
  const num = s.match(/(\d+(\.\d+)?)/);
  if (num) return parseFloat(num[1]);
  if (/חצי/.test(seg)) return food.def * 0.5;
  return food.def;
}

const PLURAL: Record<string, string> = { 'כף': 'כפות', 'כוס': 'כוסות', 'פרוסה': 'פרוסות', 'מנה': 'מנות' };
function qtyLabel(food: FoodItem, qty: number): string {
  const n = Math.round(qty * 10) / 10;
  if (food.unit === 'g') return `${n}ג'`;
  const lab = food.unitLabel;
  // 'יח', או תווית שכפולה בשם הפריט (פיתה/ביצה) → פשוט ×n
  if (!lab || lab === 'יח' || food.names[0].includes(lab)) return `×${n}`;
  return `${n} ${n === 1 ? lab : (PLURAL[lab] || lab)}`;
}

// תחשיב מלא: מפרק לטקסט → פריטים עם כמות → קלוריות/מאקרו אמיתיים
export function estimateFood(text: string, foods: FoodItem[]): FoodEstimate {
  const lines: FoodLine[] = [];
  const notInDB: string[] = [];
  const total = { kcal: 0, p: 0, c: 0, f: 0 };
  const segments = (text || '').split(/[\n,.·;]+/).map(s => s.trim()).filter(s => s.length > 1);

  for (const seg of segments) {
    let best: FoodItem | null = null, bestLen = 0;
    for (const f of foods) for (const a of f.names) {
      if (a.length > bestLen && seg.includes(a)) { best = f; bestLen = a.length; }
    }
    if (!best) {
      const stripped = seg.split(/\s+/).filter(w => !FILLER.some(g => w.includes(g)) && !/^\d+['"%]?$/.test(w)).join(' ');
      if (stripped.replace(/[^֐-׿]/g, '').length > 2) notInDB.push(seg.length > 24 ? seg.slice(0, 24) + '…' : seg);
      continue;
    }
    const qty = parseQty(seg, best);
    const gramsEq = best.unit === 'g' ? qty : qty * (best.unitGrams || 100);
    const macro = best.per100.map(v => Math.round(v * gramsEq / 100)) as [number, number, number, number];
    lines.push({ name: best.names[0], qty, qtyLabel: qtyLabel(best, qty), macro });
    total.kcal += macro[0]; total.p += macro[1]; total.c += macro[2]; total.f += macro[3];
  }

  return { lines, total, notInDB: notInDB.slice(0, 4) };
}
