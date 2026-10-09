import {
  DailyHealthData,
  HealthPermissionState,
} from "./healthTypes";

export async function requestHealthKitPermissions(): Promise<HealthPermissionState> {
  /*
   * Native HealthKit integration goes here.
   *
   * This file owns all Apple-specific health APIs.
   */

  return {
    steps: false,
    activity: false,
    sleep: false,
    heartRate: false,
    heartRateVariability: false,
    oxygenSaturation: false,
    bodyWeight: false,
    hydration: false,
    workouts: false,
  };
}

export async function getHealthKitToday(): Promise<DailyHealthData> {
  return {
    date: new Date()
      .toISOString()
      .slice(0, 10),

    steps: null,
    activeCalories: null,
    distanceKm: null,

    restingHeartRate: null,
    heartRate: null,
    hrv: null,
    spo2: null,

    sleepMinutes: null,
    deepSleepMinutes: null,
    remSleepMinutes: null,

    waterMl: null,

    weightKg: null,

    workouts: [],
  };
}