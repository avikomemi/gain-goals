import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROGRAM, RoutineDef, Loc, exName, exNote, BODY_AREAS, KRAV_TAGS, SENSITIVE_BACK_DAY } from '../data/program';
import { useStore, today, WorkoutLog, ExLog } from '../store/store';
import { nextRoutine, direction } from '../store/adi';
import { heDate } from '../components/bits';

type Phase = 'pick' | 'warmup' | 'live' | 'injury' | 'flex' | 'done' | 'krav' | 'backday' | 'order';

function orderedExercises(r: RoutineDef, saved?: string[]) {
  if (!saved?.length) return r.exercises;
  const byId = new Map(r.exercises.map(e => [e.id, e]));
  const out = saved.map(id => byId.get(id)).filter(Boolean) as typeof r.exercises;
  r.exercises.forEach(e => { if (!out.includes(e)) out.push(e); });
  return out;
}

const LIVE_KEY = 'fitlog-live';           // מצב אימון חי — מקומי בלבד, לא מסונכרן לענן
const LIVE_MAX_AGE = 6 * 60 * 60 * 1000;  // אימון שנשמר לפני יותר מ-6 שעות לא משוחזר (כנראה ננטש)
const REST_PRESETS = [60, 90, 120];
const PHASES_PERSIST: Phase[] = ['warmup', 'live', 'flex', 'injury'];

// צלצול סוף-מנוחה: Web Audio (שני צלילים חדים שנשמעים גם מעל מוזיקה) + רטט אם יש
function ringBell(ac: AudioContext | null) {
  try {
    if (ac) {
      if (ac.state === 'suspended') ac.resume();
      const beep = (at: number, freq: number) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        const t0 = ac.currentTime + at;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
        osc.connect(g); g.connect(ac.destination);
        osc.start(t0); osc.stop(t0 + 0.36);
      };
      beep(0, 880); beep(0.3, 1245);
    }
  } catch { /* אין אודיו — נסתמך על רטט/ויזואל */ }
  try { navigator.vibrate?.([220, 120, 260]); } catch { /* לא נתמך (iOS) */ }
}

// שחזור אימון פעיל שנשמר (סעיף 12) — מחזיר null אם אין/פגום/ישן/לא-אימון-פעיל
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadLive(): any | null {
  try {
    const raw = localStorage.getItem(LIVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    const routine = PROGRAM.find(p => p.key === s.routineKey);
    const fresh = s.ts && (Date.now() - s.ts) < LIVE_MAX_AGE;
    if (routine && fresh && PHASES_PERSIST.includes(s.phase) && Array.isArray(s.log)) {
      return { ...s, routine };
    }
  } catch { /* פגום — מתעלמים, לא מאבדים את ה-DB */ }
  return null;
}

export default function Workout() {
  const { db, update } = useStore();
  const nav = useNavigate();
  const restored = useRef(loadLive()).current; // אימון פעיל שנשמר לפני רענון/יציאה (סעיף 12)
  const [phase, setPhase] = useState<Phase>(restored ? restored.phase : 'pick');
  const [routine, setRoutine] = useState<RoutineDef>(restored?.routine ?? PROGRAM.find(p => p.key === nextRoutine(db))!);
  const [loc, setLoc] = useState<Loc>(restored?.loc ?? 'home');
  const [log, setLog] = useState<ExLog[]>(restored?.log ?? []);
  const [exIdx, setExIdx] = useState<number>(restored?.exIdx ?? 0);
  const [restEndAt, setRestEndAt] = useState<number | null>(restored?.restEndAt ?? null); // חותמת סיום מנוחה (ms) — שורדת רענון
  const [now, setNow] = useState(() => Date.now());
  const [whyOpen, setWhyOpen] = useState<string | null>(null);
  const [injuryAck, setInjuryAck] = useState<string | null>(restored?.injuryAck ?? null); // דיווח כאב שנשמר תוך כדי אימון
  const [endedByInjury, setEndedByInjury] = useState<boolean>(restored?.endedByInjury ?? false);
  const [savedFlex, setSavedFlex] = useState(true);

  const audioRef = useRef<AudioContext | null>(null);
  const restSec = db.restSec ?? 90;

  // יצירת/העָרַת AudioContext — חייב לקרות בתוך מחוות משתמש (דרישת iOS)
  const ensureAudio = () => {
    try {
      if (!audioRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) audioRef.current = new AC();
      }
      if (audioRef.current?.state === 'suspended') audioRef.current.resume();
    } catch { /* אין אודיו — רטט/ויזואל בלבד */ }
  };

  const startRest = () => { ensureAudio(); setNow(Date.now()); setRestEndAt(Date.now() + restSec * 1000); };

  // שעון מנוחה מבוסס-חותמת-זמן: מתקתק כל 250ms (מדויק, שורד רענון)
  useEffect(() => {
    if (!restEndAt) return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [restEndAt]);

  // צלצול כשהמנוחה נגמרה (סעיף 2) — כולל צלצול מיידי בחזרה אם הזמן כבר עבר (סעיף 7ב)
  useEffect(() => {
    if (restEndAt && now >= restEndAt) { ringBell(audioRef.current); setRestEndAt(null); }
  }, [now, restEndAt]);

  // שימור מצב אימון חי ל-localStorage (סעיף 12) — נמחק כשהאימון נגמר/ננטש
  useEffect(() => {
    try {
      if (PHASES_PERSIST.includes(phase)) {
        localStorage.setItem(LIVE_KEY, JSON.stringify({
          v: 1, ts: Date.now(), phase, routineKey: routine.key, loc, log, exIdx, restEndAt, injuryAck, endedByInjury,
        }));
      } else {
        localStorage.removeItem(LIVE_KEY);
      }
    } catch { /* אחסון מלא — לא קריטי לשימור החי */ }
  }, [phase, routine, loc, log, exIdx, restEndAt, injuryAck, endedByInjury]);

  const abandonLive = () => {
    if (!confirm('לצאת מהאימון? המצב הנוכחי לא יישמר ביומן.')) return;
    setRestEndAt(null); setInjuryAck(null); setEndedByInjury(false);
    localStorage.removeItem(LIVE_KEY);
    setPhase('pick');
  };

  const startLive = (r: RoutineDef, l: Loc) => {
    setRoutine(r); setLoc(l);
    setLog(orderedExercises(r, db.orders[r.key]).map(ex => {
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
    setSavedFlex(flexDone);
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
                <div style={{ fontSize: 12, marginTop: 6, cursor: 'pointer', color: 'var(--acc)', fontWeight: 700 }}
                  onClick={() => setWhyOpen(whyOpen === r.key ? null : r.key)}>
                  {whyOpen === r.key ? '▴ מה האימון הזה משיג' : '▾ מה האימון הזה משיג?'}
                </div>
                {whyOpen === r.key && <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.55 }}>{r.why}</div>}
              </div>
            </div>
            <div className="seg mt12">
              {r.key === 'B' ? (
                <b style={{ opacity: .45 }} onClick={() => alert('גרסת הבית של אימון B דורשת טבעות — שעדיין לא הגיעו. בינתיים B בחדר הכושר. כשתקנה טבעות, תגיד לעמית והוא יפתח את זה.')}>🏠 בית · 🔒 צריך טבעות</b>
              ) : (
                <b onClick={() => startLive(r, 'home')}>🏠 בית · בלי ציוד</b>
              )}
              <b onClick={() => startLive(r, 'gym')}>🏋️ חדר כושר</b>
              <b style={{ flex: '0 0 auto', padding: '10px 14px' }} title="שנה סדר תרגילים" onClick={() => { setRoutine(r); setPhase('order'); }}>⇅</b>
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

  /* ============ ORDER EDITOR ============ */
  if (phase === 'order') {
    const cur = orderedExercises(routine, db.orders[routine.key]);
    const move = (i: number, dirn: -1 | 1) => {
      const ids = cur.map(e => e.id);
      const j = i + dirn;
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      update(d => { d.orders[routine.key] = ids; return d; });
    };
    return (
      <div className="scr fade-in">
        <div className="micro">אימון {routine.key} · {routine.name}</div>
        <div className="h-huge mt8">סדר <em>התרגילים.</em></div>
        <div style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 6 }}>אתה הבוס. חיצים לשינוי — נשמר אוטומטית וחל על כל האימונים הבאים. המלצת עמית: נפיצות מוקדם, כשהגוף חם וטרי.</div>
        <div className="card mt12">
          {cur.map((ex, i) => (
            <div className="set" key={ex.id} style={{ alignItems: 'center' }}>
              <span className="sn num">{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{ex.name}</span>
              <button className="ok" onClick={() => move(i, -1)} style={{ opacity: i === 0 ? .3 : 1 }}>↑</button>
              <button className="ok" onClick={() => move(i, 1)} style={{ opacity: i === cur.length - 1 ? .3 : 1 }}>↓</button>
            </div>
          ))}
        </div>
        {db.orders[routine.key]?.length ? (
          <button className="ghost mt12" onClick={() => update(d => { delete d.orders[routine.key]; return d; })}>איפוס לסדר של עמית</button>
        ) : null}
        <button className="cta mt12" onClick={() => setPhase('pick')}>חזרה (הסדר כבר נשמר)</button>
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
    const exList = orderedExercises(routine, db.orders[routine.key]);
    const exDef = exList[exIdx];
    const exLog = log[exIdx];
    const { dir, why } = direction(db, exDef.id, exDef.area);
    const dirLabel = dir === 'add' ? '▲ הוסף' : dir === 'ease' ? '▼ הקל' : '◼ שמור';
    const prev = db.workouts.flatMap(w => w.exercises).filter(e => e.id === exDef.id && !e.skipped).pop();

    const setLogAt = (fn: (e: ExLog) => void) => setLog(ls => { const c = structuredClone(ls); fn(c[exIdx]); return c; });
    const restLeft = restEndAt ? Math.max(0, Math.ceil((restEndAt - now) / 1000)) : 0;

    return (
      <div className="scr fade-in" key={exDef.id}>
        <div className="spread">
          <div className="micro">אימון {routine.key} · {loc === 'home' ? '🏠 בית' : '🏋️ חדר'}</div>
          <div className="dots">
            {exList.map((_, i) => (
              <i key={i} className={i < exIdx ? 'done' : i === exIdx ? 'now' : ''} />
            ))}
          </div>
        </div>
        {injuryAck && (
          <div className="alert mt8">⚠️ <span><b>דיווח הכאב נשמר</b> ({injuryAck}) — מאיה תראה אותו. ממשיכים בזהירות, בלי גבורה.</span></div>
        )}
        <div className="w-name">{exLog.name}</div>
        <div className="w-meta">
          <span>יעד: <b>{exDef.target}</b></span>
          {exNote(exDef, loc) && <span style={{ color: 'var(--acc2)' }}>{exNote(exDef, loc)}</span>}
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
              <div className="ok" onClick={() => { const wasDone = s.done; setLogAt(e => { e.sets[si].done = !e.sets[si].done; }); if (!wasDone) startRest(); else setRestEndAt(null); }}>
                {s.done ? '✓' : ''}
              </div>
            </div>
          ))}
        </div>
        <button className="addset" onClick={() => setLogAt(e => { e.sets.push({ ...e.sets[e.sets.length - 1], done: false }); })}>+ הוסף סט</button>

        <div className="field" style={{ marginTop: 12 }}>
          <label>זמן מנוחה בין סטים</label>
          <div className="seg">
            {REST_PRESETS.map(n => (
              <b key={n} className={restSec === n ? 'on' : ''} onClick={() => update(d => { d.restSec = n; return d; })}>{n} שנ'</b>
            ))}
            <b className={!REST_PRESETS.includes(restSec) ? 'on' : ''} onClick={() => {
              const v = prompt('זמן מנוחה בשניות:', String(restSec));
              if (v == null) return;
              const n = Math.max(5, Math.min(600, parseInt(v, 10) || 0));
              if (n) update(d => { d.restSec = n; return d; });
            }}>{!REST_PRESETS.includes(restSec) ? `${restSec} שנ' ✎` : 'מותאם'}</b>
          </div>
        </div>

        {restLeft > 0 && (
          <div className="alert mt12" style={{ borderColor: 'var(--acc)' }}>⏱️ <span>מנוחה: <b className="num">{Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}</b> <button className="pill" style={{ marginInlineStart: 10 }} onClick={() => setRestEndAt(null)}>דלג</button></span></div>
        )}

        <div className="rpe">
          <span>מאמץ</span>
          {[6, 7, 8, 9, 10].map(n => (
            <b key={n} className={exLog.rpe === n ? 'on' : ''} onClick={() => setLogAt(e => { e.rpe = n; })}>{n}</b>
          ))}
        </div>

        <div className="mt16" style={{ display: 'flex', gap: 10 }}>
          <button className="cta" style={{ flex: 1 }} onClick={() => {
            // שעון המנוחה ממשיך לרוץ למעבר לתרגיל הבא (סעיף 7) — לא מאפסים
            if (exIdx < exList.length - 1) setExIdx(exIdx + 1);
            else setPhase('flex');
          }}>
            {exIdx < exList.length - 1
              ? `התרגיל הבא: ${exList[exIdx + 1].name} ←`
              : 'לבלוק הגמישות ←'}
          </button>
          <button className="ghost" style={{ width: 56, fontSize: 18 }} title="פידבק טכניקה" onClick={() => alert('פידבק טכניקה: צלם וידאו קצר באפליקציית המצלמה של הטלפון, ושלח לי (אבי) בצ\'אט של קלוד — נעה או רז יחזרו עם תיקונים. צילום מתוך האפליקציה עצמה — בפיתוח.')}>📷</button>
        </div>
        <button className="ghost warn mt8" onClick={() => setPhase('injury')}>⚠ עצור — משהו כואב</button>
        <button className="ghost mt8" onClick={() => setLogAt(e => { e.skipped = true; }) || (exIdx < exList.length - 1 ? setExIdx(exIdx + 1) : setPhase('flex'))}>דלג על התרגיל</button>
        <button className="ghost mt8" style={{ opacity: .7 }} onClick={abandonLive}>יציאה מהאימון (בלי לשמור)</button>
      </div>
    );
  }

  /* ============ INJURY ============ */
  if (phase === 'injury') {
    return <InjuryFlow
      exerciseName={log[exIdx]?.name}
      onDone={(saved, summary) => {
        if (saved) { saveWorkout(true, false); setEndedByInjury(true); setPhase('done'); }
        else { setInjuryAck(summary || null); setPhase('live'); }
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
          <div className="card mt12" style={{ borderColor: 'rgba(15,118,110,.35)' }}>
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
        <div style={{ fontSize: 60 }}>{endedByInjury ? '🩺' : '💥'}</div>
        <div className="h-huge mt12">{endedByInjury ? <>נעצר נכון.<br /><em>הדיווח נרשם.</em></> : <>אימון {routine.key}<br /><em>בפנקס.</em></>}</div>
        {endedByInjury && (
          <div style={{ fontSize: 13, color: 'var(--dim)', marginTop: 10 }}>מאיה תראה את הדיווח. אם זה גב 4+ — האימון הבא הוא "יום גב רגיש".</div>
        )}
        <div className="grid3 mt20">
          <div className="cell"><b className="num">{doneSets}</b><span>סטים</span></div>
          <div className="cell"><b className="num">{log.filter(e => !e.skipped).length}</b><span>תרגילים</span></div>
          <div className="cell"><b className="num">{loc === 'home' ? '🏠' : '🏋️'}</b><span>{loc === 'home' ? 'בית' : 'חדר'}</span></div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--good)', marginTop: 14 }}>✓ נשמר ביומן · {heDate()}{!savedFlex && !endedByInjury && ' · בלי בלוק גמישות'}</div>
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
function InjuryFlow({ exerciseName, onDone }: { exerciseName?: string; onDone: (saved: boolean, summary?: string) => void }) {
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
        onDone(true, `${area} ${level}/10`);
      }}>שמור דיווח וסיים אימון</button>
      <button className="ghost mt8" onClick={() => {
        if (area.includes('גב') && level >= 6) {
          if (!confirm(`מאיה: כאב גב ${level}/10 זה לא "להתאמן בזהירות" — זו הסלמה בהתהוות. ההמלצה החד-משמעית: לעצור היום ולעבור מחר ל"יום גב רגיש". להמשיך בכל זאת?`)) return;
        }
        update(d => { d.injuries.push({ date: today(), area, level, exercise: exerciseName, what, note: note || undefined }); return d; });
        onDone(false, `${area} ${level}/10`);
      }}>שמור והמשך להתאמן (בזהירות)</button>
    </div>
  );
}

/* ================= Krav flow ================= */
function KravFlow({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const { update } = useStore();
  const [min, setMin] = useState('60');
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const minNum = Math.max(0, parseInt(min) || 0);

  if (saved) {
    return (
      <div className="scr fade-in" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 60 }}>🥊</div>
        <div className="h-huge mt12">קרב מגע<br /><em>בפנקס.</em></div>
        <div className="grid3 mt20">
          <div className="cell"><b className="num">{minNum}</b><span>דקות</span></div>
          <div className="cell"><b className="num">{['', 'קל', 'בינוני', 'עד הסוף'][intensity]}</b><span>עצימות</span></div>
          <div className="cell"><b className="num">{tags.length || '—'}</b><span>נושאים</span></div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--good)', marginTop: 14 }}>✓ נשמר ביומן · {heDate()} · רז רואה את זה בסקירה</div>
        <button className="cta mt20" onClick={onDone}>חזרה לדשבורד</button>
      </div>
    );
  }

  return (
    <div className="scr fade-in">
      <div className="micro">יומן קרב מגע · רז</div>
      <div className="h-huge mt8">איך היה <em>באימון?</em></div>
      <div className="field"><label>משך (דקות) — כתוב מה שהיה בפועל</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="ok" onClick={() => setMin(String(Math.max(0, minNum - 5)))}>−5</button>
          <input inputMode="numeric" value={min} onChange={e => setMin(e.target.value.replace(/[^0-9]/g, ''))}
            style={{ width: 76, textAlign: 'center', background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 8px', fontSize: 16, fontWeight: 800 }} />
          <button className="ok" onClick={() => setMin(String(minNum + 5))}>+5</button>
          <span style={{ fontSize: 12, color: 'var(--dim)' }}>דקות</span>
        </div>
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
        if (minNum === 0) { alert('כמה זמן היה האימון? כתוב מספר דקות.'); return; }
        update(d => { d.krav.push({ date: today(), min: minNum, intensity, tags, note: note || undefined }); return d; });
        setSaved(true);
      }}>שמור 🥊</button>
      <button className="ghost mt8" onClick={onBack}>ביטול</button>
    </div>
  );
}
