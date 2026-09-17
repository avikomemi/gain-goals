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
  { id: 'pro', names: ['יוגורט פרו'], per100: [59, 9, 4, 1], unit: 'g', def: 200, gout: 'ok', src: 'תווית' }, // לא 'פרו' בודד — מתנגש עם "פרוסות"
  { id: 'ski', names: ['גבינת סקי', 'סקי'], per100: [100, 6, 5, 5], unit: 'g', def: 150, gout: 'ok', src: 'הערכה' },
  { id: 'cottage', names: ['קוטג'], per100: [95, 11, 1.5, 5], unit: 'g', def: 125, gout: 'ok', src: 'OFF' },
  { id: 'white5', names: ['גבינה לבנה', 'לבנה 5', 'לבנה 3', 'לבנה 9', 'גבינה רזה', 'גבינה 5', 'גבינה 3', 'גבינה 9', 'גבינה'], per100: [98, 9, 4.3, 5], unit: 'g', def: 100, gout: 'ok', src: 'OFF' },
  { id: 'bulgarit', names: ['גבינה בולגרית', 'גבינה צפתית', 'בולגרית', 'פטה', 'צפתית', 'פטא'], per100: [130, 11, 2, 9], unit: 'g', def: 50, gout: 'ok', src: 'תווית' },
  { id: 'yellow', names: ['גבינה צהובה', 'צהובה', 'עמק', 'גאודה', 'מוצרלה', 'קשקבל'], per100: [350, 25, 1, 27], unit: 'g', def: 30, gout: 'ok', src: 'USDA' },
  { id: 'egg', names: ['ביצה', 'ביצים', 'חביתה', 'אומלט'], per100: [143, 13, 0.7, 10], unit: 'unit', unitGrams: 50, unitLabel: 'ביצה', def: 2, gout: 'ok', src: 'USDA' },
  { id: 'tuna', names: ['טונה'], per100: [116, 26, 0, 1], unit: 'g', def: 100, gout: 'ok', src: 'USDA' },
  { id: 'chicken', names: ['חזה עוף', 'עוף', 'פרגיות', 'פרגית', 'פרגי', 'שניצל'], per100: [165, 31, 0, 3.6], unit: 'g', def: 150, gout: 'ok', src: 'USDA' },
  { id: 'whey', names: ['אבקת חלבון', 'שייק חלבון', 'וויי', 'פרוטאין', 'סקופ'], per100: [380, 75, 8, 6], unit: 'unit', unitGrams: 30, unitLabel: 'מנה', def: 1, gout: 'ok', src: 'תווית' },
  // משקה חלבון מוכן (מולר פרוטאין וכו', 1.5% שומן): בקבוק 400 מ"ל = 25 גר' חלבון. per100 = פר 100 מ"ל, הערכה.
  { id: 'proteindrink', names: ['משקה חלבון', 'מולר פרוטאין', 'müller protein'], per100: [51, 6.3, 3, 1.5], unit: 'unit', unitGrams: 400, unitLabel: 'בקבוק', def: 1, gout: 'ok', src: 'הערכה' },
  { id: 'steak', names: ['סטייק', 'סטיק', 'אנטריקוט', 'בשר בקר', 'בקר'], per100: [271, 25, 0, 19], unit: 'g', def: 150, gout: 'high', src: 'USDA' },
  { id: 'multiyog', names: ['יוגורט מולטי', 'מולטי'], per100: [71, 6.5, 4.6, 3], unit: 'g', def: 150, gout: 'ok', src: 'תווית' },

  // ---- פחמימות ----
  { id: 'pita', names: ['פיתה', 'פיתת', 'פיתות'], per100: [275, 9, 55, 1.2], unit: 'unit', unitGrams: 60, unitLabel: 'פיתה', def: 1, src: 'USDA' },
  { id: 'bread', names: ['פרוסת לחם', 'לחם מלא', 'לחם', 'מחמצת', 'פרוסה'], per100: [247, 13, 41, 3.4], unit: 'unit', unitGrams: 30, unitLabel: 'פרוסה', def: 2, src: 'USDA' },
  { id: 'homebread', names: ['לחם ביתי'], per100: [265, 8, 49, 3.5], unit: 'unit', unitGrams: 85, unitLabel: 'פרוסה', def: 2, src: 'תווית' },
  { id: 'challah', names: ['חלה', 'בריוש'], per100: [290, 9, 50, 5.5], unit: 'unit', unitGrams: 40, unitLabel: 'פרוסה', def: 2, src: 'USDA' },
  { id: 'rice', names: ['אורז'], per100: [130, 2.7, 28, 0.3], unit: 'g', def: 150, src: 'USDA' },
  { id: 'pasta', names: ['פסטה', 'אטריות', 'נודל'], per100: [157, 5.8, 31, 0.9], unit: 'g', def: 150, src: 'USDA' },
  // unit (לא g): כותבים "2 תפוחי אדמה" = 2 יחידות. משקל מפורש ("200 גרם") עדיין גובר דרך parseQty.
  { id: 'potato', names: ['תפוח אדמה', 'תפוחי אדמה', 'תפו"א', 'תפוא'], per100: [87, 1.9, 20, 0.1], unit: 'unit', unitGrams: 150, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'sweetpotato', names: ['בטטה'], per100: [90, 2, 21, 0.1], unit: 'unit', unitGrams: 130, unitLabel: 'יח', def: 1, src: 'USDA' },
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
  { id: 'coleslaw', names: ['קולסלאו', 'כרוב במיונז'], per100: [150, 1, 13, 11], unit: 'g', def: 100, gout: 'ok', src: 'USDA' },
  { id: 'tomato', names: ['עגבנייה', 'עגבניה', 'עגבניות'], per100: [18, 0.9, 3.9, 0.2], unit: 'unit', unitGrams: 120, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'apple', names: ['תפוח עץ', 'תפוח '], per100: [52, 0.3, 14, 0.2], unit: 'unit', unitGrams: 180, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'banana', names: ['בננה'], per100: [89, 1.1, 23, 0.3], unit: 'unit', unitGrams: 120, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'date', names: ['תמר', 'תמרים'], per100: [282, 2.5, 75, 0.4], unit: 'unit', unitGrams: 8, unitLabel: 'יח', def: 3, src: 'USDA' },
  { id: 'blueberry', names: ['אוכמניות', 'אוכמנית', 'בלוברי'], per100: [57, 0.7, 14, 0.3], unit: 'g', def: 100, gout: 'ok', src: 'USDA' },

  // ---- פירות (מדף מלא) ----
  { id: 'nectarine', names: ['נקטרינה', 'נקטרינ'], per100: [44, 1.1, 11, 0.3], unit: 'unit', unitGrams: 150, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'peach', names: ['אפרסק'], per100: [39, 0.9, 10, 0.3], unit: 'unit', unitGrams: 150, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'plum', names: ['שזיף'], per100: [46, 0.7, 11, 0.3], unit: 'unit', unitGrams: 65, unitLabel: 'יח', def: 2, src: 'USDA' },
  { id: 'apricot', names: ['משמש'], per100: [48, 1.4, 11, 0.4], unit: 'unit', unitGrams: 35, unitLabel: 'יח', def: 3, src: 'USDA' },
  { id: 'pear', names: ['אגס'], per100: [57, 0.4, 15, 0.1], unit: 'unit', unitGrams: 180, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'orange', names: ['תפוז'], per100: [47, 0.9, 12, 0.1], unit: 'unit', unitGrams: 140, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'clementine', names: ['קלמנטינה', 'מנדרינה', 'קלמנטינ', 'מנדרינ'], per100: [53, 0.8, 13, 0.3], unit: 'unit', unitGrams: 75, unitLabel: 'יח', def: 2, src: 'USDA' },
  { id: 'grapefruit', names: ['אשכולית', 'אשכולי'], per100: [42, 0.8, 11, 0.1], unit: 'unit', unitGrams: 230, unitLabel: 'יח', def: 0.5, src: 'USDA' },
  { id: 'mango', names: ['מנגו'], per100: [60, 0.8, 15, 0.4], unit: 'g', def: 200, src: 'USDA' },
  { id: 'pineapple', names: ['אננס'], per100: [50, 0.5, 13, 0.1], unit: 'g', def: 150, src: 'USDA' },
  { id: 'kiwi', names: ['קיווי'], per100: [61, 1.1, 15, 0.5], unit: 'unit', unitGrams: 75, unitLabel: 'יח', def: 2, src: 'USDA' },
  { id: 'pomegranate', names: ['רימון'], per100: [83, 1.7, 19, 1.2], unit: 'unit', unitGrams: 180, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'grapes', names: ['ענבים', 'ענב'], per100: [69, 0.7, 18, 0.2], unit: 'g', def: 100, src: 'USDA' },
  { id: 'watermelon', names: ['אבטיח'], per100: [30, 0.6, 8, 0.2], unit: 'g', def: 200, src: 'USDA' },
  { id: 'melon', names: ['מלון'], per100: [34, 0.8, 8, 0.2], unit: 'g', def: 200, src: 'USDA' },
  { id: 'strawberry', names: ['תות שדה', 'תות'], per100: [32, 0.7, 8, 0.3], unit: 'g', def: 150, src: 'USDA' },
  { id: 'raspberry', names: ['פטל'], per100: [52, 1.2, 12, 0.7], unit: 'g', def: 100, src: 'USDA' },
  { id: 'cherry', names: ['דובדבן'], per100: [63, 1, 16, 0.2], unit: 'g', def: 100, src: 'USDA' },
  { id: 'persimmon', names: ['אפרסמון'], per100: [70, 0.6, 18, 0.2], unit: 'unit', unitGrams: 170, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'fig', names: ['תאנה', 'תאנ'], per100: [74, 0.8, 19, 0.3], unit: 'unit', unitGrams: 50, unitLabel: 'יח', def: 3, src: 'USDA' },
  { id: 'papaya', names: ['פפאיה'], per100: [43, 0.5, 11, 0.3], unit: 'g', def: 150, src: 'USDA' },
  { id: 'guava', names: ['גויאבה'], per100: [68, 2.6, 14, 1], unit: 'unit', unitGrams: 55, unitLabel: 'יח', def: 1, src: 'USDA' },
  { id: 'lychee', names: ["ליצ'י", 'ליצי'], per100: [66, 0.8, 17, 0.4], unit: 'unit', unitGrams: 10, unitLabel: 'יח', def: 6, src: 'USDA' },
  { id: 'loquat', names: ['שסק'], per100: [47, 0.4, 12, 0.2], unit: 'unit', unitGrams: 15, unitLabel: 'יח', def: 4, src: 'USDA' },

  // ---- ירקות (מדף מלא) ----
  { id: 'cucumber', names: ['מלפפון'], per100: [15, 0.7, 3.6, 0.1], unit: 'g', def: 100, src: 'USDA' },
  { id: 'carrot', names: ['גזר'], per100: [41, 0.9, 10, 0.2], unit: 'g', def: 100, src: 'USDA' },
  { id: 'pepper', names: ['פלפל'], per100: [31, 1, 6, 0.3], unit: 'g', def: 100, src: 'USDA' },
  { id: 'lettuce', names: ['חסה'], per100: [15, 1.4, 2.9, 0.2], unit: 'g', def: 50, src: 'USDA' },
  { id: 'cabbage', names: ['כרוב'], per100: [25, 1.3, 6, 0.1], unit: 'g', def: 100, src: 'USDA' },
  { id: 'cauliflower', names: ['כרובית'], per100: [25, 1.9, 5, 0.3], unit: 'g', def: 100, src: 'USDA' },
  { id: 'broccoli', names: ['ברוקולי'], per100: [34, 2.8, 7, 0.4], unit: 'g', def: 100, src: 'USDA' },
  { id: 'zucchini', names: ['קישוא'], per100: [17, 1.2, 3.1, 0.3], unit: 'g', def: 100, src: 'USDA' },
  { id: 'eggplant', names: ['חציל'], per100: [25, 1, 6, 0.2], unit: 'g', def: 100, src: 'USDA' },
  { id: 'spinach', names: ['תרד'], per100: [23, 2.9, 3.6, 0.4], unit: 'g', def: 100, src: 'USDA' },
  { id: 'beet', names: ['סלק'], per100: [43, 1.6, 10, 0.2], unit: 'g', def: 100, src: 'USDA' },
  { id: 'radish', names: ['צנונית', 'צנון'], per100: [16, 0.7, 3.4, 0.1], unit: 'g', def: 50, src: 'USDA' },
  { id: 'pumpkin', names: ['דלעת'], per100: [26, 1, 6.5, 0.1], unit: 'g', def: 150, src: 'USDA' },
  { id: 'butternut', names: ['דלורית'], per100: [45, 1, 12, 0.1], unit: 'g', def: 150, src: 'USDA' },
  { id: 'kohlrabi', names: ['קולורבי'], per100: [27, 1.7, 6, 0.1], unit: 'g', def: 100, src: 'USDA' },
  { id: 'greenbeans', names: ['שעועית ירוקה', 'שעועית ירוק'], per100: [31, 1.8, 7, 0.2], unit: 'g', def: 100, src: 'USDA' },
  { id: 'peas', names: ['אפונה'], per100: [81, 5, 14, 0.4], unit: 'g', def: 100, src: 'USDA' },
  { id: 'okra', names: ['במיה'], per100: [33, 1.9, 7, 0.2], unit: 'g', def: 100, src: 'USDA' },
  { id: 'mushroom', names: ['פטריות', 'פטרייה', 'פטרי'], per100: [22, 3.1, 3.3, 0.3], unit: 'g', def: 100, src: 'USDA' },
  { id: 'artichoke', names: ['ארטישוק'], per100: [47, 3.3, 11, 0.2], unit: 'g', def: 100, src: 'USDA' },
  { id: 'asparagus', names: ['אספרגוס'], per100: [20, 2.2, 3.9, 0.1], unit: 'g', def: 100, src: 'USDA' },
  { id: 'celery', names: ['סלרי'], per100: [16, 0.7, 3, 0.2], unit: 'g', def: 100, src: 'USDA' },
  { id: 'fennel', names: ['שומר'], per100: [31, 1.2, 7, 0.2], unit: 'g', def: 100, src: 'USDA' },
  { id: 'arugula', names: ['רוקט'], per100: [25, 2.6, 3.7, 0.7], unit: 'g', def: 50, src: 'USDA' },
  { id: 'brussels', names: ['כרוב ניצנים', 'ניצנים'], per100: [43, 3.4, 9, 0.3], unit: 'g', def: 100, src: 'USDA' },
  { id: 'sprouts', names: ['נבטים', 'נבט'], per100: [30, 3, 6, 0.2], unit: 'g', def: 50, src: 'USDA' },

  // ---- מנות אתניות / מוכנות ----
  { id: 'laffa', names: ['פיתת לאפה', 'לאפה'], per100: [270, 8, 53, 2.5], unit: 'unit', unitGrams: 100, unitLabel: 'לאפה', def: 1, src: 'הערכה' },
  { id: 'fries', names: ["צ'יפס", 'צ׳יפס', 'ציפס'], per100: [312, 3.4, 41, 15], unit: 'unit', unitGrams: 7, unitLabel: 'יח', def: 10, src: 'USDA' },
  { id: 'plov', names: ['פלאוו', 'פלאו', 'פלוב', 'פילאף'], per100: [200, 6, 26, 8], unit: 'g', def: 200, gout: 'high', src: 'הערכה' },
  { id: 'dushpara', names: ['דושפרה', 'דושפרא', 'דושברה', 'דושפארה'], per100: [250, 10, 22, 14], unit: 'unit', unitGrams: 60, unitLabel: 'יח', def: 1, gout: 'high', src: 'הערכה' },
  { id: 'khachapuri', names: ["חצ'פורי", 'חצ׳פורי', 'חצפורי', 'קובדארי'], per100: [275, 11, 28, 13], unit: 'unit', unitGrams: 180, unitLabel: 'יח', def: 1, src: 'הערכה' },
  { id: 'shawarma', names: ['שווארמה', 'שוורמה', 'שווארמא', 'שווארמ'], per100: [230, 24, 1, 15], unit: 'g', def: 130, gout: 'high', src: 'USDA' }, // אנטריקוט עגל
  { id: 'shawarma_pita', names: ['פיתה שווארמה', 'פיתת שווארמה', 'פיתה שוורמה', 'פיתת שוורמה'], per100: [235, 16, 20, 11], unit: 'unit', unitGrams: 260, unitLabel: 'פיתה', def: 1, gout: 'high', src: 'הערכה' }, // פיתה+~130ג' בשר+טחינה+סלט
  { id: 'knafeh', names: ['כנאפה', 'קנאפה', 'כנאפ'], per100: [370, 6, 47, 18], unit: 'g', def: 150, gout: 'ok', src: 'הערכה' },

  // ---- חטיפים / שתייה ----
  { id: 'bamba', names: ['במבה', 'במבות'], per100: [530, 13, 49, 33], unit: 'g', def: 50, src: 'תווית' },
  { id: 'bisli', names: ['ביסלי'], per100: [483, 9, 63, 22], unit: 'unit', unitGrams: 55, unitLabel: 'שקית', def: 1, src: 'הערכה' },
  // מאפה מתוק (רוגלך/עוגה/בורקס מתוק): שם ספציפי יותר מ"לחם" → גובר במטצ'ר. הערכה לחתיכה ~80 גר'.
  { id: 'pastry', names: ['מאפה מתוק', 'מאפה', 'רוגלך', 'עוגה'], per100: [380, 6, 52, 16], unit: 'unit', unitGrams: 80, unitLabel: 'יח', def: 1, src: 'הערכה' },
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

// מספרים במילים — "שתי במבות", "חביתה משתי ביצים". סדר: הארוך קודם (שתיים לפני שתי).
const WORD_NUM: Record<string, number> = {
  'שתיים': 2, 'שניים': 2, 'שלושה': 3, 'שלוש': 3, 'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5,
  'שישה': 6, 'שש': 6, 'שבעה': 7, 'שבע': 7, 'שמונה': 8, 'תשעה': 9, 'תשע': 9, 'עשרה': 10, 'עשר': 10,
  'שתי': 2, 'שני': 2, 'אחת': 1, 'אחד': 1,
};
// מילות-יחידה: מסמנות שהמספר סופר מנות ולא גרמים
const UNIT_WORD = /פרוס|כפות|כפית|כף|כוס|קערי|קערה|צלחת|חופן|שקית|יחיד|חתיכ|נתח|קופס/;
const WORD_NUM_RE = new RegExp(`(?:^|\\s)[מובכלה]?(${Object.keys(WORD_NUM).join('|')})(?=\\s|$)`);

// כמה מהפריט הזה — מספר, "x2", "2 מנות", מספר במילים, או "חצי"; אחרת ברירת-המחדל.
// grams=true כשנכתב "גרם"/"גר'" במפורש → המספר הוא גרמים, גם לפריטי-יחידה.
// nameAt = איפה שם המאכל יושב בתוך הקטע, כדי להבדיל בין ספירה למשקל (ראה למטה).
function parseQty(seg: string, food: FoodItem, nameAt = -1): { qty: number; grams: boolean } {
  // מנקה אחוזי שומן ("5%", "5 אחוז") שלא ייחשבו ככמות — ברווחים, כדי לא להזיז מיקומים
  const s = seg.replace(/\d+(\.\d+)?\s*(?:%|אחוז)/g, m => ' '.repeat(m.length));
  // "מנה" = היחידה הטבעית של הפריט: לפריט-גרמים זו מנת ברירת-המחדל, לפריט-יחידה זו יחידה אחת.
  // בלי זה "3 חזה עוף" נספר כ-3 גרם (5 קק"ל) במקום 3 מנות.
  const portions = (n: number) => ({ qty: food.unit === 'g' ? n * food.def : n, grams: false });
  const mult = s.match(/[x×X]\s*(\d+(\.\d+)?)/);
  const dishes = s.match(/(\d+(\.\d+)?)\s*מנ(?:ה|ות)/);
  const times = mult ? parseFloat(mult[1]) : (dishes ? parseFloat(dishes[1]) : 1);
  // משקל מפורש: המספר הצמוד ל"גרם/גר'" הוא הגרמים (לא המספר הראשון במשפט), כפול מספר המנות.
  const gramNum = s.match(/(\d+(\.\d+)?)\s*(?:גרם|גר['׳])/);
  if (gramNum) return { qty: parseFloat(gramNum[1]) * times, grams: true };
  if (mult) return portions(parseFloat(mult[1]));
  if (dishes) return portions(parseFloat(dishes[1]));
  const word = s.match(WORD_NUM_RE);
  if (word) return portions(WORD_NUM[word[1]]);
  const num = s.match(/(\d+(\.\d+)?)/);
  if (num) {
    const n = parseFloat(num[1]);
    // מספר *לפני* השם הוא ספירה ("3 חזה עוף" = 3 מנות); *אחרי* השם הוא משקל ("חזה עוף 200").
    // מספר גדול לפני השם הוא עדיין משקל ("50 במבה") — אף אחד לא אוכל 50 מנות.
    // ספירה רק כשיש מה לספור: מנה מלאה (50 גר'+) או מילת-יחידה לפני השם ("2 פרוסות
    // גבינה צהובה"). אחרת "10 שקדים" היה הופך ל-10 חופנים במקום 10 שקדים.
    const countable = food.def >= 50 || UNIT_WORD.test(s.slice(0, nameAt < 0 ? 0 : nameAt));
    if (nameAt >= 0 && (num.index ?? 0) < nameAt && n <= 10 && countable) return portions(n);
    return { qty: n, grams: false };
  }
  if (/חצי/.test(seg)) return { qty: food.def * 0.5, grams: false };
  if (/(?:^|\s)רבע/.test(seg)) return { qty: food.def * 0.25, grams: false };
  return { qty: food.def, grams: false };
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

interface Hit { food: FoodItem; start: number; end: number }

// כל המאכלים שמופיעים בסגמנט אחד — לא רק אחד. "חזה עוף 200 גרם שעועית ירוקה 100 גרם"
// זה שני מאכלים גם בלי פסיק ביניהם. חפיפה → השם הספציפי מנצח ("שעועית ירוקה" לא "שעועית").
function findHits(seg: string, foods: FoodItem[]): Hit[] {
  const all: Hit[] = [];
  for (const f of foods) for (const a of f.names) {
    const i = seg.indexOf(a);
    if (i !== -1) all.push({ food: f, start: i, end: i + a.length });
  }
  all.sort((x, y) => (y.end - y.start) - (x.end - x.start)); // הארוך (הספציפי) ראשון
  const kept: Hit[] = [];
  for (const h of all) {
    if (kept.some(k => h.start < k.end && k.start < h.end)) continue; // חופף לשם ספציפי יותר
    if (kept.some(k => k.food.id === h.food.id)) continue;            // אותו מאכל בשני כינויים
    kept.push(h);
  }
  return kept.sort((a, b) => a.start - b.start);
}

// מספר "יתום" שצמוד לשם הבא ("...100 גרם **חצי** תפוח אדמה") שייך למאכל הבא, לא לקודם.
// כמות עם יחידה מפורשת ("200 גרם") נשארת אצל המאכל שלפניה — ככה כותבים בעברית.
const QTY_TAIL = /(?:^|\s)(\d+(?:\.\d+)?|חצי|רבע|שליש|שתי|שני|שלוש|שלושה|ארבע|ארבעה)\s*$/;

// חיתוך הסגמנט לפי המאכלים שנמצאו: כל מאכל מקבל את השם שלו ואת מה שנכתב אחריו
// (והראשון גם את מה שלפניו), כדי שכל אחד יקבל את הכמות שלו ולא של השכן.
function sliceBy(seg: string, hits: Hit[]): { text: string; nameAt: number }[] {
  let carry = '';
  return hits.map((h, i) => {
    const from = i === 0 ? 0 : h.start;
    const to = i + 1 < hits.length ? hits[i + 1].start : seg.length;
    const nameAt = carry.length + (h.start - from);
    let part = carry + seg.slice(from, to);
    carry = '';
    if (i + 1 < hits.length) {
      const m = part.match(QTY_TAIL);
      if (m) { carry = m[1] + ' '; part = part.slice(0, part.length - m[0].length); }
    }
    return { text: part, nameAt };
  });
}

// תחשיב מלא: מפרק לטקסט → פריטים עם כמות → קלוריות/מאקרו אמיתיים
export function estimateFood(text: string, foods: FoodItem[]): FoodEstimate {
  const lines: FoodLine[] = [];
  const notInDB: string[] = [];
  const total = { kcal: 0, p: 0, c: 0, f: 0 };
  // מפריד: פסיק/נקודה/שורה, וגם מילת החיבור "ו" (הו' תמיד תחילית — נבלעת עם המפריד).
  // "או" לא מפריד — הוא "או" (אותה מנה בשני שמות), כדי לא לספור כפול.
  const segments = (text || '').split(/[\n,.·;]+|\s+ו|\s+עם\s+/).map(s => s.trim()).filter(s => s.length > 1);

  for (const seg of segments) {
    const hits = findHits(seg, foods);
    if (!hits.length) {
      const stripped = seg.split(/\s+/).filter(w => !FILLER.some(g => w.includes(g)) && !/^\d+['"%]?$/.test(w)).join(' ');
      if (stripped.replace(/[^֐-׿]/g, '').length > 2) notInDB.push(seg.length > 24 ? seg.slice(0, 24) + '…' : seg);
      continue;
    }
    const parts = sliceBy(seg, hits);
    hits.forEach((h, i) => {
      const food = h.food;
      const { qty, grams } = parseQty(parts[i].text, food, parts[i].nameAt);
      const gramsEq = grams ? qty : (food.unit === 'g' ? qty : qty * (food.unitGrams || 100));
      const macro = food.per100.map(v => Math.round(v * gramsEq / 100)) as [number, number, number, number];
      lines.push({ name: food.names[0], qty, qtyLabel: grams ? `${qty}ג'` : qtyLabel(food, qty), macro });
      total.kcal += macro[0]; total.p += macro[1]; total.c += macro[2]; total.f += macro[3];
    });
  }

  return { lines, total, notInDB: notInDB.slice(0, 4) };
}
