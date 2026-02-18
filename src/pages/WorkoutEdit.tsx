import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { WorkoutSession } from '../data/types';
import { ChevronLeft, AlertTriangle, Check, Save } from 'lucide-react';
import { toast } from 'sonner';

const WorkoutEdit = () => {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const { workoutHistory, updateWorkout } = useApp();
  const { t, lang } = useI18n();

  const original = workoutHistory.find(w => w.id === workoutId);
  const [workout, setWorkout] = useState<WorkoutSession | null>(original ? { ...original, exercises: original.exercises.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s })) })) } : null);

  if (!workout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t('wl.notFound')}</p>
      </div>
    );
  }

  const updateExerciseField = (exIdx: number, field: 'notes' | 'painLevel' | 'rpe', value: any) => {
    setWorkout(prev => {
      if (!prev) return prev;
      const exercises = [...prev.exercises];
      exercises[exIdx] = { ...exercises[exIdx], [field]: value };
      return { ...prev, exercises };
    });
  };

  const updateSet = (exIdx: number, setIdx: number, field: 'reps' | 'weight', value: number) => {
    setWorkout(prev => {
      if (!prev) return prev;
      const exercises = [...prev.exercises];
      const sets = [...exercises[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      exercises[exIdx] = { ...exercises[exIdx], sets };
      return { ...prev, exercises };
    });
  };

  const handleSave = () => {
    updateWorkout(workout);
    toast(t('we.saved'));
    navigate(-1);
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ChevronLeft className={`w-6 h-6 ${lang === 'he' ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{workout.routineName}</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(workout.date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')} · {workout.duration} {t('dash.minutes')}
          </p>
        </div>
      </div>

      {/* Session notes */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-1 block">{t('we.sessionNotes')}</label>
        <textarea
          value={workout.notes}
          onChange={(e) => setWorkout(prev => prev ? { ...prev, notes: e.target.value } : prev)}
          className="w-full bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none h-16"
          placeholder={t('wl.notes')}
        />
      </div>

      <div className="space-y-4">
        {workout.exercises.map((ex, exIdx) => (
          <motion.div
            key={exIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: exIdx * 0.03 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">{ex.exerciseName}</h3>
              {ex.skipped && (
                <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded">{t('we.skipped')}</span>
              )}
            </div>

            {!ex.skipped && (
              <>
                {/* Sets */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex text-[10px] text-muted-foreground px-1">
                    <span className="w-8">{t('wl.set')}</span>
                    <span className="flex-1 text-center">{t('wl.reps')}</span>
                    <span className="flex-1 text-center">{t('wl.weight')}</span>
                    <span className="w-8 text-center">✓</span>
                  </div>
                  {ex.sets.map((set, setIdx) => (
                    <div key={setIdx} className="flex items-center gap-2 px-1">
                      <span className="w-6 text-xs text-muted-foreground text-center">{setIdx + 1}</span>
                      <input
                        type="number"
                        value={set.reps || ''}
                        onChange={(e) => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                        className="flex-1 bg-secondary rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="number"
                        value={set.weight || ''}
                        onChange={(e) => updateSet(exIdx, setIdx, 'weight', Number(e.target.value))}
                        className="flex-1 bg-secondary rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="w-6 flex justify-center">
                        {set.completed && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pain */}
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-warning" />
                    {t('wl.painLevel')}
                  </label>
                  <span className={`text-xs font-bold ${ex.painLevel > 5 ? 'text-pain' : ex.painLevel > 2 ? 'text-warning' : 'text-primary'}`}>
                    {ex.painLevel}/10
                  </span>
                </div>
                <input type="range" min="0" max="10" value={ex.painLevel} onChange={(e) => updateExerciseField(exIdx, 'painLevel', Number(e.target.value))} className="w-full accent-primary mb-2" />

                {/* RPE */}
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs">{t('wl.rpe')}</label>
                  <span className="text-xs font-bold text-accent">{ex.rpe}/10</span>
                </div>
                <input type="range" min="1" max="10" value={ex.rpe} onChange={(e) => updateExerciseField(exIdx, 'rpe', Number(e.target.value))} className="w-full accent-accent mb-2" />

                {/* Notes */}
                <textarea
                  value={ex.notes}
                  onChange={(e) => updateExerciseField(exIdx, 'notes', e.target.value)}
                  placeholder={t('wl.notes')}
                  className="w-full bg-secondary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none h-12"
                />
              </>
            )}
          </motion.div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl mt-6 flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" /> {t('we.saveChanges')}
      </button>
    </div>
  );
};

export default WorkoutEdit;
