import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { ChevronLeft, ChevronRight, TrendingUp, Dumbbell, Calendar, Clock, Flame, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MonthlyReport = () => {
  const { workoutHistory, profile } = useApp();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const isHe = lang === 'he';
  const locale = isHe ? 'he-IL' : 'en-US';

  const [monthOffset, setMonthOffset] = useState(0);

  const targetMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthOffset);
    return d;
  }, [monthOffset]);

  const monthLabel = targetMonth.toLocaleDateString(locale, { year: 'numeric', month: 'long' });

  const monthWorkouts = useMemo(() => {
    const y = targetMonth.getFullYear();
    const m = targetMonth.getMonth();
    return workoutHistory.filter(w => {
      const d = new Date(w.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [workoutHistory, targetMonth]);

  const stats = useMemo(() => {
    let totalSets = 0, totalReps = 0, totalVolume = 0, totalDuration = 0;
    let exerciseCount = 0, skippedCount = 0;
    const exerciseMap: Record<string, {
      name: string; sessions: number; totalSets: number; totalReps: number;
      totalVolume: number; maxWeight: number; avgPain: number; avgRpe: number;
      painEntries: number; rpeEntries: number;
    }> = {};

    monthWorkouts.forEach(w => {
      totalDuration += w.duration || 0;
      w.exercises.forEach(ex => {
        if (ex.skipped) { skippedCount++; return; }
        exerciseCount++;
        if (!exerciseMap[ex.exerciseId]) {
          exerciseMap[ex.exerciseId] = {
            name: ex.exerciseName, sessions: 0, totalSets: 0, totalReps: 0,
            totalVolume: 0, maxWeight: 0, avgPain: 0, avgRpe: 0,
            painEntries: 0, rpeEntries: 0,
          };
        }
        const entry = exerciseMap[ex.exerciseId];
        entry.sessions++;
        ex.sets.forEach(s => {
          if (s.completed) {
            entry.totalSets++;
            entry.totalReps += s.reps;
            entry.totalVolume += s.reps * (s.weight || 0);
            totalSets++;
            totalReps += s.reps;
            totalVolume += s.reps * (s.weight || 0);
            if (s.weight > entry.maxWeight) entry.maxWeight = s.weight;
          }
        });
        if (ex.painLevel > 0) { entry.avgPain += ex.painLevel; entry.painEntries++; }
        if (ex.rpe > 0) { entry.avgRpe += ex.rpe; entry.rpeEntries++; }
      });
    });

    const exerciseList = Object.values(exerciseMap)
      .map(e => ({
        ...e,
        avgPain: e.painEntries > 0 ? Math.round((e.avgPain / e.painEntries) * 10) / 10 : 0,
        avgRpe: e.rpeEntries > 0 ? Math.round((e.avgRpe / e.rpeEntries) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions);

    // Weight change this month
    const y = targetMonth.getFullYear();
    const m = targetMonth.getMonth();
    const monthWeights = profile.weightHistory.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === y && d.getMonth() === m;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const weightStart = monthWeights.length > 0 ? monthWeights[0].weight : null;
    const weightEnd = monthWeights.length > 0 ? monthWeights[monthWeights.length - 1].weight : null;
    const weightChange = weightStart && weightEnd ? Math.round((weightEnd - weightStart) * 10) / 10 : null;

    // Training days (unique dates)
    const uniqueDays = new Set(monthWorkouts.map(w => w.date.split('T')[0])).size;

    return {
      workoutCount: monthWorkouts.length, totalSets, totalReps, totalVolume,
      totalDuration, exerciseCount, skippedCount, exerciseList,
      weightChange, weightStart, weightEnd, uniqueDays,
    };
  }, [monthWorkouts, profile.weightHistory, targetMonth]);

  const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) => (
    <div className="bg-secondary/50 rounded-xl p-3 flex flex-col items-center gap-1">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-lg font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
      {sub && <span className="text-[9px] text-primary">{sub}</span>}
    </div>
  );

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">{t('report.title')}</h1>
        <button onClick={() => navigate('/progress')} className="text-xs text-primary">
          {t('nav.back')}
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 mb-5">
        <button onClick={() => setMonthOffset(prev => prev + 1)} className="p-1">
          {isHe ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <span className="font-semibold text-sm">{monthLabel}</span>
        <button
          onClick={() => setMonthOffset(prev => Math.max(0, prev - 1))}
          disabled={monthOffset === 0}
          className="p-1 disabled:opacity-30"
        >
          {isHe ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {monthWorkouts.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <p className="text-muted-foreground">{t('report.noData')}</p>
        </motion.div>
      ) : (
        <div className="space-y-5">
          {/* Summary cards */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2">
            <StatCard icon={Dumbbell} label={t('report.workouts')} value={stats.workoutCount} />
            <StatCard icon={Calendar} label={t('report.trainingDays')} value={stats.uniqueDays} />
            <StatCard icon={Clock} label={t('report.totalTime')} value={`${stats.totalDuration}'`} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-2">
            <StatCard icon={Flame} label={t('report.totalSets')} value={stats.totalSets} />
            <StatCard icon={TrendingUp} label={t('report.totalReps')} value={stats.totalReps.toLocaleString()} />
            <StatCard icon={Award} label={t('report.totalVolume')} value={`${(stats.totalVolume / 1000).toFixed(1)}t`} />
          </motion.div>

          {/* Weight change */}
          {stats.weightChange !== null && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-medium">{t('report.weightChange')}</span>
              <span className={`text-sm font-bold ${stats.weightChange < 0 ? 'text-green-400' : stats.weightChange > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                {stats.weightChange > 0 ? '+' : ''}{stats.weightChange} {t('dash.kg')}
                {' '}({stats.weightStart} → {stats.weightEnd})
              </span>
            </motion.div>
          )}

          {/* Per-exercise breakdown */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-4">{t('report.exerciseBreakdown')}</h3>
            <div className="space-y-3">
              {stats.exerciseList.map((ex, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: isHe ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.02 * i }}
                  className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{ex.name}</span>
                    <span className="text-[10px] text-muted-foreground">{ex.sessions}x {t('report.sessions')}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs font-bold text-primary">{ex.totalSets}</p>
                      <p className="text-[9px] text-muted-foreground">{t('report.sets')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary">{ex.totalReps}</p>
                      <p className="text-[9px] text-muted-foreground">{t('report.reps')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary">{ex.maxWeight > 0 ? `${ex.maxWeight}` : '—'}</p>
                      <p className="text-[9px] text-muted-foreground">{t('report.maxKg')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary">{ex.totalVolume > 0 ? ex.totalVolume.toLocaleString() : '—'}</p>
                      <p className="text-[9px] text-muted-foreground">{t('report.vol')}</p>
                    </div>
                  </div>
                  {(ex.avgPain > 0 || ex.avgRpe > 0) && (
                    <div className="flex gap-4 mt-2 pt-2 border-t border-border/50">
                      {ex.avgPain > 0 && (
                        <span className="text-[10px] text-destructive">{t('report.avgPain')}: {ex.avgPain}</span>
                      )}
                      {ex.avgRpe > 0 && (
                        <span className="text-[10px] text-accent-foreground">{t('report.avgRpe')}: {ex.avgRpe}</span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Skipped exercises note */}
          {stats.skippedCount > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {stats.skippedCount} {t('report.skipped')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthlyReport;
