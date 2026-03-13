import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { Copy, Check, Share2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ShareProgress = () => {
  const { profile, workoutHistory } = useApp();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const isHe = lang === 'he';
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => {
    const now = new Date();
    const last30 = workoutHistory.filter(w => {
      const diff = (now.getTime() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 30;
    });

    const totalWorkouts = last30.length;
    const trainingDays = new Set(last30.map(w => w.date.split('T')[0])).size;
    let totalSets = 0, totalReps = 0, totalVolume = 0, totalDuration = 0;
    let maxWeight = 0;
    const exerciseMap: Record<string, { sessions: number; maxWeight: number; totalVolume: number; avgPain: number[]; avgRpe: number[] }> = {};

    last30.forEach(w => {
      totalDuration += w.duration;
      w.exercises.forEach(ex => {
        if (ex.skipped) return;
        if (!exerciseMap[ex.exerciseName]) {
          exerciseMap[ex.exerciseName] = { sessions: 0, maxWeight: 0, totalVolume: 0, avgPain: [], avgRpe: [] };
        }
        exerciseMap[ex.exerciseName].sessions++;
        if (ex.painLevel > 0) exerciseMap[ex.exerciseName].avgPain.push(ex.painLevel);
        if (ex.rpe > 0) exerciseMap[ex.exerciseName].avgRpe.push(ex.rpe);

        ex.sets.forEach(s => {
          if (s.completed) {
            totalSets++;
            totalReps += s.reps;
            totalVolume += s.reps * s.weight;
            if (s.weight > maxWeight) maxWeight = s.weight;
            if (s.weight > exerciseMap[ex.exerciseName].maxWeight) exerciseMap[ex.exerciseName].maxWeight = s.weight;
            exerciseMap[ex.exerciseName].totalVolume += s.reps * s.weight;
          }
        });
      });
    });

    const weightChange = profile.weightHistory.length >= 2
      ? (profile.weightHistory[profile.weightHistory.length - 1].weight - profile.weightHistory[profile.weightHistory.length - 2].weight).toFixed(1)
      : null;

    return { totalWorkouts, trainingDays, totalSets, totalReps, totalVolume, totalDuration, maxWeight, exerciseMap, weightChange };
  }, [workoutHistory, profile]);

  const generateText = () => {
    const lines: string[] = [];
    const divider = '─'.repeat(30);
    
    lines.push(isHe ? `📊 דוח התקדמות - 30 ימים אחרונים` : `📊 Progress Report - Last 30 Days`);
    lines.push(divider);
    lines.push(isHe ? `👤 ${profile.name} | ${profile.weight} ק"ג` : `👤 ${profile.name} | ${profile.weight} kg`);
    if (summary.weightChange) {
      lines.push(isHe ? `⚖️ שינוי משקל: ${summary.weightChange} ק"ג` : `⚖️ Weight change: ${summary.weightChange} kg`);
    }
    lines.push('');
    lines.push(isHe ? `🏋️ סיכום:` : `🏋️ Summary:`);
    lines.push(isHe ? `  • ${summary.totalWorkouts} אימונים ב-${summary.trainingDays} ימים` : `  • ${summary.totalWorkouts} workouts in ${summary.trainingDays} days`);
    lines.push(isHe ? `  • ${summary.totalSets} סטים | ${summary.totalReps} חזרות` : `  • ${summary.totalSets} sets | ${summary.totalReps} reps`);
    lines.push(isHe ? `  • נפח כולל: ${summary.totalVolume.toLocaleString()} ק"ג` : `  • Total volume: ${summary.totalVolume.toLocaleString()} kg`);
    lines.push(isHe ? `  • משקל מקסימלי: ${summary.maxWeight} ק"ג` : `  • Max weight: ${summary.maxWeight} kg`);
    lines.push(isHe ? `  • זמן כולל: ${summary.totalDuration} דקות` : `  • Total time: ${summary.totalDuration} min`);

    const exercises = Object.entries(summary.exerciseMap);
    if (exercises.length > 0) {
      lines.push('');
      lines.push(divider);
      lines.push(isHe ? `📋 פירוט תרגילים:` : `📋 Exercise Breakdown:`);
      exercises.sort((a, b) => b[1].sessions - a[1].sessions).forEach(([name, data]) => {
        lines.push('');
        lines.push(`  ${name}`);
        lines.push(isHe
          ? `    ${data.sessions}x | מקס: ${data.maxWeight} ק"ג | נפח: ${data.totalVolume.toLocaleString()}`
          : `    ${data.sessions}x | Max: ${data.maxWeight} kg | Vol: ${data.totalVolume.toLocaleString()}`
        );
        const avgPain = data.avgPain.length > 0 ? (data.avgPain.reduce((a, b) => a + b, 0) / data.avgPain.length).toFixed(1) : null;
        const avgRpe = data.avgRpe.length > 0 ? (data.avgRpe.reduce((a, b) => a + b, 0) / data.avgRpe.length).toFixed(1) : null;
        if (avgPain || avgRpe) {
          const parts: string[] = [];
          if (avgPain) parts.push(isHe ? `כאב: ${avgPain}/10` : `Pain: ${avgPain}/10`);
          if (avgRpe) parts.push(isHe ? `מאמץ: ${avgRpe}/10` : `RPE: ${avgRpe}/10`);
          lines.push(`    ${parts.join(' | ')}`);
        }
      });
    }

    lines.push('');
    lines.push(divider);
    lines.push(isHe ? `נוצר ע"י GainGoals 💪` : `Generated by GainGoals 💪`);
    return lines.join('\n');
  };

  const text = generateText();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: isHe ? 'דוח התקדמות' : 'Progress Report', text });
    } else {
      handleCopy();
    }
  };

  const BackIcon = isHe ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen pb-20 px-4 pt-6" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <BackIcon className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{t('share.title')}</h1>
      </div>

      {summary.totalWorkouts === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-muted-foreground">
          <Share2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{t('share.noData')}</p>
        </motion.div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4 mb-4">
            <pre className="text-xs font-mono whitespace-pre-wrap text-foreground leading-relaxed" dir="ltr">
              {text}
            </pre>
          </motion.div>

          <div className="flex gap-3">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={handleCopy}
              className="flex-1 bg-secondary text-foreground rounded-xl py-3 font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              {copied ? t('share.copied') : t('share.copy')}
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={handleShare}
              className="flex-1 gradient-primary text-primary-foreground rounded-xl py-3 font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Share2 className="w-5 h-5" />
              {t('share.send')}
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareProgress;
