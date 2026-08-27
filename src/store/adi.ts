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
  const last = db.workouts[db.workouts.length - 1];
  if (!last) return 'A';
  const order: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
  return order[(order.indexOf(last.routine) + 1) % 3];
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
  // water — רק אם עברו לפחות יומיים מאז שהתחיל
  const waterRecent = db.water.filter(w => w.date >= daysAgo(2)).length;
  if (db.weights.length > 0 && waterRecent === 0 && startOf(db) <= daysAgo(2)) {
    out.push({ from: 'ד"ר ארז', text: 'יומיים בלי סימון מים. עם גאוט זה לא מותרות — בקבוק אחד עכשיו.', sev: 'warn' });
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
  return out.slice(0, 2); // one focused alert beats ten; max 2
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
    const wk = weekStartOf(today());
    if (!db.waists.some(w => weekStartOf(w.date) === wk)) steps.push('מדידת מותן שבועית');
    const dow = new Date().getDay();
    if (dow === 0 && !db.reviews.some(rv => rv.weekStart === wk)) steps.push('הסקירה השבועית עם עמית — הערב');
  }
  return steps.slice(0, 3);
}

/* ---------- heatmap (last 8 weeks) ---------- */
export function heatmap(db: DB): { date: string; level: 0 | 1 | 2 | 3; pre?: boolean }[] {
  const cells: { date: string; level: 0 | 1 | 2 | 3; pre?: boolean }[] = [];
  const activity = new Map<string, number>();
  db.workouts.forEach(w => activity.set(w.date, (activity.get(w.date) || 0) + 2));
  db.krav.forEach(k => activity.set(k.date, (activity.get(k.date) || 0) + 2));
  db.water.forEach(w => activity.set(w.date, (activity.get(w.date) || 0) + 1));
  const start = weekStartOf(daysAgo(49));
  const d0 = new Date(start + 'T12:00:00');
  for (let i = 0; i < 56; i++) {
    const d = new Date(d0.getTime() + i * 864e5).toISOString().slice(0, 10);
    const a = activity.get(d) || 0;
    cells.push({ date: d, level: a >= 3 ? 3 : a === 2 ? 2 : a === 1 ? 1 : 0, pre: d < startOf(db) || undefined });
  }
  return cells;
}

export function painByArea(db: DB): { area: string; n: number; last: string }[] {
  const m = new Map<string, { n: number; last: string }>();
  db.injuries.forEach(j => {
    const e = m.get(j.area) || { n: 0, last: '' };
    e.n++; if (j.date > e.last) e.last = j.date;
    m.set(j.area, e);
  });
  return [...m.entries()].map(([area, v]) => ({ area, ...v })).sort((a, b) => b.n - a.n);
}

/* ---------- weekly review digest + decision ---------- */
export function reviewDigest(db: DB) {
  const wk = weekStartOf(today());
  const workouts = db.workouts.filter(w => weekStartOf(w.date) === wk).length;
  const kravN = db.krav.filter(k => weekStartOf(k.date) === wk).length;
  const pains = db.injuries.filter(j => weekStartOf(j.date) === wk);
  const waterDays = db.water.filter(w => weekStartOf(w.date) === wk).length;
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
