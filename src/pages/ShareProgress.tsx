import { useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import {
  ArrowRight, ArrowLeft, Download, Share2, Copy, Check,
  Dumbbell, Calendar, Clock, Flame, Trophy, TrendingUp, TrendingDown, Minus,
  Activity, Target, Zap, Heart, ChevronDown, ChevronUp, Sparkles, AlertTriangle,
  BarChart3, Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, LineChart, Line
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
  const [showExercises, setShowExercises] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

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

    // Routine distribution
    const routineDistribution = Object.entries(routineCount).map(([name, count]) => ({ name, value: count }));

    // Exercises ranked by improvement
    const exerciseList = Object.entries(exerciseMap)
      .map(([name, d]) => {
        const weightChange = d.firstWeight > 0 ? Math.round(((d.lastWeight - d.firstWeight) / d.firstWeight) * 100) : 0;
        return { name, ...d, weightChange };
      })
      .sort((a, b) => b.weightChange - a.weightChange);

    const prs = exerciseList.filter(e => e.maxWeight > 0 && e.lastWeight >= e.maxWeight).length;

    // Streaks
    const uniqueDays = [...new Set(sorted.map(w => w.date.split('T')[0]))].sort();
    let maxStreak = 0, tempStreak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const diff = (new Date(uniqueDays[i]).getTime() - new Date(uniqueDays[i - 1]).getTime()) / 86400000;
      if (diff <= 3) { tempStreak++; } else { tempStreak = 1; }
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    }
    let currentStreak = 0;
    if (uniqueDays.length > 0) {
      currentStreak = 1;
      for (let i = uniqueDays.length - 1; i > 0; i--) {
        const diff = (new Date(uniqueDays[i]).getTime() - new Date(uniqueDays[i - 1]).getTime()) / 86400000;
        if (diff <= 3) currentStreak++; else break;
      }
    }

    // Consistency
    const last30Days = new Set(last30.map(w => w.date.split('T')[0])).size;
    const consistency = Math.min(100, Math.round((last30Days / 20) * 100));

    // Volume trend
    const last30Vol = last30.reduce((sum, w) => {
      let v = 0; w.exercises.forEach(ex => { if (!ex.skipped) ex.sets.forEach(s => { if (s.completed) v += s.reps * (s.weight || 0); }); });
      return sum + v;
    }, 0);
    const prev30Vol = prev30.reduce((sum, w) => {
      let v = 0; w.exercises.forEach(ex => { if (!ex.skipped) ex.sets.forEach(s => { if (s.completed) v += s.reps * (s.weight || 0); }); });
      return sum + v;
    }, 0);
    const volumeTrend = prev30Vol > 0 ? Math.round(((last30Vol - prev30Vol) / prev30Vol) * 100) : 0;

    // Avg workouts per week
    const firstDate = new Date(sorted[0].date);
    const weeks = Math.max(1, Math.ceil((now.getTime() - firstDate.getTime()) / (7 * 86400000)));
    const avgPerWeek = Math.round((workoutHistory.length / weeks) * 10) / 10;

    // Biggest improvement
    const biggestImprovement = exerciseList.find(e => e.weightChange > 0);

    // Insights
    const insights: { icon: any; text: string; type: 'positive' | 'warning' | 'neutral' }[] = [];
    if (biggestImprovement && biggestImprovement.weightChange > 0) {
      insights.push({
        icon: TrendingUp, type: 'positive',
        text: isHe
          ? `שיפור של ${biggestImprovement.weightChange}% ב-${biggestImprovement.name}`
          : `${biggestImprovement.weightChange}% improvement in ${biggestImprovement.name}`,
      });
    }
    if (volumeTrend > 5) {
      insights.push({
        icon: Flame, type: 'positive',
        text: isHe ? `נפח אימון עלה ב-${volumeTrend}% ב-30 ימים אחרונים` : `Training volume up ${volumeTrend}% in last 30 days`,
      });
    } else if (volumeTrend < -5) {
      insights.push({
        icon: AlertTriangle, type: 'warning',
        text: isHe ? `נפח אימון ירד ב-${Math.abs(volumeTrend)}% — שקול להגביר עומסים` : `Volume dropped ${Math.abs(volumeTrend)}% — consider increasing loads`,
      });
    }
    if (consistency >= 70) {
      insights.push({
        icon: Sparkles, type: 'positive',
        text: isHe ? `עקביות מעולה — ${consistency}% ב-30 ימים אחרונים` : `Excellent consistency — ${consistency}% in last 30 days`,
      });
    } else if (consistency < 40 && workoutHistory.length > 3) {
      insights.push({
        icon: Target, type: 'warning',
        text: isHe ? `עקביות נמוכה (${consistency}%) — נסה 3-4 אימונים בשבוע` : `Low consistency (${consistency}%) — try 3-4 workouts/week`,
      });
    }
    if (prs >= 2) {
      insights.push({
        icon: Trophy, type: 'positive',
        text: isHe ? `${prs} שיאים אישיים חדשים! 🏆` : `${prs} new personal records! 🏆`,
      });
    }

    return {
      totalWorkouts: workoutHistory.length, totalSets, totalReps, totalVolume, totalDuration,
      maxWeight, prs, currentStreak, maxStreak, consistency, volumeTrend, avgPerWeek,
      exerciseList, volumeOverTime, monthlyComparison, routineDistribution,
      last30Count: last30.length, uniqueDays: uniqueDays.length, insights,
      biggestImprovement,
      weightChange: profile.weightHistory.length >= 2
        ? Math.round((profile.weightHistory[profile.weightHistory.length - 1].weight - profile.weightHistory[0].weight) * 10) / 10
        : null,
    };
  }, [workoutHistory, profile, locale, isHe]);

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
    if (!pdfRef.current) return;
    setExporting(true);

    // Show the hidden PDF-optimized div
    const pdfEl = pdfRef.current;
    pdfEl.style.display = 'block';

    try {
      // Wait for charts to render
      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(pdfEl, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: pdfEl.scrollWidth,
        height: pdfEl.scrollHeight,
      });

      pdfEl.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = canvas.width;
      const imgH = canvas.height;

      const scaledFullH = (imgH / imgW) * pdfW;
      if (scaledFullH <= pdfH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, scaledFullH);
      } else {
        let y = 0;
        const sliceH = (pdfH / pdfW) * imgW;
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
      pdfEl.style.display = 'none';
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

  // ===== PDF-OPTIMIZED CONTENT (hidden, white bg, no animations) =====
  const PdfReport = () => (
    <div
      ref={pdfRef}
      style={{
        display: 'none',
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '800px',
        backgroundColor: '#ffffff',
        color: '#1a1a1a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '40px',
        direction: isHe ? 'rtl' : 'ltr',
      }}
    >
      {/* PDF Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '3px solid #dc2626', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', margin: 0 }}>GainGoals</h1>
          <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0' }}>
            {isHe ? 'דוח התקדמות' : 'Progress Report'} • {profile.name} • {new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', fontWeight: 800, color: '#dc2626' }}>{stats.totalWorkouts}</div>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {isHe ? 'אימונים' : 'WORKOUTS'}
          </div>
        </div>
      </div>

      {/* PDF KPIs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '30px' }}>
        {[
          { label: isHe ? 'נפח כולל' : 'Total Volume', value: `${(stats.totalVolume / 1000).toFixed(1)}t`, sub: stats.volumeTrend !== 0 ? `${stats.volumeTrend > 0 ? '+' : ''}${stats.volumeTrend}%` : '' },
          { label: isHe ? 'משקל מקסימלי' : 'Max Weight', value: `${stats.maxWeight}kg` },
          { label: isHe ? 'עקביות' : 'Consistency', value: `${stats.consistency}%` },
          { label: isHe ? 'שיאים אישיים' : 'Personal Records', value: `${stats.prs}` },
          { label: isHe ? 'זמן כולל' : 'Total Time', value: `${Math.round(stats.totalDuration / 60)}h ${stats.totalDuration % 60}m` },
          { label: isHe ? 'רצף' : 'Streak', value: `${stats.currentStreak}`, sub: `${isHe ? 'מקסימום' : 'Best'}: ${stats.maxStreak}` },
        ].map((kpi, i) => (
          <div key={i} style={{ border: '1px solid #e5e5e5', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a' }}>{kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: '11px', color: kpi.sub.startsWith('+') ? '#16a34a' : kpi.sub.startsWith('-') ? '#dc2626' : '#888', marginTop: '4px', fontWeight: 600 }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* PDF Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '30px' }}>
        {[
          { label: isHe ? 'סטים' : 'Sets', value: stats.totalSets.toLocaleString() },
          { label: isHe ? 'חזרות' : 'Reps', value: stats.totalReps.toLocaleString() },
          { label: isHe ? 'ממוצע/שבוע' : 'Avg/Week', value: `${stats.avgPerWeek}` },
          { label: isHe ? 'שינוי משקל' : 'Body Weight Δ', value: stats.weightChange !== null ? `${stats.weightChange > 0 ? '+' : ''}${stats.weightChange}kg` : '—' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#f9f9f9', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* PDF Insights */}
      {stats.insights.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#333' }}>
            {isHe ? '💡 תובנות' : '💡 Insights'}
          </h3>
          {stats.insights.map((ins, i) => (
            <div key={i} style={{
              padding: '10px 14px', marginBottom: '8px', borderRadius: '8px',
              border: `1px solid ${ins.type === 'positive' ? '#bbf7d0' : ins.type === 'warning' ? '#fef08a' : '#e5e5e5'}`,
              background: ins.type === 'positive' ? '#f0fdf4' : ins.type === 'warning' ? '#fefce8' : '#fafafa',
              fontSize: '12px', color: '#333',
            }}>
              {ins.type === 'positive' ? '✅' : ins.type === 'warning' ? '⚠️' : 'ℹ️'} {ins.text}
            </div>
          ))}
        </div>
      )}

      {/* PDF Volume Chart */}
      {stats.volumeOverTime.length >= 2 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#333' }}>
            {isHe ? '📈 נפח אימון לאורך זמן' : '📈 Training Volume Over Time'}
          </h3>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.volumeOverTime}>
                <defs>
                  <linearGradient id="pdfVolGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} width={45} />
                <Area type="monotone" dataKey="volume" stroke="#dc2626" strokeWidth={2} fill="url(#pdfVolGrad)" dot={{ r: 3, fill: '#dc2626' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* PDF Monthly Comparison */}
      {stats.monthlyComparison.length >= 2 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#333' }}>
            {isHe ? '📊 השוואה חודשית' : '📊 Monthly Comparison'}
          </h3>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyComparison}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} width={40} />
                <Bar dataKey="sessions" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* PDF Workout Distribution */}
      {stats.routineDistribution.length >= 2 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#333' }}>
            {isHe ? '🎯 התפלגות אימונים' : '🎯 Workout Distribution'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '200px', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.routineDistribution} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={3}>
                    {stats.routineDistribution.map((_, i) => (
                      <Cell key={i} fill={['#dc2626', '#f97316', '#16a34a', '#0ea5e9', '#8b5cf6'][i % 5]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              {stats.routineDistribution.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: ['#dc2626', '#f97316', '#16a34a', '#0ea5e9', '#8b5cf6'][i % 5] }} />
                  <span style={{ color: '#555' }}>{r.name}</span>
                  <span style={{ fontWeight: 700, marginLeft: '8px' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PDF Exercise Table */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#333' }}>
          {isHe ? '💪 התקדמות בתרגילים' : '💪 Exercise Progress'}
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e5e5' }}>
              <th style={{ textAlign: isHe ? 'right' : 'left', padding: '8px 4px', color: '#888', fontWeight: 600 }}>{isHe ? 'תרגיל' : 'Exercise'}</th>
              <th style={{ textAlign: 'center', padding: '8px 4px', color: '#888', fontWeight: 600 }}>{isHe ? 'פעמים' : 'Sessions'}</th>
              <th style={{ textAlign: 'center', padding: '8px 4px', color: '#888', fontWeight: 600 }}>{isHe ? 'מקס' : 'Max'}</th>
              <th style={{ textAlign: 'center', padding: '8px 4px', color: '#888', fontWeight: 600 }}>{isHe ? 'נפח' : 'Volume'}</th>
              <th style={{ textAlign: 'center', padding: '8px 4px', color: '#888', fontWeight: 600 }}>{isHe ? 'שינוי' : 'Change'}</th>
            </tr>
          </thead>
          <tbody>
            {stats.exerciseList.map((ex, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 4px', fontWeight: 500 }}>
                  {ex.name} {ex.lastWeight >= ex.maxWeight && ex.maxWeight > 0 ? '🏆' : ''}
                </td>
                <td style={{ textAlign: 'center', padding: '8px 4px' }}>{ex.sessions}</td>
                <td style={{ textAlign: 'center', padding: '8px 4px' }}>{ex.maxWeight > 0 ? `${ex.maxWeight}kg` : '—'}</td>
                <td style={{ textAlign: 'center', padding: '8px 4px' }}>{ex.totalVolume.toLocaleString()}</td>
                <td style={{ textAlign: 'center', padding: '8px 4px', fontWeight: 700, color: ex.weightChange > 0 ? '#16a34a' : ex.weightChange < 0 ? '#dc2626' : '#888' }}>
                  {ex.weightChange !== 0 ? `${ex.weightChange > 0 ? '+' : ''}${ex.weightChange}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PDF Footer */}
      <div style={{ borderTop: '2px solid #e5e5e5', paddingTop: '16px', textAlign: 'center', color: '#aaa', fontSize: '11px' }}>
        💪 GainGoals Progress Report • {new Date().toLocaleDateString(locale)} • {isHe ? 'נוצר אוטומטית' : 'Auto-generated'}
      </div>
    </div>
  );

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

      {/* On-Screen Report */}
      <div ref={reportRef} className="space-y-4">
        {/* Hero Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="gradient-primary rounded-2xl p-5 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">{isHe ? 'דוח התקדמות' : 'PROGRESS REPORT'}</p>
            <h2 className="text-2xl font-black mb-0.5">{profile.name}</h2>
            <p className="text-xs opacity-80">{new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</p>
            <div className="flex items-end gap-3 mt-3">
              <div>
                <div className="text-4xl font-black">{stats.totalWorkouts}</div>
                <div className="text-[10px] opacity-70">{isHe ? 'אימונים' : 'workouts'}</div>
              </div>
              <div className="h-8 w-px bg-primary-foreground/20" />
              <div>
                <div className="text-2xl font-bold">{stats.avgPerWeek}</div>
                <div className="text-[10px] opacity-70">{isHe ? 'ממוצע/שבוע' : 'avg/week'}</div>
              </div>
              <div className="h-8 w-px bg-primary-foreground/20" />
              <div>
                <div className="text-2xl font-bold">{Math.round(stats.totalDuration / 60)}h</div>
                <div className="text-[10px] opacity-70">{isHe ? 'סה"כ זמן' : 'total time'}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Smart Insights */}
        {stats.insights.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="space-y-2">
            {stats.insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-2.5 rounded-xl p-3 border ${
                ins.type === 'positive' ? 'border-green-500/30 bg-green-500/5' :
                ins.type === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' :
                'border-border bg-card'
              }`}>
                <ins.icon className={`w-4 h-4 mt-0.5 shrink-0 ${
                  ins.type === 'positive' ? 'text-green-400' : ins.type === 'warning' ? 'text-yellow-400' : 'text-muted-foreground'
                }`} />
                <p className="text-xs leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* KPI Grid */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Flame, label: isHe ? 'נפח כולל' : 'Total Volume', value: `${(stats.totalVolume / 1000).toFixed(1)}`, unit: 't', trend: stats.volumeTrend },
            { icon: Dumbbell, label: isHe ? 'משקל מקסימלי' : 'Max Weight', value: `${stats.maxWeight}`, unit: isHe ? 'ק"ג' : 'kg' },
            { icon: Target, label: isHe ? 'עקביות' : 'Consistency', value: `${stats.consistency}`, unit: '%', bar: stats.consistency },
            { icon: Trophy, label: isHe ? 'שיאים' : 'PRs', value: `${stats.prs}`, highlight: true },
            { icon: Zap, label: isHe ? 'רצף' : 'Streak', value: `${stats.currentStreak}`, sub: `${isHe ? 'שיא' : 'Best'}: ${stats.maxStreak}` },
            { icon: Heart, label: isHe ? 'שינוי משקל' : 'Weight Δ', value: stats.weightChange !== null ? `${stats.weightChange > 0 ? '+' : ''}${stats.weightChange}` : '—', unit: stats.weightChange !== null ? 'kg' : '', bodyWeight: true },
          ].map((kpi, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-3 text-center">
              <kpi.icon className={`w-4 h-4 mx-auto mb-1.5 ${kpi.highlight ? 'text-yellow-400' : 'text-primary'}`} />
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-lg font-bold">{kpi.value}</span>
                {kpi.unit && <span className="text-[10px] text-muted-foreground">{kpi.unit}</span>}
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{kpi.label}</p>
              {kpi.trend !== undefined && kpi.trend !== 0 && (
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  <TrendArrow value={kpi.trend} />
                  <span className={`text-[9px] font-semibold ${kpi.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                  </span>
                </div>
              )}
              {kpi.bar !== undefined && (
                <div className="h-1 bg-secondary rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full gradient-primary" style={{ width: `${kpi.bar}%` }} />
                </div>
              )}
              {kpi.sub && <p className="text-[8px] text-muted-foreground mt-0.5">{kpi.sub}</p>}
            </div>
          ))}
        </motion.div>

        {/* Volume Over Time */}
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
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              {isHe ? 'השוואה חודשית (אימונים)' : 'Monthly Sessions'}
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

        {/* Workout Distribution */}
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

        {/* Exercise Progress - Collapsible */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowExercises(!showExercises)}
            className="w-full flex items-center justify-between p-4 text-start"
          >
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-xs font-semibold text-muted-foreground">
                {isHe ? 'התקדמות בתרגילים' : 'Exercise Progress'}
              </h3>
              <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5">{stats.exerciseList.length}</span>
            </div>
            {showExercises ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {showExercises && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 pb-4 space-y-2.5">
                  {stats.exerciseList.map((ex, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium truncate">{ex.name}</span>
                          {ex.lastWeight >= ex.maxWeight && ex.maxWeight > 0 && <span className="text-[10px]">🏆</span>}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>{ex.sessions}x</span>
                          {ex.maxWeight > 0 && <span>{isHe ? 'מקס' : 'Max'}: {ex.maxWeight}{isHe ? 'ק"ג' : 'kg'}</span>}
                          <span>{isHe ? 'נפח' : 'Vol'}: {ex.totalVolume.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        {ex.weightChange !== 0 ? (
                          <span className={`text-xs font-bold ${ex.weightChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {ex.weightChange > 0 ? '+' : ''}{ex.weightChange}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

      {/* Hidden PDF-optimized report */}
      <PdfReport />
    </div>
  );
};

export default ShareProgress;
