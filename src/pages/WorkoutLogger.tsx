import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { routines } from '../data/routines';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { ExerciseLog, SetLog, WorkoutSession } from '../data/types';
import SensitivityWarning from '../components/SensitivityWarning';
import RestTimer from '../components/RestTimer';
import { ChevronLeft, ChevronRight, Check, SkipForward, ExternalLink, AlertTriangle, Trophy, X, Timer, Save, History, Zap, Minus, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

const encouragements = {
  he: [
    '💪 אתה מוכן לזה!',
    '🔥 תמשיך ככה!',
    '⚡ אלוף! עוד אחד!',
    '🏆 הגוף שלך מודה לך!',
    '💥 אין עצירה!',
    '🚀 טיל! ממשיכים!',
    '👊 חזק! אתה שובר שיאים!',
    '🌟 מדהים! תרגיש את ההתקדמות!',
  ],
  en: [
    '💪 You got this!',
    '🔥 Keep it up!',
    '⚡ Champion! One more!',
    '🏆 Your body thanks you!',
    '💥 Unstoppable!',
    '🚀 On fire! Keep going!',
    '👊 Strong! Breaking records!',
    '🌟 Amazing! Feel the progress!',
  ],
};

const WorkoutLogger = () => {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const { addWorkout, workoutHistory, profile, getCustomizedRoutine } = useApp();
  const { t, lang } = useI18n();

  const routine = getCustomizedRoutine(routineId || '');
  const warmupList = routine?.warmup || [];
  const hasWarmup = warmupList.length > 0;
  const warmupPage: any = { id: 'warmup-combined', isWarmup: true, name: 'Warmup', nameHe: 'חימום', sets: '1', reps: '' };
  const allExercises = routine ? (hasWarmup ? [warmupPage, ...routine.exercises] : routine.exercises) : [];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [startTime] = useState(Date.now());
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [completed, setCompleted] = useState(false);

  const [sets, setSets] = useState<SetLog[]>([]);
  const [painLevel, setPainLevel] = useState(0);
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState('');
  const [exerciseCompleted, setExerciseCompleted] = useState(false);

  // Warmup reps tracking
  const [warmupReps, setWarmupReps] = useState(0);

  // Rest timer state
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [isBW, setIsBW] = useState(false);
  const [restDurations, setRestDurations] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('fitlog-rest-durations');
    return saved ? JSON.parse(saved) : {};
  });
  

  const currentExercise = allExercises[currentIdx];
  const nextExercise = currentIdx < allExercises.length - 1 ? allExercises[currentIdx + 1] : null;
  const isHe = lang === 'he';

  // Encouragement message based on exercise index
  const encouragement = useMemo(() => {
    const msgs = encouragements[lang] || encouragements.en;
    return msgs[currentIdx % msgs.length];
  }, [currentIdx, lang]);

  // Find last session data for current exercise (returns log + session date)
  const getLastSessionData = (exerciseId: string) => {
    for (const session of workoutHistory) {
      const match = session.exercises.find(ex => ex.exerciseId === exerciseId && !ex.skipped);
      if (match) return { ...match, sessionDate: session.date };
    }
    return null;
  };
  const lastSessionData = currentExercise ? getLastSessionData(currentExercise.id) : null;

  // Format the last session date as a relative + absolute string
  const formatLastDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    const dateStr = d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { day: '2-digit', month: 'short' });
    if (diffDays === 0) return lang === 'he' ? `היום · ${dateStr}` : `Today · ${dateStr}`;
    if (diffDays === 1) return lang === 'he' ? `אתמול · ${dateStr}` : `Yesterday · ${dateStr}`;
    return lang === 'he' ? `לפני ${diffDays} ימים · ${dateStr}` : `${diffDays} days ago · ${dateStr}`;
  };

  // Check for effort improvement
  const effortImproved = useMemo(() => {
    if (!lastSessionData || currentExercise?.isWarmup) return false;
    const lastMaxWeight = Math.max(...lastSessionData.sets.map(s => s.weight), 0);
    const currentMaxWeight = Math.max(...sets.map(s => s.weight), 0);
    const weightImproved = lastMaxWeight > 0 && currentMaxWeight >= lastMaxWeight * 1.2;
    const rpeImproved = lastSessionData.rpe > 0 && rpe <= lastSessionData.rpe * 0.8;
    return weightImproved || rpeImproved;
  }, [lastSessionData, sets, rpe, currentExercise]);

  // Volume progression: compare current vs previous total volume (sets × reps × weight)
  const volumeStats = useMemo(() => {
    if (!lastSessionData || currentExercise?.isWarmup) return null;
    const calcVolume = (setList: { reps: number; weight: number }[], timeBased: boolean) => {
      if (timeBased) {
        // For time-based exercises: sum of seconds across sets (weight field stores seconds)
        return setList.reduce((sum, s) => sum + (s.weight || 0), 0);
      }
      return setList.reduce((sum, s) => sum + (s.reps || 0) * (s.weight || 0), 0);
    };
    const timeBased = !!currentExercise?.isTimeBased;
    const prev = calcVolume(lastSessionData.sets, timeBased);
    const curr = calcVolume(sets, timeBased);
    if (prev <= 0 && curr <= 0) return null;
    // Ratio: 1.0 = match, >1 = improvement, capped at 1.5 for the bar visual
    const ratio = prev > 0 ? curr / prev : (curr > 0 ? 1 : 0);
    const pct = Math.min(150, Math.round(ratio * 100));
    const deltaPct = prev > 0 ? Math.round((curr - prev) / prev * 100) : null;
    return { prev, curr, pct, deltaPct, timeBased, isPR: prev > 0 && curr > prev };
  }, [lastSessionData, sets, currentExercise]);

  const [initialRestoreDone, setInitialRestoreDone] = useState(false);
  const prevIdxRef = useRef<number | null>(null);

  // In-session state for each exercise (persists when navigating back/forth)
  const sessionStateRef = useRef<Record<string, {
    sets: SetLog[];
    painLevel: number;
    rpe: number;
    notes: string;
    exerciseCompleted: boolean;
    warmupReps: number;
  }>>({});

  // Save current exercise state to session ref
  const saveCurrentToSession = useCallback(() => {
    if (!currentExercise) return;
    sessionStateRef.current[currentExercise.id] = {
      sets: [...sets],
      painLevel,
      rpe,
      notes,
      exerciseCompleted,
      warmupReps,
    };
  }, [currentExercise, sets, painLevel, rpe, notes, exerciseCompleted, warmupReps]);

  // Restore saved progress on mount
  useEffect(() => {
    if (!routineId) return;
    const saved = localStorage.getItem(`fitlog-inprogress-${routineId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setLogs(data.logs || []);
        const idx = data.currentIdx || 0;
        setCurrentIdx(idx);
        prevIdxRef.current = idx;
        if (data.currentExercise) {
          setSets(data.currentExercise.sets);
          setPainLevel(data.currentExercise.painLevel);
          setRpe(data.currentExercise.rpe);
          setNotes(data.currentExercise.notes);
          if (data.currentExercise.exerciseCompleted !== undefined) {
            setExerciseCompleted(data.currentExercise.exerciseCompleted);
          }
          if (data.currentExercise.warmupReps !== undefined) {
            setWarmupReps(data.currentExercise.warmupReps);
          }
          // Also store in session ref so navigating away and back preserves it
          const ex = allExercises[idx];
          if (ex) {
            sessionStateRef.current[ex.id] = {
              sets: data.currentExercise.sets,
              painLevel: data.currentExercise.painLevel,
              rpe: data.currentExercise.rpe,
              notes: data.currentExercise.notes,
              exerciseCompleted: data.currentExercise.exerciseCompleted ?? false,
              warmupReps: data.currentExercise.warmupReps ?? 0,
            };
          }
        }
        // Restore all session states if saved
        if (data.allSessionStates) {
          sessionStateRef.current = { ...sessionStateRef.current, ...data.allSessionStates };
        }
        toast(t('wl.resuming'));
      } catch {}
    }
    setInitialRestoreDone(true);
  }, [routineId]);

  useEffect(() => {
    if (!initialRestoreDone) return;
    if (prevIdxRef.current === currentIdx) {
      prevIdxRef.current = null;
      return;
    }
    if (currentExercise) {
      // Check if we already have session state for this exercise
      const sessionState = sessionStateRef.current[currentExercise.id];
      if (sessionState) {
        setSets(sessionState.sets);
        setPainLevel(sessionState.painLevel);
        setRpe(sessionState.rpe);
        setNotes(sessionState.notes);
        setExerciseCompleted(sessionState.exerciseCompleted);
        setWarmupReps(sessionState.warmupReps);
        setIsBW(!!currentExercise.isBodyweight);
        return;
      }

      // No session state — initialize from defaults
      const numSets = parseInt(currentExercise.sets) || 1;
      const defaultReps = parseInt(currentExercise.reps) || 0;
      const lastData = getLastSessionData(currentExercise.id);
      const exerciseIsBW = !!currentExercise.isBodyweight;
      setIsBW(exerciseIsBW);
      setExerciseCompleted(false);
      const defaultWeight = currentExercise.isTimeBased ? 0 : (exerciseIsBW ? profile.weight : 0);

      if (currentExercise.isWarmup) {
        setWarmupReps(defaultReps);
        setSets([]);
      } else if (lastData && lastData.sets.length > 0) {
        setSets(Array.from({ length: numSets }, (_, i) => ({
          reps: lastData.sets[i]?.reps ?? defaultReps,
          weight: lastData.sets[i]?.weight ?? defaultWeight,
          completed: false,
        })));
        setWarmupReps(0);
      } else {
        setSets(Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: defaultWeight, completed: false })));
        setWarmupReps(0);
      }
      setPainLevel(0);
      setRpe(5);
      setNotes('');
    }
  }, [currentIdx]);

  useEffect(() => {
    localStorage.setItem('fitlog-rest-durations', JSON.stringify(restDurations));
  }, [restDurations]);

  // Keep session ref in sync with current state
  useEffect(() => {
    if (!currentExercise) return;
    sessionStateRef.current[currentExercise.id] = {
      sets: [...sets],
      painLevel,
      rpe,
      notes,
      exerciseCompleted,
      warmupReps,
    };
  }, [sets, painLevel, rpe, notes, exerciseCompleted, warmupReps, currentExercise]);

  // Debounced auto-save: 5 seconds after last change
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (completed || !routineId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(`fitlog-inprogress-${routineId}`, JSON.stringify({
        logs,
        currentIdx,
        currentExercise: { sets, painLevel, rpe, notes, exerciseCompleted, warmupReps },
        allSessionStates: sessionStateRef.current,
      }));
    }, 5000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [completed, routineId, logs, currentIdx, sets, painLevel, rpe, notes, exerciseCompleted, warmupReps]);

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
      sets: skipped ? [] : (currentExercise.isWarmup ? [{ reps: warmupReps, weight: 0, completed: exerciseCompleted }] : sets),
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
  const isTimeBased = currentExercise?.isTimeBased;

  return (
    <div className="min-h-screen pb-6 px-4 pt-4">
      {/* Rest Timer Overlay */}
      <AnimatePresence>
        {showRestTimer && (
          <RestTimer
            duration={restDurations[currentExercise?.id] || 90}
            onComplete={() => setShowRestTimer(false)}
            onSkip={() => setShowRestTimer(false)}
          />
        )}
      </AnimatePresence>

      {/* Header with routine title */}
      <div className="flex items-center justify-between mb-1">
        <button onClick={() => navigate('/workout')} className="text-muted-foreground">
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-sm font-bold text-foreground truncate max-w-[60%] text-center">
          {lang === 'he' ? routine.nameHe : routine.name}
        </h1>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg active:bg-secondary transition-colors"
          onClick={() => {
            if (!routineId) return;
            localStorage.setItem(`fitlog-inprogress-${routineId}`, JSON.stringify({
              logs,
              currentIdx,
              currentExercise: { sets, painLevel, rpe, notes, exerciseCompleted, warmupReps },
              allSessionStates: sessionStateRef.current,
            }));
            toast(lang === 'he' ? 'נשמר ✓' : 'Saved ✓', { duration: 1000 });
          }}
        >
          <Save className="w-5 h-5 text-primary" />
        </button>
      </div>
      <div className="text-center mb-2">
        <span className="text-xs text-muted-foreground">
          {currentIdx + 1} / {allExercises.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary rounded-full mb-3 overflow-hidden">
        <motion.div className="h-full gradient-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Encouragement */}
      <motion.p
        key={currentIdx}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-sm font-medium text-accent mb-3"
      >
        {encouragement}
      </motion.p>

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
                <label key={i} className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2.5 text-sm cursor-pointer active:scale-[0.98] transition-transform">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-primary"
                    onChange={() => {}}
                  />
                  <div className="flex-1">
                    <span className="font-medium">{sub.name}</span>
                    <span className="text-muted-foreground mx-2">— {sub.reps}</span>
                  </div>
                </label>
              ))}
            </div>
          )}

          <SensitivityWarning compact />

          {/* Exercise Completed Toggle */}
          <div className="mt-4 flex items-center justify-between bg-secondary rounded-lg px-3 py-2.5">
            <span className="text-xs font-medium">{isHe ? 'בוצע?' : 'Completed?'}</span>
            <button
              onClick={() => setExerciseCompleted(!exerciseCompleted)}
              className={`w-10 h-6 rounded-full transition-all relative ${exerciseCompleted ? 'bg-green-500' : 'bg-muted'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-primary-foreground transition-all ${exerciseCompleted ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          {/* Warmup reps counter */}
          {isWarmup && (
            <div className="mt-4 bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('wl.reps')}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setWarmupReps(prev => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center active:scale-90 transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xl font-bold w-10 text-center">{warmupReps}</span>
                  <button
                    onClick={() => setWarmupReps(prev => prev + 1)}
                    className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center active:scale-90 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{isHe ? 'מומלץ' : 'Suggested'}: {currentExercise.reps}</p>
            </div>
          )}

          {/* Rest duration config - per exercise */}
          {!isWarmup && (
            <div className="mt-4 flex items-center gap-3 bg-secondary rounded-lg px-3 py-2">
              <Timer className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground shrink-0">{t('timer.restTime')}</span>
              <div className="flex items-center gap-1 mr-auto">
                {[60, 90, 120, 180].map(sec => {
                  const currentRest = restDurations[currentExercise.id] || 90;
                  return (
                    <button
                      key={sec}
                      onClick={() => setRestDurations(prev => ({ ...prev, [currentExercise.id]: sec }))}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                        currentRest === sec ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
                      }`}
                    >
                      {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Last session comparison */}
          {!isWarmup && lastSessionData && (
            <div className="mt-4 bg-secondary/50 border border-border rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <History className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="text-xs font-semibold text-accent truncate">{t('wl.lastSession')}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatLastDate(lastSessionData.sessionDate)}
                </span>
              </div>
              <div className="space-y-1.5">
                {lastSessionData.sets.map((s, i) => (
                  <div key={i} className="flex items-center text-xs text-muted-foreground">
                    <span className="w-10 text-center">{t('wl.set')} {i + 1}</span>
                    <span className="flex-1 text-center">{s.reps} {t('wl.reps')}</span>
                    <span className="flex-1 text-center">
                      {isTimeBased ? `${s.weight > 0 ? s.weight : '—'}s` : (s.weight > 0 ? `${s.weight} ${t('dash.kg')}` : '—')}
                    </span>
                    <span className="w-10" />
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

              {/* Volume progression bar */}
              {volumeStats && (
                <div className="mt-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('wl.volume')} · {t('wl.vsLast')}
                    </span>
                    {volumeStats.deltaPct !== null && (
                      <span className={`text-[10px] font-bold ${
                        volumeStats.deltaPct > 0 ? 'text-primary' : volumeStats.deltaPct < 0 ? 'text-warning' : 'text-muted-foreground'
                      }`}>
                        {volumeStats.deltaPct > 0 ? '+' : ''}{volumeStats.deltaPct}%
                      </span>
                    )}
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    {/* Baseline marker at 100% (1/1.5 = 66.6%) */}
                    <div className="absolute top-0 bottom-0 w-px bg-border" style={{ left: '66.6%' }} />
                    <motion.div
                      className={`h-full rounded-full ${
                        volumeStats.isPR ? 'gradient-primary' : volumeStats.curr >= volumeStats.prev ? 'bg-primary' : 'bg-accent/60'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(volumeStats.pct / 150) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>
                      {volumeStats.curr.toLocaleString()}{volumeStats.timeBased ? 's' : ''}
                    </span>
                    <span>
                      {isHe ? 'קודם' : 'prev'}: {volumeStats.prev.toLocaleString()}{volumeStats.timeBased ? 's' : ''}
                    </span>
                  </div>
                  {volumeStats.isPR && (
                    <div className="mt-1.5 text-[10px] font-bold text-primary text-center">
                      {t('wl.newPR')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sets */}
          {!isWarmup && (
            <div className="mt-4 space-y-2">
              {/* BW toggle for bodyweight exercises */}
              {!isTimeBased && (
                <div className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-accent/20 text-accent px-2 py-0.5 rounded">BW</span>
                    <span className="text-xs text-muted-foreground">{t('wl.bodyweight')} ({profile.weight} {t('dash.kg')})</span>
                  </div>
                  <button
                    onClick={() => {
                      const newBW = !isBW;
                      setIsBW(newBW);
                      if (newBW) {
                        setSets(prev => prev.map(s => ({ ...s, weight: profile.weight })));
                      } else {
                        setSets(prev => prev.map(s => ({ ...s, weight: 0 })));
                      }
                    }}
                    className={`w-10 h-5 rounded-full transition-all relative ${isBW ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-primary-foreground transition-all ${isBW ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              )}
              {/* Column headers */}
              <div className="flex items-center px-1.5 mb-1">
                <span className="w-7 text-[10px] text-muted-foreground text-center shrink-0">{t('wl.set')}</span>
                <span className="flex-1 min-w-0 text-[10px] text-muted-foreground text-center">{t('wl.reps')}</span>
                <span className="flex-1 min-w-0 text-[10px] text-muted-foreground text-center">
                  {isTimeBased ? (isHe ? 'שניות' : 'Seconds') : t('wl.weight')}
                </span>
                <span className="w-8 text-[10px] text-muted-foreground text-center shrink-0">✓</span>
              </div>
              {sets.map((set, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-1.5 py-2 overflow-hidden">
                  <span className="w-7 text-xs text-muted-foreground text-center shrink-0">{i + 1}</span>
                  {/* Reps with +/- buttons */}
                  <div className="flex-1 min-w-0 flex items-center gap-0.5 justify-center">
                    <button
                      onClick={() => updateSetReps(i, Math.max(0, set.reps - 1))}
                      className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-all shrink-0"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={set.reps || ''}
                      onChange={(e) => updateSetReps(i, Number(e.target.value))}
                      className="w-10 min-w-0 bg-secondary rounded px-0.5 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0"
                    />
                    <button
                      onClick={() => updateSetReps(i, set.reps + 1)}
                      className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-all shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Weight / Time / BW */}
                  <div className="flex-1 min-w-0 flex justify-center px-1">
                    {isTimeBased ? (
                      <input
                        type="number"
                        value={set.weight || ''}
                        onChange={(e) => updateSetWeight(i, Number(e.target.value))}
                        className="w-full min-w-0 bg-secondary rounded px-1 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="sec"
                      />
                    ) : (
                      <input
                        type="number"
                        value={set.weight || ''}
                        onChange={(e) => updateSetWeight(i, Number(e.target.value))}
                        className="w-full min-w-0 bg-secondary rounded px-1 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder={isBW ? String(profile.weight) : '0'}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => toggleSet(i)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                      set.completed ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex justify-center gap-3 mt-2">
                <button
                  onClick={() => setSets(prev => prev.length > 1 ? prev.slice(0, -1) : prev)}
                  disabled={sets.length <= 1}
                  className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center text-lg font-bold disabled:opacity-30 active:scale-90 transition-all"
                >
                  −
                </button>
                <span className="text-xs text-muted-foreground self-center">{sets.length} {t('wl.setsLabel')}</span>
                <button
                  onClick={() => {
                    const lastSet = sets[sets.length - 1];
                    setSets(prev => [...prev, { reps: lastSet?.reps || 0, weight: lastSet?.weight || 0, completed: false }]);
                  }}
                  className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center text-lg font-bold active:scale-90 transition-all"
                >
                  +
                </button>
              </div>
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

          {/* Effort Improvement Badge */}
          {effortImproved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-xl px-3 py-2"
            >
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-primary">{t('wl.effortImproved')}</span>
            </motion.div>
          )}

          <div className="mt-4">
            {lastSessionData?.notes && (
              <div className="mb-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <History className="w-3 h-3 text-accent" />
                  <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">
                    {t('wl.lastSession')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground italic">"{lastSessionData.notes}"</p>
              </div>
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('wl.notes')}
              className="w-full bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none h-16"
            />
          </div>

          {/* Next exercise preview */}
          {nextExercise && (
            <div className="mt-3 flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2">
              <ChevronRight className={`w-4 h-4 text-muted-foreground ${lang === 'he' ? 'rotate-180' : ''}`} />
              <span className="text-xs text-muted-foreground">{t('wl.nextUp')}</span>
              <span className="text-xs font-medium text-foreground">
                {lang === 'he' ? (nextExercise.nameHe || nextExercise.name) : nextExercise.name}
              </span>
            </div>
          )}
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
