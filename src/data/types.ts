/**
 * View-model contract between the UI and your data layer.
 *
 * These are the shapes the screens render. Your API / Health Connect /
 * HealthKit code maps its own responses into them in `source.ts`; the UI
 * never touches raw API responses.
 */

export interface TrendPoint {
  /** Calendar date as "YYYY-MM-DD" (treated as local) or a full ISO timestamp. */
  date: string;
  value: number;
}

export interface DailyScore {
  /** 0-100 */
  value: number;
  streakDays?: number;
  goalsComplete?: number;
  goalsTotal?: number;
}

export interface Workout {
  id: string;
  name: string;
  /** ISO timestamp */
  startedAt: string;
  durationMin: number;
  activeKcal?: number;
}

export interface ActivityData {
  steps: number;
  stepGoal: number;
  distanceKm?: number;
  activeKcal?: number;
  /** Steps per day, oldest first, ending with today. */
  week?: TrendPoint[];
  /** Omit if workouts aren't supplied; an empty array means none today. */
  workouts?: Workout[];
}

export interface Meal {
  id: string;
  name: string;
  /** ISO timestamp */
  eatenAt: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

export interface NutritionData {
  calories: number;
  calorieGoal?: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinGoalG?: number;
  carbsGoalG?: number;
  fatGoalG?: number;
  meals: Meal[];
  /** Calories per day, oldest first, ending with today. */
  week?: TrendPoint[];
}

export interface HydrationData {
  intakeMl: number;
  targetMl: number;
  /** Millilitres per day, oldest first, ending with today. */
  week?: TrendPoint[];
}

export interface SleepData {
  /** Total time asleep last night. */
  durationMin: number;
  targetMin?: number;
  /** 0-100 */
  score?: number;
  /** ISO timestamps */
  bedtime?: string;
  wakeTime?: string;
  stages?: {
    deepMin: number;
    remMin: number;
    lightMin: number;
    awakeMin?: number;
  };
  /** Minutes asleep per night, oldest first, ending with last night. */
  week?: TrendPoint[];
}

export interface BodyData {
  weightKg?: number;
  bmi?: number;
  weekChangeKg?: number;
  history?: TrendPoint[];
}
