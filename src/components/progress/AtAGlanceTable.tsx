import { motion } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ExerciseRow {
  id: string;
  name: string;
  sessions: number;
  currentWeight: number;
  currentReps: number;
  currentVolume: number;
  volumeChange: number;
  trend: 'improving' | 'stable' | 'declining';
  data: { date: string; volume: number; maxWeight: number; maxReps: number }[];
}

interface Props {
  rows: ExerciseRow[];
  isHe: boolean;
}

const AtAGlanceTable = ({ rows, isHe }: Props) => {
  if (rows.length === 0) return null;

  const trendIcon = (t: ExerciseRow['trend']) =>
    t === 'improving' ? <TrendingUp className="w-3 h-3 text-green-400" /> :
    t === 'declining' ? <TrendingDown className="w-3 h-3 text-red-400" /> :
    <Minus className="w-3 h-3 text-muted-foreground" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="bg-card border border-border rounded-xl p-3.5 mb-4"
    >
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-semibold">{isHe ? 'מבט מהיר' : 'At a Glance'}</h3>
        <span className="text-[10px] text-muted-foreground">{rows.length} {isHe ? 'תרגילים' : 'exercises'}</span>
      </div>

      <div className="overflow-x-auto -mx-3.5 px-3.5">
        <table className="w-full text-[11px] min-w-full">
          <thead>
            <tr className="text-muted-foreground border-b border-border/50">
              <th className="text-start font-medium py-1.5 pe-2">{isHe ? 'תרגיל' : 'Exercise'}</th>
              <th className="text-center font-medium py-1.5 px-1">{isHe ? 'ק"ג' : 'KG'}</th>
              <th className="text-center font-medium py-1.5 px-1">{isHe ? 'חזרות' : 'Reps'}</th>
              <th className="text-center font-medium py-1.5 px-1">Δ%</th>
              <th className="text-center font-medium py-1.5 ps-1 w-[60px]">{isHe ? 'מגמה' : 'Trend'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const color =
                r.trend === 'improving' ? 'hsl(142, 71%, 45%)' :
                r.trend === 'declining' ? 'hsl(0, 72%, 55%)' :
                'hsl(215, 15%, 55%)';
              const deltaColor =
                r.volumeChange > 0 ? 'text-green-400' :
                r.volumeChange < 0 ? 'text-red-400' :
                'text-muted-foreground';
              return (
                <tr key={r.id} className="border-b border-border/30 last:border-0">
                  <td className="py-2 pe-2 font-medium truncate max-w-[120px]">{r.name}</td>
                  <td className="py-2 px-1 text-center tabular-nums">{r.currentWeight || '—'}</td>
                  <td className="py-2 px-1 text-center tabular-nums">{r.currentReps || '—'}</td>
                  <td className={`py-2 px-1 text-center tabular-nums font-semibold ${deltaColor}`}>
                    {r.volumeChange > 0 ? '+' : ''}{r.volumeChange}%
                  </td>
                  <td className="py-2 ps-1">
                    <div className="flex items-center justify-center gap-1">
                      {r.data.length >= 2 ? (
                        <div className="w-10 h-5">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={r.data}>
                              <Line type="monotone" dataKey="volume" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {trendIcon(r.trend)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default AtAGlanceTable;
