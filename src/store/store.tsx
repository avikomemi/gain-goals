import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Loc } from '../data/program';
import { supabase } from './cloud';
import type { Session } from '@supabase/supabase-js';

export interface SetLog { reps: number; weight?: number; done: boolean }
export interface ExLog { id: string; name: string; sets: SetLog[]; rpe?: number; skipped?: boolean }
export interface WorkoutLog {
  id: string; date: string; routine: 'A' | 'B' | 'C'; loc: Loc;
  exercises: ExLog[]; stoppedEarly?: boolean; flexDone?: boolean; finisherDone?: boolean;
}
export interface WeightEntry { date: string; kg: number }
export interface WaistEntry { date: string; cm: number }
export interface BpEntry { date: string; sys: number; dia: number }
export interface Injury { date: string; area: string; level: number; exercise?: string; what: string; note?: string }
export interface KravLog { date: string; min: number; intensity: 1 | 2 | 3; tags: string[]; note?: string }
export interface FoodLog { date: string; text: string; photos?: string[] }
export interface Review { weekStart: string; stress: number; decision: string; closedAt: string }
export interface WaterDay { date: string; ml?: number }

export interface Calib {
  waist: boolean; bp: boolean; firstWeight: boolean; flexTests: boolean;
  runs: { A: number; B: number; C: number };
  done: boolean;
}

export interface DB {
  weights: WeightEntry[]; waists: WaistEntry[]; workouts: WorkoutLog[];
  injuries: Injury[]; krav: KravLog[]; food: FoodLog[]; reviews: Review[];
  water: WaterDay[]; bp: BpEntry[]; calib: Calib;
  orders: { A?: string[]; B?: string[]; C?: string[] };
  restSec?: number; // זמן מנוחה בין סטים (שניות) — נבחר ע"י אבי, נזכר בין אימונים ומכשירים
  waterGoal?: number; // מ"ל ליום — יעד אישי, ניתן לשינוי בדשבורד
  startDate?: string; // היום שבו אבי התחיל — כל הסטטיסטיקות נמדדות מכאן, לא לפני
  updatedAt?: string; // חותמת שינוי אחרון — לסנכרון ענן (המעודכן מנצח)
}

const EMPTY: DB = {
  weights: [], waists: [], workouts: [], injuries: [], krav: [], food: [], reviews: [], water: [], bp: [],
  calib: { waist: false, bp: false, firstWeight: false, flexTests: false, runs: { A: 0, B: 0, C: 0 }, done: false },
  orders: {},
};

const KEY = 'fitlog-v3';

// הופך כל צורת נתונים (ישנה/חלקית/מהענן/מגיבוי) ל-DB תקין — לעולם לא זורק, לעולם לא מאבד שדות
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hydrate(raw: any): DB {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arr = (x: any) => (Array.isArray(x) ? x.filter(Boolean) : []);
  const d: DB = {
    ...EMPTY,
    ...(raw && typeof raw === 'object' ? raw : {}),
    weights: arr(raw?.weights), waists: arr(raw?.waists), workouts: arr(raw?.workouts),
    injuries: arr(raw?.injuries), krav: arr(raw?.krav), food: arr(raw?.food),
    reviews: arr(raw?.reviews), water: arr(raw?.water), bp: arr(raw?.bp),
    calib: { ...EMPTY.calib, ...(raw?.calib || {}), runs: { ...EMPTY.calib.runs, ...(raw?.calib?.runs || {}) } },
    orders: raw?.orders && typeof raw.orders === 'object' ? raw.orders : {},
  };
  // מיגרציה: רישומי מים ישנים (סימון בלבד) → נספרים כיעד מלא
  d.water = d.water.map(w => (w.ml == null ? { ...w, ml: d.waterGoal ?? 1500 } : w));
  // מיגרציה: תאריך התחלה — הרישום המוקדם ביותר
  if (!d.startDate) {
    const dates = [...d.weights, ...d.waists, ...d.injuries, ...d.krav, ...d.food, ...d.water, ...d.workouts, ...d.bp]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((x: any) => x?.date).filter(Boolean);
    d.startDate = dates.length ? dates.reduce((a: string, b: string) => (a < b ? a : b)) : today();
  }
  return d;
}

interface Ctx {
  db: DB;
  update: (fn: (d: DB) => DB) => void;
  session: Session | null;
  lastSync: string | null;
  syncError: string | null;
  syncNow: () => Promise<string | null>;
  recovery: boolean;           // הגיע מקישור איפוס סיסמה — צריך לקבוע חדשה
  clearRecovery: () => void;
}
const StoreCtx = createContext<Ctx | null>(null);
export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('store');
  return c;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        try { return hydrate(JSON.parse(raw)); }
        catch {
          // נתונים פגומים — שומרים עותק בצד, לא מוחקים כלום
          try { localStorage.setItem(`${KEY}-corrupt-${Date.now()}`, raw); } catch { /* full */ }
        }
      }
    } catch { /* fresh */ }
    return { ...EMPTY, startDate: today() };
  });

  const [session, setSession] = useState<Session | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout>>();
  const dbRef = useRef(db);
  const pulledRef = useRef(false); // אסור לדחוף לענן לפני שמשכנו ממנו — מגן מדריסת ענן ע"י מכשיר ריק

  useEffect(() => { dbRef.current = db; }, [db]);

  // מעקב התחברות
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      setSession(s);
      if (e === 'PASSWORD_RECOVERY') setRecovery(true);
      if (e === 'SIGNED_OUT') pulledRef.current = false;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const push = async (d: DB, uid: string): Promise<string | null> => {
    const { error } = await supabase.from('snapshots').upsert({
      user_id: uid, data: d, updated_at: d.updatedAt || new Date().toISOString(),
    });
    if (error) { setSyncError(error.message); return error.message; }
    setLastSync(new Date().toISOString());
    setSyncError(null);
    return null;
  };

  // משיכה מהענן — המעודכן מבין השניים מנצח. שגיאת רשת ≠ "אין נתונים בענן".
  const pull = async (uid: string): Promise<string | null> => {
    const { data: row, error } = await supabase.from('snapshots')
      .select('data, updated_at').eq('user_id', uid).maybeSingle();
    if (error) { setSyncError(error.message); return error.message; } // לא דוחפים כשהמשיכה נכשלה
    pulledRef.current = true;
    const remote = row?.data as DB | undefined;
    const remoteStamp = remote?.updatedAt || row?.updated_at;
    const local = dbRef.current;
    if (remote && remoteStamp && (!local.updatedAt || remoteStamp > local.updatedAt)) {
      setDb(hydrate(remote));
      setLastSync(new Date().toISOString());
      setSyncError(null);
      return null;
    }
    return push(local, uid);
  };

  // בהתחברות: משיכה ראשונית
  useEffect(() => {
    if (session) pull(session.user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // שמירה מקומית תמיד + דחיפה לענן (מושהית) — רק אחרי שמשכנו
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch { alert('האחסון המקומי מלא — מחק תמונות ישנות מיומן האוכל כדי להמשיך לשמור.'); }
    if (session && pulledRef.current) {
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => push(db, session.user.id), 2500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, session]);

  // דחיפה מיידית כשעוזבים את האפליקציה — שלא יאבד העדכון האחרון
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && session && pulledRef.current) {
        clearTimeout(pushTimer.current);
        push(dbRef.current, session.user.id);
      }
    };
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const update = (fn: (d: DB) => DB) => setDb(prev => {
    const next = fn(structuredClone(prev));
    next.updatedAt = new Date().toISOString();
    return next;
  });

  const syncNow = async (): Promise<string | null> => {
    if (!session) return 'לא מחובר — התחבר קודם';
    // אם המשיכה הראשונית לא קרתה/נכשלה — הכפתור משלים אותה בעצמו במקום לסרב
    return pulledRef.current ? push(dbRef.current, session.user.id) : pull(session.user.id);
  };

  return <StoreCtx.Provider value={{ db, update, session, lastSync, syncError, syncNow, recovery, clearRecovery: () => setRecovery(false) }}>{children}</StoreCtx.Provider>;
}

export const today = () => new Date().toISOString().slice(0, 10);
export const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
export function weekStartOf(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay(); // Sunday=0 — Israeli week starts Sunday
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}
