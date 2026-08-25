import React, { useState } from 'react';
import { useStore, today, weekStartOf } from '../store/store';
import { reviewDigest, amitDecision, weeklyAvgWeights } from '../store/adi';

const TEAM = [
  { av: '🧠', name: 'עמית', role: 'המאמן הראשי — האינטגרטור, הסקירה השבועית, ההחלטות' },
  { av: '🥊', name: 'רז', role: 'קרב מגע — דאן 7, וינגייט, קמ"י/קפ"פ. יומן הקרב והחזרה מהפגרה' },
  { av: '🤸', name: 'נעה', role: 'תנועה — מוביליטי, גמישות, יציבה, שיקום. בלוקי הגמישות שלה' },
  { av: '🔥', name: 'טל', role: 'קונדישן — אינטרוולים ואנרגיה. דוחף לקצה בתוך הגבולות' },
  { av: '🩺', name: 'מאיה', role: 'פיזיותרפיסטית — הגב, הברכיים, כל דיווח פציעה. וטו בטיחות' },
  { av: '⚕️', name: 'ד"ר ארז', role: 'רופא ספורט — גאוט, לחץ דם, שינה. וטו רפואי' },
  { av: '🥗', name: 'הילה', role: 'תזונאית — יומן האוכל, חלבון 150, מים, קצב 400 ג\'/שבוע' },
  { av: '📊', name: 'עדי', role: 'אנליסט — הדשבורד, המגמות, ההתרעות, הסקירה' },
];

export default function Team() {
  const { db, update } = useStore();
  const wk = weekStartOf(today());
  const done = db.reviews.find(r => r.weekStart === wk);
  const [stress, setStress] = useState(5);
  const [reviewing, setReviewing] = useState(false);
  const d = reviewDigest(db);
  const wa = weeklyAvgWeights(db, 2);

  return (
    <div className="scr fade-in">
      <div className="micro">הצוות שלך</div>
      <div className="h-huge mt8">שמונה אנשים<br /><em>בפינה שלך.</em></div>

      <div className="h-sec">🤝 הסקירה השבועית · ראשון בערב</div>
      {done ? (
        <div className="decision">
          <span className="who">השבוע נסגר · ההחלטה של עמית</span>
          <p>{done.decision}</p>
          <p style={{ color: 'var(--dim)', fontSize: 12 }}>מדד לחץ שדווח: {done.stress}/10</p>
        </div>
      ) : !reviewing ? (
        <div className="card">
          <div className="grid3">
            <div className="cell"><b className="num">{d.workouts}</b><span>אימונים</span></div>
            <div className="cell"><b className="num">{d.pains.length}</b><span>דיווחי כאב</span></div>
            <div className="cell"><b className="num">{d.waterDays}</b><span>ימי מים</span></div>
          </div>
          {wa.length > 0 && <div className="pill mt12" style={{ display: 'block', textAlign: 'center' }}>
            ממוצע שבועי: <b className="num">{wa[wa.length - 1].avg} ק"ג</b>
            {wa.length > 1 && <> · שבוע קודם: <b className="num">{wa[0].avg}</b></>}
          </div>}
          <button className="cta mt12" onClick={() => setReviewing(true)}>פתח סקירה שבועית עם עמית</button>
        </div>
      ) : (
        <div className="card">
          <div className="field"><label>מדד לחץ השבוע · {stress}/10 (כסף, עבודה, חיים)</label>
            <div className="seg">
              {[2, 3, 4, 5, 6, 7, 8, 9].map(n => <b key={n} className={stress === n ? 'on' : ''} onClick={() => setStress(n)}>{n}</b>)}
            </div>
          </div>
          <button className="cta red mt12" onClick={() => {
            const decision = amitDecision(db, stress);
            update(x => { x.reviews.push({ weekStart: wk, stress, decision, closedAt: today() }); return x; });
            setReviewing(false);
          }}>סגור שבוע · קבל את ההחלטה של עמית</button>
        </div>
      )}

      <div className="h-sec">👥 מי בצוות</div>
      <div className="card">
        {TEAM.map(m => (
          <div className="member" key={m.name}>
            <div className="av">{m.av}</div>
            <div><b>{m.name}</b><span>{m.role}</span></div>
          </div>
        ))}
      </div>

      <div className="h-sec">📌 העקרונות שלך</div>
      <div className="card">
        <div className="step-i"><b>·</b><span><b style={{ fontWeight: 700 }}>שבוע מינימום:</b> 2×30 דק' — הרצפה שלא יורדים ממנה</span></div>
        <div className="step-i"><b>·</b><span><b style={{ fontWeight: 700 }}>שבוע עמוס:</b> קרב מגע יורד ראשון, ABC נשאר</span></div>
        <div className="step-i"><b>·</b><span><b style={{ fontWeight: 700 }}>יעד:</b> 85 ק"ג עד דצמבר · ~400 ג'/שבוע · חלבון 150 ג'/יום</span></div>
        <div className="step-i"><b>·</b><span><b style={{ fontWeight: 700 }}>קדוש:</b> מים סביב אימון ובכל עקצוץ גאוט. במבה עד 50 ג' 🙂</span></div>
      </div>

      <div className="h-sec">🔧 נתונים</div>
      <button className="ghost" onClick={() => {
        const blob = new Blob([localStorage.getItem('fitlog-v3') || '{}'], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `fitlog-backup-${today()}.json`;
        a.click();
      }}>⬇️ גיבוי נתונים (JSON)</button>
      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8, textAlign: 'center' }}>סנכרון ענן בין מכשירים — בשלב הבא. בינתיים: גיבוי ידני.</div>
    </div>
  );
}
