import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

interface RestTimerProps {
  duration: number; // seconds
  onComplete: () => void;
  onSkip: () => void;
}

const RestTimer = ({ duration, onComplete, onSkip }: RestTimerProps) => {
  const [remaining, setRemaining] = useState(duration);
  const { t } = useI18n();

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const interval = setInterval(() => {
      setRemaining(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining, onComplete]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = ((duration - remaining) / duration) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center">
        {/* Circular timer */}
        <div className="relative w-48 h-48 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="hsl(220, 15%, 18%)"
              strokeWidth="4"
            />
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="hsl(160, 84%, 39%)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Timer className="w-5 h-5 text-primary mb-1" />
            <span className="text-4xl font-bold tabular-nums">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-muted-foreground mt-1">{t('timer.rest')}</span>
          </div>
        </div>

        <button
          onClick={onSkip}
          className="flex items-center gap-2 bg-secondary text-secondary-foreground rounded-xl px-6 py-3 text-sm font-medium"
        >
          <X className="w-4 h-4" />
          {t('timer.skip')}
        </button>
      </div>
    </motion.div>
  );
};

export default RestTimer;
