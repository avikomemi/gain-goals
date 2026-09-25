import React, { useRef, useState } from 'react';
import { useStore, today, hydrate, WorkoutLog, ExLog } from '../store/store';
import { hilaReview } from '../store/hila';
import { estimateFood } from '../store/foodDB';
import { getGoals } from '../store/goals';
import { flexMissing } from '../store/review';
import MealBuilder from '../components/MealBuilder';
import { stepsKcal } from '../store/adi';
import { supabase } from '../store/cloud';
import { routineLabel } from '../data/program';

// דוחס תמונת מנה לתמונה קטנה שנשמרת ביומן (מקומי, עד הסנכרון)
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 640;
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * sc);
      c.height = Math.round(img.height * sc);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.55));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// תאריך של היום מינוס offset ימים — נשען על UTC כמו today() כדי שיהיה עקבי
const dayStr = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
};
const dateLabel = (date: string) => date === dayStr(0) ? 'היום' : date === dayStr(1) ? 'אתמול' : date;

export default function Journal() {
  const { db, update, session } = useStore();
  const [analysis, setAnalysis] = useState<{ i: number; text: string } | null>(null);
  const [analyzing, setAnalyzing] = useState<number | null>(null);

  const analyzePhoto = async (photo: string, i: number, contextText: string) => {
    if (!session) { alert('ניתוח תמונה דורש חיבור לענן — טאב "הצוות" → סנכרון ענן → התחברות.'); return; }
    setAnalyzing(i); setAnalysis(null);
    const { data, error } = await supabase.functions.invoke('hila-vision', { body: { image: photo, text: contextText } });
    setAnalyzing(null);
    if (error || data?.error) { alert(`הניתוח נכשל: ${error?.message || data?.detail || data?.error}`); return; }
    setAnalysis({ i, text: data.answer });
  };
  const [kg, setKg] = useState('');
  const [cm, setCm] = useState('');
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [food, setFood] = useState('');
  const [tab, setTab] = useState<'log' | 'history'>('log');
  const [foodSaved, setFoodSaved] = useState(false);

  const foodToday = db.food.find(f => f.date === today());
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  // סעיף 2 — עריכת אימון שמור (חזרה לאימון ותיקון בדיעבד)
  const [draft, setDraft] = useState<WorkoutLog | null>(null);
  // עריכת יומן אוכל של יום קודם (עד שבוע אחורה) — התאריך הנערך, או null
  const [foodDraft, setFoodDraft] = useState<string | null>(null);

  const [backupMsg, setBackupMsg] = useState('');
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fitlog-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setBackupMsg(`✓ ירד קובץ: fitlog-backup-${today()}.json — שמור אותו במקום בטוח`);
    setTimeout(() => setBackupMsg(''), 6000);
  };

  const importBackup = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(String(r.result));
        if (!p || !Array.isArray(p.weights) || !Array.isArray(p.workouts)) throw new Error('bad');
        const safe = hydrate(p); // משלים שדות חסרים מגיבוי ישן — לא מוחק כלום בטעות
        if (confirm('השחזור יחליף את כל הנתונים הנוכחיים בגיבוי. להמשיך?')) {
          update(() => safe);
          alert(`✓ שוחזר: ${safe.weights.length} שקילות · ${safe.workouts.length} אימונים · ${safe.food.length} ימי יומן אוכל`);
        }
      } catch { alert('הקובץ לא נראה כמו גיבוי של FitLog.'); }
    };
    r.readAsText(file);
  };

  const addPhoto = async (file: File) => {
    try {
      const url = await compressImage(file);
      update(d => {
        let en = d.food.find(x => x.date === today());
        if (!en) { en = { date: today(), text: '' }; d.food.push(en); }
        en.photos = [...(en.photos || []), url];
        return d;
      });
    } catch { alert('לא הצלחתי לקרוא את התמונה — נסה שוב.'); }
  };

  // סעיף 2 — כשנבחר אימון לעריכה, מציגים את העורך במקום המסך הרגיל (אחרי כל ה-hooks)
  if (draft) {
    return (
      <WorkoutEditor
        w={draft}
        onCancel={() => setDraft(null)}
        onSave={exs => { update(d => { const t = d.workouts.find(x => x.id === draft.id); if (t) t.exercises = exs; return d; }); setDraft(null); }}
        onDelete={() => {
          if (!confirm('למחוק את האימון הזה מהיומן? אי אפשר לשחזר, וזה משפיע גם על הניתוחים.')) return;
          update(d => { d.workouts = d.workouts.filter(x => x.id !== draft.id); return d; });
          setDraft(null);
        }}
      />
    );
  }

  // עריכת יומן אוכל של יום נבחר (עד שבוע אחורה)
  if (foodDraft) {
    return <FoodDayEditor date={foodDraft} onClose={() => setFoodDraft(null)} />;
  }

  return (
    <div className="scr fade-in">
      <div className="micro">יומן · הילה ומאיה</div>
      <div className="h-huge mt8">מה <em>מתעדים?</em></div>

      <div className="seg mt16">
        <b className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>רישום</b>
        <b className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>היסטוריה</b>
      </div>

      {tab === 'log' && (<>
        <div className="h-sec">⚖️ שקילת בוקר</div>
        <div className="card">
          <div style={{ display: 'flex', gap: 10 }}>
            <input inputMode="decimal" placeholder='ק"ג (למשל 89.6)' value={kg} onChange={e => setKg(e.target.value)}
              style={{ flex: 1, background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 12px', fontSize: 15 }} />
            <button className="cta" style={{ width: 110 }} onClick={() => {
              const v = parseFloat(kg);
              if (!(v > 40 && v < 200)) { alert('בדוק את המשקל — למשל 89.6'); return; }
              update(d => {
                d.weights = d.weights.filter(w => w.date !== today());
                d.weights.push({ date: today(), kg: v });
                d.weights.sort((a, b) => a.date.localeCompare(b.date));
                if (!d.calib.firstWeight) d.calib.firstWeight = true;
                return d;
              });
              setKg('');
            }}>שמור</button>
          </div>
          {db.weights.length > 0 && (() => {
            const lw = db.weights[db.weights.length - 1];
            return <div style={{ fontSize: 12, marginTop: 8, color: 'var(--good)' }}>✓ נרשם — אחרון: <b className="num">{lw.kg}</b> ק"ג ({lw.date === today() ? 'היום' : lw.date}) · סה"כ {db.weights.length} שקילות</div>;
          })()}
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>אחרי שירותים, לפני קפה. רק הממוצע השבועי נחשב — יום בודד הוא רעש.</div>
        </div>

        <div className="h-sec">📏 מותן שבועי</div>
        <div className="card">
          <div style={{ display: 'flex', gap: 10 }}>
            <input inputMode="decimal" placeholder='ס"מ בגובה הטבור' value={cm} onChange={e => setCm(e.target.value)}
              style={{ flex: 1, background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 12px', fontSize: 15 }} />
            <button className="cta" style={{ width: 110 }} onClick={() => {
              const v = parseFloat(cm);
              if (!(v > 50 && v < 200)) { alert('בדוק את המדידה — למשל 97'); return; }
              update(d => {
                d.waists = d.waists.filter(w => w.date !== today()); // מדידה אחת ליום
                d.waists.push({ date: today(), cm: v });
                d.waists.sort((a, b) => a.date.localeCompare(b.date));
                if (!d.calib.waist) d.calib.waist = true;
                return d;
              });
              setCm('');
            }}>שמור</button>
          </div>
          {db.waists.length > 0 && (() => {
            const lw = db.waists[db.waists.length - 1];
            const first = db.waists[0];
            const delta = +(lw.cm - first.cm).toFixed(1);
            return <div style={{ fontSize: 12, marginTop: 8, color: 'var(--good)' }}>
              ✓ נרשם — אחרון: <b className="num">{lw.cm}</b> ס"מ ({lw.date === today() ? 'היום' : lw.date})
              {db.waists.length > 1 && <> · {delta <= 0 ? `▾${Math.abs(delta)}` : `▴${delta}`} מאז ההתחלה</>}
            </div>;
          })()}
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>בגובה הטבור, פעם בשבוע, בבוקר — המדד המרכזי לחיטוב.</div>
        </div>

        <div className="h-sec">🩺 לחץ דם</div>
        <div className="card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input inputMode="numeric" placeholder="120" value={sys} onChange={e => setSys(e.target.value.replace(/\D/g, ''))}
              style={{ flex: 1, minWidth: 0, width: '100%', textAlign: 'center', background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 6px', fontSize: 15 }} />
            <span style={{ color: 'var(--dim)', fontWeight: 900 }}>/</span>
            <input inputMode="numeric" placeholder="80" value={dia} onChange={e => setDia(e.target.value.replace(/\D/g, ''))}
              style={{ flex: 1, minWidth: 0, width: '100%', textAlign: 'center', background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 6px', fontSize: 15 }} />
            <button className="cta" style={{ width: 90 }} onClick={() => {
              const s = parseInt(sys), d2 = parseInt(dia);
              if (s > 60 && s < 260 && d2 > 35 && d2 < 160 && d2 < s) {
                update(d => {
                  d.bp.push({ date: today(), sys: s, dia: d2 });
                  if (!d.calib.bp) d.calib.bp = true;
                  return d;
                });
                setSys(''); setDia('');
              } else alert('בדוק את המספרים — למשל 111 / 73.');
            }}>שמור</button>
          </div>
          {db.bp.length > 0 && (() => {
            const last = db.bp[db.bp.length - 1];
            const ok = last.sys < 120 && last.dia < 80;
            const elevated = last.sys >= 130 || last.dia >= 85;
            return (
              <div style={{ fontSize: 12, marginTop: 8, color: ok ? 'var(--good)' : elevated ? 'var(--danger)' : 'var(--ink)' }}>
                אחרון: <b className="num">{last.sys}/{last.dia}</b> ({last.date}) · {ok ? 'ד"ר ארז: מצוין — קורט המלח האטלנטי במים מאושר 🧂' : elevated ? 'ד"ר ארז: מוגבר — מדוד שוב מחר בבוקר במנוחה; אם נשאר כך, בלי קורט מלח ודבר איתי.' : 'תקין. מדידה חוזרת בעוד חודש.'}
              </div>
            );
          })()}
        </div>

        <div className="h-sec">🍽️ יומן אוכל · היום {foodToday && '✓'}</div>
        <div className="card">
          <textarea
            defaultValue={foodToday?.text || ''}
            onChange={e => setFood(e.target.value)}
            placeholder={'טקסט חופשי: "יוגורט פרו, סלט טונה+טחינה, במבה 50, 4 קפה..."'}
            style={{ width: '100%', minHeight: 84, background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 12px', fontSize: 14, resize: 'vertical' }}
          />
          {foodToday?.photos?.length ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {foodToday.photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <img src={p} alt={`מנה ${i + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }} />
                  <span onClick={() => {
                    if (!confirm('למחוק את התמונה הזאת מהיומן?')) return;
                    update(d => {
                      const en = d.food.find(x => x.date === today());
                      if (en?.photos) en.photos = en.photos.filter(ph => ph !== p);
                      return d;
                    });
                  }} style={{ position: 'absolute', top: -6, insetInlineEnd: -6, width: 20, height: 20, borderRadius: 10, background: 'var(--acc)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</span>
                  <button className="pill" style={{ fontSize: 11, cursor: 'pointer' }} onClick={() => analyzePhoto(p, i, foodToday?.text || '')}>
                    {analyzing === i ? '⏳ מנתחת...' : '🔍 ניתוח הילה'}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ''; }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ghost mt8" style={{ flex: 1, ...(foodSaved ? { borderColor: 'var(--good)', color: 'var(--good)' } : {}) }} onClick={() => {
              const text = (food || foodToday?.text || '').trim();
              if (!text && !foodToday?.photos?.length) { alert('כתוב משהו או צלם מנה — ואז שמור.'); return; }
              update(d => {
                let en = d.food.find(x => x.date === today());
                if (!en) { en = { date: today(), text: '' }; d.food.push(en); }
                en.text = text;
                return d;
              });
              setFoodSaved(true);
              setTimeout(() => setFoodSaved(false), 3000);
            }}>{foodSaved ? '✓ נשמר ביומן של היום' : 'שמור · הילה תגיב מיד'}</button>
            <button className="ghost mt8" style={{ flex: '0 0 auto' }} onClick={() => fileRef.current?.click()}>📷 צלם מנה</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>מנה מורכבת? צלם במקום לפרט — ואז "🔍 ניתוח הילה" מתחת לתמונה (דורש חיבור בטאב הצוות).</div>
        </div>

        {analysis && (
          <div className="decision">
            <span className="who">הילה · ניתוח תמונה {analysis.i + 1} 🔍</span>
            <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{analysis.text}</div>
          </div>
        )}

        {(foodToday?.text || foodToday?.photos?.length) ? (
          <HilaResponse text={foodToday?.text || ''} photoCount={foodToday?.photos?.length || 0}
            waterMl={db.water.find(w => w.date === today())?.ml ?? 0} waterGoal={getGoals(db).waterMl} title="תגובה להיום" date={today()} />
        ) : null}

        <div className="h-sec">🧮 בונה ארוחה · הילה</div>
        <MealBuilder />

        <div className="h-sec">✅ משימות כיול</div>
        <div className="card">
          {([['firstWeight', 'שקילת בוקר ראשונה'], ['waist', 'מדידת מותן ראשונה'], ['bp', 'מדידת לחץ דם']] as const).map(([key, label]) => (
            <div className="step-i" key={key} style={{ alignItems: 'center', cursor: 'pointer' }} onClick={() => update(d => { (d.calib as any)[key] = !(d.calib as any)[key]; return d; })}>
              <span className={`check ${(db.calib as any)[key] ? 'on' : ''}`}>{(db.calib as any)[key] ? '✓' : ''}</span>
              <span className={(db.calib as any)[key] ? 'done-line' : ''}>{label}</span>
            </div>
          ))}
          <div className="step-i"><b>·</b><span>אימוני כיול: A {db.calib.runs.A}/2 · B {db.calib.runs.B}/2 · C {db.calib.runs.C}/2</span></div>
        </div>

        <div className="h-sec">🤸 מבחני גמישות · נעה</div>
        <FlexTestCard />

        <div className="h-sec">💾 גיבוי ושחזור</div>
        <div className="card">
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ghost" style={{ flex: 1 }} onClick={exportBackup}>⬇ גיבוי לקובץ</button>
            <button className="ghost" style={{ flex: 1 }} onClick={() => importRef.current?.click()}>⬆ שחזור מקובץ</button>
          </div>
          <input ref={importRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ''; }} />
          {backupMsg && <div style={{ fontSize: 12, marginTop: 8, color: 'var(--good)' }}>{backupMsg}</div>}
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>⚠️ חשוב: מחיקת האייקון ממסך הבית מוחקת גם את הנתונים המקומיים! גבה לפני, או התחבר לענן (טאב הצוות) — ואז הכל שמור ממילא.</div>
        </div>
      </>)}

      {tab === 'history' && (<>
        <div className="h-sec">אימונים אחרונים</div>
        <div className="card">
          {db.workouts.length === 0 && <div style={{ fontSize: 13, color: 'var(--dim)' }}>עדיין אין — הראשון מחכה לך 🥋</div>}
          {[...db.workouts].reverse().slice(0, 10).map(w => (
            <div className="list-item" key={w.id} style={{ cursor: 'pointer' }} onClick={() => setDraft(structuredClone(w))}>
              <span className="d">{w.date}</span> · {routineLabel(w.routine)} · {w.loc === 'home' ? '🏠' : '🏋️'}
              {w.stoppedEarly && <span style={{ color: 'var(--danger)' }}> · נעצר</span>}
              {w.flexDone && ' · גמישות ✓'}
              <span style={{ float: 'right', color: 'var(--acc)', fontSize: 12, fontWeight: 700 }}>ערוך ✎</span>
            </div>
          ))}
          {db.workouts.length > 0 && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>הקש על אימון כדי לתקן חזרות/משקל או למחוק.</div>}
        </div>
        <div className="h-sec">קרב מגע</div>
        <div className="card">
          {db.krav.length === 0 && <div style={{ fontSize: 13, color: 'var(--dim)' }}>אין רישומים עדיין — הראשון כשחוזרים 🥊</div>}
          {[...db.krav].reverse().slice(0, 6).map((k, i) => (
            <div className="list-item" key={i}><span className="d">{k.date}</span> · {k.min} ד' · {['', 'קל', 'בינוני', 'עד הסוף'][k.intensity]} · {k.tags.join(', ')}</div>
          ))}
        </div>
        <div className="h-sec">דיווחי כאב</div>
        <div className="card">
          {db.injuries.length === 0 && <div style={{ fontSize: 13, color: 'var(--dim)' }}>נקי — שנשאר ככה 💪</div>}
          {[...db.injuries].reverse().slice(0, 8).map((j, i) => (
            <div className="list-item" key={i}><span className="d">{j.date}</span> · {j.area} · כאב {j.level}/10{j.exercise ? ` · ${j.exercise}` : ''}</div>
          ))}
        </div>
        <div className="h-sec">יומן אוכל · שבוע אחרון</div>
        <div className="card">
          {[0, 1, 2, 3, 4, 5, 6].map(dayStr).map(date => {
            const f = db.food.find(x => x.date === date);
            const preview = f?.text
              ? (f.text.length > 42 ? f.text.slice(0, 42) + '…' : f.text)
              : (f?.photos?.length ? '(תמונות בלבד)' : '(לא נרשם)');
            return (
              <div className="list-item" key={date} style={{ cursor: 'pointer' }} onClick={() => setFoodDraft(date)}>
                <span className="d">{dateLabel(date)}</span> · <span style={{ color: f?.text || f?.photos?.length ? 'var(--ink)' : 'var(--dim)' }}>{preview}</span>
                <span style={{ float: 'right', color: 'var(--acc)', fontSize: 12, fontWeight: 700 }}>ערוך ✎</span>
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>הקש על יום כדי למלא או לתקן — ולקבל תחשיב קלורי גם בדיעבד, עד שבוע לאחור.</div>
        </div>
      </>)}
    </div>
  );
}

/* ================= Workout editor (סעיף 2) ================= */
const EDIT_NUM: React.CSSProperties = { width: 46, minWidth: 0, textAlign: 'center', background: 'transparent', border: 0, fontSize: 19, fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em', padding: 0, color: 'inherit' };
const editClamp = (raw: string, max = 999) => Math.min(max, Math.max(0, parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0));

function WorkoutEditor({ w, onSave, onDelete, onCancel }: { w: WorkoutLog; onSave: (exs: ExLog[]) => void; onDelete: () => void; onCancel: () => void }) {
  const [ex, setEx] = useState<ExLog[]>(() => structuredClone(w.exercises));
  const setAt = (i: number, fn: (e: ExLog) => void) => setEx(list => { const c = structuredClone(list); fn(c[i]); return c; });
  const weighted = (s: ExLog['sets'][number]) => s.weight !== undefined || s.bw;

  return (
    <div className="scr fade-in">
      <div className="micro">עריכת אימון · {w.date} · {w.loc === 'home' ? '🏠 בית' : '🏋️ חדר'}</div>
      <div className="h-huge mt8">{routineLabel(w.routine)}<em>.</em></div>
      <div style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 6 }}>תקן חזרות/משקל/סטים בדיעבד, או מחק את האימון. השינוי חל על היומן ועל הניתוחים של עדי.</div>

      {ex.map((e, i) => (
        <div className="card mt12" key={e.id} style={e.skipped ? { opacity: .6 } : {}}>
          <div className="spread" style={{ alignItems: 'center' }}>
            <b style={{ fontSize: 14, fontWeight: 800 }}>{e.name}</b>
            <button className="pill" onClick={() => setAt(i, x => { x.skipped = !x.skipped; })}>{e.skipped ? '↩︎ בטל דילוג' : 'סמן כדולג'}</button>
          </div>
          {e.sets.map((s, si) => (
            <div className={`set ${s.done ? 'done' : ''}`} key={si}>
              <span className="sn">סט {si + 1}</span>
              <div className="stp">
                <span>חזרות</span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <button onClick={() => setAt(i, x => { x.sets[si].reps = Math.max(0, x.sets[si].reps - 1); })}>−</button>
                  <input className="num" inputMode="numeric" value={s.reps} aria-label="חזרות"
                    onFocus={ev => ev.currentTarget.select()}
                    onChange={ev => { const v = editClamp(ev.target.value); setAt(i, x => { x.sets[si].reps = v; }); }}
                    style={EDIT_NUM} />
                  <button onClick={() => setAt(i, x => { x.sets[si].reps += 1; })}>+</button>
                </span>
              </div>
              {weighted(s) && (
                <div className="stp">
                  <span>{s.bw ? 'משקל' : 'ק"ג'}</span>
                  {s.bw ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <b className="num" style={{ fontSize: 13 }}>גוף</b>
                      <button title="חזרה למשקל חיצוני" onClick={() => setAt(i, x => { x.sets[si].bw = false; })}>⚖️</button>
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <button onClick={() => setAt(i, x => { x.sets[si].weight = Math.max(0, (x.sets[si].weight || 0) - 1); })}>−</button>
                      <input className="num" inputMode="numeric" value={s.weight ?? 0} aria-label='משקל (ק"ג)'
                        onFocus={ev => ev.currentTarget.select()}
                        onChange={ev => { const v = editClamp(ev.target.value); setAt(i, x => { x.sets[si].weight = v; }); }}
                        style={EDIT_NUM} />
                      <button onClick={() => setAt(i, x => { x.sets[si].weight = (x.sets[si].weight || 0) + 1; })}>+</button>
                      <button title="משקל גוף בלבד" style={{ marginInlineStart: 4 }} onClick={() => setAt(i, x => { x.sets[si].bw = true; })}>⚖️</button>
                    </span>
                  )}
                </div>
              )}
              <div className="ok" onClick={() => setAt(i, x => { x.sets[si].done = !x.sets[si].done; })}>{s.done ? '✓' : ''}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="addset" style={{ flex: 1 }} onClick={() => setAt(i, x => { x.sets.push({ ...x.sets[x.sets.length - 1], done: false }); })}>+ הוסף סט</button>
            {e.sets.length > 1 && (
              <button className="addset" style={{ flex: 1 }} onClick={() => setAt(i, x => { x.sets.pop(); })}>− הסר סט</button>
            )}
          </div>
        </div>
      ))}

      <button className="cta mt16" onClick={() => onSave(ex)}>שמור שינויים</button>
      <button className="ghost mt8" onClick={onCancel}>ביטול</button>
      <button className="cta red mt8" onClick={onDelete}>מחק את האימון</button>
    </div>
  );
}

/* ============ תגובת הילה (משותף: יומן היום + עריכת יום קודם) ============ */
function HilaResponse({ text, photoCount, waterMl, waterGoal, title, date }: { text: string; photoCount: number; waterMl: number; waterGoal: number; title: string; date: string }) {
  const { db } = useStore();
  const g = getGoals(db);
  const rev = hilaReview(text, photoCount, waterMl, waterGoal, g.protein);
  const est = estimateFood(text, db.foods || []);
  const hasNums = est.lines.length > 0;
  const act = db.fitbit?.connected ? stepsKcal(db, date) : null; // צעדים→קלוריות מ-Fitbit לאותו יום
  return (
    <div className="decision">
      <span className="who">הילה · {title}</span>
      {hasNums && (
        <div style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 6 }}>זיהיתי: {est.lines.map(l => `${l.name} ${l.qtyLabel}`).join(' · ')}</div>
      )}
      {rev.notes.map((c, i) => (
        <div key={i} style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>{c}</div>
      ))}
      {hasNums && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <span className="pill">🔥 ~<b className="num">{est.total.kcal}</b> קק"ל</span>
          <span className="pill">חלבון ~<b className="num">{est.total.p}</b>/{g.protein} גר'</span>
          <span className="pill">פחמ' ~<b className="num">{est.total.c}</b> גר'</span>
          <span className="pill">שומן ~<b className="num">{est.total.f}</b> גר'</span>
        </div>
      )}
      {hasNums && act && (
        <div style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>
          🚶 פעילות מהצעדים (~{act.steps.toLocaleString('he-IL')}): ~<b className="num">{act.kcal}</b> קק"ל · מאזן נטו: ~<b className="num">{est.total.kcal - act.kcal}</b> קק"ל
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>ד"ר ארז: הערכה מהצעדים בלבד (לא TDEE מלא) — מידע, לא "תקציב לאכול עוד". הגירעון נשאר מתון, בגלל הגאוט.</div>
        </div>
      )}
      {hasNums && (
        <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>
          לפי ערכים אמיתיים פר-100-גרם והכמויות שציינת (בלי מספר — מנה טיפוסית). היעדים שלך: ~{(g.kcal - 100).toLocaleString('he-IL')}-{(g.kcal + 100).toLocaleString('he-IL')} קק"ל · חלבון {g.protein} · שומן {g.fat}.
        </div>
      )}
      {est.notInDB.length > 0 && (
        <div style={{ fontSize: 12, marginTop: 6, color: 'var(--acc2)' }}>
          לא במסד עדיין: {est.notInDB.join(' · ')} — הוסף כמות לדיוק, וסריקת ברקוד בדרך 🙂
        </div>
      )}
      <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 8 }}>תגובה מיידית לפי כללי התזונה שלך · לתמונות — כפתור 🔍 · לניתוח מעמיק — הסקירה השבועית או צ'אט</div>
    </div>
  );
}

/* ============ מבחני גמישות (נעה) — רישום המספרים, לא רק צ'קבוקס ============ */
// ההוראות יושבות ליד השדה — מדידה בלי הוראה היא מספר שאי אפשר לחזור עליו
const FLEX_FIELDS = [
  { key: 'fingerFloor', label: 'אצבעות–רצפה', short: 'אצבעות', unit: 'ס"מ', hint: 'שלילי = מתחת לרצפה',
    how: 'עמידה, רגליים צמודות, ברכיים ישרות. נשיפה ויורדים לאט עם הידיים. מודדים מקצות האצבעות לרצפה: נגיעה = 0, מתחת לרצפה = מספר שלילי. בלי קפיצות — עד ההתנגדות, לא עד הכאב.' },
  { key: 'squatSec', label: 'סקוואט עמוק', short: 'סקוואט', unit: 'שנ׳', hint: 'החזקה',
    how: 'רגליים ברוחב כתפיים, אצבעות מעט החוצה. יורדים עמוק כשהעקבים על הרצפה והחזה פתוח, וסופרים שניות עד שהצורה נשברת (עקב מתרומם / גב מתעגל / ברך קורסת). מודדים בטווח שאתה שולט בו.' },
  { key: 'shoulderR', label: 'כתף · יד ימין מלמעלה', short: 'כתף ימ׳', unit: 'ס"מ', hint: 'שלילי = חפיפה',
    how: 'יד ימין עולה מעל הכתף ויורדת במורד הגב (אצבעות כלפי מטה, כמו לגרד בין השכמות). יד שמאל מגיעה מאחורי הגב מלמטה, גב כף היד על עמוד השדרה, אצבעות כלפי מעלה. שתי הידיים מתקרבות — מודדים את המרווח בין קצות האצבעות. נגיעה = 0, אחיזה/חפיפה = מספר שלילי.' },
  { key: 'shoulderL', label: 'כתף · יד שמאל מלמעלה', short: 'כתף שמ׳', unit: 'ס"מ', hint: 'שלילי = חפיפה',
    how: 'אותה תנוחה בדיוק, הפוך: יד שמאל מלמעלה וימין מלמטה. מודדים כל צד בנפרד — ההפרש בין הצדדים הוא הממצא, לא המספר עצמו.' },
] as const;

function FlexTestCard() {
  const { db, update } = useStore();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [howOpen, setHowOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const last = [...(db.flex || [])].sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  const save = () => {
    const num = (s?: string) => { const t = (s ?? '').trim(); if (t === '') return undefined; const n = parseFloat(t); return isNaN(n) ? undefined : n; };
    const entry = { date: today(), fingerFloor: num(vals.fingerFloor), squatSec: num(vals.squatSec), shoulderR: num(vals.shoulderR), shoulderL: num(vals.shoulderL) };
    if ([entry.fingerFloor, entry.squatSec, entry.shoulderR, entry.shoulderL].every(v => v === undefined)) { alert('הכנס לפחות מדד אחד לפני שמירה.'); return; }
    update(d => {
      d.flex = [...(d.flex || []).filter(f => f.date !== entry.date), entry];
      d.calib.flexTests = flexMissing(d).length === 0;   // בסיס מלא = כל ארבעת המדדים נמדדו
      return d;
    });
    setVals({}); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="card">
      <button className="pill" onClick={() => setHowOpen(v => !v)}>{howOpen ? 'הסתר הוראות' : '❓ איך מודדים'}</button>
      {FLEX_FIELDS.map(f => (
        <div key={f.key} style={{ marginTop: 8 }}>
        <div className="spread" style={{ alignItems: 'center' }}>
          <span style={{ fontSize: 13, minWidth: 0 }}>{f.label} <small style={{ color: 'var(--dim)' }}>({f.unit} · {f.hint})</small></span>
          <input inputMode="numeric" value={vals[f.key] ?? ''} aria-label={f.label}
            placeholder={last?.[f.key] != null ? String(last[f.key]) : '—'}
            onChange={e => { const v = e.target.value.replace(/[^0-9.-]/g, ''); setVals(s => ({ ...s, [f.key]: v })); }}
            style={{ width: 64, minWidth: 0, textAlign: 'center', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 4px', fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }} />
        </div>
        {howOpen && <div style={{ fontSize: 11.5, color: 'var(--dim)', lineHeight: 1.55, marginTop: 4, paddingInlineStart: 2 }}>{f.how}</div>}
        </div>
      ))}
      <button className="cta mt12" style={{ width: '100%' }} onClick={save}>💾 שמור מדידה</button>
      {saved && <div style={{ fontSize: 12, marginTop: 8, color: 'var(--good)' }}>✓ נשמר. נעה: יופי — עכשיו יש ממה למדוד את ההתקדמות.</div>}
      {last && (
        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 10, lineHeight: 1.6 }}>
          מדידה אחרונה · {last.date}: {FLEX_FIELDS.map(f => last[f.key] != null ? `${f.short} ${last[f.key]}` : null).filter(Boolean).join(' · ') || '—'}
        </div>
      )}
      {flexMissing(db).length > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--acc2)', marginTop: 8, lineHeight: 1.5 }}>
          עוד לא נמדדו: {flexMissing(db).join(' · ')} — בלי כולם אין בסיס מלא למדוד ממנו התקדמות.
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>מדוד פעם בחודש. ההתקדמות מול הבסיס בטאב המגמות.</div>
    </div>
  );
}

/* ============ עריכת יומן אוכל של יום קודם (עד שבוע אחורה) ============ */
function FoodDayEditor({ date, onClose }: { date: string; onClose: () => void }) {
  const { db, update } = useStore();
  const entry = db.food.find(f => f.date === date);
  const photos = entry?.photos || [];
  const [text, setText] = useState(entry?.text || '');
  const [saved, setSaved] = useState(false);
  const waterMl = db.water.find(w => w.date === date)?.ml ?? 0;

  const save = () => {
    const t = text.trim();
    if (!t && photos.length === 0) { alert('כתוב מה אכלת ביום הזה — ואז שמור.'); return; }
    update(d => {
      let en = d.food.find(x => x.date === date);
      if (!en) { en = { date, text: '' }; d.food.push(en); }
      en.text = t;
      d.food.sort((a, b) => a.date.localeCompare(b.date));
      return d;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="scr fade-in">
      <div className="micro">עריכת יומן אוכל · {dateLabel(date)} ({date})</div>
      <div className="h-huge mt8">מה <em>אכלת?</em></div>
      <div style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 6 }}>מלא או תקן את היום הזה בדיעבד — הילה תגיב ותיתן תחשיב קלורי. משפיע גם על הניתוחים של עדי.</div>

      <div className="card mt12">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'טקסט חופשי: "יוגורט פרו, סלט טונה+טחינה, גבינת סקי, 4 קפה..."'}
          style={{ width: '100%', minWidth: 0, minHeight: 96, background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 12px', fontSize: 14, resize: 'vertical' }}
        />
        {photos.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {photos.map((p, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={p} alt={`מנה ${i + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }} />
                <span onClick={() => {
                  if (!confirm('למחוק את התמונה הזאת מהיומן?')) return;
                  update(d => { const en = d.food.find(x => x.date === date); if (en?.photos) en.photos = en.photos.filter(ph => ph !== p); return d; });
                }} style={{ position: 'absolute', top: -6, insetInlineEnd: -6, width: 20, height: 20, borderRadius: 10, background: 'var(--acc)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</span>
              </div>
            ))}
          </div>
        )}
        <button className="ghost mt8" style={{ width: '100%', ...(saved ? { borderColor: 'var(--good)', color: 'var(--good)' } : {}) }} onClick={save}>
          {saved ? '✓ נשמר ליום הזה' : 'שמור · הילה תגיב מיד'}
        </button>
      </div>

      {(text.trim() || photos.length) ? (
        <HilaResponse text={text} photoCount={photos.length} waterMl={waterMl} waterGoal={getGoals(db).waterMl} title={dateLabel(date)} date={date} />
      ) : null}

      <button className="ghost mt16" style={{ width: '100%' }} onClick={onClose}>← חזרה להיסטוריה</button>
    </div>
  );
}
