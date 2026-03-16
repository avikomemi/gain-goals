import { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import {
  ArrowRight, ArrowLeft, Download, Share2, Copy, Check,
  Dumbbell, Calendar, Clock, Flame, Trophy, TrendingUp, TrendingDown, Minus,
  Activity, Target, Zap, Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, RadialBarChart, RadialBar
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ShareProgress = () => {
  const { profile, workoutHistory } = useApp();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const isHe = lang === 'he';
  const locale = isHe ? 'he-IL' : 'en-US';
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const BackIcon = isHe ? ArrowRight : ArrowLeft;

  const stats = useMemo(() => {
    if (workoutHistory.length === 0) return null;

    const sorted = [...workoutHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const now = new Date();
    const last30 = sorted.filter(w => (now.getTime() - new Date(w.date).getTime()) / 86400000 <= 30);
    const prev30 = sorted.filter(w => {
      const diff = (now.getTime() - new Date(w.date).getTime()) / 86400000;
      return diff > 30 && diff <= 60;
    });

    let totalSets = 0, totalReps = 0, totalVolume = 0, totalDuration = 0;
    let maxWeight = 0;
    const exerciseMap: Record<string, {
      sessions: number; maxWeight: number; firstWeight: number; lastWeight: number;
      totalVolume: number; totalReps: number; pain: number[]; rpe: number[];
      data: { date: string; weight: number; volume: number }[];
    }> = {};

    // Routine distribution
    const routineCount: Record<string, number> = {};

    sorted.forEach(w => {
      totalDuration += w.duration;
      routineCount[w.routineName] = (routineCount[w.routineName] || 0) + 1;

      w.exercises.forEach(ex => {
        if (ex.skipped) return;
        if (!exerciseMap[ex.exerciseName]) {
          exerciseMap[ex.exerciseName] = {
            sessions: 0, maxWeight: 0, firstWeight: 0, lastWeight: 0,
            totalVolume: 0, totalReps: 0, pain: [], rpe: [],
            data: [],
          };
        }
        const entry = exerciseMap[ex.exerciseName];
        entry.sessions++;
        if (ex.painLevel > 0) entry.pain.push(ex.painLevel);
        if (ex.rpe > 0) entry.rpe.push(ex.rpe);

        let sessionVol = 0, sessionMax = 0, sessionReps = 0;
        ex.sets.forEach(s => {
          if (s.completed) {
            totalSets++; totalReps += s.reps;
            const vol = s.reps * (s.weight || 0);
            totalVolume += vol; sessionVol += vol; sessionReps += s.reps;
            if (s.weight > maxWeight) maxWeight = s.weight;
            if (s.weight > sessionMax) sessionMax = s.weight;
            if (s.weight > entry.maxWeight) entry.maxWeight = s.weight;
          }
        });

        if (entry.firstWeight === 0 && sessionMax > 0) entry.firstWeight = sessionMax;
        if (sessionMax > 0) entry.lastWeight = sessionMax;
        entry.totalVolume += sessionVol;
        entry.totalReps += sessionReps;
        entry.data.push({
          date: new Date(w.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
          weight: sessionMax,
          volume: sessionVol,
        });
      });
    });

    // Volume over time
    const volumeOverTime = sorted.map(w => {
      let vol = 0;
      w.exercises.forEach(ex => {
        if (!ex.skipped) ex.sets.forEach(s => { if (s.completed) vol += s.reps * (s.weight || 0); });
      });
      return {
        date: new Date(w.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
        volume: vol,
      };
    });

    // Monthly comparison
    const monthMap: Record<string, { volume: number; sessions: number }> = {};
    sorted.forEach(w => {
      const key = new Date(w.date).toLocaleDateString(locale, { month: 'short', year: '2-digit' });
      if (!monthMap[key]) monthMap[key] = { volume: 0, sessions: 0 };
      monthMap[key].sessions++;
      w.exercises.forEach(ex => {
        if (!ex.skipped) ex.sets.forEach(s => { if (s.completed) monthMap[key].volume += s.reps * (s.weight || 0); });
      });
    });
    const monthlyComparison = Object.entries(monthMap).map(([month, d]) => ({ month, ...d }));

    // Routine distribution for pie chart
    const routineDistribution = Object.entries(routineCount).map(([name, count]) => ({ name, value: count }));

    // Exercises ranked by improvement
    const exerciseList = Object.entries(exerciseMap)
      .map(([name, d]) => {
        const weightChange = d.firstWeight > 0 ? Math.round(((d.lastWeight - d.firstWeight) / d.firstWeight) * 100) : 0;
        return { name, ...d, weightChange };
      })
      .sort((a, b) => b.weightChange - a.weightChange);

    // PRs
    const prs = exerciseList.filter(e => e.maxWeight > 0 && e.lastWeight >= e.maxWeight).length;

    // Streaks
    const uniqueDays = [...new Set(sorted.map(w => w.date.split('T')[0]))].sort();
    let currentStreak = 0, maxStreak = 0, tempStreak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const diff = (new Date(uniqueDays[i]).getTime() - new Date(uniqueDays[i - 1]).getTime()) / 86400000;
      if (diff <= 3) { tempStreak++; } else { tempStreak = 1; }
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    }
    // Current streak from end
    if (uniqueDays.length > 0) {
      currentStreak = 1;
      for (let i = uniqueDays.length - 1; i > 0; i--) {
        const diff = (new Date(uniqueDays[i]).getTime() - new Date(uniqueDays[i - 1]).getTime()) / 86400000;
        if (diff <= 3) currentStreak++; else break;
      }
    }

    // Consistency (last 30 days)
    const last30Days = new Set(last30.map(w => w.date.split('T')[0])).size;
    const consistency = Math.min(100, Math.round((last30Days / 20) * 100));

    // Last 30 vs prev 30 volume
    const last30Vol = last30.reduce((sum, w) => {
      let v = 0; w.exercises.forEach(ex => { if (!ex.skipped) ex.sets.forEach(s => { if (s.completed) v += s.reps * (s.weight || 0); }); });
      return sum + v;
    }, 0);
    const prev30Vol = prev30.reduce((sum, w) => {
      let v = 0; w.exercises.forEach(ex => { if (!ex.skipped) ex.sets.forEach(s => { if (s.completed) v += s.reps * (s.weight || 0); }); });
      return sum + v;
    }, 0);
    const volumeTrend = prev30Vol > 0 ? Math.round(((last30Vol - prev30Vol) / prev30Vol) * 100) : 0;

    return {
      totalWorkouts: workoutHistory.length, totalSets, totalReps, totalVolume, totalDuration,
      maxWeight, prs, currentStreak, maxStreak, consistency, volumeTrend,
      exerciseList, volumeOverTime, monthlyComparison, routineDistribution,
      last30Count: last30.length, uniqueDays: uniqueDays.length,
      weightChange: profile.weightHistory.length >= 2
        ? Math.round((profile.weightHistory[profile.weightHistory.length - 1].weight - profile.weightHistory[0].weight) * 10) / 10
        : null,
    };
  }, [workoutHistory, profile, locale]);

  const COLORS = ['hsl(0,85%,46%)', 'hsl(25,95%,53%)', 'hsl(145,63%,42%)', 'hsl(195,80%,50%)', 'hsl(280,70%,60%)'];

  const handleCopy = async () => {
    if (!stats) return;
    const text = [
      `📊 GainGoals ${isHe ? 'דוח התקדמות' : 'Progress Report'}`,
      `${isHe ? 'אימונים' : 'Workouts'}: ${stats.totalWorkouts}`,
      `${isHe ? 'נפח כולל' : 'Total Volume'}: ${stats.totalVolume.toLocaleString()} kg`,
      `${isHe ? 'שיא' : 'Max Weight'}: ${stats.maxWeight} kg`,
      `${isHe ? 'שיאים אישיים' : 'PRs'}: ${stats.prs}`,
      `💪 GainGoals`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#0f0f0f',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = Math.min(pdfW / imgW, pdfH / imgH);
      const w = imgW * ratio;
      const h = imgH * ratio;

      // If content is taller than one page, split
      const pageHeight = pdfH;
      const scaledFullH = (imgH / imgW) * pdfW;
      if (scaledFullH <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, scaledFullH);
      } else {
        let y = 0;
        const sliceH = (pageHeight / pdfW) * imgW;
        let page = 0;
        while (y < imgH) {
          if (page > 0) pdf.addPage();
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = imgW;
          sliceCanvas.height = Math.min(sliceH, imgH - y);
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, y, imgW, sliceCanvas.height, 0, 0, imgW, sliceCanvas.height);
            const sliceData = sliceCanvas.toDataURL('image/png');
            const sliceScaledH = (sliceCanvas.height / imgW) * pdfW;
            pdf.addImage(sliceData, 'PNG', 0, 0, pdfW, sliceScaledH);
          }
          y += sliceH;
          page++;
        }
      }

      const now = new Date();
      const fileName = `GainGoals_Progress_Report_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && stats) {
      await navigator.share({
        title: isHe ? 'דוח התקדמות GainGoals' : 'GainGoals Progress Report',
        text: `${isHe ? 'אימונים' : 'Workouts'}: ${stats.totalWorkouts} | ${isHe ? 'נפח' : 'Volume'}: ${stats.totalVolume.toLocaleString()}kg`,
      });
    } else {
      handleCopy();
    }
  };

  const TrendArrow = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
    if (value < 0) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  if (!stats || stats.totalWorkouts === 0) {
    return (
      <div className="min-h-screen pb-20 px-4 pt-6" dir={isHe ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <BackIcon className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">{t('share.title')}</h1>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-muted-foreground">
          <Share2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{t('share.noData')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 px-4 pt-6" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <BackIcon className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t('share.title')}</h1>
        </div>
      </div>

      {/* Exportable Report Content */}
      <div ref={reportRef} className="space-y-4">
        {/* Report Header Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="gradient-primary rounded-2xl p-5 text-primary-foreground">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-bold">{isHe ? 'דוח התקדמות' : 'Progress Report'}</h2>
              <p className="text-xs opacity-80">{profile.name} • {new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="text-3xl font-black">{stats.totalWorkouts}</div>
          </div>
          <p className="text-[11px] opacity-70">{isHe ? 'סה"כ אימונים מתועדים' : 'Total recorded workouts'}</p>
        </motion.div>

        {/* KPI Grid */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3">
          {/* Volume */}
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground">{isHe ? 'נפח כולל' : 'Total Volume'}</span>
            </div>
            <p className="text-xl font-bold">{(stats.totalVolume / 1000).toFixed(1)}<span className="text-xs text-muted-foreground ml-0.5">t</span></p>
            {stats.volumeTrend !== 0 && (
              <div className="flex items-center gap-1 mt-1">
                <TrendArrow value={stats.volumeTrend} />
                <span className={`text-[10px] font-semibold ${stats.volumeTrend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.volumeTrend > 0 ? '+' : ''}{stats.volumeTrend}% {isHe ? 'מ-30 יום' : 'vs 30d'}
                </span>
              </div>
            )}
          </div>

          {/* Max Weight */}
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Dumbbell className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground">{isHe ? 'משקל מקסימלי' : 'Max Weight'}</span>
            </div>
            <p className="text-xl font-bold">{stats.maxWeight}<span className="text-xs text-muted-foreground ml-0.5">{isHe ? 'ק"ג' : 'kg'}</span></p>
          </div>

          {/* Consistency */}
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground">{isHe ? 'עקביות' : 'Consistency'}</span>
            </div>
            <p className="text-xl font-bold">{stats.consistency}<span className="text-xs text-muted-foreground ml-0.5">%</span></p>
            <div className="h-1.5 bg-secondary rounded-full mt-1.5 overflow-hidden">
              <div className="h-full rounded-full gradient-primary" style={{ width: `${stats.consistency}%` }} />
            </div>
          </div>

          {/* PRs */}
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-[10px] text-muted-foreground">{isHe ? 'שיאים אישיים' : 'Personal Records'}</span>
            </div>
            <p className="text-xl font-bold">{stats.prs}</p>
          </div>

          {/* Total Time */}
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground">{isHe ? 'זמן כולל' : 'Total Time'}</span>
            </div>
            <p className="text-xl font-bold">{Math.round(stats.totalDuration / 60)}<span className="text-xs text-muted-foreground ml-0.5">{isHe ? 'שעות' : 'hrs'}</span></p>
            <p className="text-[10px] text-muted-foreground">{stats.totalDuration} {isHe ? 'דקות' : 'min'}</p>
          </div>

          {/* Streak */}
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground">{isHe ? 'רצף אימונים' : 'Streak'}</span>
            </div>
            <p className="text-xl font-bold">{stats.currentStreak}</p>
            <p className="text-[10px] text-muted-foreground">{isHe ? 'מקסימום' : 'Best'}: {stats.maxStreak}</p>
          </div>
        </motion.div>

        {/* Sets / Reps / Body Weight row */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold">{stats.totalSets.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{isHe ? 'סטים' : 'Sets'}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold">{stats.totalReps.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{isHe ? 'חזרות' : 'Reps'}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            {stats.weightChange !== null ? (
              <>
                <p className={`text-lg font-bold ${stats.weightChange < 0 ? 'text-green-400' : stats.weightChange > 0 ? 'text-red-400' : ''}`}>
                  {stats.weightChange > 0 ? '+' : ''}{stats.weightChange}
                </p>
                <p className="text-[10px] text-muted-foreground">{isHe ? 'שינוי ק"ג' : 'kg change'}</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold">{profile.weight}</p>
                <p className="text-[10px] text-muted-foreground">{isHe ? 'ק"ג' : 'kg'}</p>
              </>
            )}
          </div>
        </motion.div>

        {/* Volume Over Time Chart */}
        {stats.volumeOverTime.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" />
              {isHe ? 'נפח אימון לאורך זמן' : 'Training Volume Over Time'}
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={stats.volumeOverTime}>
                <defs>
                  <linearGradient id="shareVolGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0,85%,46%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0,85%,46%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(0,0%,50%)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(0,0%,50%)' }} width={35} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(0,0%,10%)', border: '1px solid hsl(0,0%,18%)', borderRadius: '8px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="volume" stroke="hsl(0,85%,46%)" strokeWidth={2} fill="url(#shareVolGrad)" dot={{ r: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Monthly Comparison */}
        {stats.monthlyComparison.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {isHe ? 'השוואה חודשית (אימונים)' : 'Monthly Comparison (Sessions)'}
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={stats.monthlyComparison}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(0,0%,50%)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(0,0%,50%)' }} width={25} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(0,0%,10%)', border: '1px solid hsl(0,0%,18%)', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="sessions" fill="hsl(0,85%,46%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Routine Distribution Pie */}
        {stats.routineDistribution.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-primary" />
              {isHe ? 'התפלגות אימונים' : 'Workout Distribution'}
            </h3>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={130}>
                <PieChart>
                  <Pie data={stats.routineDistribution} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3}>
                    {stats.routineDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(0,0%,10%)', border: '1px solid hsl(0,0%,18%)', borderRadius: '8px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {stats.routineDistribution.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{r.name}</span>
                    <span className="font-semibold ml-auto">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Exercises – Biggest Improvements */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            {isHe ? 'התקדמות בתרגילים' : 'Exercise Progress'}
          </h3>
          <div className="space-y-2.5">
            {stats.exerciseList.slice(0, 8).map((ex, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{ex.name}</span>
                    {ex.lastWeight >= ex.maxWeight && ex.maxWeight > 0 && (
                      <span className="text-[10px]">🏆</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>{ex.sessions}x</span>
                    <span>{isHe ? 'מקס' : 'Max'}: {ex.maxWeight}{isHe ? 'ק"ג' : 'kg'}</span>
                    <span>{isHe ? 'נפח' : 'Vol'}: {ex.totalVolume.toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-end">
                  {ex.weightChange !== 0 ? (
                    <span className={`text-xs font-bold ${ex.weightChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {ex.weightChange > 0 ? '+' : ''}{ex.weightChange}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  <p className="text-[9px] text-muted-foreground">{isHe ? 'שינוי משקל' : 'weight Δ'}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center py-2">
          <p className="text-[10px] text-muted-foreground">💪 GainGoals • {new Date().toLocaleDateString(locale)}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-5">
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          onClick={handleExportPDF}
          disabled={exporting}
          className="flex-1 gradient-primary text-primary-foreground rounded-xl py-3.5 font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
        >
          <Download className="w-5 h-5" />
          {exporting ? (isHe ? 'מייצא...' : 'Exporting...') : (isHe ? 'ייצוא PDF' : 'Export PDF')}
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          onClick={handleCopy}
          className="bg-secondary text-foreground rounded-xl py-3.5 px-4 font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          onClick={handleShare}
          className="bg-secondary text-foreground rounded-xl py-3.5 px-4 font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Share2 className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
};

export default ShareProgress;
