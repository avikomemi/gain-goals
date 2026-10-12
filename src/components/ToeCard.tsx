// דיווח יומי של כאב הבוהן. אושר ע"י אבי 12.10.26 כתחליף לכלל ההתרעה הישן
// ("עקצוץ גאוט"), שלא עובד כשהכאב כמעט תמיד נוכח.
import React from 'react';
import { useStore, today } from '../store/store';
import { toeToday, toeAvg, toeTrend, toeCoverage } from '../store/toe';

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const color = (l: number) => (l === 0 ? 'var(--good)' : l >= 5 ? 'var(--danger)' : l >= 3 ? 'var(--acc2)' : 'var(--acc)');

export default function ToeCard() {
  const { db, update } = useStore();
  const cur = toeToday(db);
  const avg7 = toeAvg(db, 7);
  const trend = toeTrend(db);
  const seen = toeCoverage(db, 7);

  const set = (level: number) => update(d => {
    const e = d.toe.find(t => t.date === today());
    if (e) e.level = level; else d.toe.push({ date: today(), level });
    return d;
  });

  return (
    <div className="card">
      <div className="spread" style={{ alignItems: 'baseline' }}>
        <b>🦶 כאב בוהן שמאל — היום</b>
        {cur && <b className="num" style={{ fontSize: 22, color: color(cur.level) }}>{cur.level}<small style={{ fontSize: 12, fontWeight: 400 }}>/10</small></b>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 3, marginTop: 10 }}>
        {LEVELS.map(l => (
          <button
            key={l}
            className={cur?.level === l ? 'pill on' : 'pill'}
            onClick={() => set(l)}
            style={{ padding: '9px 0', minWidth: 0, fontWeight: 700, textAlign: 'center',
                     ...(cur?.level === l ? { background: color(l), color: '#fff', borderColor: color(l) } : {}) }}
          >{l}</button>
        ))}
      </div>

      {!cur && <div className="micro mt8" style={{ color: 'var(--dim)' }}>0 זה גם תשובה — יום בלי כאב הוא נתון, לא דילוג.</div>}

      {avg7 !== null && (
        <div className="micro mt8" style={{ color: 'var(--dim)' }}>
          ממוצע 7 ימים: <b className="num">{avg7}</b>
          {seen < 5 && ` (${seen === 1 ? 'רק יום אחד דווח' : `רק ${seen} ימים דווחו`} — עוד מוקדם למגמה)`}
          {trend && seen >= 5 && (
            trend.delta > 0.5 ? <span style={{ color: 'var(--danger)' }}> · ▴{trend.delta} מול השבוע שעבר</span>
            : trend.delta < -0.5 ? <span style={{ color: 'var(--good)' }}> · ▾{Math.abs(trend.delta)} מול השבוע שעבר</span>
            : ' · יציב'
          )}
        </div>
      )}
    </div>
  );
}
