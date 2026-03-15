import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Dumbbell, Activity, Flame, Trophy, Target } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { WorkoutSession } from '../../data/types';

interface ExerciseData {
  id: string;
  name: string;
  sessions: number;
  currentWeight: number;
  firstWeight: number;
  weightChange: number;
  currentVolume: number;
  firstVolume: number;
  volumeChange: number;
  maxWeightEver: number;
  trend: 'improving' | 'stable' | 'declining';
  data: { date: string; volume: number; maxWeight: number }[];
}

interface OverallSummaryProps {
  exerciseAnalyses: ExerciseData[];
  workoutHistory: WorkoutSession[];
  t: (key: string) => string;
  locale: string;
}

const OverallSummary = ({ exerciseAnalyses, workoutHistory, t, locale }: OverallSummaryProps) => {
  const stats = useMemo(() => {
    const totalSessions = workoutHistory.length;
    const totalExercises = exerciseAnalyses.length;
    const improving = exerciseAnalyses.filter(e => e.trend === 'improving').length;
    const stable = exerciseAnalyses.filter(e => e.trend === 'stable').length;
    const declining = exerciseAnalyses.filter(e => e.trend === 'declining').length;

    // Aggregate volume over time (per workout session)
    const volumeBySession = workoutHistory
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(w => {
        let vol = 0;
        w.exercises.forEach(ex => {
          if (!ex.skipped) ex.sets.forEach(s => { vol += s.reps * (s.weight || 1); });
        });
        return {
          date: new Date(w.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
          volume: vol,
        };
      });

    const firstHalfVol = volumeBySession.slice(0, Math.ceil(volumeBySession.length / 2));
    const secondHalfVol = volumeBySession.slice(Math.ceil(volumeBySession.length / 2));
    const avgFirst = firstHalfVol.length > 0 ? firstHalfVol.reduce((s, d) => s + d.volume, 0) / firstHalfVol.length : 0;
    const avgSecond = secondHalfVol.length > 0 ? secondHalfVol.reduce((s, d) => s + d.volume, 0) / secondHalfVol.length : 0;
    const overallVolumeChange = avgFirst > 0 ? Math.round(((avgSecond - avgFirst) / avgFirst) * 100 * 10) / 10 : 0;

    // PRs count
    const prs = exerciseAnalyses.filter(e => e.maxWeightEver > 0 && e.currentWeight >= e.maxWeightEver).length;

    // Avg weight change across exercises that use weight
    const weightExercises = exerciseAnalyses.filter(e => e.currentWeight > 0);
    const avgWeightChange = weightExercises.length > 0
      ? Math.round(weightExercises.reduce((s, e) => s + e.weightChange, 0) / weightExercises.length * 10) / 10
      : 0;

    return { totalSessions, totalExercises, improving, stable, declining, volumeBySession, overallVolumeChange, prs, avgWeightChange };
  }, [exerciseAnalyses, workoutHistory, locale]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 space-y-3">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-[11px] text-muted-foreground">{t('prog.sessions')}</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalSessions}</p>
          <p className="text-[10px] text-muted-foreground">{stats.totalExercises} {t('dash.exercises')}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-[11px] text-muted-foreground">{t('prog.volume')} Δ</span>
          </div>
          <p className="text-2xl font-bold">
            <span className={stats.overallVolumeChange > 0 ? 'text-green-400' : stats.overallVolumeChange < 0 ? 'text-red-400' : ''}>
              {stats.overallVolumeChange > 0 ? '+' : ''}{stats.overallVolumeChange}%
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground">{t('prog.avgPerSession')}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Dumbbell className="w-4 h-4 text-primary" />
            <span className="text-[11px] text-muted-foreground">{t('prog.weightUsed')} Δ</span>
          </div>
          <p className="text-2xl font-bold">
            <span className={stats.avgWeightChange > 0 ? 'text-green-400' : stats.avgWeightChange < 0 ? 'text-red-400' : ''}>
              {stats.avgWeightChange > 0 ? '+' : ''}{stats.avgWeightChange}%
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground">{t('prog.change')}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-[11px] text-muted-foreground">{t('prog.pr')}</span>
          </div>
          <p className="text-2xl font-bold">{stats.prs}</p>
          <p className="text-[10px] text-muted-foreground">{t('prog.exerciseStats')}</p>
        </div>
      </div>

      {/* Trend Distribution */}
      <div className="bg-card border border-border rounded-xl p-3.5">
        <p className="text-[11px] text-muted-foreground mb-2.5 font-semibold">{t('prog.trend')}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 flex-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full" style={{ width: `${stats.totalExercises > 0 ? (stats.improving / stats.totalExercises) * 100 : 0}%` }} />
            </div>
            <span className="text-xs font-bold text-green-400">{stats.improving}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-1">
            <Minus className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-muted-foreground rounded-full" style={{ width: `${stats.totalExercises > 0 ? (stats.stable / stats.totalExercises) * 100 : 0}%` }} />
            </div>
            <span className="text-xs font-bold text-muted-foreground">{stats.stable}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-red-400 rounded-full" style={{ width: `${stats.totalExercises > 0 ? (stats.declining / stats.totalExercises) * 100 : 0}%` }} />
            </div>
            <span className="text-xs font-bold text-red-400">{stats.declining}</span>
          </div>
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
          <span>{t('prog.improving')}</span>
          <span>{t('prog.stable')}</span>
          <span>{t('prog.declining')}</span>
        </div>
      </div>

      {/* Overall Volume Trend Chart */}
      {stats.volumeBySession.length >= 2 && (
        <div className="bg-card border border-border rounded-xl p-3.5">
          <p className="text-[11px] text-muted-foreground mb-2 font-semibold">{t('prog.totalVolume')} — {t('prog.trend')}</p>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={stats.volumeBySession}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(270, 60%, 55%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(270, 60%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 11%)', border: '1px solid hsl(220, 15%, 20%)', borderRadius: '8px', color: 'hsl(210, 20%, 95%)', fontSize: '12px' }} />
              <Area type="monotone" dataKey="volume" stroke="hsl(270, 60%, 55%)" strokeWidth={2} fill="url(#volGrad)" dot={{ r: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};

export default OverallSummary;
