import { Routine, Exercise } from './types';

const commonWarmup: Exercise[] = [
  { id: 'wu-1', name: 'Cardio', nameHe: 'קרדיו', sets: '1', reps: '2-3 דקות', notes: 'ריצה / אופניים / חתירה / קפיצה בחבל', isWarmup: true },
  { id: 'wu-2', name: 'Lunge + Rotation / Side Band', nameHe: 'לאנג\' + סיבוב', sets: '1', reps: '10 מטר', isWarmup: true },
  { id: 'wu-3', name: 'Long Lunge + Reach Up', nameHe: 'לאנג\' ארוך + הושטה למעלה', sets: '1', reps: '10 מטר', notes: 'ידיים לתקרה', isWarmup: true },
  { id: 'wu-4', name: 'Cat/Cow', nameHe: 'חתול/פרה', sets: '1', reps: '10', isWarmup: true },
  { id: 'wu-5', name: 'Russian Baby Makers', sets: '1', reps: '10', isWarmup: true },
  { id: 'wu-6', name: 'Jefferson Curls', sets: '1', reps: '10', notes: 'הוסף משקל אם אפשר', isWarmup: true },
  { id: 'wu-7', name: 'Shoulder Dislocation (PVC)', nameHe: 'דיסלוקציית כתף', sets: '1', reps: '10', isWarmup: true },
  { id: 'wu-8', name: 'Press + Squat', nameHe: 'לחיצה + סקוואט', sets: '1', reps: '10', notes: 'אחיזה רחבה מאוד', isWarmup: true },
];

export const routines: Routine[] = [
  {
    id: 'strength-kb-plyo',
    name: 'Strength (KB) + Plyometrics',
    nameHe: 'כוח (קטלבל) + פליאומטרי',
    icon: '🏋️',
    warmup: commonWarmup,
    exercises: [
      { id: 'skb-1', name: 'Single KB Press', nameHe: 'לחיצת קטלבל בודד', sets: '3', reps: '6-8', notes: 'יד חופשית מבצעת תנועה הפוכה' },
      { id: 'skb-2', name: 'KB Swing', nameHe: 'סווינג קטלבל', sets: '3', reps: '10', notes: 'אל תקשת את הגב התחתון, נשיפה חזקה' },
      { id: 'skb-8', name: 'Single Leg Landing Practice', nameHe: 'תרגול נחיתה על רגל אחת', sets: '5', reps: '5', isBodyweight: true },
      { id: 'skb-3', name: 'Drop Lands', nameHe: 'נחיתות', sets: '3', reps: '3-4', notes: '30-45 ס"מ — ⚡ נעל את הנחיתה!', isBodyweight: true },
      { id: 'skb-4', name: 'Box Jump', nameHe: 'קפיצה לקופסה', sets: '3', reps: '3-4', notes: '30-45 ס"מ — שלוש הרחבות: ירך-ברך-קרסול', isBodyweight: true },
      { id: 'skb-5', name: 'Drop Jump to Broad Jump', nameHe: 'קפיצת נפילה לקפיצה רחבה', sets: '3-4', reps: '2-3', notes: '15-20 ס"מ, נחיתה בפיצול — ⚡ נעל את הנחיתה!', isBodyweight: true },
      { id: 'skb-6', name: 'FLOW', nameHe: 'פלואו — שחק עם תנועות', sets: '3', reps: '1', link: 'https://youtube.com/shorts/y_6i7nGHAio', isBodyweight: true },
      {
        id: 'skb-7', name: 'Thoracic Mobility', nameHe: 'ניידות בית החזה', sets: '1', reps: 'ראה פירוט', isMobility: true, isBodyweight: true,
        subExercises: [
          { name: 'Bended Half Kneeling Archers Stretch', reps: '10 לכל צד' },
          { name: 'Quadruped T-Spine Rotation', reps: '10 לכל צד' },
          { name: 'Prayers Pose to Upward Dog', reps: '10 מעברים' },
        ]
      },
    ],
  },
  {
    id: 'calisthenics-upper',
    name: 'Calisthenics Upper',
    nameHe: 'קליסטניקס — פלג גוף עליון',
    icon: '💪',
    warmup: commonWarmup,
    exercises: [
      { id: 'cu-1', name: 'Pull-ups', nameHe: 'מתח', sets: '3', reps: '1 סט מקס + 2x5-10', notes: 'עם משקל אם אפשר', isBodyweight: true },
      { id: 'cu-2', name: 'Dips', nameHe: 'שקעים (מקבילים)', sets: '3', reps: '1 סט מקס + 2x5-10', notes: 'עם משקל אם אפשר', isBodyweight: true },
      { id: 'cu-10', name: 'Negative Bar Muscle Practice', nameHe: 'תרגול שלילי למוסל אפ', sets: '3', reps: '5', isBodyweight: true },
      { id: 'cu-3', name: 'Lever', nameHe: 'מנוף', sets: '1', reps: '3-5 דקות משחק', notes: 'שחק עם התנועה', isBodyweight: true },
      { id: 'cu-4', name: 'Toes to Bar', nameHe: 'אצבעות למתח', sets: '3-4', reps: '3-8', isBodyweight: true },
      { id: 'cu-5', name: 'Single Arm Alt. Wide Deficit Push-ups', nameHe: 'שכיבות סמיכה רחבות לסירוגין', sets: '3', reps: '12-16', notes: 'צד לצד', isBodyweight: true },
      { id: 'cu-6', name: 'BW Triceps Extension', nameHe: 'הרחבת טרייספס', sets: '3', reps: '10-15', isBodyweight: true },
      { id: 'cu-7', name: 'Australian Pull-ups', nameHe: 'מתח אוסטרלי', sets: '3', reps: '10-15', isBodyweight: true },
    ],
  },
  {
    id: 'calisthenics-lower',
    name: 'Calisthenics Lower',
    nameHe: 'קליסטניקס — פלג גוף תחתון',
    icon: '🦵',
    warmup: commonWarmup,
    exercises: [
      { id: 'cl-1', name: 'Single Pistol Squat', nameHe: 'סקוואט אקדח', sets: '3', reps: '4-6', notes: '45 ס"מ', isBodyweight: true },
      { id: 'cl-2', name: 'Forward Step Up', nameHe: 'עליית מדרגה קדימה', sets: '3', reps: '4-6', notes: '45 ס"מ', isBodyweight: true },
      { id: 'cl-3', name: 'Sideways Step Up', nameHe: 'עליית מדרגה צידית', sets: '3', reps: '4-6', notes: '45 ס"מ', isBodyweight: true },
      { id: 'cl-4', name: 'Cossack Squat', nameHe: 'סקוואט קוזאק', sets: '3', reps: '6-8', notes: 'הוסף משקל אם קל', isBodyweight: true },
      { id: 'cl-5', name: 'Box Squat', nameHe: 'בוקס סקוואט', sets: '3', reps: '8', notes: '⚠️ אל תלך חזק ונמוך' },
      { id: 'cl-6', name: 'Nordic Curls', nameHe: 'נורדיק קרל', sets: '3', reps: '6-8', notes: 'Slow and controlled reps', isBodyweight: true },
    ],
  },
];
