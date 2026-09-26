// מונה המים. אבי, 26.9.26: "את עדכוני השתיה שים ביומן. זה חלק מהעדכון הרגיל."
// עבר מהדשבורד ליומן — שתייה נרשמת יחד עם האוכל, לא במסך הסיכום.
import React from 'react';
import { useStore, today } from '../store/store';
import { getGoals, clampGoal } from '../store/goals';

export default function WaterCard() {
  const { db, update } = useStore();
  const goal = getGoals(db).waterMl;
  const ml = db.water.find(w => w.date === today())?.ml ?? 0;
  const pct = Math.min(100, Math.round((ml / goal) * 100));

  const addWater = (amt: number) => update(d => {
    let e = d.water.find(w => w.date === today());
    if (!e) { e = { date: today(), ml: 0 }; d.water.push(e); }
    e.ml = Math.max(0, (e.ml || 0) + amt);   // גם 0 נשאר רשום — היסטוריה לא נמחקת
    return d;
  });
  const setGoal = (amt: number) => update(d => {
    d.goals = { ...d.goals, waterMl: clampGoal('waterMl', getGoals(d).waterMl + amt) };
    return d;
  });

  return (
    <div className="card">
      <div className="spread" style={{ alignItems: 'baseline' }}>
        <b className="num" style={{ fontSize: 22, color: ml >= goal ? 'var(--good)' : 'inherit' }}>
          {ml} <small style={{ fontSize: 12, fontWeight: 400 }}>מ"ל</small>{ml >= goal && ' ✓'}
        </b>
        <span style={{ fontSize: 12, color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
          יעד אישי:
          <button className="ok" style={{ width: 26, height: 26 }} onClick={() => setGoal(-250)}>−</button>
          <b className="num">{goal}</b>
          <button className="ok" style={{ width: 26, height: 26 }} onClick={() => setGoal(250)}>+</button>
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--chip)', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: ml >= goal ? 'var(--good)' : 'var(--acc)', transition: 'width .3s' }} />
      </div>
      <div className="seg mt12">
        <b onClick={() => addWater(250)}>+ כוס (250)</b>
        <b onClick={() => addWater(500)}>+ בקבוק (500)</b>
        <b style={{ flex: '0 0 auto', padding: '10px 14px', opacity: ml === 0 ? .35 : 1 }} onClick={() => addWater(-250)}>−</b>
      </div>
      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>כל לחיצה נרשמת לתאריך של היום. היעד שלך — קצב שנוח לך, מעלים בהדרגה. עדי עוקבת אחרי ימים בלי רישום.</div>
    </div>
  );
}
