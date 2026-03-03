import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface InsightCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  type?: 'positive' | 'neutral' | 'warning';
  delay?: number;
}

const InsightCard = ({ icon: Icon, title, description, type = 'neutral', delay = 0 }: InsightCardProps) => {
  const colors = {
    positive: 'border-green-500/30 bg-green-500/5',
    neutral: 'border-accent/30 bg-accent/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
  };
  const iconColors = {
    positive: 'text-green-400',
    neutral: 'text-accent',
    warning: 'text-yellow-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={`border rounded-xl p-3 flex gap-3 items-start ${colors[type]}`}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColors[type]}`} />
      <div>
        <p className="text-xs font-bold mb-0.5">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default InsightCard;
