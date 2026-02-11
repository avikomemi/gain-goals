import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { routines } from '../data/routines';
import { useApp } from '../context/AppContext';
import { ExerciseLog, SetLog, WorkoutSession, Exercise } from '../data/types';
import SensitivityWarning from '../components/SensitivityWarning';
import { ChevronRight, Check, SkipForward, ExternalLink, AlertTriangle, Trophy, X } from 'lucide-react';
import confetti from 'canvas-confetti';

const WorkoutLogger = () => {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const { addWorkout } = useApp();

  const routine = routines.find(r => r.id === routineId);
  const allExercises = routine ? [...routine.warmup, ...routine.exercises] : [];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [startTime] = useState(Date.now());
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [completed, setCompleted] = useState(false);

  // Current exercise state
  const [sets, setSets] = useState<SetLog[]>([]);
  const [painLevel, setPainLevel] = useState(0);
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState('');

  const currentExercise = allExercises[currentIdx];

  useEffect(() => {
    if (currentExercise) {
      const numSets = parseInt(currentExercise.sets) || 1;
      const defaultReps = parseInt(currentExercise.reps) || 0;
      setSets(Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: 0, completed: false })));
      setPainLevel(0);
      setRpe(5);
      setNotes('');
    }
  }, [currentIdx]);

  if (!routine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>אימון לא נמצא</p>
      </div>
    );
  }

  const toggleSet = (idx: number) => {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, completed: !s.completed } : s));
  };

  const updateSetReps = (idx: number, reps: number) => {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, reps } : s));
  };

  const updateSetWeight = (idx: number, weight: number) => {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, weight } : s));
  };

  const saveAndNext = (skipped: boolean) => {
    const log: ExerciseLog = {
      exerciseId: currentExercise.id,
      exerciseName: currentExercise.name,
      sets: skipped ? [] : sets,
      skipped,
      notes,
      painLevel,
      rpe,
    };
    const newLogs = [...logs, log];
    setLogs(newLogs);

    if (currentIdx < allExercises.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Workout complete!
      const session: WorkoutSession = {
        id: Date.now().toString(),
        routineId: routine.id,
        routineName: routine.nameHe,
        date: new Date().toISOString(),
        duration: Math.round((Date.now() - startTime) / 60000),
        exercises: newLogs,
        notes: '',
      };
      addWorkout(session);
      setCompleted(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
        </motion.div>
        <h1 className="text-2xl font-bold mb-2">כל הכבוד! 🎉</h1>
        <p className="text-muted-foreground mb-2">{routine.nameHe}</p>
        <p className="text-sm text-muted-foreground mb-6">
          {logs.filter(l => !l.skipped).length} תרגילים הושלמו · {Math.round((Date.now() - startTime) / 60000)} דקות
        </p>
        <button
          onClick={() => navigate('/')}
          className="gradient-primary text-primary-foreground font-semibold px-8 py-3 rounded-xl"
        >
          חזרה לראשי
        </button>
      </div>
    );
  }

  const progress = ((currentIdx + 1) / allExercises.length) * 100;
  const isWarmup = currentExercise?.isWarmup;

  return (
    <div className="min-h-screen pb-6 px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate('/workout')} className="text-muted-foreground">
          <X className="w-6 h-6" />
        </button>
        <span className="text-xs text-muted-foreground">
          {currentIdx + 1} / {allExercises.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary rounded-full mb-5 overflow-hidden">
        <motion.div
          className="h-full gradient-primary rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {isWarmup && (
        <span className="inline-block text-[10px] font-semibold bg-accent/20 text-accent px-2 py-0.5 rounded mb-2">חימום</span>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.2 }}
        >
          {/* Exercise Name */}
          <h2 className="text-xl font-bold mb-1">
            {currentExercise.nameHe || currentExercise.name}
          </h2>
          {currentExercise.nameHe && (
            <p className="text-xs text-muted-foreground mb-2">{currentExercise.name}</p>
          )}

          {/* Notes / Instructions */}
          {currentExercise.notes && (
            <div className={`text-sm rounded-lg px-3 py-2 mb-3 ${
              currentExercise.notes.includes('⚠️') || currentExercise.notes.includes('אל ת')
                ? 'bg-warning/10 text-warning'
                : 'bg-secondary text-secondary-foreground'
            }`}>
              {currentExercise.notes}
            </div>
          )}

          {currentExercise.link && (
            <a
              href={currentExercise.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-accent text-sm mb-3"
            >
              <ExternalLink className="w-3.5 h-3.5" /> צפה בסרטון
            </a>
          )}

          {/* Sub-exercises for mobility */}
          {currentExercise.subExercises && (
            <div className="space-y-2 mb-4">
              {currentExercise.subExercises.map((sub, i) => (
                <div key={i} className="bg-secondary rounded-lg px-3 py-2 text-sm">
                  <span className="font-medium">{sub.name}</span>
                  <span className="text-muted-foreground mr-2">— {sub.reps}</span>
                </div>
              ))}
            </div>
          )}

          <SensitivityWarning compact />

          {/* Sets */}
          {!isWarmup && (
            <div className="mt-4 space-y-2">
              <div className="flex text-[10px] text-muted-foreground px-1 mb-1">
                <span className="w-10">סט</span>
                <span className="flex-1 text-center">חזרות</span>
                <span className="flex-1 text-center">משקל (ק"ג)</span>
                <span className="w-10 text-center">✓</span>
              </div>
              {sets.map((set, i) => (
                <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-lg px-2 py-2">
                  <span className="w-8 text-xs text-muted-foreground text-center">{i + 1}</span>
                  <input
                    type="number"
                    value={set.reps || ''}
                    onChange={(e) => updateSetReps(i, Number(e.target.value))}
                    className="flex-1 bg-secondary rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0"
                  />
                  <input
                    type="number"
                    value={set.weight || ''}
                    onChange={(e) => updateSetWeight(i, Number(e.target.value))}
                    className="flex-1 bg-secondary rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0"
                  />
                  <button
                    onClick={() => toggleSet(i)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      set.completed
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pain Level */}
          {!isWarmup && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  רמת כאב
                </label>
                <span className={`text-sm font-bold ${painLevel > 5 ? 'text-pain' : painLevel > 2 ? 'text-warning' : 'text-primary'}`}>
                  {painLevel}/10
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}

          {/* RPE */}
          {!isWarmup && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">RPE (מאמץ)</label>
                <span className="text-sm font-bold text-accent">{rpe}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={rpe}
                onChange={(e) => setRpe(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          )}

          {/* Notes */}
          <div className="mt-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות / שינויים / התאמות..."
              className="w-full bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none h-16"
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => saveAndNext(true)}
          className="flex-1 bg-secondary text-secondary-foreground rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2"
        >
          <SkipForward className="w-4 h-4" /> דלג
        </button>
        <button
          onClick={() => saveAndNext(false)}
          className="flex-[2] gradient-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
        >
          {currentIdx < allExercises.length - 1 ? (
            <>הבא <ChevronRight className="w-4 h-4 rotate-180" /></>
          ) : (
            <>סיים אימון 🎉</>
          )}
        </button>
      </div>
    </div>
  );
};

export default WorkoutLogger;
