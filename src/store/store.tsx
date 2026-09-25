import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Loc, RoutineKey } from '../data/program';
import { supabase } from './cloud';
import { FoodItem, mergeFoods } from './foodDB';
import { readFitbitCallback, exchangeFitbitCode, clearFitbitCallbackUrl, syncFitbit } from './fitbit';
import type { Session } from '@supabase/supabase-js';

export interface SetLog { reps: number; weight?: number; done: boolean; bw?: boolean }
export interface ExLog { id: string; name: string; sets: SetLog[]; rpe?: number; skipped?: boolean; params?: Record<string, number> }
export interface WorkoutLog {
  id: string; date: string; routine: RoutineKey; loc: Loc;   // 'P' = דף הפיזיו, אימון נפרד מסבב ABC
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
// מבחני גמישות (בסיס + חודשי) — נעה. אצבעות-רצפה/כתף בס"מ (שלילי=עברת/חפיפה), סקוואט בשניות.
export interface FlexEntry { date: string; fingerFloor?: number; squatSec?: number; shoulderR?: number; shoulderL?: number }

export interface Calib {
  waist: boolean; bp: boolean; firstWeight: boolean; flexTests: boolean;
  runs: { A: number; B: number; C: number };
  done: boolean;
}

export interface DB {
  weights: WeightEntry[]; waists: WaistEntry[]; workouts: WorkoutLog[];
  injuries: Injury[]; krav: KravLog[]; food: FoodLog[]; reviews: Review[];
  water: WaterDay[]; bp: BpEntry[]; flex: FlexEntry[]; calib: Calib;
  orders: { A?: string[]; B?: string[]; C?: string[]; P?: string[] };
  foods?: FoodItem[]; // מסד תזונה אישי (ערכים פר-100-גרם) — נזרע מ-SEED_FOODS, גדל עם הזמן
  restSec?: number; // ברירת-מחדל גלובלית לזמן מנוחה (שניות) — נפילה לתרגילים שלא הוגדרו פרטנית
  restByEx?: Record<string, number>; // זמן מנוחה פר-תרגיל (exerciseId → שניות) — גובר על restSec
  waterGoal?: number; // מ"ל ליום — השדה הישן, נשמר לתאימות; היעד החי יושב ב-goals
  goals?: Partial<import('./goals').Goals>; // היעדים שאבי קבע (מה שלא נקבע — ברירת מחדל)
  startDate?: string; // היום שבו אבי התחיל — כל הסטטיסטיקות נמדדות מכאן, לא לפני
  updatedAt?: string; // חותמת שינוי אחרון — לסנכרון ענן (המעודכן מנצח)
  fitbit?: { connected: boolean; connectedAt?: string; scope?: string; fitbitUserId?: string; lastSync?: string }; // סטטוס חיבור Fitbit (הטוקן עצמו בשרת בלבד)
  sleep?: { date: string; minutes: number; deep?: number; rem?: number; light?: number; awake?: number; inBed?: number }[]; // שינה מ-Fitbit (דקות שינה לפי לילה)
  steps?: { date: string; count: number }[]; // צעדים יומיים מ-Fitbit
}

const EMPTY: DB = {
  weights: [], waists: [], workouts: [], injuries: [], krav: [], food: [], reviews: [], water: [], bp: [],
  flex: [],
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
    sleep: arr(raw?.sleep), steps: arr(raw?.steps), flex: arr(raw?.flex),
    calib: { ...EMPTY.calib, ...(raw?.calib || {}), runs: { ...EMPTY.calib.runs, ...(raw?.calib?.runs || {}) } },
    orders: raw?.orders && typeof raw.orders === 'object' ? raw.orders : {},
  };
  // זריעה/מיזוג של מסד התזונה — פריטי-זרע חדשים נכנסים, עריכות של אבי נשמרות
  d.foods = mergeFoods(d.foods);
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

// upsert per-day records (steps/sleep) — incoming wins, sorted by date
export function mergeByDate<T extends { date: string }>(existing: T[] | undefined, incoming: T[] | undefined): T[] {
  const m = new Map<string, T>((existing || []).map(x => [x.date, x]));
  for (const it of incoming || []) m.set(it.date, it);
  return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
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
    return hydrate({ startDate: today() }); // התקנה טרייה — עדיין עוברת דרך hydrate כדי לזרוע foods ושדות ברירת-מחדל
  });

  const [session, setSession] = useState<Session | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout>>();
  const dbRef = useRef(db);
  const pulledRef = useRef(false); // אסור לדחוף לענן לפני שמשכנו ממנו — מגן מדריסת ענן ע"י מכשיר ריק
  const fitbitHandledRef = useRef(false); // callback של Fitbit מטופל פעם אחת בלבד
  const fitbitSyncedRef = useRef(false); // סנכרון Fitbit רץ פעם אחת לכל טעינת אפליקציה

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

  // חזרה מ-Fitbit: יש ?code בכתובת → ממירים לטוקן בשרת ומסמנים "מחובר".
  // דורש session פעיל (ה-Edge Function מוגן ב-JWT).
  useEffect(() => {
    if (!session || fitbitHandledRef.current) return;
    const cb = readFitbitCallback();
    if (!cb) return;
    fitbitHandledRef.current = true;
    (async () => {
      const { data, error } = await exchangeFitbitCode(cb.code);
      clearFitbitCallbackUrl();
      if (!error && data?.ok) {
        update(d => ({ ...d, fitbit: { connected: true, connectedAt: new Date().toISOString(), scope: data.scope, fitbitUserId: data.fitbitUserId } }));
      } else {
        alert(`חיבור Fitbit נכשל: ${error?.message || data?.detail || data?.error || 'שגיאה לא ידועה'}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // סנכרון Fitbit פעם אחת לכל טעינה (כשמחוברים) — מושך שינה+צעדים וממזג ליומן
  useEffect(() => {
    if (!session || !db.fitbit?.connected || fitbitSyncedRef.current) return;
    fitbitSyncedRef.current = true;
    (async () => {
      const { data, error } = await syncFitbit();
      if (error || !data) return; // תקלת רשת — שקט, ננסה בפתיחה הבאה
      if (data.needsReconnect) {
        // הטוקן פג (מגבלת 7 הימים של Testing) — מסמנים מנותק כדי שאבי יחבר שוב
        update(d => (d.fitbit ? { ...d, fitbit: { ...d.fitbit, connected: false } } : d));
        return;
      }
      if (data.ok) {
        update(d => {
          if (data.steps?.length) d.steps = mergeByDate(d.steps, data.steps);
          if (data.sleep?.length) d.sleep = mergeByDate(d.sleep, data.sleep);
          if (d.fitbit) d.fitbit.lastSync = data.syncedAt;
          return d;
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, db.fitbit?.connected]);

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
