import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

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

      {workoutHistory.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <p className="text-muted-foreground">{t('prog.doWorkouts')}</p>
        </motion.div>
      )}
    </div>
  );
};

export default Progress;
