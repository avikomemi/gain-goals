import React, { useRef, useState } from 'react';
import { useStore, today } from '../store/store';

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
  const { db, update } = useStore();
  const [kg, setKg] = useState('');
  const [cm, setCm] = useState('');
  const [food, setFood] = useState('');
  const [tab, setTab] = useState<'log' | 'history'>('log');

  const foodToday = db.food.find(f => f.date === today());
  const fileRef = useRef<HTMLInputElement>(null);

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
              if (v > 40 && v < 200) update(d => {
                d.weights = d.weights.filter(w => w.date !== today());
                d.weights.push({ date: today(), kg: v });
                d.weights.sort((a, b) => a.date.localeCompare(b.date));
                if (!d.calib.firstWeight) d.calib.firstWeight = true;
                return d;
              });
              setKg('');
            }}>שמור</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>אחרי שירותים, לפני קפה. רק הממוצע השבועי נחשב — יום בודד הוא רעש.</div>
        </div>

        <div className="h-sec">📏 מותן שבועי</div>
        <div className="card">
          <div style={{ display: 'flex', gap: 10 }}>
            <input inputMode="decimal" placeholder='ס"מ בגובה הטבור' value={cm} onChange={e => setCm(e.target.value)}
              style={{ flex: 1, background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 6, padding: '11px 12px', fontSize: 15 }} />
            <button className="cta" style={{ width: 110 }} onClick={() => {
              const v = parseFloat(cm);
              if (v > 50 && v < 200) update(d => {
                d.waists.push({ date: today(), cm: v });
                if (!d.calib.waist) d.calib.waist = true;
                return d;
              });
              setCm('');
            }}>שמור</button>
          </div>
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
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p} alt={`מנה ${i + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }} />
                  <span onClick={() => update(d => {
                    const en = d.food.find(x => x.date === today());
                    if (en?.photos) en.photos = en.photos.filter((_, j) => j !== i);
                    return d;
                  })} style={{ position: 'absolute', top: -6, insetInlineEnd: -6, width: 20, height: 20, borderRadius: 10, background: 'var(--acc)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</span>
                </div>
              ))}
            </div>
          ) : null}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ''; }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ghost mt8" style={{ flex: 1 }} onClick={() => {
              const text = (food || foodToday?.text || '').trim();
              if (!text && !foodToday?.photos?.length) return;
              update(d => {
                let en = d.food.find(x => x.date === today());
                if (!en) { en = { date: today(), text: '' }; d.food.push(en); }
                en.text = text;
                return d;
              });
            }}>שמור · הילה תגיב בסקירה</button>
            <button className="ghost mt8" style={{ flex: '0 0 auto' }} onClick={() => fileRef.current?.click()}>📷 צלם מנה</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>מנה מורכבת? צלם במקום לפרט. ניתוח אוטומטי (קלוריות/חלבון) יגיע עם הסנכרון — בינתיים שלח לי בצ'אט והילה תעריך.</div>
        </div>

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
      </>)}

      {tab === 'history' && (<>
        <div className="h-sec">אימונים אחרונים</div>
        <div className="card">
          {db.workouts.length === 0 && <div style={{ fontSize: 13, color: 'var(--dim)' }}>עדיין אין — הראשון מחכה לך 🥋</div>}
          {[...db.workouts].reverse().slice(0, 10).map(w => (
            <div className="list-item" key={w.id}>
              <span className="d">{w.date}</span> · אימון {w.routine} · {w.loc === 'home' ? '🏠' : '🏋️'}
              {w.stoppedEarly && <span style={{ color: 'var(--acc)' }}> · נעצר</span>}
              {w.flexDone && ' · גמישות ✓'}
            </div>
          ))}
        </div>
        <div className="h-sec">קרב מגע</div>
        <div className="card">
          {db.krav.length === 0 && <div style={{ fontSize: 13, color: 'var(--dim)' }}>אין רישומים — חוזרים בספטמבר 🥊</div>}
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
