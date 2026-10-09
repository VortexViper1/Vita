import {
  DailyHealthData,
  HealthPermissionState,
} from "./healthTypes";

export async function requestHealthConnectPermissions(): Promise<HealthPermissionState> {
  /*
   * Native Health Connect integration goes here.
   *
   * This file deliberately owns Android-specific APIs.
   * The rest of the app must never import Health Connect
   * directly.
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

export async function getHealthConnectToday(): Promise<DailyHealthData> {
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