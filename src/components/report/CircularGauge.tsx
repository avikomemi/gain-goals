import { motion } from 'framer-motion';

interface CircularGaugeProps {
  value: number; // 0-100
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const CircularGauge = ({ value, label, sublabel, size = 100, strokeWidth = 8, color }: CircularGaugeProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  const center = size / 2;

  const getColor = () => {
    if (color) return color;
    if (value >= 80) return 'hsl(var(--success))';
    if (value >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const getGrade = () => {
    if (value >= 90) return 'A+';
    if (value >= 80) return 'A';
    if (value >= 70) return 'B+';
    if (value >= 60) return 'B';
    if (value >= 50) return 'C';
    if (value >= 30) return 'D';
    return 'F';
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={center} cy={center} r={radius} fill="none"
            stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
          <motion.circle
            cx={center} cy={center} r={radius} fill="none"
            stroke={getColor()} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black" style={{ color: getColor() }}>{getGrade()}</span>
          <span className="text-[10px] text-muted-foreground">{Math.round(value)}%</span>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-center leading-tight">{label}</span>
      {sublabel && <span className="text-[9px] text-muted-foreground text-center">{sublabel}</span>}
    </div>
  );
};

export default CircularGauge;
