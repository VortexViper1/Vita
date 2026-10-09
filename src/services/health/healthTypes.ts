export interface DailyHealthData {
  date: string;

  steps: number | null;

  activeCalories: number | null;

  distanceKm: number | null;

  restingHeartRate: number | null;

  heartRate: number | null;

  hrv: number | null;

  spo2: number | null;

  sleepMinutes: number | null;

  deepSleepMinutes: number | null;

  remSleepMinutes: number | null;

  waterMl: number | null;

  weightKg: number | null;

  workouts: WorkoutData[];
}

export interface WorkoutData {
  id: string;

  type: string;

  startTime: string;

  endTime: string;

  durationMinutes: number;

  calories: number | null;

  distanceKm: number | null;
}

export interface HealthPermissionState {
  steps: boolean;

  activity: boolean;

  sleep: boolean;

  heartRate: boolean;

  heartRateVariability: boolean;

  oxygenSaturation: boolean;

  bodyWeight: boolean;

  hydration: boolean;

  workouts: boolean;
}