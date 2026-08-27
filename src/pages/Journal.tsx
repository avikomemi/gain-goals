import React, { useRef, useState } from 'react';
import { useStore, today, hydrate } from '../store/store';
import { hilaReview } from '../store/hila';
import { supabase } from '../store/cloud';

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

        {(foodToday?.text || foodToday?.photos?.length) ? (() => {
          const rev = hilaReview(foodToday?.text || '', foodToday?.photos?.length || 0,
            db.water.find(w => w.date === today())?.ml ?? 0, db.waterGoal ?? 1500);
          return (
            <div className="decision">
              <span className="who">הילה · תגובה להיום</span>
              {rev.found.length > 0 && (
                <div style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 6 }}>זיהיתי: {rev.found.join(' · ')}</div>
              )}
              {rev.notes.map((c, i) => (
                <div key={i} style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>{c}</div>
              ))}
              {rev.est && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <span className="pill">🔥 ~<b className="num">{rev.est.kcal}</b> קק"ל</span>
                  <span className="pill">חלבון ~<b className="num">{rev.est.p}</b>/135 גר'</span>
                  <span className="pill">פחמ' ~<b className="num">{rev.est.c}</b> גר'</span>
                  <span className="pill">שומן ~<b className="num">{rev.est.f}</b> גר'</span>
                </div>
              )}
              {rev.est && (
                <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>
                  הערכה גסה לפי מנות טיפוסיות (בלי כמויות מדויקות). היעדים שלך: ~1,800-2,000 קק"ל · חלבון 130-140 · שומן 60-70 · השאר פחמימות.
                </div>
              )}
              {rev.unknown.length > 0 && (
                <div style={{ fontSize: 12, marginTop: 6, color: 'var(--acc2)' }}>
                  עוד לא מכירה: {rev.unknown.join(' · ')} — ספר לאבי בצ'אט ויוסיפו אותי למילון 🙂
                </div>
              )}
              <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 8 }}>תגובה מיידית לפי כללי התזונה שלך · לתמונות — כפתור 🔍 · לניתוח מעמיק — הסקירה השבועית או צ'אט</div>
            </div>
          );
        })() : null}

        <div className="h-sec">✅ משימות כיול</div>
        <div className="card">
          {([['firstWeight', 'שקילת בוקר ראשונה'], ['waist', 'מדידת מותן ראשונה'], ['bp', 'מדידת לחץ דם'], ['flexTests', 'מבחני גמישות בסיס']] as const).map(([key, label]) => (
            <div className="step-i" key={key} style={{ alignItems: 'center', cursor: 'pointer' }} onClick={() => update(d => { (d.calib as any)[key] = !(d.calib as any)[key]; return d; })}>
              <span className={`check ${(db.calib as any)[key] ? 'on' : ''}`}>{(db.calib as any)[key] ? '✓' : ''}</span>
              <span className={(db.calib as any)[key] ? 'done-line' : ''}>{label}</span>
            </div>
          ))}
          <div className="step-i"><b>·</b><span>אימוני כיול: A {db.calib.runs.A}/2 · B {db.calib.runs.B}/2 · C {db.calib.runs.C}/2</span></div>
        </div>

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
            <div className="list-item" key={w.id}>
              <span className="d">{w.date}</span> · אימון {w.routine} · {w.loc === 'home' ? '🏠' : '🏋️'}
              {w.stoppedEarly && <span style={{ color: 'var(--danger)' }}> · נעצר</span>}
              {w.flexDone && ' · גמישות ✓'}
            </div>
          ))}
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
        <div className="h-sec">יומן אוכל</div>
        <div className="card">
          {[...db.food].reverse().slice(0, 5).map((f, i) => (
            <div className="list-item" key={i}>
              <span className="d">{f.date}</span> · {f.text || '(תמונות בלבד)'}
              {f.photos?.length ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {f.photos.map((p, j) => <img key={j} src={p} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--line)' }} />)}
                </div>
              ) : null}
            </div>
          ))}
          {db.food.length === 0 && <div style={{ fontSize: 13, color: 'var(--dim)' }}>עוד לא נרשם</div>}
        </div>
      </>)}
    </div>
  );
}
