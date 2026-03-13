import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserProfile, WorkoutSession, WeightEntry, Routine, Exercise } from '../data/types';
import { routines as defaultRoutines } from '../data/routines';

export interface ExerciseOverride {
  name?: string;
  nameHe?: string;
  link?: string;
}

export interface RoutineCustomization {
  exerciseOrder?: string[]; // ordered exercise IDs
  exerciseOverrides?: Record<string, ExerciseOverride>;
}

interface AppState {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  workoutHistory: WorkoutSession[];
  addWorkout: (w: WorkoutSession) => void;
  updateWorkout: (w: WorkoutSession) => void;
  addWeightEntry: (e: WeightEntry) => void;
  getCustomizedRoutine: (routineId: string) => Routine | undefined;
  updateRoutineCustomization: (routineId: string, customization: RoutineCustomization) => void;
  routineCustomizations: Record<string, RoutineCustomization>;
}

const defaultProfile: UserProfile = {
  name: 'המשתמש',
  age: 48.7,
  height: 180,
  weight: 94,
  goals: ['חיטוב', 'גמישות', 'כוח'],
  sensitivities: ['גב', 'ברכיים'],
  weightHistory: [
    { date: '2025-01-01', weight: 96 },
    { date: '2025-01-15', weight: 95.5 },
    { date: '2025-02-01', weight: 95 },
    { date: '2025-02-15', weight: 94.5 },
    { date: '2025-03-01', weight: 94 },
  ],
};

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfileState] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('fitlog-profile');
    return saved ? JSON.parse(saved) : defaultProfile;
  });

  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>(() => {
    const saved = localStorage.getItem('fitlog-workouts');
    return saved ? JSON.parse(saved) : [];
  });

  const [routineCustomizations, setRoutineCustomizations] = useState<Record<string, RoutineCustomization>>(() => {
    const saved = localStorage.getItem('fitlog-routine-customizations');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('fitlog-profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('fitlog-workouts', JSON.stringify(workoutHistory));
  }, [workoutHistory]);

  useEffect(() => {
    localStorage.setItem('fitlog-routine-customizations', JSON.stringify(routineCustomizations));
  }, [routineCustomizations]);

  const setProfile = (p: UserProfile) => setProfileState(p);

  const addWorkout = (w: WorkoutSession) => {
    setWorkoutHistory(prev => [w, ...prev]);
  };

  const updateWorkout = (w: WorkoutSession) => {
    setWorkoutHistory(prev => prev.map(existing => existing.id === w.id ? w : existing));
  };

  const addWeightEntry = (e: WeightEntry) => {
    setProfileState(prev => ({
      ...prev,
      weight: e.weight,
      weightHistory: [...prev.weightHistory, e],
    }));
  };

  const getCustomizedRoutine = useCallback((routineId: string): Routine | undefined => {
    const base = defaultRoutines.find(r => r.id === routineId);
    if (!base) return undefined;
    const custom = routineCustomizations[routineId];
    if (!custom) return base;

    const applyOverrides = (exercises: Exercise[]): Exercise[] => {
      return exercises.map(ex => {
        const override = custom.exerciseOverrides?.[ex.id];
        if (!override) return ex;
        return {
          ...ex,
          ...(override.name !== undefined && { name: override.name }),
          ...(override.nameHe !== undefined && { nameHe: override.nameHe }),
          ...(override.link !== undefined && { link: override.link || undefined }),
        };
      });
    };

    let customExercises = applyOverrides(base.exercises);

    // Reorder if custom order exists
    if (custom.exerciseOrder) {
      const ordered: Exercise[] = [];
      custom.exerciseOrder.forEach(id => {
        const ex = customExercises.find(e => e.id === id);
        if (ex) ordered.push(ex);
      });
      // Add any new exercises not in the custom order
      customExercises.forEach(ex => {
        if (!ordered.find(o => o.id === ex.id)) ordered.push(ex);
      });
      customExercises = ordered;
    }

    return { ...base, exercises: customExercises, warmup: applyOverrides(base.warmup) };
  }, [routineCustomizations]);

  const updateRoutineCustomization = (routineId: string, customization: RoutineCustomization) => {
    setRoutineCustomizations(prev => ({
      ...prev,
      [routineId]: { ...prev[routineId], ...customization },
    }));
  };

  return (
    <AppContext.Provider value={{ profile, setProfile, workoutHistory, addWorkout, updateWorkout, addWeightEntry, getCustomizedRoutine, updateRoutineCustomization, routineCustomizations }}>
      {children}
    </AppContext.Provider>
  );
};
