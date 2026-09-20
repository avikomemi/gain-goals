// בונה ארוחה — "רשימת מכולת עם מחשבון".
// אבי: "אם אין לי רשימה שממנה אפשר להרכיב, ושאפשר לדעת מראש דרך מחשבון את הערכים,
// אין לי תמונה של זה." אז: בוחרים מאכלים מהמאגר, רואים קלוריות וחלבון *לפני* האכילה,
// ומוסיפים ליומן בלחיצה.
//
// עיקרון: הבונה לא מחשב לבד — הוא מרכיב בדיוק את אותו משפט שייכנס ליומן, ומריץ עליו
// את estimateFood. מה שרואים כאן הוא מה שהילה תספור, תמיד. אין שני מקורות אמת.
import React, { useMemo, useState } from 'react';
import { FoodItem, estimateFood, mergeFoods } from '../store/foodDB';
import { getGoals } from '../store/goals';
import { useStore, today } from '../store/store';

// כמה להוסיף בכל לחיצה: פריטי-יחידה ביחידות, פריטי-גרמים בקפיצות הגיוניות
const stepOf = (f: FoodItem) => (f.unit === 'unit' ? 1 : f.def >= 100 ? 25 : 10);

/** המשפט שייכנס ליומן — בדיוק בניסוח שהפרסר של הילה מבין */
export function mealText(picked: { food: FoodItem; qty: number }[]): string {
  return picked
    .filter(p => p.qty > 0)
    .map(p => (p.food.unit === 'unit' ? `${p.food.names[0]} x${p.qty}` : `${p.food.names[0]} ${p.qty} גרם`))
    .join(', ');
}

// קיבוץ לקטגוריות — כדי שרשימה של 100+ פריטים תהיה רשימת מכולת ולא ערימה
const GROUPS: { label: string; ids: string[] }[] = [
  { label: '🥚 חלבון', ids: ['egg', 'chicken', 'turkey', 'tuna', 'salmon', 'cottage', 'white5', 'skyr', 'bioyog', 'multiyog', 'pro', 'bulgarit', 'yellow', 'whey', 'proteindrink', 'steak', 'shakshuka'] },
  { label: '🫘 קטניות', ids: ['lentils', 'chickpeas', 'edamame', 'tofu', 'greenbeans', 'peas'] },
  { label: '🍚 פחמימות', ids: ['bread', 'pita', 'rice', 'pasta', 'potato', 'sweetpotato', 'couscous', 'oats', 'challah'] },
  { label: '🥗 ירקות ומרקים', ids: ['salad', 'vegsoup', 'cucumber', 'tomato', 'pepper', 'carrot', 'broccoli', 'cauliflower', 'cabbage', 'zucchini', 'eggplant', 'mushroom', 'beet', 'spinach'] },
  { label: '🍎 פירות', ids: ['apple', 'banana', 'nectarine', 'orange', 'clementine', 'grapes', 'watermelon', 'melon', 'strawberry', 'blueberry', 'date', 'kiwi', 'pear', 'persimmon', 'mango'] },
  { label: '🥑 שומנים', ids: ['avocado', 'tahini', 'hummus', 'oliveoil', 'peanutbutter', 'nuts', 'pecan', 'walnut'] },
  { label: '🍫 תקציב חופשי', ids: ['darkchoc', 'choc', 'bamba', 'bisli', 'popcorn', 'pastry', 'knafeh', 'fries', 'cola', 'coladiet'] },
];

export default function MealBuilder() {
  const { db, update } = useStore();
  const foods = useMemo(() => mergeFoods(db.foods), [db.foods]);
  const goals = getGoals(db);
  const [picked, setPicked] = useState<{ food: FoodItem; qty: number }[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [added, setAdded] = useState(false);

  const byId = useMemo(() => new Map(foods.map(f => [f.id, f])), [foods]);
  const text = mealText(picked);
  const est = useMemo(() => estimateFood(text, foods), [text, foods]);

  const add = (f: FoodItem) => setPicked(ps => {
    const i = ps.findIndex(p => p.food.id === f.id);
    if (i >= 0) return ps.map((p, j) => (j === i ? { ...p, qty: p.qty + stepOf(f) } : p));
    return [...ps, { food: f, qty: f.unit === 'unit' ? f.def : Math.max(stepOf(f), f.def) }];
  });
  const bump = (id: string, dir: 1 | -1) => setPicked(ps => ps
    .map(p => (p.food.id === id ? { ...p, qty: Math.max(0, p.qty + dir * stepOf(p.food)) } : p))
    .filter(p => p.qty > 0));

  // חיפוש חופשי על כל המאגר, לא רק על הקטגוריות
  const hits = q.trim().length > 1
    ? foods.filter(f => f.names.some(n => n.includes(q.trim()))).slice(0, 12)
    : [];

  const portion = (f: FoodItem) => {
    const e = estimateFood(mealText([{ food: f, qty: f.unit === 'unit' ? f.def : Math.max(stepOf(f), f.def) }]), foods);
    const l = e.lines[0];
    return l ? `${l.qtyLabel} · ${l.macro[0]} קק"ל · ${l.macro[1]} חלבון` : '';
  };

  const saveToDiary = () => {
    if (!text) return;
    update(d => {
      let en = d.food.find(x => x.date === today());
      if (!en) { en = { date: today(), text: '' }; d.food.push(en); }
      en.text = en.text ? `${en.text.trim()}, ${text}` : text;
      d.food.sort((a, b) => a.date.localeCompare(b.date));
      return d;
    });
    setPicked([]); setAdded(true); setTimeout(() => setAdded(false), 3000);
  };

  const pct = (v: number, goal: number) => Math.min(100, Math.round((v / goal) * 100));

  return (
    <div className="card">
      {/* --- מה שנבחר עד עכשיו --- */}
      {picked.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {est.lines.map((l, i) => {
            const p = picked[i];
            return (
              <div key={l.name + i} className="spread" style={{ alignItems: 'center', marginTop: 6, fontSize: 13 }}>
                <span style={{ minWidth: 0 }}>{l.name} <small style={{ color: 'var(--dim)' }}>{l.qtyLabel} · {l.macro[0]} קק"ל · {l.macro[1]} חלבון</small></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                  <button className="ok" onClick={() => p && bump(p.food.id, -1)}>−</button>
                  <button className="ok" onClick={() => p && bump(p.food.id, 1)}>+</button>
                </span>
              </div>
            );
          })}

          {/* --- המחשבון: הסכום, מול היעדים --- */}
          <div className="mt12" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            <div className="spread" style={{ fontSize: 14, fontWeight: 900 }}>
              <span>🔥 {est.total.kcal} קק"ל <small style={{ color: 'var(--dim)', fontWeight: 400 }}>מתוך {goals.kcal}</small></span>
              <span>חלבון {est.total.p} <small style={{ color: 'var(--dim)', fontWeight: 400 }}>מתוך {goals.protein}</small></span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {([['קק"ל', pct(est.total.kcal, goals.kcal), 'var(--acc2)'], ['חלבון', pct(est.total.p, goals.protein), 'var(--good)']] as const).map(([lab, p, col]) => (
                <div key={lab} style={{ flex: 1 }}>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--chip)', overflow: 'hidden' }}>
                    <div style={{ width: `${p}%`, height: '100%', background: col }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 3 }}>{lab} {p}%</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 8 }}>
              פחמ' {est.total.c} גר' · שומן {est.total.f} גר' (יעד {goals.fat})
            </div>
            <button className="cta mt12" style={{ width: '100%' }} onClick={saveToDiary}>➕ הוסף ליומן של היום</button>
            <button className="ghost mt8" style={{ width: '100%' }} onClick={() => setPicked([])}>נקה</button>
          </div>
        </div>
      )}
      {added && <div style={{ fontSize: 12, color: 'var(--good)', marginBottom: 10 }}>✓ נוסף ליומן. הילה תתייחס לזה בתגובה של היום.</div>}

      {/* --- רשימת המכולת --- */}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔎 חפש מאכל (למשל: עדשים)"
        style={{ width: '100%', background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', fontSize: 14 }} />

      {hits.length > 0 ? (
        <div className="mt8">
          {hits.map(f => (
            <div key={f.id} className="spread" style={{ alignItems: 'center', marginTop: 6, fontSize: 13 }}>
              <span style={{ minWidth: 0 }}>{f.names[0]} <small style={{ color: 'var(--dim)' }}>{portion(f)}</small></span>
              <button className="pill" style={{ flex: '0 0 auto' }} onClick={() => add(f)}>הוסף</button>
            </div>
          ))}
        </div>
      ) : (
        GROUPS.map(g => {
          const items = g.ids.map(id => byId.get(id)).filter(Boolean) as FoodItem[];
          if (!items.length) return null;
          const isOpen = open === g.label;
          return (
            <div key={g.label} className="mt8">
              <button className="pill" style={{ width: '100%', textAlign: 'start' }} onClick={() => setOpen(isOpen ? null : g.label)}>
                {isOpen ? '▾' : '▸'} {g.label} <small style={{ color: 'var(--dim)' }}>({items.length})</small>
              </button>
              {isOpen && items.map(f => (
                <div key={f.id} className="spread" style={{ alignItems: 'center', marginTop: 6, fontSize: 13, paddingInlineStart: 6 }}>
                  <span style={{ minWidth: 0 }}>{f.names[0]} <small style={{ color: 'var(--dim)' }}>{portion(f)}</small></span>
                  <button className="pill" style={{ flex: '0 0 auto' }} onClick={() => add(f)}>הוסף</button>
                </div>
              ))}
            </div>
          );
        })
      )}
      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 10, lineHeight: 1.5 }}>
        המספרים כאן הם בדיוק מה שהילה תספור — אותו מנוע, אותם ערכים פר-100-גרם.
      </div>
    </div>
  );
}
