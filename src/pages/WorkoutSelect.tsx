import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routines } from '../data/routines';
import { useI18n } from '../i18n/I18nProvider';
import SensitivityWarning from '../components/SensitivityWarning';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WorkoutSelect = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-2">{t('ws.title')}</h1>
      <p className="text-muted-foreground text-sm mb-5">{t('ws.subtitle')}</p>

      <SensitivityWarning compact />

      <div className="space-y-3 mt-5">
        {routines.map((routine, i) => (
          <motion.button
            key={routine.id}
            initial={{ opacity: 0, x: lang === 'he' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/workout/${routine.id}`)}
            className="w-full bg-card border border-border rounded-xl p-5 flex items-center justify-between text-right hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{routine.icon}</span>
              <div>
                <h3 className="font-semibold">{lang === 'he' ? routine.nameHe : routine.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{routine.exercises.length} {t('ws.exercisesAndWarmup')}</p>
              </div>
            </div>
            {lang === 'he' ? <ChevronLeft className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default WorkoutSelect;
