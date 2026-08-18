# FitLog IL

Build a complete, beautiful, mobile-first web app called **FitLog IL** (שם בעברית: לוג אימונים) using Next.js + Tailwind + Supabase (auth + database) + Recharts for graphs.

This is a personal workout logging and progress tracking app for a 48.7 year old man, 180cm tall, 94kg. Goals: חיטוב (body recomposition/toning), גמישות (flexibility) and כוח (strength). He has sensitivities in the back (גב) and knees (ברכיים) — always show a clear warning in the profile and during every workout log to be careful with these areas, and allow easy logging of modifications or pain level (0-10).

**Core user flow:**
- Profile → Dashboard → Choose or start a workout → Log exercises easily → See beautiful progress graphs.

**Pre-loaded routines (exactly as described, no changes):**

**Routine 1: Strength (KB) + Plyometrics**
Warm-up (common to all routines):
- 2-3 min cardio (run/bike/row/rope)
- 10m = 1 lunge + rotation/side band
- 10m = 1 long lunge + reach up (hands to ceiling)
- 10 cat/cow
- 10 Russian Baby Makers
- 10 Jefferson curls (add weight if possible)
- 10 shoulder dislocation (PVC)
- 10 press + squat (very wide grip)

Main exercises:
- Single KB press: 3x6-8, free arm performs opposite motion
- KB swing: 3x10, do not arch lower back, exhale forcefully
- Drop lands: 3x3-4 @ 30-45cm, ***stick the landing***
- Box jump: 3x3-4 @ 30-45cm, triple extension (hip-knee-ankle)
- Drop jump: 3-4x2-3 @ 15-20cm, land in split position, ***stick the landing***
- FLOW: play with movements (include link: https://youtube.com/shorts/y_6i7nGHAio)
- Thoracic mobility:
  - Bended half kneeling archers stretch — 10 reps each side
  - Quadruped T-spine rotation — 10 reps each side
  - Prayers pose to upward dog passes — 10 passes

**Routine 2: Calisthenics Lower**
Warm-up same
- Single Pistol Squat: 3x4-6 @45cm
- Forward Step Up: 3x4-6 @45cm
- Sideways Step Up: 3x4-6 @45cm
- Cossack Squat: 3x6-8 (add weight if easy)
- Leg Press: 3x8 (do not go hard and low)

**Routine 3: Calisthenics Upper**
Warm-up same
- Pull-ups: 1 set max (weighted if possible) + 2 sets x 5-10
- Dips: 1 set max (weighted if possible) + 2 sets x 5-10
- Lever: 3-5 min play
- Toes to Bar: 3-4x3-8
- Single Arm Alternating Wide Deficit Push-ups: 3x12-16 (side to side)
- Bodyweight Triceps Extension: 3x10-15
- Australian Pull-ups: 3x10-15

**Key Features (must have all):**

1. **Profile** — edit age, height, weight (with history), goals, sensitivities. Weight graph + option for progress photos.

2. **Dashboard** — today's streak, quick "Start Workout" button, recent progress highlights, weight chart mini.

3. **Workout Logger** (the heart of the app)  
   - Choose routine (or custom)  
   - For each exercise: sets completed, reps (per set or total), weight (kg), notes/modifications (very important for back & knees), RPE 1-10, pain level (0-10)  
   - Easy to skip or modify exercise  
   - At the end: session summary + celebration if PR

4. **Progress & Graphs** (very important)  
   - Beautiful charts: body weight over time, strength progress per exercise (weight used, estimated 1RM, max reps, volume)  
   - User can pin important metrics  
   - Training consistency calendar (heatmap)  
   - Weekly/monthly summaries

5. **UI/UX Requirements**  
   - Entire app in **Hebrew** (all buttons, labels, texts, menus — e.g. "התחל אימון", "התקדמות", "לוג אימון", "גרפים", "שמור"). Exercise names can stay in English with Hebrew translation in parentheses where common (מתח, שקעים, סווינג KB וכו').  
   - Dark mode first, premium fitness design (clean, motivational, green/blue accents)  
   - Extremely mobile friendly (this will be used in the gym)  
   - Smooth animations, confetti on workout completion and PRs

Start by building the profile + dashboard + workout logger with the three routines fully implemented, then add the graphs and polish. Use real content from the routines above — never placeholders.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gain-goals.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1f02a632-fce6-4f76-b14b-f896b88139d5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
