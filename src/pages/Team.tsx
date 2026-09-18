import React, { useState } from 'react';
import { useStore, today, weekStartOf, mergeByDate } from '../store/store';
import { reviewDigest, weeklyAvgWeights } from '../store/adi';
import { fullReview, FullReview } from '../store/review';
import { Goals, GOAL_LIMITS, getGoals, clampGoal, goalText, paceWarning, DEFAULT_GOALS } from '../store/goals';
import { supabase } from '../store/cloud';
import { beginFitbitConnect, disconnectFitbit, fitbitConfigured, syncFitbit } from '../store/fitbit';

function CloudCard() {
  const { session, lastSync, syncError, syncNow, recovery, clearRecovery } = useStore();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [needConfirm, setNeedConfirm] = useState(false);

  const inputStyle = { flex: 1, background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 12px', fontSize: 14 } as const;

  if (session && recovery) {
    return (
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700 }}>🔑 קביעת סיסמה חדשה</div>
        <input style={{ ...inputStyle, width: '100%', marginTop: 8 }} type="password" placeholder="סיסמה חדשה (6+ תווים)" value={pass} onChange={e => setPass(e.target.value)} />
        <button className="cta mt8" style={{ opacity: busy ? .6 : 1 }} disabled={busy} onClick={async () => {
          if (pass.length < 6) { setMsg('לפחות 6 תווים.'); return; }
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password: pass });
          setBusy(false);
          if (error) setMsg(`שגיאה: ${error.message}`);
          else { setMsg(''); setPass(''); clearRecovery(); }
        }}>שמור סיסמה חדשה</button>
        {msg && <div style={{ fontSize: 12, marginTop: 8, color: 'var(--danger)' }}>{msg}</div>}
      </div>
    );
  }

  if (session) {
    return (
      <div className="card">
        <div style={{ fontSize: 13 }}>☁️ מחובר: <b>{session.user.email}</b></div>
        <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>
          {lastSync ? `סונכרן לאחרונה: ${new Date(lastSync).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : 'עוד לא סונכרן בהפעלה הזאת'}
          {' · '}נשמר בענן אוטומטית · נמשך מהענן בכל פתיחת אפליקציה.
        </div>
        {syncError && <div style={{ fontSize: 12, marginTop: 6, color: 'var(--danger)' }}>⚠ הסנכרון האחרון נכשל — נסה "סנכרן עכשיו". ({syncError})</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button className="ghost" style={{ flex: 1, opacity: busy ? .6 : 1 }} disabled={busy} onClick={async () => {
            setMsg(''); setBusy(true);
            const e = await syncNow();
            setBusy(false);
            setMsg(e ? `שגיאה: ${e}` : '✓ סונכרן');
          }}>{busy ? '⏳ מסנכרן...' : '🔄 סנכרן עכשיו'}</button>
          <button className="ghost" style={{ flex: '0 0 auto' }} onClick={() => { if (confirm('להתנתק? הנתונים יישארו במכשיר, אבל יפסיקו להסתנכרן.')) supabase.auth.signOut(); }}>התנתק</button>
        </div>
        {msg && <div style={{ fontSize: 12, marginTop: 8, color: msg.startsWith('✓') ? 'var(--good)' : 'var(--danger)' }}>{msg}</div>}
      </div>
    );
  }

  const go = async (mode: 'up' | 'in') => {
    if (!email.includes('@') || pass.length < 6) { setMsg('מייל תקין + סיסמה של 6 תווים לפחות.'); return; }
    setBusy(true); setMsg('');
    const { error } = mode === 'up'
      ? await supabase.auth.signUp({ email, password: pass })
      : await supabase.auth.signInWithPassword({ email, password: pass });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes('not confirmed')) {
        setNeedConfirm(true);
        setMsg('המייל עוד לא אושר. חפש בתיבת הספאם/Junk מייל מ-noreply@mail.app.supabase.io ולחץ על הקישור שבו — ואז התחבר שוב.');
      } else if (error.message.includes('already registered')) setMsg('המייל כבר רשום — נסה "התחברות".');
      else setMsg(`שגיאה: ${error.message}`);
    } else if (mode === 'up') {
      setNeedConfirm(true);
      setMsg('✓ נשלח מייל אישור — בדוק גם בספאם (השולח: noreply@mail.app.supabase.io). לחץ על הקישור וחזור להתחבר.');
    }
  };

  const resend = async () => {
    if (!email.includes('@')) { setMsg('כתוב את המייל למעלה ואז שלח שוב.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setBusy(false);
    setMsg(error ? `שגיאה בשליחה חוזרת: ${error.message}` : '✓ נשלח שוב — בדוק את תיבת הדואר ואת הספאם.');
  };

  return (
    <div className="card">
      <div style={{ fontSize: 12.5, color: 'var(--dim)', marginBottom: 10 }}>התחברות אחת — והנתונים נשמרים בענן, מסתנכרנים בין הטלפון והמחשב, והילה מקבלת עיניים (ניתוח תמונות).</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input style={inputStyle} type="email" inputMode="email" placeholder="המייל שלך" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={inputStyle} type="password" placeholder="סיסמה (6+ תווים)" value={pass} onChange={e => setPass(e.target.value)} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="cta" style={{ flex: 1, opacity: busy ? .6 : 1 }} disabled={busy} onClick={() => go('in')}>התחברות</button>
          <button className="ghost" style={{ flex: 1, opacity: busy ? .6 : 1 }} disabled={busy} onClick={() => go('up')}>הרשמה ראשונה</button>
        </div>
      </div>
      {msg && <div style={{ fontSize: 12, marginTop: 8, color: msg.startsWith('✓') ? 'var(--good)' : 'var(--danger)' }}>{msg}</div>}
      {needConfirm && (
        <button className="ghost mt8" style={{ width: '100%', opacity: busy ? .6 : 1 }} disabled={busy} onClick={resend}>📧 שלח שוב מייל אישור</button>
      )}
      <div style={{ fontSize: 12, marginTop: 10, textAlign: 'center', color: 'var(--acc)', fontWeight: 700, cursor: 'pointer' }} onClick={async () => {
        if (!email.includes('@')) { setMsg('כתוב את המייל למעלה ואז לחץ "שכחתי סיסמה".'); return; }
        setBusy(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://avikomemi.github.io/gain-goals/' });
        setBusy(false);
        setMsg(error ? `שגיאה: ${error.message}` : '✓ נשלח מייל איפוס (בדוק גם בספאם). לחץ על הקישור — תחזור לכאן לקביעת סיסמה חדשה.');
      }}>שכחתי סיסמה</div>
    </div>
  );
}

function FitbitCard() {
  const { session, db, update } = useStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const fb = db.fitbit;

  if (!session) {
    return (
      <div className="card">
        <div style={{ fontSize: 12.5, color: 'var(--dim)' }}>⌚ כדי לחבר Fitbit צריך קודם להתחבר לענן (למעלה) — הטוקן נשמר מאובטח בשרת.</div>
      </div>
    );
  }

  if (fb?.connected) {
    return (
      <div className="card">
        <div style={{ fontSize: 13 }}>⌚ מחובר ל-<b>Fitbit</b> ✓</div>
        <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>
          {fb.connectedAt ? `חובר: ${new Date(fb.connectedAt).toLocaleDateString('he-IL')}` : ''}
          {fb.lastSync ? ` · סונכרן: ${new Date(fb.lastSync).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ' · עוד לא סונכרן'}
        </div>
        {msg && <div style={{ fontSize: 12, marginTop: 6, color: msg.startsWith('✓') ? 'var(--good)' : 'var(--danger)' }}>{msg}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button className="ghost" style={{ flex: 1, opacity: busy ? .6 : 1 }} disabled={busy} onClick={async () => {
            setMsg(''); setBusy(true);
            const { data, error } = await syncFitbit();
            setBusy(false);
            if (error || !data) { setMsg('שגיאת רשת — נסה שוב.'); return; }
            if (data.needsReconnect) { update(d => (d.fitbit ? { ...d, fitbit: { ...d.fitbit, connected: false } } : d)); setMsg('החיבור פג (7 ימים) — התחבר שוב.'); return; }
            if (data.ok) {
              update(d => {
                if (data.steps?.length) d.steps = mergeByDate(d.steps, data.steps);
                if (data.sleep?.length) d.sleep = mergeByDate(d.sleep, data.sleep);
                if (d.fitbit) d.fitbit.lastSync = data.syncedAt;
                return d;
              });
              setMsg(`✓ נמשך: ${data.sleep?.length || 0} לילות שינה · ${data.steps?.length || 0} ימי צעדים`);
            }
          }}>{busy ? '⏳ מושך...' : '🔄 משוך נתונים'}</button>
          <button className="ghost" style={{ flex: '0 0 auto', opacity: busy ? .6 : 1 }} disabled={busy} onClick={async () => {
            if (!confirm('לנתק את Fitbit? נפסיק למשוך נתונים ממנו.')) return;
            setBusy(true);
            await disconnectFitbit();
            update(d => ({ ...d, fitbit: undefined }));
            setBusy(false);
          }}>נתק</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ fontSize: 12.5, color: 'var(--dim)', marginBottom: 10 }}>חבר את ה-Fitbit — שינה וצעדים ייכנסו לדשבורד אוטומטית, ועדי ינתח אותם מול האימונים.</div>
      <button className="cta" style={{ width: '100%', opacity: fitbitConfigured() ? 1 : .5 }} disabled={!fitbitConfigured()} onClick={beginFitbitConnect}>
        {fitbitConfigured() ? '⌚ חבר Fitbit' : '⌚ חיבור Fitbit — בקרוב'}
      </button>
    </div>
  );
}

const TEAM = [
  { av: '🧠', name: 'עמית', role: 'המאמן הראשי — האינטגרטור, הסקירה השבועית, ההחלטות' },
  { av: '🥊', name: 'רז', role: 'קרב מגע — דאן 7, וינגייט, קמ"י/קפ"פ. יומן הקרב והחזרה מהפגרה' },
  { av: '🤸', name: 'נעה', role: 'תנועה — מוביליטי, גמישות, יציבה, שיקום. בלוקי הגמישות שלה' },
  { av: '🔥', name: 'טל', role: 'קונדישן — אינטרוולים ואנרגיה. דוחף לקצה בתוך הגבולות' },
  { av: '🩺', name: 'מאיה', role: 'פיזיותרפיסטית — הגב, הברכיים, כל דיווח פציעה. וטו בטיחות' },
  { av: '⚕️', name: 'ד"ר ארז', role: 'רופא ספורט — גאוט, לחץ דם, שינה. וטו רפואי' },
  { av: '🥗', name: 'הילה', role: 'תזונאית — יומן האוכל, החלבון, המים וקצב הירידה' },
  { av: '📊', name: 'עדי', role: 'אנליסט — הדשבורד, המגמות, ההתרעות, הסקירה' },
];



/* ============ היעדים — אבי קובע, כל המסכים קוראים מכאן ============ */
const GOAL_ROWS: (keyof Goals)[] = ['weightKg', 'paceGr', 'kcal', 'protein', 'fat', 'workouts', 'weighIns', 'waterMl', 'sleepMin'];

function GoalsCard() {
  const { db, update } = useStore();
  const g = getGoals(db);
  const current = db.weights[db.weights.length - 1]?.kg;
  const warn = paceWarning(g, current);
  const bump = (k: keyof Goals, dir: 1 | -1) => update(d => {
    const next = getGoals(d)[k] + dir * GOAL_LIMITS[k].step;
    d.goals = { ...d.goals, [k]: clampGoal(k, next) };
    return d;
  });

  return (
    <div className="card">
      {GOAL_ROWS.map(k => {
        const lim = GOAL_LIMITS[k];
        const mine = db.goals?.[k] != null && db.goals[k] !== DEFAULT_GOALS[k];
        return (
          <div key={k} className="spread" style={{ alignItems: 'center', marginTop: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--dim)', fontWeight: 700 }}>
              {lim.label} <span style={{ fontSize: 11, fontWeight: 400 }}>{lim.unit}</span>
              {mine && <span style={{ fontSize: 10, color: 'var(--acc)' }}> · שלך</span>}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="ok" onClick={() => bump(k, -1)}>−</button>
              <b className="num" style={{ minWidth: 54, textAlign: 'center' }}>{goalText(k, g[k])}</b>
              <button className="ok" onClick={() => bump(k, 1)}>+</button>
            </span>
          </div>
        );
      })}
      {warn && <div className="alert mt12" style={{ borderColor: 'var(--danger)' }}>⚠️ <span>{warn}</span></div>}
      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 10, lineHeight: 1.5 }}>
        כל המסכים קוראים מכאן — הסקירה, הילה, הדשבורד והמגמות. משנה כאן, משתנה בכל מקום.
      </div>
      {db.goals && Object.keys(db.goals).length > 0 && (
        <button className="ghost mt8" onClick={() => { if (confirm('לאפס את כל היעדים לברירת המחדל שנקבעה באינטייק?')) update(d => { delete d.goals; return d; }); }}>
          אפס לברירת המחדל
        </button>
      )}
    </div>
  );
}

/* ============ הסקירה המלאה — מה שהצוות רואה בנתונים (מנוע: store/review.ts) ============ */
const DOT: Record<string, string> = { good: 'var(--good)', warn: 'var(--acc2)', bad: 'var(--danger)' };

function FullReviewCard({ r }: { r: FullReview }) {
  const [openAll, setOpenAll] = useState(false);
  const flags = openAll ? r.flags : r.flags.slice(0, 3);
  const dateLab = (d: string) => d.slice(5).split('-').reverse().join('.');

  if (!r.logged) return (
    <div className="card">
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>אין עדיין מספיק נתונים לסקירה. תרשום אימון, שקילה או יום ביומן — ועמית יתחיל לעבוד.</div>
    </div>
  );

  return (
    <div className="card">
      <div className="micro">{dateLab(r.from)}–{dateLab(r.to)} · {r.days} ימים</div>

      {r.metrics.map(m => (
        <div key={m.label} className="spread" style={{ alignItems: 'baseline', marginTop: 8, fontSize: 13, gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
            <i style={{ width: 7, height: 7, borderRadius: 4, background: DOT[m.status], display: 'inline-block' }} />
            <b style={{ fontWeight: 700 }}>{m.label}</b>
          </span>
          <span style={{ textAlign: 'end', minWidth: 0 }}>
            <span className="num" style={{ fontSize: 12.5 }}>{m.value}</span>
            {m.target && m.target !== '—' && <span style={{ color: 'var(--dim)', fontSize: 11 }}> · יעד {m.target}</span>}
          </span>
        </div>
      ))}

      {r.nutrition.top.length > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 10, lineHeight: 1.5 }}>
          הכי קלורי אצלך: {r.nutrition.top.map(t => `${t.name} ~${t.kcalPerDay} קק"ל/יום`).join(' · ')}
        </div>
      )}

      {r.wins.length > 0 && (
        <div className="mt12">
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--good)' }}>✅ מה עובד</div>
          {r.wins.map((w, i) => <div key={i} style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.55 }}>{w}</div>)}
        </div>
      )}

      {flags.map((f, i) => (
        <div key={i} className="alert mt8" style={{ borderColor: f.sev === 'red' ? 'var(--danger)' : 'rgba(217,119,6,.45)', alignItems: 'flex-start' }}>
          <span>{f.sev === 'red' ? '🔴' : '⚠️'}</span>
          <span style={{ lineHeight: 1.55 }}>
            <b>{f.from}: {f.title}</b>
            <div style={{ fontSize: 12.5, marginTop: 3 }}>{f.body}</div>
          </span>
        </div>
      ))}
      {r.flags.length > 3 && (
        <button className="pill mt8" onClick={() => setOpenAll(v => !v)}>
          {openAll ? 'פחות' : `עוד ${r.flags.length - 3} דגלים`}
        </button>
      )}

      {r.calibMissing.length > 0 && (
        <div style={{ fontSize: 12.5, marginTop: 12, lineHeight: 1.5 }}>
          <b>לסגירת הכיול חסר:</b> {r.calibMissing.join(' · ')}
        </div>
      )}
    </div>
  );
}

export default function Team() {
  const { db, update } = useStore();
  const wk = weekStartOf(today());
  const done = db.reviews.find(r => r.weekStart === wk);
  const [stress, setStress] = useState(5);
  const [reviewing, setReviewing] = useState(false);
  const d = reviewDigest(db);
  const wa = weeklyAvgWeights(db, 2);
  const full = fullReview(db);
  const goals = getGoals(db);

  return (
    <div className="scr fade-in">
      <div className="micro">הצוות שלך</div>
      <div className="h-huge mt8">שמונה אנשים<br /><em>בפינה שלך.</em></div>

      <div className="h-sec">🤝 הסקירה · 3 שבועות אחרונים</div>
      <FullReviewCard r={full} />

      <div className="h-sec">🧠 ההחלטה של עמית · השבוע</div>
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
          <div style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.55 }}>
            <b>ההצעה של עמית:</b> {full.decision}
          </div>
          <button className="cta mt12" onClick={() => setReviewing(true)}>סגור שבוע · דווח לחץ ואשר</button>
        </div>
      ) : (
        <div className="card">
          <div className="field"><label>מדד לחץ השבוע · {stress}/10 (כסף, עבודה, חיים)</label>
            <div className="seg">
              {[2, 3, 4, 5, 6, 7, 8, 9].map(n => <b key={n} className={stress === n ? 'on' : ''} onClick={() => setStress(n)}>{n}</b>)}
            </div>
          </div>
          <div style={{ fontSize: 12.5, marginBottom: 10, lineHeight: 1.55 }}><b>ההחלטה שתישמר:</b> {full.decision}</div>
          <button className="cta red mt12" onClick={() => {
            const decision = full.decision;
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

      <div className="h-sec">🎯 היעדים שלך · אתה קובע</div>
      <GoalsCard />

      <div className="h-sec">📌 העקרונות שלך</div>
      <div className="card">
        <div className="step-i"><b>·</b><span><b style={{ fontWeight: 700 }}>שבוע מינימום:</b> 2×30 דק' — הרצפה שלא יורדים ממנה</span></div>
        <div className="step-i"><b>·</b><span><b style={{ fontWeight: 700 }}>שבוע עמוס:</b> קרב מגע יורד ראשון, ABC נשאר</span></div>
        <div className="step-i"><b>·</b><span><b style={{ fontWeight: 700 }}>יעד:</b> {goals.weightKg} ק"ג · ~{goals.paceGr} ג'/שבוע · חלבון {goals.protein} ג'/יום</span></div>
        <div className="step-i"><b>·</b><span><b style={{ fontWeight: 700 }}>קדוש:</b> מים סביב אימון ובכל עקצוץ גאוט. במבה עד 50 ג' 🙂</span></div>
      </div>

      <div className="h-sec">☁️ סנכרון ענן</div>
      <CloudCard />
      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8, textAlign: 'center' }}>גיבוי ידני לקובץ — ביומן, בכרטיס "גיבוי ושחזור".</div>

      <div className="h-sec">⌚ מכשירים · Fitbit</div>
      <FitbitCard />
    </div>
  );
}
