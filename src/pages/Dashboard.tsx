import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import CircularGauge from '../components/report/CircularGauge';

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, workoutHistory } = useApp();
  const { t, lang } = useI18n();
  const isHe = lang === 'he';

  const today = new Date().toLocaleDateString(isHe ? 'he-IL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  // Compute scores from last 30 days
  const now = new Date();
  const last30 = workoutHistory.filter(w => {
    const diff = (now.getTime() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  });
  const prev30 = workoutHistory.filter(w => {
    const diff = (now.getTime() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24);
    return diff > 30 && diff <= 60;
  });

  const calcStats = (workouts: typeof workoutHistory) => {
    let totalSets = 0, totalReps = 0, totalVolume = 0, totalDuration = 0;
    let maxWeight = 0, totalPain = 0, painCount = 0;
    const days = new Set<string>();
    workouts.forEach(w => {
      days.add(w.date.split('T')[0]);
      totalDuration += w.duration;
      w.exercises.filter(e => !e.skipped).forEach(ex => {
        totalSets += ex.sets.length;
        if (ex.painLevel > 0) { totalPain += ex.painLevel; painCount++; }
        ex.sets.filter(s => s.completed).forEach(s => {
          totalReps += s.reps;
          totalVolume += s.reps * s.weight;
          if (s.weight > maxWeight) maxWeight = s.weight;
        });
      });
    });
    return { totalSets, totalReps, totalVolume, totalDuration, maxWeight, uniqueDays: days.size, avgPain: painCount > 0 ? totalPain / painCount : 0 };
  };

  const cur = calcStats(last30);
  const prev = calcStats(prev30);

  const strengthScore = (() => {
    const volChange = prev.totalVolume > 0 ? ((cur.totalVolume - prev.totalVolume) / prev.totalVolume) * 100 : (cur.totalVolume > 0 ? 100 : 0);
    const volumeS = Math.min(40, Math.max(0, 20 + volChange * 0.4));
    const weightS = cur.maxWeight > 0 ? Math.min(30, (cur.maxWeight / 100) * 30) : 10;
    const consistS = Math.min(100, (cur.uniqueDays / 20) * 100) * 0.3;
    return Math.min(100, Math.round(volumeS + weightS + consistS));
  })();

  const toningScore = (() => {
    const repS = Math.min(35, (cur.totalReps / 500) * 35);
    const setS = Math.min(30, (cur.totalSets / 100) * 30);
    const freqS = Math.min(35, (cur.uniqueDays / 16) * 35);
    return Math.min(100, Math.round(repS + setS + freqS));
  })();

  const flexibilityScore = (() => {
    const consistS = Math.min(100, (cur.uniqueDays / 20) * 100) * 0.5;
    const painBonus = cur.avgPain > 0 ? Math.max(0, 30 - cur.avgPain * 6) : 30;
    const durS = Math.min(20, (cur.totalDuration / 300) * 20);
    return Math.min(100, Math.round(consistS + painBonus + durS));
  })();

  const overallScore = Math.round((strengthScore + toningScore + flexibilityScore) / 3);

  const getStreak = () => {
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (workoutHistory.some(w => w.date.startsWith(dateStr))) {
        streak++;
      } else if (i > 0) break;
    }
    return streak;
  };

  const streak = getStreak();

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <p className="text-muted-foreground text-xs">{today}</p>
        <h1 className="text-xl font-bold mt-0.5">{t('dash.hello')}</h1>
      </motion.div>

      {/* Start Workout CTA */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/workout')}
        className="w-full gradient-primary rounded-2xl p-4 flex items-center justify-between mb-6 glow-primary"
      >
        <div className="text-right">
          <h2 className="text-base font-bold text-primary-foreground">{t('dash.startWorkout')}</h2>
          <p className="text-xs text-primary-foreground/70">{t('dash.startWorkoutSub')}</p>
        </div>
        <div className="bg-primary-foreground/20 rounded-xl p-2.5">
          <Play className="w-5 h-5 text-primary-foreground" />
        </div>
      </motion.button>

      {/* Goal Progress - Main Focus */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-5 mb-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">{isHe ? 'התקדמות יעדים' : 'Goal Progress'}</h3>
          <span className="text-[10px] text-muted-foreground">{isHe ? '30 ימים אחרונים' : 'Last 30 days'}</span>
        </div>

        <div className="flex items-center justify-around mb-4">
          <CircularGauge value={strengthScore} label={isHe ? 'כוח' : 'Strength'} size={85} strokeWidth={7} />
          <CircularGauge value={toningScore} label={isHe ? 'חיטוב' : 'Toning'} size={85} strokeWidth={7} />
          <CircularGauge value={flexibilityScore} label={isHe ? 'גמישות' : 'Flexibility'} size={85} strokeWidth={7} />
        </div>

        {/* Overall bar */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-muted-foreground">{isHe ? 'ציון כולל' : 'Overall'}</span>
            <span className="font-bold text-primary">{overallScore}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full gradient-primary"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(overallScore, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Quick stats row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-2.5 mb-5">
        <div className="bg-card rounded-xl p-3 text-center border border-border">
          <p className="text-xl font-bold">{streak}</p>
          <p className="text-[10px] text-muted-foreground">{t('dash.streak')}</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border">
          <p className="text-xl font-bold">{last30.length}</p>
          <p className="text-[10px] text-muted-foreground">{isHe ? 'אימונים (30י)' : 'Workouts (30d)'}</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border">
          <p className="text-xl font-bold">{profile.weight}</p>
          <p className="text-[10px] text-muted-foreground">{t('dash.kg')}</p>
        </div>
      </motion.div>

      {/* View full report link */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        onClick={() => navigate('/report')}
        className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 mb-5"
      >
        <span className="text-xs font-medium">{isHe ? 'צפה בדוח מלא' : 'View Full Report'}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </motion.button>

      {/* Last workout */}
      {workoutHistory.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">{isHe ? 'אימון אחרון' : 'Last Workout'}</h3>
          <button
            onClick={() => navigate(`/workout/edit/${workoutHistory[0].id}`)}
            className="w-full bg-card rounded-xl p-3.5 border border-border flex items-center justify-between text-start"
          >
            <div>
              <p className="font-medium text-sm">{workoutHistory[0].routineName}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(workoutHistory[0].date).toLocaleDateString(isHe ? 'he-IL' : 'en-US')} · {workoutHistory[0].duration} {t('dash.minutes')}
              </p>
            </div>
            <span className="text-[11px] text-primary font-semibold">
              {workoutHistory[0].exercises.filter(e => !e.skipped).length} {t('dash.exercises')}
            </span>
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
