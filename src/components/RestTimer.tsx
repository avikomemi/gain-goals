import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Timer, X, Maximize2, Minimize2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

interface RestTimerProps {
  duration: number;
  onComplete: () => void;
  onSkip: () => void;
}

const RestTimer = ({ duration, onComplete, onSkip }: RestTimerProps) => {
  const [remaining, setRemaining] = useState(duration);
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctx.resume();
      audioCtxRef.current = ctx;
    } catch {}
    return () => {
      audioCtxRef.current?.close();
    };
  }, []);

  const playBeep = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      ctx.resume().then(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1100;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.5, ctx.currentTime + 0.5);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
        osc2.start(ctx.currentTime + 0.5);
        osc2.stop(ctx.currentTime + 0.9);

        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.frequency.value = 1320;
        osc3.type = 'sine';
        gain3.gain.setValueAtTime(0.5, ctx.currentTime + 1.0);
        gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.4);
        osc3.start(ctx.currentTime + 1.0);
        osc3.stop(ctx.currentTime + 1.4);
      });
    } catch {}

    try {
      navigator?.vibrate?.([200, 100, 200, 100, 300]);
    } catch {}
  }, []);

  useEffect(() => {
    if (remaining <= 0) {
      playBeep();
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
  const circumference = 2 * Math.PI * 18;

  if (expanded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-48 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round"
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
          <div className="flex gap-3">
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-2 bg-secondary text-secondary-foreground rounded-xl px-5 py-3 text-sm font-medium"
            >
              <Minimize2 className="w-4 h-4" />
              {'↓'}
            </button>
            <button
              onClick={onSkip}
              className="flex items-center gap-2 bg-secondary text-secondary-foreground rounded-xl px-5 py-3 text-sm font-medium"
            >
              <X className="w-4 h-4" />
              {t('timer.skip')}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Compact floating pill
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.8 }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border rounded-full px-4 py-2.5 shadow-lg glow-primary"
    >
      {/* Mini circular progress */}
      <div className="relative w-9 h-9 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
          <circle
            cx="20" cy="20" r="18" fill="none"
            stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${circumference * (1 - progress / 100)}`}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <Timer className="absolute inset-0 m-auto w-3.5 h-3.5 text-primary" />
      </div>

      <span className="text-lg font-bold tabular-nums text-foreground">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>

      <button onClick={() => setExpanded(true)} className="p-1.5 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
        <Maximize2 className="w-4 h-4" />
      </button>
      <button onClick={onSkip} className="p-1.5 rounded-full hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default RestTimer;
