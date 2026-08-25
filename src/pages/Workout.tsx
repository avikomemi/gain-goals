import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROGRAM, RoutineDef, Loc, exName, exNote, BODY_AREAS, KRAV_TAGS, SENSITIVE_BACK_DAY } from '../data/program';
import { useStore, today, WorkoutLog, ExLog } from '../store/store';
import { nextRoutine, direction } from '../store/adi';
import { heDate } from '../components/bits';

type Phase = 'pick' | 'warmup' | 'live' | 'injury' | 'flex' | 'done' | 'krav' | 'backday';

export default function Workout() {
  const { db, update } = useStore();
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>('pick');
  const [routine, setRoutine] = useState<RoutineDef>(PROGRAM.find(p => p.key === nextRoutine(db))!);
  const [loc, setLoc] = useState<Loc>('home');
  const [log, setLog] = useState<ExLog[]>([]);
  const [exIdx, setExIdx] = useState(0);
  const [restLeft, setRestLeft] = useState(0);

  useEffect(() => {
    if (restLeft <= 0) return;
    const t = setTimeout(() => setRestLeft(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [restLeft]);

  const startLive = (r: RoutineDef, l: Loc) => {
    setRoutine(r); setLoc(l);
    setLog(r.exercises.map(ex => {
      const prev = db.workouts.flatMap(w => w.exercises).filter(e => e.id === ex.id && !e.skipped).pop();
      const sets = prev?.sets?.length
        ? prev.sets.map(s => ({ ...s, done: false }))
        : Array.from({ length: ex.setsDefault }, () => ({ reps: ex.repsDefault, weight: ex.weighted ? 0 : undefined, done: false }));
      return { id: ex.id, name: exName(ex, l), sets, rpe: undefined };
    }));
    setExIdx(0);
    setPhase('warmup');
  };

  const saveWorkout = (stoppedEarly: boolean, flexDone: boolean) => {
    update(d => {
      const w: WorkoutLog = { id: crypto.randomUUID(), date: today(), routine: routine.key, loc, exercises: log, stoppedEarly, flexDone };
      d.workouts.push(w);
      if (!d.calib.done) {
        d.calib.runs[routine.key] = Math.min(2, d.calib.runs[routine.key] + 1);
        const c = d.calib;
        if (c.firstWeight && c.waist && c.bp && c.flexTests && c.runs.A >= 2 && c.runs.B >= 2 && c.runs.C >= 2) c.done = true;
      }
      return d;
    });
  };

  /* ============ PICK ============ */
  if (phase === 'pick') {
    const nr = nextRoutine(db);
    return (
      <div className="scr fade-in">
        <div className="micro">{heDate()} · בחר פעילות</div>
        <div className="h-huge mt8">מה עושים <em>היום?</em></div>
        <div className="h-sec">אימוני ABC · הבא בתור: {nr}</div>
        {PROGRAM.map(r => (
          <div className="card mt8" key={r.key} style={r.key === nr ? { borderColor: 'var(--acc)' } : {}}>
            <div className="spread">
              <div>
                <b style={{ fontSize: 16, fontWeight: 900 }}>{r.icon} אימון {r.key} · {r.name}</b>
                {r.key === nr && <span className="dir ease" style={{ marginInlineStart: 8 }}>הבא בתור</span>}
                <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>{r.focus}</div>
              </div>
            </div>
            <div className="seg mt12">
              {r.key === 'B' ? (
                <b style={{ opacity: .45 }} onClick={() => alert('גרסת הבית של אימון B דורשת טבעות — שעדיין לא הגיעו. בינתיים B בחדר הכושר. כשתקנה טבעות, תגיד לעמית והוא יפתח את זה.')}>🏠 בית · 🔒 צריך טבעות</b>
              ) : (
                <b onClick={() => startLive(r, 'home')}>🏠 בית · בלי ציוד</b>
              )}
              <b onClick={() => startLive(r, 'gym')}>🏋️ חדר כושר</b>
            </div>
          </div>
        ))}
        <div className="h-sec">עוד</div>
        <div className="seg">
          <b onClick={() => setPhase('krav')}>🥊 רישום קרב מגע</b>
          <b onClick={() => setPhase('backday')}>🌡️ יום גב רגיש</b>
        </div>
      </div>
    );
  }

  /* ============ WARMUP ============ */
  if (phase === 'warmup') {
    return (
      <div className="scr fade-in">
        <div className="micro">אימון {routine.key} · {loc === 'home' ? '🏠 בית' : '🏋️ חדר כושר'}</div>
        <div className="h-huge mt8">חימום.</div>
        {loc === 'gym' && (
          <div className="alert mt12">🧊 <span><b>פרוטוקול אנטי-התכווצות:</b> רחוק מפתח המזגן, סווטשירט/חולצה יבשה בהישג יד. הפליאומטריה מיד אחרי החימום — כשהגוף חם.</span></div>
        )}
        <div className="card mt12">
          {routine.warmup.map((w, i) => (
            <div className="step-i" key={i}><b>·</b><span>{w}</span></div>
          ))}
        </div>
        <button className="cta mt16" onClick={() => setPhase('live')}>סיימתי חימום · לתרגילים ←</button>
      </div>
    );
  }

  /* ============ LIVE ============ */
  if (phase === 'live') {
    const exDef = routine.exercises[exIdx];
    const exLog = log[exIdx];
    const { dir, why } = direction(db, exDef.id, exDef.area);
    const dirLabel = dir === 'add' ? '▲ הוסף' : dir === 'ease' ? '▼ הקל' : '◼ שמור';
    const prev = db.workouts.flatMap(w => w.exercises).filter(e => e.id === exDef.id && !e.skipped).pop();

    const setLogAt = (fn: (e: ExLog) => void) => setLog(ls => { const c = structuredClone(ls); fn(c[exIdx]); return c; });

    return (
      <div className="scr fade-in" key={exDef.id}>
        <div className="spread">
          <div className="micro">אימון {routine.key} · {loc === 'home' ? '🏠 בית' : '🏋️ חדר'}</div>
          <div className="dots">
            {routine.exercises.map((_, i) => (
              <i key={i} className={i < exIdx ? 'done' : i === exIdx ? 'now' : ''} />
            ))}
          </div>
        </div>
        <div className="w-name">{exLog.name}</div>
        <div className="w-meta">
          <span>יעד: <b>{exDef.target}</b></span>
          {exNote(exDef, loc) && <span style={{ color: 'var(--acc)' }}>{exNote(exDef, loc)}</span>}
        </div>
        <div className="mt12 spread">
          <span className="pill">
            {prev ? <>פעם קודמת: <b className="num">{prev.sets.map(s => s.reps).join(' · ')}</b>{prev.sets[0]?.weight ? ` @ ${prev.sets[0].weight} ק"ג` : ''}</> : 'פעם ראשונה — כיול'}
          </span>
          <span className={`dir ${dir}`} title={why} onClick={() => alert(why)}>{dirLabel}</span>
        </div>

        <div className="mt12">
          {exLog.sets.map((s, si) => (
            <div className={`set ${s.done ? 'done' : ''}`} key={si}>
              <span className="sn">סט {si + 1}</span>
              <div className="stp">
                <span>{exDef.timeBased ? 'שניות' : 'חזרות'}</span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <button onClick={() => setLogAt(e => { e.sets[si].reps = Math.max(0, e.sets[si].reps - 1); })}>−</button>
                  <b className="num">{s.reps}</b>
                  <button onClick={() => setLogAt(e => { e.sets[si].reps += 1; })}>+</button>
                </span>
              </div>
              {exDef.weighted && (
                <div className="stp">
                  <span>ק"ג</span>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => setLogAt(e => { e.sets[si].weight = Math.max(0, (e.sets[si].weight || 0) - 1); })}>−</button>
                    <b className="num">{s.weight ?? 0}</b>
                    <button onClick={() => setLogAt(e => { e.sets[si].weight = (e.sets[si].weight || 0) + 1; })}>+</button>
                  </span>
                </div>
              )}
              <div className="ok" onClick={() => { setLogAt(e => { e.sets[si].done = !e.sets[si].done; }); if (!s.done) setRestLeft(90); }}>
                {s.done ? '✓' : ''}
              </div>
            </div>
          ))}
        </div>
        <button className="addset" onClick={() => setLogAt(e => { e.sets.push({ ...e.sets[e.sets.length - 1], done: false }); })}>+ הוסף סט</button>

        {restLeft > 0 && (
          <div className="alert mt12" style={{ borderColor: 'var(--line)' }}>⏱️ <span>מנוחה: <b className="num">{Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}</b> <button className="pill" style={{ marginInlineStart: 10 }} onClick={() => setRestLeft(0)}>דלג</button></span></div>
        )}

        <div className="rpe">
          <span>מאמץ</span>
          {[6, 7, 8, 9, 10].map(n => (
            <b key={n} className={exLog.rpe === n ? 'on' : ''} onClick={() => setLogAt(e => { e.rpe = n; })}>{n}</b>
          ))}
        </div>

        <div className="mt16" style={{ display: 'flex', gap: 10 }}>
          <button className="cta" style={{ flex: 1 }} onClick={() => {
            setRestLeft(0);
            if (exIdx < routine.exercises.length - 1) setExIdx(exIdx + 1);
            else setPhase('flex');
          }}>
            {exIdx < routine.exercises.length - 1 ? 'התרגיל הבא ←' : 'לבלוק הגמישות ←'}
          </button>
          <button className="ghost" style={{ width: 56, fontSize: 18 }} title="צלם וידאו לפידבק טכניקה — שלח לצוות בצ'אט" onClick={() => alert('צלם וידאו של הביצוע ושלח לעמית בצ\'אט — נעה או רז יחזרו עם תיקונים. (העלאה מתוך האפליקציה תגיע עם הסנכרון)')}>📷</button>
        </div>
        <button className="ghost warn mt8" onClick={() => setPhase('injury')}>⚠ עצור — משהו כואב</button>
        <button className="ghost mt8" onClick={() => setLogAt(e => { e.skipped = true; }) || (exIdx < routine.exercises.length - 1 ? setExIdx(exIdx + 1) : setPhase('flex'))}>דלג על התרגיל</button>
      </div>
    );
  }

  /* ============ INJURY ============ */
  if (phase === 'injury') {
    return <InjuryFlow
      exerciseName={log[exIdx]?.name}
      onDone={(saved) => {
        if (saved) { saveWorkout(true, false); setPhase('done'); }
        else setPhase('live');
      }}
    />;
  }

  /* ============ FLEX ============ */
  if (phase === 'flex') {
    return (
      <div className="scr fade-in">
        <div className="micro">אימון {routine.key} · שלב אחרון</div>
        <div className="h-huge mt8">{routine.flexTitle.split('·')[1]}<em>.</em></div>
        <div style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 6 }}>הגמישות היא חלק מהאימון — הדגש החזק שלך. של נעה.</div>
        <div className="card mt12">
          {routine.flexibility.map((f, i) => (
            <div className="step-i" key={i}><b>·</b><span><b style={{ fontWeight: 700 }}>{f.name}</b> — {f.dose}</span></div>
          ))}
        </div>
        {routine.finisher && (
          <div className="card mt12" style={{ borderColor: 'rgba(216,31,42,.3)' }}>
            <b style={{ fontWeight: 900, fontSize: 14 }}>{routine.finisher.name}</b>
            <div style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 3 }}>{routine.finisher.dose} · {routine.finisher.note}</div>
          </div>
        )}
        <button className="cta mt16" onClick={() => { saveWorkout(false, true); setPhase('done'); }}>סיים אימון 🎉</button>
        <button className="ghost mt8" onClick={() => { saveWorkout(false, false); setPhase('done'); }}>סיים בלי גמישות (נעה רושמת לפניה)</button>
      </div>
    );
  }

  /* ============ DONE ============ */
  if (phase === 'done') {
    const doneSets = log.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
    return (
      <div className="scr fade-in" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 60 }}>💥</div>
        <div className="h-huge mt12">אימון {routine.key}<br /><em>בפנקס.</em></div>
        <div className="grid3 mt20">
          <div className="cell"><b className="num">{doneSets}</b><span>סטים</span></div>
          <div className="cell"><b className="num">{log.filter(e => !e.skipped).length}</b><span>תרגילים</span></div>
          <div className="cell"><b className="num">{loc === 'home' ? '🏠' : '🏋️'}</b><span>{loc === 'home' ? 'בית' : 'חדר'}</span></div>
        </div>
        <button className="cta mt20" onClick={() => nav('/')}>חזרה לדשבורד</button>
      </div>
    );
  }

  /* ============ KRAV LOG ============ */
  if (phase === 'krav') {
    return <KravFlow onDone={() => nav('/')} onBack={() => setPhase('pick')} />;
  }

  /* ============ SENSITIVE BACK DAY ============ */
  return (
    <div className="scr fade-in">
      <div className="micro">תבנית חלופית · מאיה</div>
      <div className="h-huge mt8">יום גב <em>רגיש.</em></div>
      <div style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 6 }}>הגב מציק? לא מוותרים על תנועה — מוותרים על עומס.</div>
      <div className="card mt12">
        {SENSITIVE_BACK_DAY.map((s, i) => <div className="step-i" key={i}><b>·</b><span>{s}</span></div>)}
      </div>
      <div className="alert mt12">📌 <span><b>מאיה:</b> 3 ימים רצופים של גב רגיש — מדברים, ושוקלים רופא/פיזיו.</span></div>
      <button className="cta mt16" onClick={() => setPhase('pick')}>חזרה</button>
    </div>
  );
}

/* ================= Injury flow ================= */
function InjuryFlow({ exerciseName, onDone }: { exerciseName?: string; onDone: (saved: boolean) => void }) {
  const { update } = useStore();
  const [what, setWhat] = useState('נעצרתי באמצע');
  const [area, setArea] = useState('גב תחתון');
  const [level, setLevel] = useState(5);
  const [note, setNote] = useState('');
  return (
    <div className="scr fade-in">
      <div className="micro">דיווח פציעה · מאיה</div>
      <div className="h-huge mt8">מה <em>קרה?</em></div>
      <div className="field"><label>מה קרה</label>
        <div className="seg">
          {['נעצרתי באמצע', 'כאב אבל המשכתי', 'כאב אחרי'].map(w => (
            <b key={w} className={what === w ? 'on' : ''} onClick={() => setWhat(w)}>{w}</b>
          ))}
        </div>
      </div>
      <div className="field"><label>איפה בגוף</label>
        <div className="tagrow">
          {BODY_AREAS.map(a => <b key={a} className={area === a ? 'on' : ''} onClick={() => setArea(a)}>{a}</b>)}
        </div>
      </div>
      <div className="field"><label>רמת כאב · {level}/10</label>
        <div className="seg">
          {[2, 3, 4, 5, 6, 7, 8].map(n => <b key={n} className={level === n ? 'on' : ''} onClick={() => setLevel(n)}>{n}</b>)}
        </div>
      </div>
      <div className="field"><label>מה עשית / הערות (לא חובה)</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="עצרתי, מתחתי קצת..." />
      </div>
      {area.includes('גב') && level >= 4 && (
        <div className="alert mt12">🌡️ <span><b>מאיה:</b> גב {level}/10 — האימון הבא הוא "יום גב רגיש". בלי עומסים עד שהכאב יורד מתחת ל-2.</span></div>
      )}
      {area.includes('גאוט') && (
        <div className="alert mt12">💧 <span><b>ד"ר ארז:</b> מצב חירום מים — בקבוק עכשיו, אפס עומס על כף הרגל, רק עליון/גמישות.</span></div>
      )}
      <button className="cta red mt16" onClick={() => {
        update(d => { d.injuries.push({ date: today(), area, level, exercise: exerciseName, what, note: note || undefined }); return d; });
        onDone(true);
      }}>שמור דיווח וסיים אימון</button>
      <button className="ghost mt8" onClick={() => {
        update(d => { d.injuries.push({ date: today(), area, level, exercise: exerciseName, what, note: note || undefined }); return d; });
        onDone(false);
      }}>שמור והמשך להתאמן (בזהירות)</button>
    </div>
  );
}

/* ================= Krav flow ================= */
function KravFlow({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const { update } = useStore();
  const [min, setMin] = useState(60);
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  return (
    <div className="scr fade-in">
      <div className="micro">יומן קרב מגע · רז</div>
      <div className="h-huge mt8">איך היה <em>באימון?</em></div>
      <div className="field"><label>משך (דקות)</label>
        <div className="seg">{[45, 60, 75, 90].map(m => <b key={m} className={min === m ? 'on' : ''} onClick={() => setMin(m)}>{m}</b>)}</div>
      </div>
      <div className="field"><label>עצימות</label>
        <div className="seg">
          {([['קל', 1], ['בינוני', 2], ['עד הסוף', 3]] as const).map(([l, v]) => (
            <b key={v} className={intensity === v ? 'on' : ''} onClick={() => setIntensity(v)}>{l}</b>
          ))}
        </div>
      </div>
      <div className="field"><label>מה עבדתם</label>
        <div className="tagrow">
          {KRAV_TAGS.map(t => (
            <b key={t} className={tags.includes(t) ? 'on' : ''} onClick={() => setTags(x => x.includes(t) ? x.filter(y => y !== t) : [...x, t])}>{t}</b>
          ))}
        </div>
      </div>
      <div className="field"><label>איך הרגיש הגוף (לא חובה)</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="אנרגיה טובה, הברך החזיקה..." />
      </div>
      <button className="cta mt16" onClick={() => {
        update(d => { d.krav.push({ date: today(), min, intensity, tags, note: note || undefined }); return d; });
        onDone();
      }}>שמור 🥊</button>
      <button className="ghost mt8" onClick={onBack}>ביטול</button>
    </div>
  );
}
