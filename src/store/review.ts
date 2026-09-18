// מנוע הסקירה התקופתית — מה שעמית והצוות היו אומרים לאבי אם היו יושבים על הנתונים.
// הכל מחושב מהיומן עצמו: אימונים, שקילות, מים, יומן אוכל (דרך אותו פרסר של הילה),
// כאבים וכיול. אין כאן טקסטים קבועים — כל שורה נובעת ממספר, וכל דגל נושא בעלים.
import { DB, today, daysAgo } from './store';
import { estimateFood, mergeFoods } from './foodDB';

export interface ReviewMetric { label: string; value: string; target?: string; status: 'good' | 'warn' | 'bad' }
export interface ReviewFlag { from: string; title: string; body: string; sev: 'red' | 'warn' }
export interface FullReview {
  from: string; to: string; days: number; logged: boolean;   // logged=false → אין מספיק נתונים לסקירה
  metrics: ReviewMetric[];
  wins: string[];
  flags: ReviewFlag[];
  calibMissing: string[];
  decision: string;
  nutrition: { days: number; kcal: number; protein: number; top: { name: string; kcalPerDay: number }[] };
}

const inRange = (d: string, from: string, to: string) => d >= from && d <= to;
const round = (n: number) => Math.round(n);

/**
 * סקירה מלאה על חלון של N ימים (ברירת מחדל 21 — שלושה שבועות).
 * לא יורדת לפני startDate: מה שקרה לפני שהתחלנו הוא לא "פספוס".
 */
export function fullReview(db: DB, days = 21): FullReview {
  const to = today();
  const wanted = daysAgo(days - 1);
  const from = db.startDate && db.startDate > wanted ? db.startDate : wanted;
  const span = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 864e5) + 1);
  const weeks = span / 7;

  const workouts = db.workouts.filter(w => inRange(w.date, from, to));
  const weights = db.weights.filter(w => inRange(w.date, from, to));
  const waists = db.waists.filter(w => inRange(w.date, from, to));
  const water = db.water.filter(w => inRange(w.date, from, to) && (w.ml || 0) > 0);
  const foodDays = db.food.filter(f => inRange(f.date, from, to) && (f.text || '').trim().length > 2);
  const pains = db.injuries.filter(j => inRange(j.date, from, to));
  const waterGoal = db.waterGoal ?? 1500;
  const sleep = (db.sleep || []).filter(x => inRange(x.date, from, to) && x.minutes > 0);
  const sleepAvg = sleep.length ? Math.round(sleep.reduce((a, x) => a + x.minutes, 0) / sleep.length) : 0;
  const hhmm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

  /* ---------- תזונה: אותו פרסר שהילה מציגה בו את היום, על כל הימים ---------- */
  const foods = mergeFoods(db.foods);
  const byFood = new Map<string, number>();
  let kcal = 0, protein = 0;
  for (const f of foodDays) {
    const e = estimateFood(f.text, foods);
    kcal += e.total.kcal; protein += e.total.p;
    for (const l of e.lines) byFood.set(l.name, (byFood.get(l.name) || 0) + l.macro[0]);
  }
  const nDays = foodDays.length || 1;
  const nutrition = {
    days: foodDays.length,
    kcal: round(kcal / nDays),
    protein: round(protein / nDays),
    top: [...byFood.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([name, k]) => ({ name, kcalPerDay: round(k / nDays) })),
  };

  /* ---------- מדדים ---------- */
  const perWeek = workouts.length / weeks;
  const weighPerWeek = weights.length / weeks;
  const lastWeight = weights[weights.length - 1] || db.weights[db.weights.length - 1];
  const daysSinceWeigh = lastWeight ? Math.round((new Date(to).getTime() - new Date(lastWeight.date).getTime()) / 864e5) : null;
  const waterOk = water.filter(w => (w.ml || 0) >= waterGoal).length;
  const waterAvg = water.length ? round(water.reduce((a, w) => a + (w.ml || 0), 0) / water.length) : 0;
  const lastWaist = waists[waists.length - 1] || db.waists[db.waists.length - 1];

  const metrics: ReviewMetric[] = [
    { label: 'אימונים', value: `${workouts.length} · ${perWeek.toFixed(1)} בשבוע`, target: '3 בשבוע', status: perWeek >= 2.5 ? 'good' : perWeek >= 1.8 ? 'warn' : 'bad' },
    { label: 'שקילות', value: lastWeight ? `${weights.length} · אחרונה ${lastWeight.kg} ק"ג לפני ${daysSinceWeigh} ימים` : 'אף אחת', target: '2-3 בשבוע', status: weighPerWeek >= 2 ? 'good' : weighPerWeek >= 1 ? 'warn' : 'bad' },
    { label: 'מותן', value: lastWaist ? `${lastWaist.cm} ס"מ (${lastWaist.date.slice(5).split('-').reverse().join('.')})` : 'לא נמדד', target: 'שבועי', status: waists.length >= weeks - 1 ? 'good' : waists.length ? 'warn' : 'bad' },
    { label: 'מים', value: water.length ? `ממוצע ${waterAvg} מ"ל · ${waterOk}/${water.length} ימים ביעד` : 'לא נרשם', target: `${waterGoal} מ"ל`, status: water.length && waterOk / water.length >= 0.7 ? 'good' : water.length ? 'warn' : 'bad' },
    { label: 'יומן אוכל', value: `${foodDays.length} ימים מתוך ${span}`, target: 'יומי', status: foodDays.length / span >= 0.8 ? 'good' : foodDays.length / span >= 0.4 ? 'warn' : 'bad' },
    { label: 'חלבון', value: foodDays.length ? `ממוצע ${nutrition.protein} גר' ליום` : '—', target: "135 גר'", status: nutrition.protein >= 120 ? 'good' : nutrition.protein >= 95 ? 'warn' : 'bad' },
    ...(sleep.length ? [{ label: 'שינה', value: `ממוצע ${hhmm(sleepAvg)} שעות (${sleep.length} לילות מ-Fitbit)`, target: '7:00', status: (sleepAvg >= 390 ? 'good' : sleepAvg >= 330 ? 'warn' : 'bad') as ReviewMetric['status'] }] : []),
    { label: 'דיווחי כאב', value: pains.length ? `${pains.length} · חמור ${Math.max(...pains.map(p => p.level))}/10` : 'אין', target: '—', status: !pains.length ? 'good' : Math.max(...pains.map(p => p.level)) >= 4 ? 'bad' : 'warn' },
  ];

  /* ---------- מה עובד — רק דברים שהנתונים מוכיחים ---------- */
  const wins: string[] = [];
  if (water.length >= 3 && waterOk / water.length >= 0.7)
    wins.push(`מים: ממוצע ${waterAvg} מ"ל, ${waterOk} מתוך ${water.length} הימים מעל היעד. זה הביטוח שלך מול הגאוט.`);
  const clean = workouts.filter(w => !w.stoppedEarly && !w.exercises.some(e => e.skipped));
  if (workouts.length >= 3 && clean.length === workouts.length)
    wins.push(`${workouts.length} אימונים, כולם הושלמו במלואם — אפס תרגילים שדולגו. האיכות שלך לא הבעיה.`);
  const flexDone = workouts.filter(w => w.flexDone).length;
  if (workouts.length >= 3 && flexDone / workouts.length >= 0.75)
    wins.push(`בלוק הגמישות בוצע ב-${flexDone} מתוך ${workouts.length} אימונים — נעה מרוצה.`);
  if (nutrition.protein >= 120) wins.push(`חלבון בממוצע ${nutrition.protein} גר' ליום — קרוב ליעד.`);

  /* ---------- דגלים, לפי בעלים ולפי חומרה ---------- */
  const flags: ReviewFlag[] = [];
  const worstPain = pains.slice().sort((a, b) => b.level - a.level)[0];
  const gout = pains.filter(p => p.area.includes('גאוט') || p.area.includes('רגל'));
  if (gout.length) {
    const rising = gout.length > 1 && gout[gout.length - 1].level > gout[0].level;
    flags.push({
      from: 'ד"ר ארז', sev: gout[gout.length - 1].level >= 3 || rising ? 'red' : 'warn',
      title: rising ? 'הגאוט מטפס' : 'דיווח גאוט',
      body: `${gout.length} דיווחים בכף הרגל${rising ? `, והרמה עולה: ${gout[0].level} → ${gout[gout.length - 1].level}` : ''}. מים זה הביטוח, ובשר אדום/אלכוהול הם הטריגר.`,
    });
  }
  // בשר אדום בתקופה שבה יש כאב גאוט — מזוהה מדגל הגאוט שבמסד המזון
  if (gout.length) {
    const high = new Map<string, number>();
    for (const f of foodDays) for (const l of estimateFood(f.text, foods).lines) {
      const item = foods.find(x => x.names[0] === l.name);
      if (item?.gout === 'high') high.set(l.name, (high.get(l.name) || 0) + 1);
    }
    if (high.size) flags.push({
      from: 'ד"ר ארז', sev: 'red', title: 'פורינים גבוהים בשבוע של כאב',
      body: `${[...high.entries()].map(([n, c]) => `${n} ×${c}`).join(' · ')} — בדיוק בתקופה שבה הכאב עלה. בשבוע הקרוב להוריד, ומים לצד.`,
    });
  }
  if (sleep.length >= 4 && sleepAvg < 330) flags.push({
    from: 'ד"ר ארז', sev: sleepAvg < 300 ? 'red' : 'warn', title: `שינה ${hhmm(sleepAvg)} בממוצע`,
    body: `${sleep.length} לילות מדודים. זה המכשול המרכזי ל-shredded: שינה קצרה מעלה קורטיזול, פוגעת בהתאוששות ומגבירה רעב. לא נלחמים בסליחות — אבל כל שכיבה מוקדמת נספרת.`,
  });
  if (weighPerWeek < 2) flags.push({
    from: 'עדי', sev: weighPerWeek < 1 ? 'red' : 'warn', title: 'אין מספיק שקילות למדוד מגמה',
    body: `${weights.length} שקילות ב-${span} ימים${daysSinceWeigh != null ? ` (אחרונה לפני ${daysSinceWeigh} ימים)` : ''}. היעד הוא 400 גר' לשבוע — בלי ממוצע שבועי אי אפשר לדעת אם זה קורה, וגם לא אם הקצב מסוכן לגאוט.`,
  });
  if (foodDays.length >= 3 && nutrition.protein < 110) flags.push({
    from: 'הילה', sev: nutrition.protein < 90 ? 'red' : 'warn', title: 'חלבון מתחת ליעד',
    body: `ממוצע ${nutrition.protein} גר' ליום מול יעד 135. בגירעון קלורי בלי חלבון הגוף שורף שריר.${nutrition.top[0] ? ` הפריט הכי קלורי אצלך: ${nutrition.top[0].name} — ${nutrition.top[0].kcalPerDay} קק"ל ליום בממוצע.` : ''}`,
  });
  if (foodDays.length >= 3 && foodDays.length / span < 0.6) flags.push({
    from: 'הילה', sev: 'warn', title: 'היומן חלקי',
    body: `${foodDays.length} ימים מתוך ${span}. המספרים למעלה הם רק מה שנרשם — כנראה תת-דיווח, ולכן אי אפשר להבדיל בין גירעון אמיתי לבין יום שלא תועד.`,
  });
  if (perWeek < 2.5) flags.push({
    from: 'עמית', sev: perWeek < 1.8 ? 'red' : 'warn', title: 'תדירות מתחת לתוכנית',
    body: `${perWeek.toFixed(1)} אימונים בשבוע מול 3. זכור את שבוע המינימום: 2 פעולות × 30 דקות זו הרצפה, לא הכל-או-כלום.`,
  });
  const areas = new Map<string, number>();
  pains.forEach(p => areas.set(p.area, (areas.get(p.area) || 0) + 1));
  for (const [area, n] of areas) if (n >= 2 && !area.includes('גאוט')) flags.push({
    from: 'מאיה', sev: 'warn', title: `${area} — ${n} דיווחים`,
    body: 'אותו אזור חוזר. מחליפים תרגילים לאזור עד שנבין מה קורה.',
  });
  if (workouts.length >= 3 && flexDone / workouts.length < 0.5) flags.push({
    from: 'נעה', sev: 'warn', title: 'בלוק הגמישות נזנח',
    body: `בוצע ב-${flexDone} מתוך ${workouts.length} אימונים. הגמישות היא הדגש החזק שלך, לא התוספת.`,
  });

  flags.sort((a, b) => (a.sev === 'red' ? 0 : 1) - (b.sev === 'red' ? 0 : 1));

  /* ---------- כיול: מה עוד חסר ---------- */
  const c = db.calib;
  const calibMissing: string[] = [];
  if (!c.done) {
    if (!c.firstWeight) calibMissing.push('שקילת בוקר ראשונה');
    if (!c.waist) calibMissing.push('מדידת מותן');
    if (!c.bp) calibMissing.push('לחץ דם');
    if (!c.flexTests) calibMissing.push('מבחני גמישות');
    const left = 6 - (c.runs.A + c.runs.B + c.runs.C);
    if (left > 0) calibMissing.push(`עוד ${left} אימוני כיול (A:${c.runs.A} B:${c.runs.B} C:${c.runs.C})`);
  }

  /* ---------- החלטה אחת. הבטיחות קודמת, ואחריה מה שחוסם מדידה ---------- */
  let decision: string;
  if (worstPain && worstPain.level >= 4)
    decision = `${worstPain.area} בעוצמה ${worstPain.level} — מאיה מחליפה את התרגילים לאזור, והשבוע בלי עומס עליו.`;
  else if (gout.length && gout[gout.length - 1].level >= 3)
    decision = 'שבוע בלי בשר אדום, ובקבוק מים בכל עקצוץ בכף הרגל. אם הכאב חוזר ב-3+ — עוצרים את התרגילים שמעמיסים על הרגל.';
  else if (weighPerWeek < 2)
    decision = 'שקילה 3 פעמים בשבוע — ראשון, שלישי, חמישי. בוקר, אחרי שירותים, לפני אוכל. בלי זה אי אפשר לדעת אם משהו עובד.';
  else if (perWeek < 2.5)
    decision = 'שלושה אימונים השבוע, בימים קבועים מראש. אם נופל — שבוע המינימום, לא אפס.';
  else if (nutrition.protein < 110)
    decision = `חלבון: להוסיף מקור אחד לכל ארוחה (ביצים, קוטג', עוף). היעד 135, אתה על ${nutrition.protein}.`;
  else if (calibMissing.length)
    decision = `לסגור את הכיול: ${calibMissing[0]}.`;
  else decision = 'ממשיכים כרגיל — הנתונים במקום. שומרים על התדירות והמדידות.';

  return {
    from, to, days: span, logged: workouts.length + foodDays.length + weights.length > 0,
    metrics, wins, flags, calibMissing, decision, nutrition,
  };
}
