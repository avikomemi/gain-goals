import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Area, AreaChart
} from 'recharts';
import { ChevronDown, ChevronUp, FileText, Share2, TrendingUp, TrendingDown, Minus, Trophy, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExerciseAnalysis {
  id: string;
  name: string;
  sessions: number;
  currentWeight: number;
  firstWeight: number;
  weightChange: number;
  currentReps: number;
  firstReps: number;
  repsChange: number;
  currentVolume: number;
  firstVolume: number;
  volumeChange: number;
  maxWeightEver: number;
  maxRepsEver: number;
  trend: 'improving' | 'stable' | 'declining';
  data: { date: string; maxWeight: number; maxReps: number; volume: number; painLevel: number; rpe: number }[];
}

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
  const exerciseAnalyses: ExerciseAnalysis[] = useMemo(() => {
    const map = new Map<string, { name: string; data: ExerciseAnalysis['data'] }>();
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
          maxWeight: maxW,
          maxReps: maxR,
          volume: vol,
          painLevel: ex.painLevel || 0,
          rpe: ex.rpe || 0,
        });
      });
    });

    return Array.from(map.entries()).map(([id, { name, data }]) => {
      const first = data[0];
      const last = data[data.length - 1];
      const weightChange = first.maxWeight > 0 ? ((last.maxWeight - first.maxWeight) / first.maxWeight) * 100 : 0;
      const repsChange = first.maxReps > 0 ? ((last.maxReps - first.maxReps) / first.maxReps) * 100 : 0;
      const volumeChange = first.volume > 0 ? ((last.volume - first.volume) / first.volume) * 100 : 0;

      // Trend based on last 3 sessions vs first 3
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
        currentWeight: last.maxWeight,
        firstWeight: first.maxWeight,
        weightChange: Math.round(weightChange * 10) / 10,
        currentReps: last.maxReps,
        firstReps: first.maxReps,
        repsChange: Math.round(repsChange * 10) / 10,
        currentVolume: last.volume,
        firstVolume: first.volume,
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

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
    if (trend === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const ChangeIndicator = ({ value, suffix = '%' }: { value: number; suffix?: string }) => {
    const color = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-muted-foreground';
    const prefix = value > 0 ? '+' : '';
    return <span className={`text-xs font-bold ${color}`}>{prefix}{value}{suffix}</span>;
  };

  const MiniSparkline = ({ data, dataKey, color }: { data: any[]; dataKey: string; color: string }) => {
    if (data.length < 2) return null;
    return (
      <ResponsiveContainer width="100%" height={40}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`spark-${dataKey}-${color.replace(/[^a-z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={`url(#spark-${dataKey}-${color.replace(/[^a-z0-9]/g, '')})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
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

      {/* Body Weight */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4 mb-4">
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-xl p-4 mb-4">
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

      {/* Exercise Progress - Summary Cards with Drill-Down */}
      {exerciseAnalyses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-sm font-semibold mb-3">{t('prog.exerciseProgress')}</h3>
          <div className="space-y-3">
            {exerciseAnalyses.map((ex) => {
              const isExpanded = expandedExercise === ex.id;
              return (
                <motion.div key={ex.id} layout className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Summary Row */}
                  <button
                    onClick={() => setExpandedExercise(isExpanded ? null : ex.id)}
                    className="w-full p-3.5 text-start"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendIcon trend={ex.trend} />
                        <span className="text-sm font-semibold">{ex.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{ex.sessions} {t('prog.sessions')}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Key Metrics Row */}
                    <div className="grid grid-cols-3 gap-2">
                      {ex.currentWeight > 0 && (
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground">{t('prog.weightUsed')}</p>
                          <p className="text-sm font-bold">{ex.currentWeight} <span className="text-[10px] font-normal text-muted-foreground">{t('dash.kg')}</span></p>
                          <ChangeIndicator value={ex.weightChange} />
                        </div>
                      )}
                      <div className="bg-secondary/50 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">{t('prog.maxReps')}</p>
                        <p className="text-sm font-bold">{ex.currentReps}</p>
                        <ChangeIndicator value={ex.repsChange} />
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">{t('prog.volume')}</p>
                        <p className="text-sm font-bold">{ex.currentVolume}</p>
                        <ChangeIndicator value={ex.volumeChange} />
                      </div>
                    </div>

                    {/* Mini sparkline */}
                    {ex.data.length >= 2 && (
                      <div className="mt-2">
                        <MiniSparkline data={ex.data} dataKey={ex.currentWeight > 0 ? 'maxWeight' : 'volume'} color={ex.trend === 'improving' ? 'hsl(160, 84%, 39%)' : ex.trend === 'declining' ? 'hsl(0, 80%, 55%)' : 'hsl(215, 15%, 55%)'} />
                      </div>
                    )}

                    {/* PR Badge */}
                    {ex.maxWeightEver > 0 && ex.currentWeight >= ex.maxWeightEver && (
                      <div className="flex items-center gap-1 mt-1">
                        <Trophy className="w-3 h-3 text-yellow-400" />
                        <span className="text-[10px] text-yellow-400 font-semibold">{t('prog.pr')} — {ex.maxWeightEver} {t('dash.kg')}</span>
                      </div>
                    )}
                  </button>

                  {/* Drill-Down: Full Charts */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3.5 pb-4 space-y-4 border-t border-border/50 pt-3">
                          {/* Comparison: First vs Latest */}
                          <div className="bg-secondary/30 rounded-lg p-3">
                            <p className="text-[10px] text-muted-foreground mb-2 font-semibold">{t('prog.firstRecord')} → {t('prog.latestWeight')}</p>
                            <div className="grid grid-cols-3 gap-3 text-center">
                              {ex.firstWeight > 0 && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground">{t('prog.weightUsed')}</p>
                                  <p className="text-xs">{ex.firstWeight} → <span className="font-bold text-primary">{ex.currentWeight}</span></p>
                                </div>
                              )}
                              <div>
                                <p className="text-[10px] text-muted-foreground">{t('prog.maxReps')}</p>
                                <p className="text-xs">{ex.firstReps} → <span className="font-bold text-primary">{ex.currentReps}</span></p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">{t('prog.volume')}</p>
                                <p className="text-xs">{ex.firstVolume} → <span className="font-bold text-primary">{ex.currentVolume}</span></p>
                              </div>
                            </div>
                          </div>

                          {/* Weight Chart */}
                          {ex.data.some(d => d.maxWeight > 0) && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">{t('prog.weightUsed')}</p>
                              <ResponsiveContainer width="100%" height={130}>
                                <LineChart data={ex.data}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                                  <Tooltip contentStyle={customTooltipStyle} />
                                  <Line type="monotone" dataKey="maxWeight" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(160, 84%, 39%)' }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Volume Chart - % change over time for better visibility */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">{t('prog.totalVolume')}</p>
                            <ResponsiveContainer width="100%" height={130}>
                              <BarChart data={ex.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                                <YAxis domain={['dataMin * 0.8', 'dataMax * 1.1']} tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                                <Tooltip contentStyle={customTooltipStyle} />
                                <Bar dataKey="volume" fill="hsl(270, 60%, 55%)" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Reps Chart */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">{t('prog.maxReps')}</p>
                            <ResponsiveContainer width="100%" height={130}>
                              <LineChart data={ex.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                                <Tooltip contentStyle={customTooltipStyle} />
                                <Line type="monotone" dataKey="maxReps" stroke="hsl(195, 80%, 50%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(195, 80%, 50%)' }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Pain & RPE if exists */}
                          {ex.data.some(d => d.painLevel > 0) && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">{t('prog.painOverTime')}</p>
                              <ResponsiveContainer width="100%" height={100}>
                                <LineChart data={ex.data}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                                  <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                                  <Tooltip contentStyle={customTooltipStyle} />
                                  <Line type="monotone" dataKey="painLevel" stroke="hsl(0, 80%, 55%)" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                          {ex.data.some(d => d.rpe > 0) && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">{t('prog.rpeOverTime')}</p>
                              <ResponsiveContainer width="100%" height={100}>
                                <LineChart data={ex.data}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                                  <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: 'hsl(215, 15%, 55%)' }} />
                                  <Tooltip contentStyle={customTooltipStyle} />
                                  <Line type="monotone" dataKey="rpe" stroke="hsl(35, 90%, 55%)" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
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
