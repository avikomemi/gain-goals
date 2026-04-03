export interface Exercise {
  id: string;
  name: string;
  nameHe?: string;
  sets: string;
  reps: string;
  notes?: string;
  isWarmup?: boolean;
  isBodyweight?: boolean;
  isTimeBased?: boolean;
  link?: string;
  isMobility?: boolean;
  subExercises?: { name: string; reps: string }[];
}

export interface Routine {
  id: string;
  name: string;
  nameHe: string;
  icon: string;
  warmup: Exercise[];
  exercises: Exercise[];
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
  skipped: boolean;
  notes: string;
  painLevel: number;
  rpe: number;
}

export interface SetLog {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface WorkoutSession {
  id: string;
  routineId: string;
  routineName: string;
  date: string;
  duration: number; // minutes
  exercises: ExerciseLog[];
  notes: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface UserProfile {
  name: string;
  age: number;
  height: number;
  weight: number;
  goals: string[];
  sensitivities: string[];
  weightHistory: WeightEntry[];
}
