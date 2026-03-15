import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area
} from 'recharts';

interface ExerciseData {
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

interface ExerciseCardProps {
  exercise: ExerciseData;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
  customTooltipStyle: React.CSSProperties;
}

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (trend === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
};

const ChangeIndicator = ({ value }: { value: number }) => {
  const color = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-muted-foreground';
  const prefix = value > 0 ? '+' : '';
  return <span className={`text-xs font-bold ${color}`}>{prefix}{value}%</span>;
};

const MiniSparkline = ({ data, dataKey, color }: { data: any[]; dataKey: string; color: string }) => {
  if (data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={36}>
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

const ExerciseCard = ({ exercise: ex, isExpanded, onToggle, t, customTooltipStyle }: ExerciseCardProps) => {
  const sparkColor = ex.trend === 'improving' ? 'hsl(160, 84%, 39%)' : ex.trend === 'declining' ? 'hsl(0, 80%, 55%)' : 'hsl(215, 15%, 55%)';

  return (
    <motion.div layout className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Summary Row */}
      <button onClick={onToggle} className="w-full p-3.5 text-start">
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

        {/* Key Metrics */}
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
            <MiniSparkline data={ex.data} dataKey={ex.currentWeight > 0 ? 'maxWeight' : 'volume'} color={sparkColor} />
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

      {/* Drill-Down */}
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
              {/* First vs Latest */}
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

              {/* Volume Chart */}
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

              {/* Pain */}
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

              {/* RPE */}
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
};

export default ExerciseCard;
