import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { ChevronDown } from 'lucide-react';

const Progress = () => {
  const { profile, workoutHistory } = useApp();
  const { t, lang } = useI18n();
  const locale = lang === 'he' ? 'he-IL' : 'en-US';

  const weightData = profile.weightHistory.map(e => ({
    date: new Date(e.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
    weight: e.weight,
  }));

  const getWeeklyData = () => {
    const weeks: { label: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const count = workoutHistory.filter(w => {
        const d = new Date(w.date);
        return d >= weekStart && d < weekEnd;
      }).length;
      weeks.push({ label: `${t('prog.week')} ${8 - i}`, count });
    }
    return weeks;
  };

  const getHeatmapData = () => {
    const days: { date: string; trained: boolean; dayLabel: string }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        trained: workoutHistory.some(w => w.date.startsWith(dateStr)),
        dayLabel: d.toLocaleDateString(locale, { day: 'numeric' }),
      });
    }
    return days;
  };

  const weeklyData = getWeeklyData();
  const heatmapData = getHeatmapData();

  const getExerciseStats = () => {
    const stats: Record<string, { name: string; totalVolume: number; maxWeight: number; sessions: number }> = {};
    workoutHistory.forEach(w => {
      w.exercises.forEach(ex => {
        if (ex.skipped) return;
        if (!stats[ex.exerciseId]) {
          stats[ex.exerciseId] = { name: ex.exerciseName, totalVolume: 0, maxWeight: 0, sessions: 0 };
        }
        stats[ex.exerciseId].sessions++;
        ex.sets.forEach(s => {
          stats[ex.exerciseId].totalVolume += s.reps * (s.weight || 1);
          if (s.weight > stats[ex.exerciseId].maxWeight) {
            stats[ex.exerciseId].maxWeight = s.weight;
          }
        });
      });
    });
    return Object.values(stats).sort((a, b) => b.sessions - a.sessions).slice(0, 5);
  };

  const exerciseStats = getExerciseStats();

  // Per-exercise progress data
  const getAllExerciseIds = () => {
    const map = new Map<string, string>();
    workoutHistory.forEach(w => {
      w.exercises.forEach(ex => {
        if (!ex.skipped && ex.sets.length > 0) {
          map.set(ex.exerciseId, ex.exerciseName);
        }
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  };

  const availableExercises = getAllExerciseIds();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(availableExercises[0]?.id || '');

  const getExerciseProgressData = (exerciseId: string) => {
    const data: { date: string; maxWeight: number; maxReps: number; volume: number }[] = [];
    // Sort workouts chronologically
    const sorted = [...workoutHistory].reverse();
    sorted.forEach(w => {
      w.exercises.forEach(ex => {
        if (ex.exerciseId === exerciseId && !ex.skipped) {
          let maxW = 0, maxR = 0, vol = 0;
          ex.sets.forEach(s => {
            if (s.weight > maxW) maxW = s.weight;
            if (s.reps > maxR) maxR = s.reps;
            vol += s.reps * (s.weight || 1);
          });
          data.push({
            date: new Date(w.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
            maxWeight: maxW,
            maxReps: maxR,
            volume: vol,
          });
        }
      });
    });
    return data;
  };

  const exerciseProgressData = selectedExerciseId ? getExerciseProgressData(selectedExerciseId) : [];

  const customTooltipStyle = {
    backgroundColor: 'hsl(220, 18%, 11%)',
    border: '1px solid hsl(220, 15%, 20%)',
    borderRadius: '8px',
    color: 'hsl(210, 20%, 95%)',
    fontSize: '12px',
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-5">{t('prog.title')}</h1>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4 mb-5">
        <h3 className="text-sm font-semibold mb-4">{t('prog.bodyWeight')}</h3>
        {weightData.length > 1 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215, 15%, 55%)' }} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: 'hsl(215, 15%, 55%)' }} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Line type="monotone" dataKey="weight" stroke="hsl(160, 84%, 39%)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(160, 84%, 39%)' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">{t('prog.addWeightForChart')}</p>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-xl p-4 mb-5">
        <h3 className="text-sm font-semibold mb-4">{t('prog.calendar')}</h3>
        <div className="grid grid-cols-10 gap-1">
          {heatmapData.map((day, i) => (
            <div
              key={i}
              className={`aspect-square rounded-sm flex items-center justify-center text-[9px] ${
                day.trained ? 'bg-primary text-primary-foreground font-bold' : 'bg-secondary text-muted-foreground'
              }`}
              title={day.date}
            >
              {day.dayLabel}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-xl p-4 mb-5">
        <h3 className="text-sm font-semibold mb-4">{t('prog.weeklyFreq')}</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(215, 15%, 55%)' }} />
            <Tooltip contentStyle={customTooltipStyle} />
            <Bar dataKey="count" fill="hsl(195, 80%, 50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {exerciseStats.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">{t('prog.exerciseStats')}</h3>
          <div className="space-y-3">
            {exerciseStats.map((stat, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{stat.name}</p>
                  <p className="text-xs text-muted-foreground">{stat.sessions} {t('prog.workouts')}</p>
                </div>
                <div className="text-left">
                  {stat.maxWeight > 0 && (
                    <p className="text-xs text-primary font-semibold">{t('prog.max')}: {stat.maxWeight} {t('dash.kg')}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{t('prog.volume')}: {stat.totalVolume}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Per-exercise progress graphs */}
      {availableExercises.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-xl p-4 mb-5">
          <h3 className="text-sm font-semibold mb-3">{t('prog.exerciseProgress')}</h3>
          
          {/* Exercise selector */}
          <div className="relative mb-4">
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary pr-8"
            >
              {availableExercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute top-3 end-3 text-muted-foreground pointer-events-none" />
          </div>

          {exerciseProgressData.length > 1 ? (
            <div className="space-y-4">
              {/* Weight progress */}
              {exerciseProgressData.some(d => d.maxWeight > 0) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{t('prog.weightUsed')}</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={exerciseProgressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                      <YAxis tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Line type="monotone" dataKey="maxWeight" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Reps progress */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t('prog.maxReps')}</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={exerciseProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Line type="monotone" dataKey="maxReps" stroke="hsl(195, 80%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Volume progress */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t('prog.totalVolume')}</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={exerciseProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Bar dataKey="volume" fill="hsl(270, 60%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">{t('prog.noData')}</p>
          )}
        </motion.div>
      )}

      {workoutHistory.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <p className="text-muted-foreground">{t('prog.doWorkouts')}</p>
        </motion.div>
      )}
    </div>
  );
};

export default Progress;
