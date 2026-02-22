import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routines } from '../data/routines';
import { useI18n } from '../i18n/I18nProvider';
import { useApp } from '../context/AppContext';
import SensitivityWarning from '../components/SensitivityWarning';
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Star } from 'lucide-react';

const WorkoutSelect = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { workoutHistory } = useApp();

  // Determine next workout based on rotation
  const getNextRoutineId = () => {
    if (workoutHistory.length === 0) return routines[0]?.id;
    const lastRoutineId = workoutHistory[0]?.routineId;
    const lastIdx = routines.findIndex(r => r.id === lastRoutineId);
    return routines[(lastIdx + 1) % routines.length]?.id;
  };
  const nextRoutineId = getNextRoutineId();

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground text-sm mb-4">
        {lang === 'he' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {t('nav.back')}
      </button>
      <h1 className="text-2xl font-bold mb-2">{t('ws.title')}</h1>
      <p className="text-muted-foreground text-sm mb-5">{t('ws.subtitle')}</p>

      <SensitivityWarning compact />

      <div className="space-y-3 mt-5">
        {routines.map((routine, i) => {
          const isNext = routine.id === nextRoutineId;
          return (
            <motion.button
              key={routine.id}
              initial={{ opacity: 0, x: lang === 'he' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/workout/${routine.id}`)}
              className={`w-full bg-card border rounded-xl p-5 flex items-center justify-between text-right transition-colors ${isNext ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/50'}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{routine.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{lang === 'he' ? routine.nameHe : routine.name}</h3>
                    {isNext && <Star className="w-4 h-4 text-primary fill-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {routine.exercises.length} {t('ws.exercisesAndWarmup')}
                    {isNext && <span className="text-primary font-medium mx-1">· {lang === 'he' ? 'הבא בתור' : 'Up Next'}</span>}
                  </p>
                </div>
              </div>
              {lang === 'he' ? <ChevronLeft className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default WorkoutSelect;
