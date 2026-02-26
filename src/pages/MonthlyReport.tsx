import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Dumbbell, Calendar, Clock, Flame, Award, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface MonthStats {
  workoutCount: number;
  uniqueDays: number;
  totalDuration: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  exerciseCount: number;
  skippedCount: number;
  exerciseList: ExerciseStat[];
  weightChange: number | null;
  weightStart: number | null;
  weightEnd: number | null;
}

interface ExerciseStat {
  name: string;
  sessions: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  maxWeight: number;
  avgPain: number;
  avgRpe: number;
}

function calcMonthStats(workoutHistory: any[], weightHistory: any[], targetMonth: Date): MonthStats {
  const y = targetMonth.getFullYear();
  const m = targetMonth.getMonth();
  const monthWorkouts = workoutHistory.filter((w: any) => {
    const d = new Date(w.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });

  let totalSets = 0, totalReps = 0, totalVolume = 0, totalDuration = 0;
  let exerciseCount = 0, skippedCount = 0;
  const exerciseMap: Record<string, any> = {};

  monthWorkouts.forEach((w: any) => {
    totalDuration += w.duration || 0;
    w.exercises.forEach((ex: any) => {
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
      ex.sets.forEach((s: any) => {
        if (s.completed) {
          entry.totalSets++; entry.totalReps += s.reps;
          entry.totalVolume += s.reps * (s.weight || 0);
          totalSets++; totalReps += s.reps;
          totalVolume += s.reps * (s.weight || 0);
          if (s.weight > entry.maxWeight) entry.maxWeight = s.weight;
        }
      });
      if (ex.painLevel > 0) { entry.avgPain += ex.painLevel; entry.painEntries++; }
      if (ex.rpe > 0) { entry.avgRpe += ex.rpe; entry.rpeEntries++; }
    });
  });

  const exerciseList = Object.values(exerciseMap)
    .map((e: any) => ({
      name: e.name, sessions: e.sessions, totalSets: e.totalSets, totalReps: e.totalReps,
      totalVolume: e.totalVolume, maxWeight: e.maxWeight,
      avgPain: e.painEntries > 0 ? Math.round((e.avgPain / e.painEntries) * 10) / 10 : 0,
      avgRpe: e.rpeEntries > 0 ? Math.round((e.avgRpe / e.rpeEntries) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  const monthWeights = weightHistory.filter((e: any) => {
    const d = new Date(e.date);
    return d.getFullYear() === y && d.getMonth() === m;
  }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const weightStart = monthWeights.length > 0 ? monthWeights[0].weight : null;
  const weightEnd = monthWeights.length > 0 ? monthWeights[monthWeights.length - 1].weight : null;
  const weightChange = weightStart && weightEnd ? Math.round((weightEnd - weightStart) * 10) / 10 : null;
  const uniqueDays = new Set(monthWorkouts.map((w: any) => w.date.split('T')[0])).size;

  return { workoutCount: monthWorkouts.length, totalSets, totalReps, totalVolume, totalDuration, exerciseCount, skippedCount, exerciseList, weightChange, weightStart, weightEnd, uniqueDays };
}

const MonthlyReport = () => {
  const { workoutHistory, profile } = useApp();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const isHe = lang === 'he';
  const locale = isHe ? 'he-IL' : 'en-US';

  const [monthOffset, setMonthOffset] = useState(0);

  const targetMonth = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - monthOffset); return d;
  }, [monthOffset]);

  const prevMonth = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - monthOffset - 1); return d;
  }, [monthOffset]);

  const monthLabel = targetMonth.toLocaleDateString(locale, { year: 'numeric', month: 'long' });

  const current = useMemo(() => calcMonthStats(workoutHistory, profile.weightHistory, targetMonth), [workoutHistory, profile.weightHistory, targetMonth]);
  const previous = useMemo(() => calcMonthStats(workoutHistory, profile.weightHistory, prevMonth), [workoutHistory, profile.weightHistory, prevMonth]);

  const pctChange = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const TrendIcon = ({ change, inverted = false }: { change: number; inverted?: boolean }) => {
    const positive = inverted ? change < 0 : change > 0;
    const negative = inverted ? change > 0 : change < 0;
    if (change === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
    if (positive) return <TrendingUp className="w-3 h-3 text-green-400" />;
    return <TrendingDown className="w-3 h-3 text-red-400" />;
  };

  const TrendBadge = ({ change, inverted = false }: { change: number; inverted?: boolean }) => {
    const positive = inverted ? change < 0 : change > 0;
    const negative = inverted ? change > 0 : change < 0;
    const color = change === 0 ? 'text-muted-foreground bg-muted' : positive ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10';
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${color}`}>
        <TrendIcon change={change} inverted={inverted} />
        {change > 0 ? '+' : ''}{change}%
      </span>
    );
  };

  const kpis = [
    { icon: Dumbbell, label: t('report.workouts'), value: current.workoutCount, prev: previous.workoutCount },
    { icon: Calendar, label: t('report.trainingDays'), value: current.uniqueDays, prev: previous.uniqueDays },
    { icon: Clock, label: t('report.totalTime'), value: current.totalDuration, prev: previous.totalDuration, suffix: "'" },
    { icon: Flame, label: t('report.totalSets'), value: current.totalSets, prev: previous.totalSets },
    { icon: TrendingUp, label: t('report.totalReps'), value: current.totalReps, prev: previous.totalReps },
    { icon: Award, label: t('report.totalVolume'), value: current.totalVolume, prev: previous.totalVolume, format: 'volume' },
  ];

  // Bar chart data for KPI comparison
  const barData = kpis.map(k => ({
    name: k.label,
    current: k.format === 'volume' ? Math.round(k.value / 1000) : k.value,
    previous: k.format === 'volume' ? Math.round(k.prev / 1000) : k.prev,
  }));

  const hasData = current.workoutCount > 0;

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">{t('report.title')}</h1>
        <button onClick={() => navigate('/progress')} className="text-xs text-primary flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> {t('nav.back')}
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 mb-5">
        <button onClick={() => setMonthOffset(prev => prev + 1)} className="p-1">
          {isHe ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <span className="font-semibold text-sm">{monthLabel}</span>
        <button onClick={() => setMonthOffset(prev => Math.max(0, prev - 1))} disabled={monthOffset === 0} className="p-1 disabled:opacity-30">
          {isHe ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {!hasData ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <p className="text-muted-foreground">{t('report.noData')}</p>
        </motion.div>
      ) : (
        <div className="space-y-5">
          {/* KPI Cards with trend */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2">
            {kpis.map((kpi, i) => {
              const change = pctChange(kpi.value, kpi.prev);
              const displayVal = kpi.format === 'volume' ? `${(kpi.value / 1000).toFixed(1)}t` : kpi.suffix ? `${kpi.value.toLocaleString()}${kpi.suffix}` : kpi.value.toLocaleString();
              return (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.03 * i }}
                  className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-1.5">
                  <kpi.icon className="w-4 h-4 text-primary" />
                  <span className="text-lg font-bold">{displayVal}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{kpi.label}</span>
                  <TrendBadge change={change} />
                </motion.div>
              );
            })}
          </motion.div>

          {/* Comparison bar chart */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{isHe ? 'השוואה לחודש קודם' : 'vs. Previous Month'}</h3>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" /> {isHe ? 'נוכחי' : 'Current'}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted-foreground/40 inline-block" /> {isHe ? 'קודם' : 'Previous'}</span>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barGap={2} barCategoryGap="20%">
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="previous" radius={[4, 4, 0, 0]} fill="hsl(var(--muted-foreground) / 0.3)" />
                  <Bar dataKey="current" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Weight change */}
          {current.weightChange !== null && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-medium">{t('report.weightChange')}</span>
              <div className="flex items-center gap-2">
                <TrendBadge change={current.weightChange < 0 ? -Math.abs(Math.round(current.weightChange / (current.weightStart || 1) * 100)) : Math.round(current.weightChange / (current.weightStart || 1) * 100)} inverted />
                <span className="text-sm font-bold">
                  {current.weightChange > 0 ? '+' : ''}{current.weightChange} {t('dash.kg')}
                </span>
              </div>
            </motion.div>
          )}

          {/* Per-exercise with progress bars */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-4">{t('report.exerciseBreakdown')}</h3>
            <div className="space-y-3">
              {current.exerciseList.map((ex, i) => {
                const prevEx = previous.exerciseList.find(p => p.name === ex.name);
                const volChange = prevEx ? pctChange(ex.totalVolume, prevEx.totalVolume) : 0;
                const maxWChange = prevEx ? pctChange(ex.maxWeight, prevEx.maxWeight) : 0;

                return (
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
                        <div className="flex items-center justify-center gap-0.5">
                          <p className="text-xs font-bold text-primary">{ex.maxWeight > 0 ? ex.maxWeight : '—'}</p>
                          {maxWChange !== 0 && <TrendIcon change={maxWChange} />}
                        </div>
                        <p className="text-[9px] text-muted-foreground">{t('report.maxKg')}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-0.5">
                          <p className="text-xs font-bold text-primary">{ex.totalVolume > 0 ? ex.totalVolume.toLocaleString() : '—'}</p>
                          {volChange !== 0 && <TrendIcon change={volChange} />}
                        </div>
                        <p className="text-[9px] text-muted-foreground">{t('report.vol')}</p>
                      </div>
                    </div>
                    {/* Volume progress bar vs previous */}
                    {prevEx && ex.totalVolume > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">{isHe ? 'נפח vs קודם' : 'Volume vs prev'}</span>
                          <TrendBadge change={volChange} />
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${volChange >= 0 ? 'bg-primary' : 'bg-destructive/60'}`}
                            style={{ width: `${Math.min(100, Math.max(10, (ex.totalVolume / Math.max(prevEx.totalVolume, 1)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {(ex.avgPain > 0 || ex.avgRpe > 0) && (
                      <div className="flex gap-4 mt-2 pt-2 border-t border-border/50">
                        {ex.avgPain > 0 && <span className="text-[10px] text-destructive">{t('report.avgPain')}: {ex.avgPain}</span>}
                        {ex.avgRpe > 0 && <span className="text-[10px] text-accent-foreground">{t('report.avgRpe')}: {ex.avgRpe}</span>}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {current.skippedCount > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {current.skippedCount} {t('report.skipped')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthlyReport;
