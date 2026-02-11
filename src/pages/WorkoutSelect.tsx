import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routines } from '../data/routines';
import SensitivityWarning from '../components/SensitivityWarning';
import { ChevronLeft } from 'lucide-react';

const WorkoutSelect = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-2">בחר אימון</h1>
      <p className="text-muted-foreground text-sm mb-5">בחר תוכנית אימון להתחיל</p>

      <SensitivityWarning compact />

      <div className="space-y-3 mt-5">
        {routines.map((routine, i) => (
          <motion.button
            key={routine.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/workout/${routine.id}`)}
            className="w-full bg-card border border-border rounded-xl p-5 flex items-center justify-between text-right hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{routine.icon}</span>
              <div>
                <h3 className="font-semibold">{routine.nameHe}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{routine.exercises.length} תרגילים + חימום</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default WorkoutSelect;
