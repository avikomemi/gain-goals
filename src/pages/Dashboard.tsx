import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, today, daysAgo } from '../store/store';
import { alerts, nextSteps, nextRoutine, weeklyAvgWeights, lastWaist, streakWeeksNoInjuryStop, currentWeekWorkouts, sleepAdvice, weeklyReviewDue, reviewDigest } from '../store/adi';
import { PROGRAM } from '../data/program';
import { PulseRing, Alerts, heDate } from '../components/bits';

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'בוקר טוב';
  if (h >= 12 && h < 17) return 'צהריים טובים';
  if (h >= 17 && h < 22) return 'ערב טוב';
  return 'לילה טוב';
}

export default function Dashboard() {
  const { db, update, session } = useStore();
  const nav = useNavigate();
  const wa = weeklyAvgWeights(db, 2);
  const cur = wa[wa.length - 1];
  const prev = wa.length > 1 ? wa[wa.length - 2] : undefined;
  const delta = cur && prev ? +(cur.avg - prev.avg).toFixed(1) : null;
  const waist = lastWaist(db);
  const streak = streakWeeksNoInjuryStop(db);
  const nr = nextRoutine(db);
  const routine = PROGRAM.find(p => p.key === nr)!;
  const steps = nextSteps(db);
  const goal = db.waterGoal ?? 1500;
  const ml = db.water.find(w => w.date === today())?.ml ?? 0;
  const addWater = (amt: number) => update(d => {
    let e = d.water.find(w => w.date === today());
    if (!e) { e = { date: today(), ml: 0 }; d.water.push(e); }
    e.ml = Math.max(0, (e.ml || 0) + amt); // גם 0 נשאר רשום — היסטוריה לא נמחקת
    return d;
  });
  const setGoal = (amt: number) => update(d => { d.waterGoal = Math.max(500, Math.min(4000, (d.waterGoal ?? 1500) + amt)); return d; });
  const pct = Math.min(100, Math.round((ml / goal) * 100));

  const lastSleep = db.sleep && db.sleep.length ? db.sleep[db.sleep.length - 1] : undefined;
  const lastSteps = db.steps && db.steps.length ? db.steps[db.steps.length - 1] : undefined;
  const sleepNote = sleepAdvice(db);
  const dayLabel = (d: string) => d === today() ? 'היום' : d === daysAgo(1) ? 'אתמול' : d.slice(5).replace('-', '/');

  return (
    <div className="scr fade-in">
      <div className="micro">{heDate()} · {db.calib.done ? 'שגרה' : 'שלב כיול'}</div>
      <div className="h-huge mt8">{greeting()},<br /><em>{session ? 'אבי.' : 'אורח.'}</em></div>
      {!session && (
        <div className="alert mt12">👤 <span>אתה במצב מקומי — הנתונים נשמרים רק במכשיר הזה. <b>התחבר בטאב "הצוות"</b> כדי שיסתנכרנו לענן ולכל המכשירים, ושהילה תוכל לנתח תמונות.</span></div>
      )}

      <div className="ringwrap">
        <PulseRing done={currentWeekWorkouts(db)} total={3} />
        <div style={{ flex: 1 }}>
          <div className="row"><span className="k">משקל · ממוצע שבועי</span>
            <span className="v num">{cur ? cur.avg : '—'} <small>ק"ג</small>{' '}
              {delta !== null && (delta <= 0
                ? <span className="up">▾{Math.abs(delta)}</span>
                : <span className="down">▴{delta}</span>)}
            </span>
          </div>
          <div className="row"><span className="k">מותן</span><span className="v num">{waist ?? '—'} <small>ס"מ</small></span></div>
          <div className="row"><span className="k">רצף ללא השבתה</span><span className="v num">{streak} <small>{streak === 1 ? 'שבוע' : 'שבועות'}</small></span></div>
        </div>
      </div>

      {db.fitbit?.connected && (lastSleep || lastSteps) && (<>
        <div className="h-sec">⌚ מ-Fitbit</div>
        <div className="card">
          <div className="grid3">
            <div className="cell">
              <b className="num">{lastSleep ? `${Math.floor(lastSleep.minutes / 60)}:${String(lastSleep.minutes % 60).padStart(2, '0')}` : '—'}</b>
              <span>שינה{lastSleep ? ` · ${dayLabel(lastSleep.date)}` : ''}</span>
            </div>
            <div className="cell">
              <b className="num">{lastSleep?.deep != null ? lastSleep.deep : '—'}</b>
              <span>עמוקה (דק')</span>
            </div>
            <div className="cell">
              <b className="num">{lastSteps ? lastSteps.count.toLocaleString('he-IL') : '—'}</b>
              <span>צעדים{lastSteps ? ` · ${dayLabel(lastSteps.date)}` : ''}</span>
            </div>
          </div>
          {sleepNote && <div style={{ fontSize: 12, marginTop: 10, lineHeight: 1.5, color: 'var(--acc2)' }}>😴 {sleepNote.msg}</div>}
        </div>
      </>)}

      {/* הסקירה השבועית ישבה רק בטאב הצוות, ורק בימי ראשון — אבי פשוט לא ראה אותה.
          עכשיו היא צפה כאן, במסך הראשי, כל עוד היא פתוחה. */}
      {weeklyReviewDue(db) && (() => {
        const rd = reviewDigest(db);
        return (
          <>
            <div className="h-sec">🤝 הסקירה השבועית · מחכה לך</div>
            <div className="card" style={{ borderColor: 'var(--acc)' }}>
              <div className="grid3">
                <div className="cell"><b className="num">{rd.workouts}</b><span>אימונים</span></div>
                <div className="cell"><b className="num">{rd.pains.length}</b><span>דיווחי כאב</span></div>
                <div className="cell"><b className="num">{rd.waterDays}</b><span>ימי מים</span></div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 8, lineHeight: 1.5 }}>
                עמית מחכה לסגור את השבוע שעבר — מגמה, מה בוצע, כאבים, ומדד לחץ. החלטה אחת לשבוע הבא.
              </div>
              <button className="cta mt12" onClick={() => nav('/team')}>פתח סקירה עם עמית</button>
            </div>
          </>
        );
      })()}

      <div className="h-sec">הצעדים הבאים · עדי</div>
      <div className="card">
        {steps.map((s, i) => (
          <div className="step-i" key={i}><b>{i + 1}</b><span>{s}</span></div>
        ))}
      </div>

      <Alerts list={alerts(db)} />

      <div className="h-sec">💧 מים · היום</div>
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

      <button className="cta mt16" onClick={() => nav('/workout')}>
        התחל אימון {nr} · {routine.name}
        <small>הבא בסבב · {routine.exercises.length} תרגילים + {routine.flexTitle}</small>
      </button>
    </div>
  );
}
