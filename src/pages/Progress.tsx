import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const Progress = () => {
  const { profile, workoutHistory } = useApp();

  // Weight chart data
  const weightData = profile.weightHistory.map(e => ({
    date: new Date(e.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }),
    weight: e.weight,
  }));

  // Workout frequency by week (last 8 weeks)
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
      weeks.push({
        label: `שבוע ${8 - i}`,
        count,
      });
    }
    return weeks;
  };

  // Training calendar heatmap (last 30 days)
  const getHeatmapData = () => {
    const days: { date: string; trained: boolean; dayLabel: string }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        trained: workoutHistory.some(w => w.date.startsWith(dateStr)),
        dayLabel: d.toLocaleDateString('he-IL', { day: 'numeric' }),
      });
    }
    return days;
  };

  const weeklyData = getWeeklyData();
  const heatmapData = getHeatmapData();

  // Exercise volume (total sets * reps for main exercises)
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
      <h1 className="text-2xl font-bold mb-5">התקדמות</h1>

      {/* Weight Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-4 mb-5"
      >
        <h3 className="text-sm font-semibold mb-4">משקל גוף</h3>
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
          <p className="text-sm text-muted-foreground text-center py-8">הוסף מדידות משקל כדי לראות גרף</p>
        )}
      </motion.div>

      {/* Training Calendar Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-xl p-4 mb-5"
      >
        <h3 className="text-sm font-semibold mb-4">לוח אימונים (30 ימים אחרונים)</h3>
        <div className="grid grid-cols-10 gap-1">
          {heatmapData.map((day, i) => (
            <div
              key={i}
              className={`aspect-square rounded-sm flex items-center justify-center text-[9px] ${
                day.trained
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'bg-secondary text-muted-foreground'
              }`}
              title={day.date}
            >
              {day.dayLabel}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Weekly Frequency */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl p-4 mb-5"
      >
        <h3 className="text-sm font-semibold mb-4">תדירות אימונים שבועית</h3>
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

      {/* Exercise Stats */}
      {exerciseStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <h3 className="text-sm font-semibold mb-3">סטטיסטיקת תרגילים</h3>
          <div className="space-y-3">
            {exerciseStats.map((stat, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{stat.name}</p>
                  <p className="text-xs text-muted-foreground">{stat.sessions} אימונים</p>
                </div>
                <div className="text-left">
                  {stat.maxWeight > 0 && (
                    <p className="text-xs text-primary font-semibold">מקס: {stat.maxWeight} ק"ג</p>
                  )}
                  <p className="text-xs text-muted-foreground">נפח: {stat.totalVolume}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {workoutHistory.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-muted-foreground">בצע אימונים כדי לראות התקדמות 📊</p>
        </motion.div>
      )}
    </div>
  );
};

export default Progress;
