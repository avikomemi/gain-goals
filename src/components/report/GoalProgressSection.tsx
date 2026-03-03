import { motion } from 'framer-motion';
import CircularGauge from './CircularGauge';

interface GoalScore {
  label: string;
  sublabel: string;
  score: number;
  color?: string;
}

interface GoalProgressSectionProps {
  goals: GoalScore[];
  overallScore: number;
  overallLabel: string;
}

const GoalProgressSection = ({ goals, overallScore, overallLabel }: GoalProgressSectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-card border border-border rounded-xl p-4"
    >
      <h3 className="text-sm font-semibold mb-4 text-center">{overallLabel}</h3>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {goals.map((g, i) => (
          <CircularGauge key={i} value={g.score} label={g.label} sublabel={g.sublabel} color={g.color} />
        ))}
      </div>
      {/* Overall progress bar */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-bold text-primary">{Math.round(overallScore)}%</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full gradient-primary"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(overallScore, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default GoalProgressSection;
