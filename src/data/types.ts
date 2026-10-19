/**
 * View-model contract between the UI and the data layer.
 *
 * Health Connect / HealthKit and Supabase responses are mapped to these
 * shapes in source.ts. UI components should not consume raw provider records.
 */

export interface TrendPoint {
  /** Calendar date as YYYY-MM-DD (local) or a full ISO timestamp. */
  date: string;
  value: number;
}

export interface DailyScore {
  /** Score from 0 to 100. */
  value: number;
  streakDays?: number;
  goalsComplete?: number;
  goalsTotal?: number;
}

export interface Workout {
  id: string;
  name: string;
  /** ISO timestamp. */
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
  /** Omitted when workouts are not supplied; [] means no workouts today. */
  workouts?: Workout[];
}

export interface Meal {
  id: string;
  name: string;
  /** ISO timestamp. */
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
  /** Total time asleep for the most recent sleep session/night. */
  durationMin: number;
  targetMin?: number;
  /** Score from 0 to 100, only when supported or explicitly calculated. */
  score?: number;
  /** ISO timestamps. */
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
  /** Latest weight in kilograms; manual entries may take priority per date. */
  weightKg?: number;
  /** BMI is only present when a valid height and weight are available. */
  bmi?: number;
  /** Newest weight minus oldest available weight in the recent 7-day window. */
  weekChangeKg?: number;
  /** Weight measurements, one value per date, oldest or newest order normalized by the UI. */
  history?: TrendPoint[];
}
