import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { routines } from '../data/routines';
import { useI18n } from '../i18n/I18nProvider';
import { useApp } from '../context/AppContext';
import SensitivityWarning from '../components/SensitivityWarning';
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Star, ArrowUp, ArrowDown, Settings2, RotateCcw, Pencil } from 'lucide-react';

const WorkoutSelect = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { workoutHistory } = useApp();
  const [editMode, setEditMode] = useState(false);

  // Load custom order from localStorage, fallback to default routine IDs
  const [routineOrder, setRoutineOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('fitlog-routine-order');
    if (saved) {
      const parsed = JSON.parse(saved) as string[];
      // Validate all routine IDs still exist
      const validIds = routines.map(r => r.id);
      const filtered = parsed.filter(id => validIds.includes(id));
      // Add any new routines not in saved order
      const missing = validIds.filter(id => !filtered.includes(id));
      return [...filtered, ...missing];
    }
    return routines.map(r => r.id);
  });

  const defaultOrder = routines.map(r => r.id);

  useEffect(() => {
    localStorage.setItem('fitlog-routine-order', JSON.stringify(routineOrder));
  }, [routineOrder]);

  const orderedRoutines = routineOrder
    .map(id => routines.find(r => r.id === id))
    .filter(Boolean) as typeof routines;

  const moveRoutine = (index: number, direction: -1 | 1) => {
    const newOrder = [...routineOrder];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setRoutineOrder(newOrder);
  };

  const resetOrder = () => setRoutineOrder(defaultOrder);
  const isCustomOrder = JSON.stringify(routineOrder) !== JSON.stringify(defaultOrder);

  // Determine next workout based on rotation
  const getNextRoutineId = () => {
    if (workoutHistory.length === 0) return orderedRoutines[0]?.id;
    const lastRoutineId = workoutHistory[0]?.routineId;
    const lastIdx = orderedRoutines.findIndex(r => r.id === lastRoutineId);
    return orderedRoutines[(lastIdx + 1) % orderedRoutines.length]?.id;
  };
  const nextRoutineId = getNextRoutineId();

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground text-sm">
          {lang === 'he' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {t('nav.back')}
        </button>
        <div className="flex items-center gap-2">
          {editMode && isCustomOrder && (
            <button
              onClick={resetOrder}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {lang === 'he' ? 'איפוס' : 'Reset'}
            </button>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all ${
              editMode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            {lang === 'he' ? 'סדר' : 'Order'}
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-2">{t('ws.title')}</h1>
      <p className="text-muted-foreground text-sm mb-5">{t('ws.subtitle')}</p>

      <SensitivityWarning compact />

      <div className="space-y-3 mt-5">
        <AnimatePresence mode="popLayout">
          {orderedRoutines.map((routine, i) => {
            const isNext = routine.id === nextRoutineId;
            return (
              <motion.div
                key={routine.id}
                layout
                initial={{ opacity: 0, x: lang === 'he' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05, layout: { type: 'spring', stiffness: 300, damping: 30 } }}
                className="flex items-center gap-2"
              >
                {editMode && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex flex-col gap-1"
                  >
                    <button
                      onClick={() => moveRoutine(i, -1)}
                      disabled={i === 0}
                      className="p-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveRoutine(i, 1)}
                      disabled={i === orderedRoutines.length - 1}
                      className="p-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}

                <motion.button
                  layout="position"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => !editMode && navigate(`/workout/${routine.id}`)}
                  className={`flex-1 bg-card border rounded-xl p-5 flex items-center justify-between text-right transition-colors ${
                    isNext ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/50'
                  } ${editMode ? 'cursor-default' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{routine.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{lang === 'he' ? routine.nameHe : routine.name}</h3>
                        {isNext && !editMode && <Star className="w-4 h-4 text-primary fill-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {routine.exercises.length} {t('ws.exercisesAndWarmup')}
                        {isNext && !editMode && <span className="text-primary font-medium mx-1">· {lang === 'he' ? 'הבא בתור' : 'Up Next'}</span>}
                      </p>
                    </div>
                  </div>
                  {!editMode && (lang === 'he' ? <ChevronLeft className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />)}
                </motion.button>
                {editMode && (
                  <button
                    onClick={() => navigate(`/routine/edit/${routine.id}`)}
                    className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WorkoutSelect;