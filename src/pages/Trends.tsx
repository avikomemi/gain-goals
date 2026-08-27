import React from 'react';
import { useStore } from '../store/store';
import { weeklyAvgWeights, heatmap, painByArea } from '../store/adi';

const HEIGHT_M = 1.80; // הגובה של אבי

export default function Trends() {
  const { db, session } = useStore();
  const wa = weeklyAvgWeights(db, 6);
  const max = Math.max(...wa.map(w => w.avg), 1);
  const min = Math.min(...wa.map(w => w.avg), max - 1);
  const cells = heatmap(db);
  const pains = painByArea(db);
  const waistArr = db.waists.slice(-6);

  const lastWeight = db.weights.length ? db.weights[db.weights.length - 1] : null;
  const curAvg = wa.length ? wa[wa.length - 1].avg : (lastWeight?.kg ?? null);
  const lastWaist = db.waists.length ? db.waists[db.waists.length - 1] : null;

  // מדדים
  const bmi = curAvg ? +(curAvg / (HEIGHT_M * HEIGHT_M)).toFixed(1) : null;
  const bmiLabel = bmi == null ? '' : bmi < 18.5 ? 'תת-משקל' : bmi < 25 ? 'תקין' : bmi < 30 ? 'עודף קל' : 'עודף';
  const whtr = lastWaist ? +(lastWaist.cm / (HEIGHT_M * 100)).toFixed(2) : null;
  const whtrLabel = whtr == null ? '' : whtr < 0.5 ? 'מצוין' : whtr < 0.57 ? 'אזור עבודה' : 'גבוה';
  // קצב: שינוי שבועי ממוצע על פני עד 3 שבועות אחרונים
  let pace: number | null = null;
  if (wa.length >= 2) {
    const span = Math.min(3, wa.length - 1);
    pace = +(((wa[wa.length - 1].avg - wa[wa.length - 1 - span].avg) / span)).toFixed(2);
  }
  // צפי הגעה ל-85
  let eta: string | null = null;
  if (pace !== null && pace < -0.05 && curAvg && curAvg > 85) {
    const weeks = Math.ceil((curAvg - 85) / -pace);
    if (weeks < 120) {
      const d = new Date(Date.now() + weeks * 7 * 864e5);
      eta = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    }
  }

  const upd = db.updatedAt ? new Date(db.updatedAt).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="scr fade-in">
      <div className="micro">מגמות · עדי</div>
      <div className="h-huge mt8">המספרים<br /><em>מדברים.</em></div>
      <div style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 8 }}>
        נמדד מאז {db.startDate ?? '—'} · עדכון אחרון: {upd} · {session ? 'מסונכרן לענן ☁️' : 'מקומי בלבד — התחבר בטאב הצוות'}
      </div>

      <div className="h-sec">🧮 המדדים שלך</div>
      <div className="card">
        <div className="row"><span className="k">BMI (לפי 1.80 מ')</span>
          <span className="v num">{bmi ?? '—'} <small>{bmiLabel}</small></span></div>
        <div className="row"><span className="k">יחס מותן-גובה</span>
          <span className="v num" style={{ color: whtr != null && whtr < 0.5 ? 'var(--good)' : 'inherit' }}>{whtr ?? '—'} <small>{whtrLabel}</small></span></div>
        <div className="row"><span className="k">קצב שבועי</span>
          <span className="v num">{pace == null ? '—' : (pace <= 0 ? `▾${Math.abs(pace)}` : `▴${pace}`)} <small>ק"ג/שבוע · יעד ~0.4</small></span></div>
        <div className="row"><span className="k">צפי הגעה ל-85 ק"ג</span>
          <span className="v num">{eta ?? '—'}</span></div>
        <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>
          יחס מותן-גובה הוא המדד הטוב ביותר לחיטוב אצלך (מתחת ל-0.5 = מצוין). BMI לא מבדיל שריר משומן — התייחס אליו כהקשר בלבד. הקצב מחושב מהממוצעים השבועיים.
        </div>
      </div>

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
          <div className="chart-cap">
            <span>כל עמודה = ממוצע שקילות הבוקר של שבוע (א'-ש')</span>
            <span>יעד דצמבר: 85</span>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 6 }}>
            שקילה אחרונה: {lastWeight?.date} ({lastWeight?.kg} ק"ג) · טווח הגרף {min}-{max} ק"ג — ההבדלים מוגדלים ויזואלית
          </div>
        </div>
      )}

      <div className="h-sec">מותן</div>
      <div className="card">
        {waistArr.length === 0
          ? <div style={{ fontSize: 13, color: 'var(--dim)' }}>אין מדידות מותן — המדד המרכזי לחיטוב. סרט מדידה, גובה טבור, פעם בשבוע.</div>
          : <>
            <div className="spread"><span className="pill">אחרון: <b className="num">{lastWaist!.cm} ס"מ</b> · {lastWaist!.date}</span>
              {db.waists.length > 1 && <span className={lastWaist!.cm <= db.waists[0].cm ? 'up' : 'down'}>
                {lastWaist!.cm <= db.waists[0].cm ? '▾' : '▴'}{Math.abs(lastWaist!.cm - db.waists[0].cm).toFixed(1)} ס"מ מאז ההתחלה
              </span>}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 6 }}>נמדד בגובה הטבור, פעם בשבוע בבוקר · {db.waists.length} מדידות סה"כ</div>
          </>}
      </div>

      <div className="h-sec">מפת חום · עקביות 8 שבועות</div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--dim)', fontWeight: 700, marginBottom: 4 }}>
          {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => <span key={d} style={{ flex: 1, textAlign: 'center' }}>{d}</span>)}
        </div>
        <div className="heat">
          {cells.map(c => <i key={c.date}
            className={[c.pre ? 'pre' : c.fut ? 'fut' : c.level ? `l${c.level}` : '', c.today ? 'today' : ''].filter(Boolean).join(' ')}
            title={c.pre ? `${c.date} · לפני ההתחלה` : c.fut ? `${c.date} · עוד לא הגיע` : c.date} />)}
        </div>
        <div className="chart-cap mt8"><span>בהיר=מים בלבד · כהה=אימון/קרב מגע · מלא=אימון+מים</span><span>מסגרת=היום</span></div>
        <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 4 }}>מעומעם = לפני ההתחלה או ימים שעוד לא הגיעו — לא נספרים נגדך</div>
      </div>

      <div className="h-sec">מפת כאב · מאז ההתחלה</div>
      <div className="card">
        {pains.length === 0
          ? <div style={{ fontSize: 13, color: 'var(--dim)' }}>אפס דיווחים. בול מה שמאיה רוצה לראות.</div>
          : <>
            {pains.map(p => (
              <div className="list-item spread" key={p.area}>
                <span><b style={{ fontWeight: 700 }}>{p.area}</b> <span style={{ color: 'var(--dim)', fontSize: 11 }}>· חמור ביותר {p.maxLevel}/10 · אחרון {p.last}</span></span>
                <span className="num" style={{ fontWeight: 900, color: p.n >= 3 ? 'var(--danger)' : 'var(--ink)' }}>{p.n}</span>
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 6 }}>המספר = כמות דיווחי כאב באזור · אדום = 3+ דיווחים (מאיה מתערבת)</div>
          </>}
      </div>
    </div>
  );
}
