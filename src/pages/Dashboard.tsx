import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, TrendingUp, Flame, Scale } from 'lucide-react';
import { useApp } from '../context/AppContext';
import SensitivityWarning from '../components/SensitivityWarning';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, workoutHistory } = useApp();

  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

  // Calculate streak
  const getStreak = () => {
    let streak = 0;
    const now = new Date();
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
  const totalWorkouts = workoutHistory.length;
  const thisWeek = workoutHistory.filter(w => {
    const d = new Date(w.date);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;

  const weightData = profile.weightHistory.slice(-10).map(e => ({ weight: e.weight }));

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="text-muted-foreground text-sm">{today}</p>
        <h1 className="text-2xl font-bold mt-1">שלום! 💪</h1>
      </motion.div>

      {/* Sensitivity Warning */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-5"
      >
        <SensitivityWarning compact />
      </motion.div>

      {/* Start Workout Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/workout')}
        className="w-full gradient-primary rounded-2xl p-5 flex items-center justify-between mb-6 glow-primary animate-pulse-glow"
      >
        <div className="text-right">
          <h2 className="text-lg font-bold text-primary-foreground">התחל אימון</h2>
          <p className="text-sm text-primary-foreground/80">בחר תוכנית והתחל לתעד</p>
        </div>
        <div className="bg-primary-foreground/20 rounded-xl p-3">
          <Play className="w-6 h-6 text-primary-foreground" />
        </div>
      </motion.button>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        <div className="bg-card rounded-xl p-4 text-center border border-border">
          <Flame className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{streak}</p>
          <p className="text-[10px] text-muted-foreground">רצף ימים</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center border border-border">
          <TrendingUp className="w-5 h-5 text-accent mx-auto mb-2" />
          <p className="text-2xl font-bold">{thisWeek}</p>
          <p className="text-[10px] text-muted-foreground">השבוע</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center border border-border">
          <Scale className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{profile.weight}</p>
          <p className="text-[10px] text-muted-foreground">ק"ג</p>
        </div>
      </motion.div>

      {/* Weight Mini Chart */}
      {weightData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl p-4 border border-border mb-6"
        >
          <h3 className="text-sm font-semibold mb-3">מגמת משקל</h3>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={weightData}>
              <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="hsl(160, 84%, 39%)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Recent Workouts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h3 className="text-sm font-semibold mb-3">אימונים אחרונים</h3>
        {workoutHistory.length === 0 ? (
          <div className="bg-card rounded-xl p-6 border border-border text-center">
            <p className="text-muted-foreground text-sm">עדיין אין אימונים — התחל את הראשון! 🚀</p>
          </div>
        ) : (
          <div className="space-y-2">
            {workoutHistory.slice(0, 5).map((w, i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{w.routineName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(w.date).toLocaleDateString('he-IL')} · {w.duration} דקות
                  </p>
                </div>
                <div className="text-xs text-primary font-semibold">
                  {w.exercises.filter(e => !e.skipped).length} תרגילים
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
