import React, { useState } from 'react';
import { useStore, today, weekStartOf } from '../store/store';
import { reviewDigest, amitDecision, weeklyAvgWeights } from '../store/adi';
import { supabase } from '../store/cloud';

function CloudCard() {
  const { session, lastSync, syncNow, recovery, clearRecovery } = useStore();
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
          {lastSync ? `סונכרן לאחרונה: ${new Date(lastSync).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : 'מסנכרן...'}
          {' · '}הנתונים נשמרים בענן אוטומטית ומסתנכרנים בין המכשירים.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button className="ghost" style={{ flex: 1 }} onClick={async () => { setMsg(''); const e = await syncNow(); setMsg(e ? `שגיאה: ${e}` : '✓ סונכרן'); }}>🔄 סנכרן עכשיו</button>
          <button className="ghost" style={{ flex: '0 0 auto' }} onClick={() => supabase.auth.signOut()}>התנתק</button>
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

      <div className="h-sec">☁️ סנכרון ענן</div>
      <CloudCard />
      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8, textAlign: 'center' }}>גיבוי ידני לקובץ — ביומן, בכרטיס "גיבוי ושחזור".</div>
    </div>
  );
}
