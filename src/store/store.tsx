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

interface Ctx {
  db: DB;
  update: (fn: (d: DB) => DB) => void;
  session: Session | null;
  lastSync: string | null;
  syncNow: () => Promise<string | null>;
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
        const d = { ...EMPTY, ...JSON.parse(raw) } as DB;
        // מיגרציה: רישומי מים ישנים (סימון בלבד, בלי כמות) → נספרים כיעד מלא
        d.water = d.water.map(w => (w.ml == null ? { ...w, ml: d.waterGoal ?? 1500 } : w));
        // מיגרציה: תאריך התחלה — הרישום המוקדם ביותר, כדי שהסטטיסטיקות יימדדו רק מאז
        if (!d.startDate) {
          const dates = [...d.weights, ...d.waists, ...d.injuries, ...d.krav, ...d.food, ...d.water, ...d.workouts].map(x => x.date);
          d.startDate = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : today();
        }
        return d;
      }
    } catch { /* fresh */ }
    return { ...EMPTY, startDate: today() };
  });
  const [session, setSession] = useState<Session | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout>>();

  // מעקב התחברות
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const push = async (d: DB, uid: string): Promise<string | null> => {
    const { error } = await supabase.from('snapshots').upsert({
      user_id: uid, data: d, updated_at: d.updatedAt || new Date().toISOString(),
    });
    if (!error) setLastSync(new Date().toISOString());
    return error ? error.message : null;
  };

  // בהתחברות: מושכים מהענן — המעודכן מבין השניים מנצח
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: row } = await supabase.from('snapshots').select('data').eq('user_id', session.user.id).maybeSingle();
      const remote = row?.data as DB | undefined;
      if (remote && remote.updatedAt && (!db.updatedAt || remote.updatedAt > db.updatedAt)) {
        setDb({ ...EMPTY, ...remote });
        setLastSync(new Date().toISOString());
      } else {
        await push(db, session.user.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // שמירה מקומית תמיד + דחיפה לענן (מושהית) כשמחוברים
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch { alert('האחסון המקומי מלא — מחק תמונות ישנות מיומן האוכל כדי להמשיך לשמור.'); }
    if (session) {
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => push(db, session.user.id), 2500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, session]);

  const update = (fn: (d: DB) => DB) => setDb(prev => {
    const next = fn(structuredClone(prev));
    next.updatedAt = new Date().toISOString();
    return next;
  });

  const syncNow = () => session ? push(db, session.user.id) : Promise.resolve('לא מחובר');

  return <StoreCtx.Provider value={{ db, update, session, lastSync, syncNow }}>{children}</StoreCtx.Provider>;
}

export const today = () => new Date().toISOString().slice(0, 10);
export const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
export function weekStartOf(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay(); // Sunday=0 — Israeli week starts Sunday
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}
