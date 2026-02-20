import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { routines } from '../data/routines';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { ExerciseLog, SetLog, WorkoutSession } from '../data/types';
import SensitivityWarning from '../components/SensitivityWarning';
import RestTimer from '../components/RestTimer';
import { ChevronLeft, ChevronRight, Check, SkipForward, ExternalLink, AlertTriangle, Trophy, X, Timer, Save, Loader2, History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

const WorkoutLogger = () => {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const { addWorkout, workoutHistory } = useApp();
  const { t, lang } = useI18n();

  const routine = routines.find(r => r.id === routineId);
  const allExercises = routine ? [...routine.warmup, ...routine.exercises] : [];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [startTime] = useState(Date.now());
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [completed, setCompleted] = useState(false);

  const [sets, setSets] = useState<SetLog[]>([]);
  const [painLevel, setPainLevel] = useState(0);
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState('');

  // Rest timer state
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(() => {
    const saved = localStorage.getItem('fitlog-rest-duration');
    return saved ? parseInt(saved) : 90;
  });
  const [isSaving, setIsSaving] = useState(false);

  const currentExercise = allExercises[currentIdx];

  // Find last session data for current exercise
  const getLastSessionData = (exerciseId: string) => {
    for (const session of workoutHistory) {
      const match = session.exercises.find(ex => ex.exerciseId === exerciseId && !ex.skipped);
      if (match) return match;
    }
    return null;
  };
  const lastSessionData = currentExercise ? getLastSessionData(currentExercise.id) : null;

  const [restoredIdx, setRestoredIdx] = useState<number | null>(null);
  const [restoredExerciseState, setRestoredExerciseState] = useState<{ sets: SetLog[]; painLevel: number; rpe: number; notes: string } | null>(null);

  // Restore saved progress on mount
  useEffect(() => {
    if (!routineId) return;
    const saved = localStorage.getItem(`fitlog-inprogress-${routineId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setLogs(data.logs || []);
        setCurrentIdx(data.currentIdx || 0);
        setRestoredIdx(data.currentIdx || 0);
        if (data.currentExercise) {
          setRestoredExerciseState(data.currentExercise);
        }
        toast(t('wl.resuming'));
      } catch {}
    }
  }, [routineId]);

  useEffect(() => {
    if (currentExercise) {
      // If we just restored and this is the restored index, use saved state
      if (restoredIdx === currentIdx && restoredExerciseState) {
        setSets(restoredExerciseState.sets);
        setPainLevel(restoredExerciseState.painLevel);
        setRpe(restoredExerciseState.rpe);
        setNotes(restoredExerciseState.notes);
        setRestoredIdx(null);
        setRestoredExerciseState(null);
      } else {
        const numSets = parseInt(currentExercise.sets) || 1;
        const defaultReps = parseInt(currentExercise.reps) || 0;
        setSets(Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: 0, completed: false })));
        setPainLevel(0);
        setRpe(5);
        setNotes('');
      }
    }
  }, [currentIdx]);

  useEffect(() => {
    localStorage.setItem('fitlog-rest-duration', restDuration.toString());
  }, [restDuration]);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (completed || !routineId) return;
    const interval = setInterval(() => {
      setIsSaving(true);
      localStorage.setItem(`fitlog-inprogress-${routineId}`, JSON.stringify({
        logs,
        currentIdx,
        currentExercise: { sets, painLevel, rpe, notes },
      }));
      setTimeout(() => setIsSaving(false), 600);
    }, 10000);
    return () => clearInterval(interval);
  }, [completed, routineId, logs, currentIdx, sets, painLevel, rpe, notes]);

  if (!routine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t('wl.notFound')}</p>
      </div>
    );
  }

  const toggleSet = (idx: number) => {
    const wasCompleted = sets[idx].completed;
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, completed: !s.completed } : s));
    // Auto-start rest timer when completing a set (not un-completing)
    if (!wasCompleted) {
      setShowRestTimer(true);
    }
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
      const session: WorkoutSession = {
        id: Date.now().toString(),
        routineId: routine.id,
        routineName: lang === 'he' ? routine.nameHe : routine.name,
        date: new Date().toISOString(),
        duration: Math.round((Date.now() - startTime) / 60000),
        exercises: newLogs,
        notes: '',
      };
      addWorkout(session);
      setCompleted(true);
      // Clear saved progress
      localStorage.removeItem(`fitlog-inprogress-${routineId}`);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
        </motion.div>
        <h1 className="text-2xl font-bold mb-2">{t('wl.congrats')}</h1>
        <p className="text-muted-foreground mb-2">{lang === 'he' ? routine.nameHe : routine.name}</p>
        <p className="text-sm text-muted-foreground mb-6">
          {logs.filter(l => !l.skipped).length} {t('wl.completed')} · {Math.round((Date.now() - startTime) / 60000)} {t('dash.minutes')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="gradient-primary text-primary-foreground font-semibold px-8 py-3 rounded-xl"
        >
          {t('wl.backHome')}
        </button>
      </div>
    );
  }

  const progress = ((currentIdx + 1) / allExercises.length) * 100;
  const isWarmup = currentExercise?.isWarmup;

  return (
    <div className="min-h-screen pb-6 px-4 pt-4">
      {/* Rest Timer Overlay */}
      <AnimatePresence>
        {showRestTimer && (
          <RestTimer
            duration={restDuration}
            onComplete={() => setShowRestTimer(false)}
            onSkip={() => setShowRestTimer(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate('/workout')} className="text-muted-foreground">
          <X className="w-6 h-6" />
        </button>
        <span className="text-xs text-muted-foreground">
          {currentIdx + 1} / {allExercises.length}
        </span>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg active:bg-secondary transition-colors"
          onClick={() => {
            if (isSaving || !routineId) return;
            setIsSaving(true);
            localStorage.setItem(`fitlog-inprogress-${routineId}`, JSON.stringify({
              logs,
              currentIdx,
              currentExercise: { sets, painLevel, rpe, notes },
            }));
            setTimeout(() => setIsSaving(false), 700);
          }}
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Save className="w-5 h-5 text-primary" />
          )}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary rounded-full mb-5 overflow-hidden">
        <motion.div className="h-full gradient-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {isWarmup && (
        <span className="inline-block text-[10px] font-semibold bg-accent/20 text-accent px-2 py-0.5 rounded mb-2">{t('wl.warmup')}</span>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: lang === 'he' ? -30 : 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: lang === 'he' ? 30 : -30 }}
          transition={{ duration: 0.2 }}
        >
          <h2 className="text-xl font-bold mb-1">
            {lang === 'he' ? (currentExercise.nameHe || currentExercise.name) : currentExercise.name}
          </h2>
          {currentExercise.nameHe && lang === 'he' && (
            <p className="text-xs text-muted-foreground mb-2">{currentExercise.name}</p>
          )}
          {currentExercise.nameHe && lang === 'en' && (
            <p className="text-xs text-muted-foreground mb-2">{currentExercise.nameHe}</p>
          )}

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
            <a href={currentExercise.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent text-sm mb-3">
              <ExternalLink className="w-3.5 h-3.5" /> {t('wl.watchVideo')}
            </a>
          )}

          {currentExercise.subExercises && (
            <div className="space-y-2 mb-4">
              {currentExercise.subExercises.map((sub, i) => (
                <div key={i} className="bg-secondary rounded-lg px-3 py-2 text-sm">
                  <span className="font-medium">{sub.name}</span>
                  <span className="text-muted-foreground mx-2">— {sub.reps}</span>
                </div>
              ))}
            </div>
          )}

          <SensitivityWarning compact />

          {/* Rest duration config */}
          {!isWarmup && (
            <div className="mt-4 flex items-center gap-3 bg-secondary rounded-lg px-3 py-2">
              <Timer className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground shrink-0">{t('timer.restTime')}</span>
              <div className="flex items-center gap-1 mr-auto">
                {[60, 90, 120, 180].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setRestDuration(sec)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                      restDuration === sec ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
                    }`}
                  >
                    {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Last session comparison */}
          {!isWarmup && lastSessionData && (
            <div className="mt-4 bg-secondary/50 border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <History className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-semibold text-accent">{t('wl.lastSession')}</span>
              </div>
              <div className="space-y-1.5">
                {lastSessionData.sets.map((s, i) => (
                  <div key={i} className="flex items-center text-xs text-muted-foreground gap-2">
                    <span className="w-8 text-center">{t('wl.set')} {i + 1}</span>
                    <span className="flex-1 text-center">{s.reps} {t('wl.reps')}</span>
                    <span className="flex-1 text-center">{s.weight > 0 ? `${s.weight} ${t('dash.kg')}` : '—'}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {t('wl.pain')}: <span className={`font-semibold ${lastSessionData.painLevel > 5 ? 'text-pain' : lastSessionData.painLevel > 2 ? 'text-warning' : 'text-primary'}`}>{lastSessionData.painLevel}/10</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('wl.effort')}: <span className="font-semibold text-accent">{lastSessionData.rpe}/10</span>
                </span>
              </div>
            </div>
          )}

          {/* Sets */}
          {!isWarmup && (
            <div className="mt-4 space-y-2">
              <div className="flex text-[10px] text-muted-foreground px-1 mb-1">
                <span className="w-10">{t('wl.set')}</span>
                <span className="flex-1 text-center">{t('wl.reps')}</span>
                <span className="flex-1 text-center">{t('wl.weight')}</span>
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
                      set.completed ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isWarmup && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  {t('wl.painLevel')}
                </label>
                <span className={`text-sm font-bold ${painLevel > 5 ? 'text-pain' : painLevel > 2 ? 'text-warning' : 'text-primary'}`}>
                  {painLevel}/10
                </span>
              </div>
              <input type="range" min="0" max="10" value={painLevel} onChange={(e) => setPainLevel(Number(e.target.value))} className="w-full accent-primary" />
            </div>
          )}

          {!isWarmup && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">{t('wl.rpe')}</label>
                <span className="text-sm font-bold text-accent">{rpe}/10</span>
              </div>
              <input type="range" min="1" max="10" value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="w-full accent-accent" />
            </div>
          )}

          <div className="mt-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('wl.notes')}
              className="w-full bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none h-16"
            />
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3 mt-6">
        {currentIdx > 0 && (
          <button onClick={() => setCurrentIdx(currentIdx - 1)} className="bg-secondary text-secondary-foreground rounded-xl py-3 px-3 text-sm font-medium flex items-center justify-center">
            <ChevronLeft className={`w-4 h-4 ${lang === 'he' ? 'rotate-180' : ''}`} />
          </button>
        )}
        <button onClick={() => saveAndNext(true)} className="flex-1 bg-secondary text-secondary-foreground rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2">
          <SkipForward className="w-4 h-4" /> {t('wl.skip')}
        </button>
        <button onClick={() => saveAndNext(false)} className="flex-[2] gradient-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2">
          {currentIdx < allExercises.length - 1 ? (
            <>{t('wl.next')} <ChevronRight className={`w-4 h-4 ${lang === 'he' ? 'rotate-180' : ''}`} /></>
          ) : (
            <>{t('wl.finish')}</>
          )}
        </button>
      </div>
    </div>
  );
};

export default WorkoutLogger;
