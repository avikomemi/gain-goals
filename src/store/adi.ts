// עדי — האנליסט: ממוצעים, מגמות, אנומליות, התרעות, צ'יפ כיוון, הצעדים הבאים.
import { DB, WorkoutLog, weekStartOf, today, daysAgo } from './store';
import { PROGRAM } from '../data/program';

export interface Alert { from: string; text: string; sev: 'warn' | 'info' }

// כל הסטטיסטיקות נמדדות מיום ההתחלה של אבי — לא לפני
const startOf = (db: DB) => db.startDate ?? today();

/* ---------- weekly aggregates ---------- */
export function weeklyAvgWeights(db: DB, weeks = 6): { week: string; avg: number }[] {
  const map = new Map<string, number[]>();
  for (const w of db.weights) {
    const wk = weekStartOf(w.date);
    if (!map.has(wk)) map.set(wk, []);
    map.get(wk)!.push(w.kg);
  }
  return [...map.entries()]
    .map(([week, arr]) => ({ week, avg: +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-weeks);
}

export function currentWeekWorkouts(db: DB): number {
  const wk = weekStartOf(today());
  return db.workouts.filter(w => weekStartOf(w.date) === wk).length;
}

export function lastWaist(db: DB): number | null {
  return db.waists.length ? db.waists[db.waists.length - 1].cm : null;
}

export function streakWeeksNoInjuryStop(db: DB): number {
  // consecutive weeks (back from current) without a back injury report level>=4
  // נספר רק מאז תאריך ההתחלה — שבועות שלפני לא נחשבים "רצף"
  const firstWeek = weekStartOf(startOf(db));
  let n = 0;
  for (let i = 0; i < 26; i++) {
    const wk = weekStartOf(daysAgo(i * 7));
    if (wk < firstWeek) break;
    const bad = db.injuries.some(j => weekStartOf(j.date) === wk && j.area.includes('גב') && j.level >= 4);
    if (bad) break;
    n++;
  }
  return n;
}

export function nextRoutine(db: DB): 'A' | 'B' | 'C' {
  const order: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
  // דף הפיזיו ('P') הוא אימון נפרד — הוא לא מקדם ולא מאפס את הסבב.
  // בלי הסינון הזה indexOf היה מחזיר -1 וכל אימון שיקום היה מחזיר את הסבב ל-A.
  const last = [...db.workouts].reverse().find(w => order.includes(w.routine as 'A' | 'B' | 'C'));
  if (!last) return 'A';
  return order[(order.indexOf(last.routine as 'A' | 'B' | 'C') + 1) % 3];
}

/* ---------- שינה → עומס אימון (מנתוני Fitbit) ---------- */
// מחזיר עצה רק כשהלילה האחרון קצר אפילו ביחס ל-4-5 השעות הרגילות של אבי, ורק כשהנתון טרי — כדי לא לנדנד.
export function sleepAdvice(db: DB): { minutes: number; date: string; label: string; msg: string } | null {
  if (!db.sleep?.length) return null;
  const last = db.sleep.reduce((a, b) => (a.date >= b.date ? a : b));
  if (!last || last.date < daysAgo(1)) return null; // רלוונטי רק להיום/אתמול
  const label = `${Math.floor(last.minutes / 60)}:${String(last.minutes % 60).padStart(2, '0')}`;
  if (last.minutes >= 240) return null; // מעל 4 שעות — לא מתריעים
  return {
    minutes: last.minutes, date: last.date, label,
    msg: `ישנת ${label} הלילה — קצר אפילו בשבילך. מאיה: עייפות + הגב הרגיש + עומס כבד = שילוב מסוכן. היום מורידים סט או משקל, מאריכים חימום, ולא רודפים מספרים. אימון קל שנעשה שווה יותר מכבד שמפיל.`,
  };
}

/* ---------- צעדים → קלוריות (מנתוני Fitbit) ---------- */
// הערכה גסה: ~0.045 קק"ל לצעד למשקל ~90 ק"ג. לא מדויק כמו מה ש-Fitbit מחשב — הערכה לתצוגה בלבד.
const KCAL_PER_STEP = 0.045;
export function stepsKcal(db: DB, date: string): { steps: number; kcal: number } | null {
  const rec = db.steps?.find(s => s.date === date);
  if (!rec || !rec.count) return null;
  return { steps: rec.count, kcal: Math.round(rec.count * KCAL_PER_STEP) };
}

/* ---------- direction chip ---------- */
export type Direction = 'add' | 'keep' | 'ease';
export function direction(db: DB, exId: string, area?: string): { dir: Direction; why: string } {
  // recent injury in same area (14 days)
  if (area) {
    const recent = db.injuries.find(j => j.date >= daysAgo(14) && j.area && area.includes(j.area.split(' ')[0]));
    if (recent) return { dir: 'ease', why: `דיווח כאב ב${recent.area} לפני פחות משבועיים — מקלים` };
  }
  // long absence
  const last = db.workouts[db.workouts.length - 1];
  if (last && last.date < daysAgo(10)) return { dir: 'ease', why: 'חזרה אחרי הפסקה — שבוע ראשון בעומס מופחת' };
  // history of this exercise
  const hist = db.workouts.flatMap(w => w.exercises.filter(e => e.id === exId && !e.skipped)).slice(-2);
  if (hist.length >= 2) {
    const rpes = hist.map(h => h.rpe ?? 0).filter(Boolean);
    if (rpes.length === 2 && rpes[0] >= 9 && rpes[1] >= 9) return { dir: 'ease', why: 'מאמץ 9+ פעמיים ברצף — סימן עייפות' };
    const lastH = hist[hist.length - 1];
    if ((lastH.rpe ?? 10) <= 8 && lastH.sets.every(s => s.done)) return { dir: 'add', why: 'כל הסטים הושלמו במאמץ 8 ומטה — אפשר להוסיף' };
  }
  return { dir: 'keep', why: 'ממשיכים באותו עומס — בסיס יציב' };
}

/* ---------- alerts ---------- */
export function alerts(db: DB): Alert[] {
  const out: Alert[] = [];
  const wa = weeklyAvgWeights(db, 4);

  // rapid loss
  if (wa.length >= 2) {
    const d = wa[wa.length - 2].avg - wa[wa.length - 1].avg;
    if (d > 0.9) out.push({ from: 'ד"ר ארז', text: `ירדת ${d.toFixed(1)} ק"ג בשבוע — מהר מדי, סיכון התקף גאוט. תוסיף קצת אוכל ותאט.`, sev: 'warn' });
  }
  // upward trend 3 weeks
  if (wa.length >= 3 && wa[wa.length - 1].avg > wa[wa.length - 2].avg && wa[wa.length - 2].avg > wa[wa.length - 3].avg) {
    out.push({ from: 'עמית', text: 'שלושה שבועות של עלייה במגמה. בלי אשמה — בוא נדבר בסקירה על מה קורה.', sev: 'info' });
  }
  // water — לפי כמות במונה, רק אם עברו לפחות יומיים מאז שהתחיל
  const waterMl2d = db.water.filter(w => w.date >= daysAgo(2)).reduce((a, w) => a + (w.ml || 0), 0);
  if (waterMl2d < 500 && startOf(db) <= daysAgo(2)) {
    out.push({ from: 'ד"ר ארז', text: 'כמעט בלי מים במונה יומיים. עם גאוט זה לא מותרות — כוס אחת עכשיו, ולחץ "+ כוס" בדשבורד.', sev: 'warn' });
  }
  // pain repeat
  const wk = weekStartOf(today());
  const areas = new Map<string, number>();
  db.injuries.filter(j => weekStartOf(j.date) === wk).forEach(j => areas.set(j.area, (areas.get(j.area) || 0) + 1));
  for (const [area, n] of areas) if (n >= 2) out.push({ from: 'מאיה', text: `${area} דיווח פעמיים השבוע — מחליפים תרגילים לאזור עד שנבין מה קורה.`, sev: 'warn' });
  // absence
  const last = db.workouts[db.workouts.length - 1];
  if (last && last.date < daysAgo(5)) out.push({ from: 'עמית', text: '5+ ימים בלי אימון. הכל בסדר? זכור את שבוע המינימום: 2×30 דקות וזהו.', sev: 'info' });
  // high stress
  const lastRev = db.reviews[db.reviews.length - 1];
  if (lastRev && lastRev.stress >= 8) out.push({ from: 'עמית', text: 'הלחץ שדיווחת גבוה. השבוע האימון הוא שסתום — לא עוד מטלה. מוריד ציפיות, שומר רצפה.', sev: 'info' });
  // flexibility skipped repeatedly this week
  const wkNow = weekStartOf(today());
  const noFlex = db.workouts.filter(w => weekStartOf(w.date) === wkNow && !w.flexDone && !w.stoppedEarly).length;
  if (noFlex >= 2) out.push({ from: 'נעה', text: `${noFlex} אימונים השבוע בלי בלוק הגמישות — זה הדגש החזק שלך, לא התוספת.`, sev: 'info' });
  // בטיחות קודמת: warn לפני info, ואז מקסימום 2
  return out.sort((a, b) => (a.sev === 'warn' ? 0 : 1) - (b.sev === 'warn' ? 0 : 1)).slice(0, 2);
}

/* ---------- next steps ---------- */
export function nextSteps(db: DB): string[] {
  const steps: string[] = [];
  const c = db.calib;
  if (!c.done) {
    if (!c.firstWeight) steps.push('שקילת בוקר ראשונה — מחר כשקמים');
    if (!c.waist) steps.push('מדידת מותן ראשונה (סרט מדידה, גובה טבור)');
    if (!c.bp) steps.push('מדידת לחץ דם (בית מרקחת / קופ"ח) — פותח את קורט המלח');
    if (!c.flexTests) steps.push('מבחני גמישות בסיס: אצבעות-רצפה, סקוואט עמוק, ידיים מאחורי הגב');
    const runsLeft = 6 - (c.runs.A + c.runs.B + c.runs.C);
    if (runsLeft > 0) steps.push(`אימוני כיול: עוד ${runsLeft} (כל אימון פעמיים לקביעת משקלים)`);
  } else {
    const nr = nextRoutine(db);
    const r = PROGRAM.find(p => p.key === nr)!;
    steps.push(`אימון ${nr} — ${r.name}`);
    const wk2 = weekStartOf(today());
    if (!db.waists.some(w => weekStartOf(w.date) === wk2)) steps.push('מדידת מותן שבועית');
  }
  // הסקירה השבועית — שני באגים שהסתירו אותה לגמרי: (1) היא הופיעה רק בימי ראשון,
  // (2) והיא נדחפה אחרונה, אחרי צעדי הכיול, ואז נחתכה ב-slice(0,3). עכשיו היא ראשונה
  // ונשארת פתוחה כל השבוע עד שנסגרת. הטקס הוא ראשון בערב — אבל מי שפספס עדיין רואה.
  if (weeklyReviewDue(db))
    steps.unshift(new Date().getDay() === 0
      ? 'הסקירה השבועית עם עמית — הערב (בטאב הצוות)'
      : 'הסקירה השבועית של השבוע שעבר — עדיין פתוחה (בטאב הצוות)');
  return steps.slice(0, 3);
}

/* ---------- heatmap (last 8 weeks) ---------- */
export function heatmap(db: DB): { date: string; level: 0 | 1 | 2 | 3; pre?: boolean; fut?: boolean; today?: boolean }[] {
  const cells: { date: string; level: 0 | 1 | 2 | 3; pre?: boolean; fut?: boolean; today?: boolean }[] = [];
  const activity = new Map<string, number>();
  db.workouts.forEach(w => activity.set(w.date, (activity.get(w.date) || 0) + 2));
  db.krav.forEach(k => activity.set(k.date, (activity.get(k.date) || 0) + 2));
  db.water.forEach(w => { if ((w.ml || 0) > 0) activity.set(w.date, (activity.get(w.date) || 0) + 1); });
  const start = weekStartOf(daysAgo(49));
  const d0 = new Date(start + 'T12:00:00');
  const now = today();
  for (let i = 0; i < 56; i++) {
    const d = new Date(d0.getTime() + i * 864e5).toISOString().slice(0, 10);
    const a = activity.get(d) || 0;
    cells.push({
      date: d, level: a >= 3 ? 3 : a === 2 ? 2 : a === 1 ? 1 : 0,
      pre: d < startOf(db) || undefined, fut: d > now || undefined, today: d === now || undefined,
    });
  }
  return cells;
}

export function painByArea(db: DB): { area: string; n: number; last: string; maxLevel: number }[] {
  const m = new Map<string, { n: number; last: string; maxLevel: number }>();
  db.injuries.forEach(j => {
    const e = m.get(j.area) || { n: 0, last: '', maxLevel: 0 };
    e.n++; if (j.date > e.last) e.last = j.date;
    if (j.level > e.maxLevel) e.maxLevel = j.level;
    m.set(j.area, e);
  });
  return [...m.entries()].map(([area, v]) => ({ area, ...v })).sort((a, b) => b.n - a.n);
}

/* ---------- weekly review digest + decision ---------- */
// השבוע שהסקירה סוגרת = השבוע המלא שהסתיים (ראשון–שבת שעברו).
// בלי זה, סקירה של ראשון בערב סיכמה שבוע בן יום אחד והציגה אפסים.
export function reviewedWeek(): string { return weekStartOf(daysAgo(7)); }

// הסקירה השבועית עוד לא נסגרה — ויש בכלל מה לסכם (לא מציקים למשתמש טרי)
export function weeklyReviewDue(db: DB): boolean {
  const hasData = db.workouts.length > 0 || db.weights.length > 0 || db.food.length > 0;
  return hasData && !db.reviews.some(rv => rv.weekStart === weekStartOf(today()));
}

export function reviewDigest(db: DB) {
  const wk = reviewedWeek();
  const workouts = db.workouts.filter(w => weekStartOf(w.date) === wk).length;
  const kravN = db.krav.filter(k => weekStartOf(k.date) === wk).length;
  const pains = db.injuries.filter(j => weekStartOf(j.date) === wk);
  const waterDays = db.water.filter(w => weekStartOf(w.date) === wk && (w.ml || 0) > 0).length;
  const wa = weeklyAvgWeights(db, 4);
  return { workouts, kravN, pains, waterDays, weeklyAvgs: wa };
}

export function amitDecision(db: DB, stress: number): string {
  const d = reviewDigest(db);
  const topPain = d.pains.sort((a, b) => b.level - a.level)[0];
  if (topPain && topPain.level >= 4)
    return `${topPain.area} דיווח כאב ${topPain.level} — מאיה מתאימה את התרגילים לאזור השבוע. שאר התוכנית ללא שינוי.`;
  if (stress >= 8)
    return 'שבוע לחוץ. יורדים לשבוע מינימום רשמי: 2 פעולות של 30 דקות, בלי יעדי ביצוע. האימון הוא השסתום שלך.';
  if (d.workouts >= 3)
    return 'שלושה מלאים. שבוע הבא ממשיכים אותו דבר — עקביות מנצחת אינטנסיביות. עבודה יפה.';
  if (d.workouts === 0)
    return 'שבוע בלי אימונים. קורה. שבוע הבא: מתחילים מהרצפה — שני חצאי אימונים, וזה מספיק כדי לחזור לתנועה.';
  return `בוצעו ${d.workouts} השבוע. שבוע הבא נכוון ל-3 — ואם רק 2, שאחד מהם יהיה C (הרגליים והגמישות שלך).`;
}
