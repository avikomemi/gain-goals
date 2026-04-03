import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Dumbbell, Calendar, Clock, Flame, Award, ArrowLeft, Zap, Target, AlertTriangle, Sparkles, Heart, Activity, BarChart3, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import CircularGauge from '../components/report/CircularGauge';
import GoalProgressSection from '../components/report/GoalProgressSection';
import InsightCard from '../components/report/InsightCard';

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
  avgRpe: number;
  avgPain: number;
  maxWeightLifted: number;
  consistencyScore: number;
  weeklyBreakdown: number[];
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
  let totalRpe = 0, rpeCount = 0, totalPain = 0, painCount = 0;
  let maxWeightLifted = 0;
  const exerciseMap: Record<string, any> = {};

  // Weekly breakdown (4-5 weeks)
  const weeklyBreakdown = [0, 0, 0, 0, 0];

  monthWorkouts.forEach((w: any) => {
    totalDuration += w.duration || 0;
    const day = new Date(w.date).getDate();
    const weekIdx = Math.min(4, Math.floor((day - 1) / 7));
    weeklyBreakdown[weekIdx]++;

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
          if (s.weight > maxWeightLifted) maxWeightLifted = s.weight;
        }
      });
      if (ex.painLevel > 0) { entry.avgPain += ex.painLevel; entry.painEntries++; totalPain += ex.painLevel; painCount++; }
      if (ex.rpe > 0) { entry.avgRpe += ex.rpe; entry.rpeEntries++; totalRpe += ex.rpe; rpeCount++; }
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

  // Days in month
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const consistencyScore = Math.min(100, Math.round((uniqueDays / Math.min(daysInMonth, 20)) * 100));

  return {
    workoutCount: monthWorkouts.length, totalSets, totalReps, totalVolume, totalDuration,
    exerciseCount, skippedCount, exerciseList, weightChange, weightStart, weightEnd, uniqueDays,
    avgRpe: rpeCount > 0 ? Math.round((totalRpe / rpeCount) * 10) / 10 : 0,
    avgPain: painCount > 0 ? Math.round((totalPain / painCount) * 10) / 10 : 0,
    maxWeightLifted, consistencyScore, weeklyBreakdown,
  };
}

const MonthlyReport = () => {
  const { workoutHistory, profile } = useApp();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const isHe = lang === 'he';
  const locale = isHe ? 'he-IL' : 'en-US';

  const [monthOffset, setMonthOffset] = useState(0);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);

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

  // === Goal Scoring ===
  const strengthScore = useMemo(() => {
    // Based on volume increase, max weight progression, and consistency
    const volChange = pctChange(current.totalVolume, previous.totalVolume);
    const volumeScore = Math.min(40, Math.max(0, 20 + volChange * 0.4));
    const weightScore = current.maxWeightLifted > 0 ? Math.min(30, (current.maxWeightLifted / 100) * 30) : 10;
    const consistScore = current.consistencyScore * 0.3;
    return Math.min(100, Math.round(volumeScore + weightScore + consistScore));
  }, [current, previous]);

  const toningScore = useMemo(() => {
    // Based on total reps, sets, and workout frequency (high volume = toning)
    const repScore = Math.min(35, (current.totalReps / 500) * 35);
    const setScore = Math.min(30, (current.totalSets / 100) * 30);
    const freqScore = Math.min(35, (current.uniqueDays / 16) * 35);
    return Math.min(100, Math.round(repScore + setScore + freqScore));
  }, [current]);

  const flexibilityScore = useMemo(() => {
    // Based on training consistency and low pain levels
    const consistScore = current.consistencyScore * 0.5;
    const painBonus = current.avgPain > 0 ? Math.max(0, 30 - current.avgPain * 6) : 30;
    const durationScore = Math.min(20, (current.totalDuration / 300) * 20);
    return Math.min(100, Math.round(consistScore + painBonus + durationScore));
  }, [current]);

  const overallScore = Math.round((strengthScore + toningScore + flexibilityScore) / 3);

  // === Insights Generation ===
  const insights = useMemo(() => {
    const list: { icon: any; title: string; description: string; type: 'positive' | 'neutral' | 'warning' }[] = [];
    const volChange = pctChange(current.totalVolume, previous.totalVolume);

    if (volChange > 10) {
      list.push({
        icon: TrendingUp,
        title: isHe ? '📈 עלייה בנפח אימון' : '📈 Volume Increasing',
        description: isHe
          ? `הנפח עלה ב-${volChange}% מהחודש הקודם — סימן מצוין להתקדמות בכוח וחיטוב!`
          : `Volume is up ${volChange}% from last month — great sign for strength & toning progress!`,
        type: 'positive',
      });
    } else if (volChange < -10) {
      list.push({
        icon: TrendingDown,
        title: isHe ? '📉 ירידה בנפח' : '📉 Volume Decreased',
        description: isHe
          ? `הנפח ירד ב-${Math.abs(volChange)}%. שקול להגדיל עומסים או חזרות בהדרגה.`
          : `Volume dropped ${Math.abs(volChange)}%. Consider gradually increasing loads or reps.`,
        type: 'warning',
      });
    }

    if (current.consistencyScore >= 75) {
      list.push({
        icon: Sparkles,
        title: isHe ? '🔥 עקביות מעולה' : '🔥 Excellent Consistency',
        description: isHe
          ? `${current.uniqueDays} ימי אימון החודש — העקביות שלך היא המפתח להצלחה!`
          : `${current.uniqueDays} training days this month — your consistency is the key to success!`,
        type: 'positive',
      });
    } else if (current.uniqueDays < 8 && current.workoutCount > 0) {
      list.push({
        icon: Calendar,
        title: isHe ? '⏰ הגבר תדירות' : '⏰ Increase Frequency',
        description: isHe
          ? `רק ${current.uniqueDays} ימי אימון. נסה להגיע ל-3-4 אימונים בשבוע לתוצאות מיטביות.`
          : `Only ${current.uniqueDays} training days. Aim for 3-4 sessions/week for optimal results.`,
        type: 'warning',
      });
    }

    if (current.avgPain > 4) {
      list.push({
        icon: AlertTriangle,
        title: isHe ? '⚠️ רמת כאב גבוהה' : '⚠️ High Pain Levels',
        description: isHe
          ? `כאב ממוצע ${current.avgPain}/10. שקול להתייעץ עם מאמן או לשנות טכניקה.`
          : `Average pain ${current.avgPain}/10. Consider consulting a trainer or adjusting technique.`,
        type: 'warning',
      });
    } else if (current.avgPain > 0 && current.avgPain <= 2) {
      list.push({
        icon: Heart,
        title: isHe ? '💚 כאב מינימלי' : '💚 Minimal Pain',
        description: isHe
          ? `כאב ממוצע ${current.avgPain}/10 — מצוין! הגוף מסתגל יפה לאימונים.`
          : `Average pain ${current.avgPain}/10 — excellent! Your body is adapting well.`,
        type: 'positive',
      });
    }

    if (current.avgRpe >= 7 && current.avgRpe <= 9) {
      list.push({
        icon: Zap,
        title: isHe ? '⚡ עצימות מושלמת' : '⚡ Perfect Intensity',
        description: isHe
          ? `RPE ממוצע ${current.avgRpe}/10 — אתה עובד בטווח האידיאלי לבניית כוח!`
          : `Average RPE ${current.avgRpe}/10 — you're training in the ideal zone for strength building!`,
        type: 'positive',
      });
    }

    if (current.skippedCount > 3) {
      list.push({
        icon: Target,
        title: isHe ? '🎯 תרגילים שדולגו' : '🎯 Skipped Exercises',
        description: isHe
          ? `${current.skippedCount} תרגילים דולגו. נסה למצוא חלופות במקום לדלג.`
          : `${current.skippedCount} exercises skipped. Try finding alternatives instead of skipping.`,
        type: 'warning',
      });
    }

    return list;
  }, [current, previous, isHe]);

  const TrendIcon = ({ change, inverted = false }: { change: number; inverted?: boolean }) => {
    const positive = inverted ? change < 0 : change > 0;
    if (change === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
    if (positive) return <TrendingUp className="w-3 h-3 text-green-400" />;
    return <TrendingDown className="w-3 h-3 text-red-400" />;
  };

  const TrendBadge = ({ change, inverted = false }: { change: number; inverted?: boolean }) => {
    const positive = inverted ? change < 0 : change > 0;
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

  const barData = kpis.map(k => ({
    name: k.label,
    current: k.format === 'volume' ? Math.round(k.value / 1000) : k.value,
    previous: k.format === 'volume' ? Math.round(k.prev / 1000) : k.prev,
  }));

  // Weekly breakdown chart
  const weeklyData = current.weeklyBreakdown.map((count, i) => ({
    name: isHe ? `שבוע ${i + 1}` : `W${i + 1}`,
    workouts: count,
  })).filter((_, i) => i < 5);

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
          {/* === GOAL GAUGES === */}
          <GoalProgressSection
            overallLabel={isHe ? 'התקדמות לפי מטרות' : 'Goal Progress'}
            overallScore={overallScore}
            goals={[
              { label: isHe ? 'כוח' : 'Strength', sublabel: isHe ? 'נפח + מקס' : 'Volume + Max', score: strengthScore, color: 'hsl(160, 84%, 39%)' },
              { label: isHe ? 'חיטוב' : 'Toning', sublabel: isHe ? 'חזרות + תדירות' : 'Reps + Freq', score: toningScore, color: 'hsl(195, 80%, 50%)' },
              { label: isHe ? 'גמישות' : 'Flexibility', sublabel: isHe ? 'עקביות + כאב' : 'Consist + Pain', score: flexibilityScore, color: 'hsl(280, 70%, 60%)' },
            ]}
          />

          {/* === SMART INSIGHTS === */}
          {insights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-primary" />
                {isHe ? 'תובנות חכמות' : 'Smart Insights'}
              </h3>
              {insights.map((insight, i) => (
                <InsightCard key={i} icon={insight.icon} title={insight.title} description={insight.description} type={insight.type} delay={0.12 + i * 0.05} />
              ))}
            </motion.div>
          )}

          {/* === KPI Cards === */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-2">
            {kpis.map((kpi, i) => {
              const change = pctChange(kpi.value, kpi.prev);
              const displayVal = kpi.format === 'volume' ? `${(kpi.value / 1000).toFixed(1)}t` : kpi.suffix ? `${kpi.value.toLocaleString()}${kpi.suffix}` : kpi.value.toLocaleString();
              return (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + 0.03 * i }}
                  className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-1.5">
                  <kpi.icon className="w-4 h-4 text-primary" />
                  <span className="text-lg font-bold">{displayVal}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{kpi.label}</span>
                  <TrendBadge change={change} />
                </motion.div>
              );
            })}
          </motion.div>

          {/* === Intensity & Health Meters === */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3">
            {/* RPE Gauge */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center">
              <CircularGauge
                value={current.avgRpe * 10}
                label={isHe ? 'עצימות ממוצעת' : 'Avg Intensity'}
                sublabel={`RPE ${current.avgRpe}/10`}
                size={90}
                color={current.avgRpe >= 8 ? 'hsl(0, 72%, 51%)' : current.avgRpe >= 6 ? 'hsl(45, 93%, 47%)' : 'hsl(160, 84%, 39%)'}
              />
            </div>
            {/* Pain Gauge */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center">
              <CircularGauge
                value={Math.max(0, 100 - current.avgPain * 10)}
                label={isHe ? 'בריאות מפרקית' : 'Joint Health'}
                sublabel={isHe ? `כאב ${current.avgPain}/10` : `Pain ${current.avgPain}/10`}
                size={90}
                color={current.avgPain <= 2 ? 'hsl(160, 84%, 39%)' : current.avgPain <= 5 ? 'hsl(45, 93%, 47%)' : 'hsl(0, 72%, 51%)'}
              />
            </div>
          </motion.div>

          {/* === Weekly Breakdown === */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">{isHe ? 'פילוח שבועי' : 'Weekly Breakdown'}</h3>
            </div>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Bar dataKey="workouts" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* === Comparison Bar Chart === */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
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
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="previous" radius={[4, 4, 0, 0]} fill="hsl(var(--muted-foreground) / 0.3)" />
                  <Bar dataKey="current" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Weight change */}
          {current.weightChange !== null && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-medium">{t('report.weightChange')}</span>
              <div className="flex items-center gap-2">
                <TrendBadge change={current.weightChange < 0 ? -Math.abs(Math.round(current.weightChange / (current.weightStart || 1) * 100)) : Math.round(current.weightChange / (current.weightStart || 1) * 100)} inverted />
                <span className="text-sm font-bold">{current.weightChange > 0 ? '+' : ''}{current.weightChange} {t('dash.kg')}</span>
              </div>
            </motion.div>
          )}

          {/* === Exercise Breakdown (collapsible) === */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-4">{t('report.exerciseBreakdown')}</h3>
            <div className="space-y-2">
              {current.exerciseList.map((ex, i) => {
                const prevEx = previous.exerciseList.find(p => p.name === ex.name);
                const volChange = prevEx ? pctChange(ex.totalVolume, prevEx.totalVolume) : 0;
                const maxWChange = prevEx ? pctChange(ex.maxWeight, prevEx.maxWeight) : 0;
                const isExpanded = expandedExercise === i;

                return (
                  <motion.div key={i} initial={{ opacity: 0, x: isHe ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.02 * i }}
                    className="bg-secondary/30 rounded-lg overflow-hidden">
                    <button onClick={() => setExpandedExercise(isExpanded ? null : i)} className="w-full p-3 text-start">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{ex.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{ex.sessions}x</span>
                          {volChange !== 0 && <TrendBadge change={volChange} />}
                        </div>
                      </div>
                      {/* Mini stats row */}
                      <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span>{ex.totalSets} {t('report.sets')}</span>
                        <span>{ex.totalReps} {t('report.reps')}</span>
                        {ex.maxWeight > 0 && <span>{ex.maxWeight} {t('report.maxKg')}</span>}
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-3 pb-3 space-y-2">
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
                            <p className="text-xs font-bold text-primary">{ex.totalVolume > 0 ? ex.totalVolume.toLocaleString() : '—'}</p>
                            <p className="text-[9px] text-muted-foreground">{t('report.vol')}</p>
                          </div>
                        </div>
                        {/* Volume bar */}
                        {prevEx && ex.totalVolume > 0 && (
                          <div className="pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between text-[10px] mb-1">
                              <span className="text-muted-foreground">{isHe ? 'נפח vs קודם' : 'Volume vs prev'}</span>
                              <TrendBadge change={volChange} />
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${volChange >= 0 ? 'bg-primary' : 'bg-destructive/60'}`}
                                style={{ width: `${Math.min(100, Math.max(10, (ex.totalVolume / Math.max(prevEx.totalVolume, 1)) * 100))}%` }} />
                            </div>
                          </div>
                        )}
                        {(ex.avgPain > 0 || ex.avgRpe > 0) && (
                          <div className="flex gap-4 pt-2 border-t border-border/50">
                            {ex.avgPain > 0 && <span className="text-[10px] text-destructive">{t('report.avgPain')}: {ex.avgPain}</span>}
                            {ex.avgRpe > 0 && <span className="text-[10px] text-accent-foreground">{t('report.avgRpe')}: {ex.avgRpe}</span>}
                          </div>
                        )}
                      </motion.div>
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
