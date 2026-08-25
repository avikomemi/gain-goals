import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Loc } from '../data/program';

export interface SetLog { reps: number; weight?: number; done: boolean }
export interface ExLog { id: string; name: string; sets: SetLog[]; rpe?: number; skipped?: boolean }
export interface WorkoutLog {
  id: string; date: string; routine: 'A' | 'B' | 'C'; loc: Loc;
  exercises: ExLog[]; stoppedEarly?: boolean; flexDone?: boolean; finisherDone?: boolean;
}
export interface WeightEntry { date: string; kg: number }
export interface WaistEntry { date: string; cm: number }
export interface Injury { date: string; area: string; level: number; exercise?: string; what: string; note?: string }
export interface KravLog { date: string; min: number; intensity: 1 | 2 | 3; tags: string[]; note?: string }
export interface FoodLog { date: string; text: string }
export interface Review { weekStart: string; stress: number; decision: string; closedAt: string }
export interface WaterDay { date: string }

export interface Calib {
  waist: boolean; bp: boolean; firstWeight: boolean; flexTests: boolean;
  runs: { A: number; B: number; C: number };
  done: boolean;
}

export interface DB {
  weights: WeightEntry[]; waists: WaistEntry[]; workouts: WorkoutLog[];
  injuries: Injury[]; krav: KravLog[]; food: FoodLog[]; reviews: Review[];
  water: WaterDay[]; calib: Calib;
}

const EMPTY: DB = {
  weights: [], waists: [], workouts: [], injuries: [], krav: [], food: [], reviews: [], water: [],
  calib: { waist: false, bp: false, firstWeight: false, flexTests: false, runs: { A: 0, B: 0, C: 0 }, done: false },
};

const KEY = 'fitlog-v3';

interface Ctx {
  db: DB;
  update: (fn: (d: DB) => DB) => void;
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
      if (raw) return { ...EMPTY, ...JSON.parse(raw) };
    } catch { /* fresh */ }
    return EMPTY;
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(db)); }, [db]);
  const update = (fn: (d: DB) => DB) => setDb(prev => fn(structuredClone(prev)));
  return <StoreCtx.Provider value={{ db, update }}>{children}</StoreCtx.Provider>;
}

export const today = () => new Date().toISOString().slice(0, 10);
export const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
export function weekStartOf(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay(); // Sunday=0 — Israeli week starts Sunday
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}
