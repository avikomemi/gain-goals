import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Area, AreaChart
} from 'recharts';
import { ChevronDown, ChevronUp, FileText, Share2, TrendingUp, TrendingDown, Minus, Trophy, Dumbbell, Activity, Flame, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OverallSummary from '../components/progress/OverallSummary';
import ExerciseCard from '../components/progress/ExerciseCard';
import AtAGlanceTable from '../components/progress/AtAGlanceTable';

const Progress = () => {
  const { profile, workoutHistory } = useApp();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const weightData = profile.weightHistory.map(e => ({
    date: new Date(e.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
    weight: e.weight,
  }));

  const heatmapData = useMemo(() => {
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
  }, [workoutHistory, locale]);

  // Deep exercise analysis
  const exerciseAnalyses = useMemo(() => {
    const map = new Map<string, { name: string; data: { date: string; maxWeight: number; maxReps: number; volume: number; painLevel: number; rpe: number }[] }>();
    const sorted = [...workoutHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach(w => {
      w.exercises.forEach(ex => {
        if (ex.skipped || ex.sets.length === 0) return;
        if (!map.has(ex.exerciseId)) {
          map.set(ex.exerciseId, { name: ex.exerciseName, data: [] });
        }
        let maxW = 0, maxR = 0, vol = 0;
        ex.sets.forEach(s => {
          if (s.weight > maxW) maxW = s.weight;
          if (s.reps > maxR) maxR = s.reps;
          vol += s.reps * (s.weight || 1);
        });
        map.get(ex.exerciseId)!.data.push({
          date: new Date(w.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
          maxWeight: maxW, maxReps: maxR, volume: vol,
          painLevel: ex.painLevel || 0, rpe: ex.rpe || 0,
        });
      });
    });

    return Array.from(map.entries()).map(([id, { name, data }]) => {
      const first = data[0];
      const last = data[data.length - 1];
      const weightChange = first.maxWeight > 0 ? ((last.maxWeight - first.maxWeight) / first.maxWeight) * 100 : 0;
      const repsChange = first.maxReps > 0 ? ((last.maxReps - first.maxReps) / first.maxReps) * 100 : 0;
      const volumeChange = first.volume > 0 ? ((last.volume - first.volume) / first.volume) * 100 : 0;

      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (data.length >= 3) {
        const recent3 = data.slice(-3);
        const first3 = data.slice(0, 3);
        const recentAvgVol = recent3.reduce((s, d) => s + d.volume, 0) / 3;
        const firstAvgVol = first3.reduce((s, d) => s + d.volume, 0) / 3;
        const volDiff = firstAvgVol > 0 ? ((recentAvgVol - firstAvgVol) / firstAvgVol) * 100 : 0;
        if (volDiff > 5) trend = 'improving';
        else if (volDiff < -5) trend = 'declining';
      }

      return {
        id, name, data,
        sessions: data.length,
        currentWeight: last.maxWeight, firstWeight: first.maxWeight,
        weightChange: Math.round(weightChange * 10) / 10,
        currentReps: last.maxReps, firstReps: first.maxReps,
        repsChange: Math.round(repsChange * 10) / 10,
        currentVolume: last.volume, firstVolume: first.volume,
        volumeChange: Math.round(volumeChange * 10) / 10,
        maxWeightEver: Math.max(...data.map(d => d.maxWeight)),
        maxRepsEver: Math.max(...data.map(d => d.maxReps)),
        trend,
      };
    }).filter(a => a.sessions >= 1).sort((a, b) => b.sessions - a.sessions);
  }, [workoutHistory, locale]);

  const customTooltipStyle = {
    backgroundColor: 'hsl(220, 18%, 11%)',
    border: '1px solid hsl(220, 15%, 20%)',
    borderRadius: '8px',
    color: 'hsl(210, 20%, 95%)',
    fontSize: '12px',
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">{t('prog.title')}</h1>
        <button onClick={() => navigate('/report')} className="flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/10 px-3 py-1.5 rounded-lg">
          <FileText className="w-3.5 h-3.5" />
          {t('report.viewReport')}
        </button>
      </div>

      {/* Overall Summary */}
      {exerciseAnalyses.length > 0 && (
        <OverallSummary
          exerciseAnalyses={exerciseAnalyses}
          workoutHistory={workoutHistory}
          t={t}
          locale={locale}
        />
      )}

      {/* At a Glance Table */}
      {exerciseAnalyses.length > 0 && (
        <AtAGlanceTable rows={exerciseAnalyses} isHe={lang === 'he'} />
      )}

      {/* Body Weight */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">{t('prog.bodyWeight')}</h3>
        {weightData.length > 1 ? (
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={weightData}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215, 15%, 55%)' }} />
              <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fontSize: 10, fill: 'hsl(215, 15%, 55%)' }} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Area type="monotone" dataKey="weight" stroke="hsl(160, 84%, 39%)" strokeWidth={2.5} fill="url(#weightGrad)" dot={{ r: 3, fill: 'hsl(160, 84%, 39%)' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">{t('prog.addWeightForChart')}</p>
        )}
      </motion.div>

      {/* Training Calendar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">{t('prog.calendar')}</h3>
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

      {/* Per-Exercise Drill-Down */}
      {exerciseAnalyses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h3 className="text-sm font-semibold mb-3">{t('prog.exerciseProgress')}</h3>
          <div className="space-y-3">
            {exerciseAnalyses.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                isExpanded={expandedExercise === ex.id}
                onToggle={() => setExpandedExercise(expandedExercise === ex.id ? null : ex.id)}
                t={t}
                customTooltipStyle={customTooltipStyle}
              />
            ))}
          </div>
        </motion.div>
      )}

      {workoutHistory.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <p className="text-muted-foreground">{t('prog.doWorkouts')}</p>
        </motion.div>
      )}

      {workoutHistory.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <button
            onClick={() => navigate('/share')}
            className="w-full gradient-primary text-primary-foreground rounded-xl py-3 font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Share2 className="w-5 h-5" />
            {t('share.button')}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default Progress;
