export type Lang = 'he' | 'en';

const translations = {
  // Nav
  'nav.home': { he: 'ראשי', en: 'Home' },
  'nav.workout': { he: 'אימון', en: 'Workout' },
  'nav.progress': { he: 'התקדמות', en: 'Progress' },
  'nav.profile': { he: 'פרופיל', en: 'Profile' },

  // Dashboard
  'dash.hello': { he: 'שלום! 💪', en: 'Hello! 💪' },
  'dash.startWorkout': { he: 'התחל אימון', en: 'Start Workout' },
  'dash.startWorkoutSub': { he: 'בחר תוכנית והתחל לתעד', en: 'Choose a routine and start logging' },
  'dash.streak': { he: 'רצף ימים', en: 'Day Streak' },
  'dash.thisWeek': { he: 'השבוע', en: 'This Week' },
  'dash.kg': { he: 'ק"ג', en: 'kg' },
  'dash.weightTrend': { he: 'מגמת משקל', en: 'Weight Trend' },
  'dash.recentWorkouts': { he: 'אימונים אחרונים', en: 'Recent Workouts' },
  'dash.noWorkouts': { he: 'עדיין אין אימונים — התחל את הראשון! 🚀', en: 'No workouts yet — start your first! 🚀' },
  'dash.exercises': { he: 'תרגילים', en: 'exercises' },
  'dash.minutes': { he: 'דקות', en: 'min' },

  // Workout Select
  'ws.title': { he: 'בחר אימון', en: 'Choose Workout' },
  'ws.subtitle': { he: 'בחר תוכנית אימון להתחיל', en: 'Select a training routine to begin' },
  'ws.exercisesAndWarmup': { he: 'תרגילים + חימום', en: 'exercises + warmup' },

  // Workout Logger
  'wl.notFound': { he: 'אימון לא נמצא', en: 'Workout not found' },
  'wl.warmup': { he: 'חימום', en: 'Warmup' },
  'wl.set': { he: 'סט', en: 'Set' },
  'wl.reps': { he: 'חזרות', en: 'Reps' },
  'wl.weight': { he: 'משקל (ק"ג)', en: 'Weight (kg)' },
  'wl.painLevel': { he: 'רמת כאב', en: 'Pain Level' },
  'wl.rpe': { he: 'RPE (מאמץ)', en: 'RPE (Effort)' },
  'wl.notes': { he: 'הערות / שינויים / התאמות...', en: 'Notes / modifications...' },
  'wl.skip': { he: 'דלג', en: 'Skip' },
  'wl.next': { he: 'הבא', en: 'Next' },
  'wl.finish': { he: 'סיים אימון 🎉', en: 'Finish Workout 🎉' },
  'wl.watchVideo': { he: 'צפה בסרטון', en: 'Watch Video' },
  'wl.congrats': { he: 'כל הכבוד! 🎉', en: 'Great Job! 🎉' },
  'wl.completed': { he: 'תרגילים הושלמו', en: 'exercises completed' },
  'wl.backHome': { he: 'חזרה לראשי', en: 'Back to Home' },

  // Rest Timer
  'timer.rest': { he: 'מנוחה', en: 'Rest' },
  'timer.skip': { he: 'דלג על מנוחה', en: 'Skip Rest' },
  'timer.restTime': { he: 'זמן מנוחה (שניות)', en: 'Rest Time (seconds)' },

  // Sensitivity
  'sens.title': { he: 'אזורים רגישים', en: 'Sensitive Areas' },
  'sens.compact': { he: 'זהירות: גב וברכיים — התאם עומסים ותנועות', en: 'Caution: Back & Knees — adjust loads and movements' },
  'sens.detail': {
    he: 'שים לב לביצוע תקין, הקטן עומסים בעת כאב, ורשום כל שינוי או אי-נוחות.',
    en: 'Pay attention to proper form, reduce loads during pain, and log any changes or discomfort.',
  },
  'sens.back': { he: 'גב', en: 'Back' },
  'sens.knees': { he: 'ברכיים', en: 'Knees' },

  // Profile
  'prof.title': { he: 'פרופיל', en: 'Profile' },
  'prof.personal': { he: 'פרטים אישיים', en: 'Personal Info' },
  'prof.age': { he: 'גיל', en: 'Age' },
  'prof.height': { he: 'גובה', en: 'Height' },
  'prof.cm': { he: 'ס"מ', en: 'cm' },
  'prof.currentWeight': { he: 'משקל נוכחי', en: 'Current Weight' },
  'prof.updateWeight': { he: 'עדכון משקל', en: 'Update Weight' },
  'prof.newWeight': { he: 'משקל חדש (ק״ג)', en: 'New weight (kg)' },
  'prof.save': { he: 'שמור', en: 'Save' },
  'prof.goals': { he: 'מטרות', en: 'Goals' },
  'prof.weightHistory': { he: 'היסטוריית משקל', en: 'Weight History' },
  'prof.language': { he: 'שפה', en: 'Language' },

  // Progress
  'prog.title': { he: 'התקדמות', en: 'Progress' },
  'prog.bodyWeight': { he: 'משקל גוף', en: 'Body Weight' },
  'prog.addWeightForChart': { he: 'הוסף מדידות משקל כדי לראות גרף', en: 'Add weight measurements to see a chart' },
  'prog.calendar': { he: 'לוח אימונים (30 ימים אחרונים)', en: 'Training Calendar (Last 30 Days)' },
  'prog.weeklyFreq': { he: 'תדירות אימונים שבועית', en: 'Weekly Training Frequency' },
  'prog.exerciseStats': { he: 'סטטיסטיקת תרגילים', en: 'Exercise Stats' },
  'prog.workouts': { he: 'אימונים', en: 'workouts' },
  'prog.max': { he: 'מקס', en: 'Max' },
  'prog.volume': { he: 'נפח', en: 'Volume' },
  'prog.doWorkouts': { he: 'בצע אימונים כדי לראות התקדמות 📊', en: 'Complete workouts to see progress 📊' },
  'prog.week': { he: 'שבוע', en: 'Week' },

  // Goals translations
  'goal.toning': { he: 'חיטוב', en: 'Toning' },
  'goal.flexibility': { he: 'גמישות', en: 'Flexibility' },
  'goal.strength': { he: 'כוח', en: 'Strength' },
} as const;

export type TransKey = keyof typeof translations;

export const t = (key: TransKey, lang: Lang): string => {
  return translations[key]?.[lang] || key;
};

export default translations;
