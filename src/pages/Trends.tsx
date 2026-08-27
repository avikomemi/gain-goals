import React from 'react';
import { useStore } from '../store/store';
import { weeklyAvgWeights, heatmap, painByArea } from '../store/adi';

export default function Trends() {
  const { db } = useStore();
  const wa = weeklyAvgWeights(db, 6);
  const max = Math.max(...wa.map(w => w.avg), 1);
  const min = Math.min(...wa.map(w => w.avg), max - 1);
  const cells = heatmap(db);
  const pains = painByArea(db);
  const waistArr = db.waists.slice(-6);

  return (
    <div className="scr fade-in">
      <div className="micro">מגמות · עדי</div>
      <div className="h-huge mt8">המספרים<br /><em>מדברים.</em></div>

      <div className="h-sec">משקל · ממוצע שבועי</div>
      {wa.length === 0 ? (
        <div className="card" style={{ fontSize: 13, color: 'var(--dim)' }}>אין שקילות עדיין. שקילת בוקר ראשונה — ביומן.</div>
      ) : (
        <div className="card">
          <div className="chart">
            {wa.map((w, i) => {
              const h = 20 + 75 * ((w.avg - min) / Math.max(max - min, 0.1));
              return <i key={w.week} className={i === wa.length - 1 ? 'hot' : ''} style={{ height: `${h}%` }}><em>{w.avg}</em></i>;
            })}
          </div>
          <div className="chart-cap"><span>{wa.length} שבועות אחרונים</span><span>יעד דצמבר: 85</span></div>
        </div>
      )}

      <div className="h-sec">מותן</div>
      <div className="card">
        {waistArr.length === 0
          ? <div style={{ fontSize: 13, color: 'var(--dim)' }}>אין מדידות מותן — המדד המרכזי ל-shredded. סרט מדידה, גובה טבור, פעם בשבוע.</div>
          : <div className="spread"><span className="pill">אחרון: <b className="num">{waistArr[waistArr.length - 1].cm} ס"מ</b></span>
            {waistArr.length > 1 && <span className={waistArr[waistArr.length - 1].cm <= waistArr[0].cm ? 'up' : 'down'}>
              {waistArr[waistArr.length - 1].cm <= waistArr[0].cm ? '▾' : '▴'}{Math.abs(waistArr[waistArr.length - 1].cm - waistArr[0].cm).toFixed(1)} ס"מ מאז ההתחלה
            </span>}
          </div>}
      </div>

      <div className="h-sec">מפת חום · עקביות 8 שבועות</div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--dim)', fontWeight: 700, marginBottom: 4 }}>
          {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => <span key={d} style={{ flex: 1, textAlign: 'center' }}>{d}</span>)}
        </div>
        <div className="heat">
          {cells.map(c => <i key={c.date} className={c.pre ? 'pre' : c.level ? `l${c.level}` : ''} title={c.pre ? `${c.date} · לפני ההתחלה` : c.date} />)}
        </div>
        <div className="chart-cap mt8"><span>ריק=כלום · בהיר=מים · כהה=אימון</span><span>מעומעם = לפני ההתחלה</span></div>
      </div>

      <div className="h-sec">מפת כאב</div>
      <div className="card">
        {pains.length === 0
          ? <div style={{ fontSize: 13, color: 'var(--dim)' }}>אפס דיווחים. בול מה שמאיה רוצה לראות.</div>
          : pains.map(p => (
            <div className="list-item spread" key={p.area}>
              <span><b style={{ fontWeight: 700 }}>{p.area}</b> <span style={{ color: 'var(--dim)', fontSize: 11 }}>· אחרון {p.last}</span></span>
              <span className="num" style={{ fontWeight: 900, color: p.n >= 3 ? 'var(--danger)' : 'var(--ink)' }}>{p.n}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
