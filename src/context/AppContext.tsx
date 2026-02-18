import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, WorkoutSession, WeightEntry } from '../data/types';

interface AppState {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  workoutHistory: WorkoutSession[];
  addWorkout: (w: WorkoutSession) => void;
  updateWorkout: (w: WorkoutSession) => void;
  addWeightEntry: (e: WeightEntry) => void;
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

  useEffect(() => {
    localStorage.setItem('fitlog-profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('fitlog-workouts', JSON.stringify(workoutHistory));
  }, [workoutHistory]);

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

  return (
    <AppContext.Provider value={{ profile, setProfile, workoutHistory, addWorkout, updateWorkout, addWeightEntry }}>
      {children}
    </AppContext.Provider>
  );
};
