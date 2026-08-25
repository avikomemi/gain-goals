import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, today } from '../store/store';
import { alerts, nextSteps, nextRoutine, weeklyAvgWeights, lastWaist, streakWeeksNoInjuryStop, currentWeekWorkouts } from '../store/adi';
import { PROGRAM } from '../data/program';
import { PulseRing, Alerts, heDate } from '../components/bits';

export default function Dashboard() {
  const { db, update } = useStore();
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
  const waterToday = db.water.some(w => w.date === today());

  return (
    <div className="scr fade-in">
      <div className="micro">{heDate()} · {db.calib.done ? 'שגרה' : 'שלב כיול'}</div>
      <div className="h-huge mt8">ערב טוב,<br /><em>אבי.</em></div>

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
          <div className="row"><span className="k">רצף ללא השבתה</span><span className="v num">{streak} <small>שבועות</small></span></div>
        </div>
      </div>

      <div className="h-sec">הצעדים הבאים · עדי</div>
      <div className="card">
        {steps.map((s, i) => (
          <div className="step-i" key={i}><b>{i + 1}</b><span>{s}</span></div>
        ))}
      </div>

      <Alerts list={alerts(db)} />

      <button
        className="ghost mt16"
        style={waterToday ? { borderColor: 'var(--good)', color: 'var(--good)' } : {}}
        onClick={() => update(d => {
          if (!d.water.some(w => w.date === today())) d.water.push({ date: today() });
          return d;
        })}
      >
        {waterToday ? '💧 מים סומנו היום ✓' : '💧 שתיתי מים היום'}
      </button>

      <button className="cta mt16" onClick={() => nav('/workout')}>
        התחל אימון {nr} · {routine.name}
        <small>הבא בסבב · {routine.exercises.length} תרגילים + {routine.flexTitle}</small>
      </button>
    </div>
  );
}
