import {
  aggregateRecord,
  getGrantedPermissions,
  initialize,
  readRecords,
  requestPermission,
} from "react-native-health-connect";

import { supabase } from "../lib/supabase";

import type {
  ActivityData,
  BodyData,
  DailyScore,
  HydrationData,
  NutritionData,
  SleepData,
} from "./types";

export interface HealthDataSource {
  getDailyScore?: () => Promise<DailyScore>;
  getActivity?: () => Promise<ActivityData>;
  getNutrition?: () => Promise<NutritionData>;
  getHydration?: () => Promise<HydrationData>;
  getSleep?: () => Promise<SleepData>;
  getBody?: () => Promise<BodyData>;
}

const GOALS = { steps: 10000, waterMl: 2500, sleepMin: 480 } as const;

type HealthRecordType =
  | "Steps"
  | "Distance"
  | "ActiveCaloriesBurned"
  | "Hydration"
  | "SleepSession"
  | "Weight"
  | "ExerciseSession"
  | "Nutrition";

const READ_PERMISSIONS = [
  { accessType: "read" as const, recordType: "Steps" as const },
  { accessType: "read" as const, recordType: "Distance" as const },
  { accessType: "read" as const, recordType: "ActiveCaloriesBurned" as const },
  { accessType: "read" as const, recordType: "Hydration" as const },
  { accessType: "read" as const, recordType: "SleepSession" as const },
  { accessType: "read" as const, recordType: "Weight" as const },
  { accessType: "read" as const, recordType: "ExerciseSession" as const },
  { accessType: "read" as const, recordType: "Nutrition" as const },
];

let initialization: Promise<void> | null = null;

async function ensureHealthConnect(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      const ready = await initialize();

      if (!ready) {
        throw new Error(
          "Health Connect is unavailable. Install or enable Health Connect on this Android device.",
        );
      }
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }

  await initialization;
}

/**
 * Requests only the permission needed for the current data type.
 * A denied permission for one metric will not block unrelated metrics.
 */
async function ensurePermission(recordType: HealthRecordType): Promise<boolean> {
  await ensureHealthConnect();

  const required = READ_PERMISSIONS.find(
    (permission) => permission.recordType === recordType,
  );

  if (!required) return false;

  let granted = await getGrantedPermissions();
  const hasPermission = () =>
    granted.some(
      (permission) =>
        permission.accessType === "read" &&
        permission.recordType === recordType,
    );

  if (hasPermission()) return true;

  await requestPermission([required]);
  granted = await getGrantedPermissions();

  return hasPermission();
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysAgo(days: number): Date {
  const date = startOfToday();
  date.setDate(date.getDate() - days);
  return date;
}

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function currentUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

function localDayBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function range(from: Date, to = new Date()) {
  return {
    operator: "between" as const,
    startTime: from.toISOString(),
    endTime: to.toISOString(),
  };
}

/**
 * Return null if this particular metric is unavailable or its permission
 * has not been granted. Other metrics can still load normally.
 */
async function aggregate(
  recordType: HealthRecordType,
  from: Date,
  to = new Date(),
): Promise<any | null> {
  try {
    const allowed = await ensurePermission(recordType);
    if (!allowed) return null;

    return await aggregateRecord({
      recordType: recordType as any,
      timeRangeFilter: range(from, to),
    } as any);
  } catch (error) {
    console.warn(`[Health Connect] Could not read ${recordType}:`, error);
    return null;
  }
}

async function safeReadRecords(
  recordType: HealthRecordType,
  from: Date,
  to = new Date(),
  pageSize = 100,
): Promise<any[]> {
  try {
    const allowed = await ensurePermission(recordType);
    if (!allowed) return [];

    const result = await readRecords(recordType as any, {
      timeRangeFilter: range(from, to),
      pageSize,
      ascending: false,
    } as any);

    return Array.isArray((result as any)?.records)
      ? (result as any).records
      : [];
  } catch (error) {
    console.warn(`[Health Connect] Could not read ${recordType}:`, error);
    return [];
  }
}

async function getActivity(): Promise<ActivityData> {
  const today = startOfToday();

  const [stepsResult, distanceResult, caloriesResult, exerciseRecords] =
    await Promise.all([
      aggregate("Steps", today),
      aggregate("Distance", today),
      aggregate("ActiveCaloriesBurned", today),
      safeReadRecords("ExerciseSession", today),
    ]);

  const steps = num(stepsResult?.COUNT_TOTAL);

  const distanceMeters = num(
    distanceResult?.DISTANCE?.inMeters ??
      (distanceResult?.DISTANCE?.inKilometers != null
        ? num(distanceResult.DISTANCE.inKilometers) * 1000
        : 0),
  );
  const distanceKm = distanceMeters / 1000;

  const activeKcal = num(
    caloriesResult?.ACTIVE_CALORIES_TOTAL?.inKilocalories ??
      (caloriesResult?.ACTIVE_CALORIES_TOTAL?.inCalories != null
        ? num(caloriesResult.ACTIVE_CALORIES_TOTAL.inCalories) / 1000
        : caloriesResult?.inKilocalories),
  );

  const workouts = exerciseRecords.map((record: any) => ({
    id: String(
      record.metadata?.id ??
        `${record.startTime}-${record.exerciseType ?? "workout"}`,
    ),
    name: String(record.title ?? record.exerciseType ?? "Workout"),
    startedAt: record.startTime,
    durationMin: Math.max(
      0,
      (new Date(record.endTime).getTime() -
        new Date(record.startTime).getTime()) /
        60000,
    ),
    activeKcal: undefined,
  }));

  return {
    steps,
    stepGoal: GOALS.steps,
    distanceKm,
    activeKcal,
    workouts,
  };
}

async function getHydration(): Promise<HydrationData> {
  const today = startOfToday();
  const userId = await currentUserId();

  const [todayResult, weekResult, manualTodayResult, manualWeekResult] = await Promise.all([
    aggregate("Hydration", today),
    Promise.all(
      Array.from({ length: 7 }, async (_, index) => {
        const from = daysAgo(6 - index);
        const to = new Date(from);
        to.setDate(to.getDate() + 1);
        const result = await aggregate("Hydration", from, to);
        const liters = num(result?.VOLUME_TOTAL?.inLiters);
        const milliliters =
          num(result?.VOLUME_TOTAL?.inMilliliters) || liters * 1000;
        return { date: localDate(from), value: milliliters };
      }),
    ),
    userId
      ? supabase.from("hydration_logs").select("amount_ml, log_date")
          .eq("user_id", userId).eq("log_date", localDate(today))
      : Promise.resolve({ data: [], error: null } as any),
    userId
      ? supabase.from("hydration_logs").select("amount_ml, log_date")
          .eq("user_id", userId)
          .gte("log_date", localDate(daysAgo(6)))
          .lte("log_date", localDate(today))
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (manualTodayResult.error) {
    console.warn("[Supabase] Could not load today's manual hydration:", manualTodayResult.error.message);
  }
  if (manualWeekResult.error) {
    console.warn("[Supabase] Could not load manual hydration history:", manualWeekResult.error.message);
  }

  const healthLiters = num(todayResult?.VOLUME_TOTAL?.inLiters);
  const healthMl =
    num(todayResult?.VOLUME_TOTAL?.inMilliliters) || healthLiters * 1000;
  const manualTodayMl = (manualTodayResult.data ?? []).reduce(
    (sum: number, row: any) => sum + num(row.amount_ml), 0,
  );
  const manualByDate = new Map<string, number>();
  for (const row of manualWeekResult.data ?? []) {
    const date = String(row.log_date);
    manualByDate.set(date, (manualByDate.get(date) ?? 0) + num(row.amount_ml));
  }

  const week = weekResult.map((entry) => ({
    ...entry,
    value: entry.value + (manualByDate.get(entry.date) ?? 0),
  }));

  // Manual logs are separate from Health Connect records, so add both sources.
  return {
    intakeMl: healthMl + manualTodayMl,
    targetMl: GOALS.waterMl,
    week,
  };
}

async function getSleep(): Promise<SleepData> {
  const from = daysAgo(1);
  from.setHours(18, 0, 0, 0);

  const records = await safeReadRecords("SleepSession", from);

  const sessions = records
    .map((record: any) => ({
      start: new Date(record.startTime).getTime(),
      end: new Date(record.endTime).getTime(),
      stages: Array.isArray(record.stages) ? record.stages : [],
    }))
    .filter(
      (record: any) =>
        Number.isFinite(record.start) &&
        Number.isFinite(record.end) &&
        record.end > record.start,
    );

  const durationMin = Math.round(
    sessions.reduce(
      (sum: number, session: any) => sum + (session.end - session.start),
      0,
    ) / 60000,
  );

  const earliest =
    sessions.length > 0
      ? Math.min(...sessions.map((item: any) => item.start))
      : undefined;
  const latest =
    sessions.length > 0
      ? Math.max(...sessions.map((item: any) => item.end))
      : undefined;

  return {
    durationMin,
    targetMin: GOALS.sleepMin,
    score:
      durationMin > 0
        ? Math.min(100, Math.round((durationMin / GOALS.sleepMin) * 100))
        : undefined,
    bedtime:
      earliest === undefined ? undefined : new Date(earliest).toISOString(),
    wakeTime: latest === undefined ? undefined : new Date(latest).toISOString(),
    stages: {
      deepMin: 0,
      remMin: 0,
      lightMin: durationMin,
      awakeMin: 0,
    },
  };
}

async function getBody(): Promise<BodyData> {
  const records = await safeReadRecords("Weight", daysAgo(365), new Date(), 1000);

  const healthHistory = records
    .map((record: any) => {
      const timestampValue = record.time ?? record.startTime;
      const timestamp = new Date(timestampValue).getTime();
      const weightKg = num(
        record.weight?.inKilograms ??
          (record.weight?.inGrams != null
            ? num(record.weight.inGrams) / 1000
            : record.weight?.inPounds != null
              ? num(record.weight.inPounds) * 0.45359237
              : 0),
      );
      return {
        ts: timestamp,
        date: Number.isFinite(timestamp) ? localDate(new Date(timestamp)) : "",
        value: weightKg,
        source: "health" as const,
      };
    })
    .filter((item: any) => item.value > 0 && Number.isFinite(item.ts) && item.date.length > 0);

  const userId = await currentUserId();
  let manualHistory: Array<{ ts: number; date: string; value: number; source: "manual" }> = [];
  if (userId) {
    const { data, error } = await supabase
      .from("body_measurements")
      .select("measured_on, weight_kg, source")
      .eq("user_id", userId)
      .eq("source", "manual")
      .gte("measured_on", localDate(daysAgo(365)))
      .order("measured_on", { ascending: false });

    if (error) {
      console.warn("[Supabase] Could not load manual weight entries:", error.message);
    } else {
      manualHistory = (data ?? []).map((row: any) => ({
        ts: new Date(`${row.measured_on}T12:00:00`).getTime(),
        date: String(row.measured_on),
        value: num(row.weight_kg),
        source: "manual" as const,
      })).filter((item) => item.value > 0 && Number.isFinite(item.ts));
    }
  }

  // One value per calendar date. A manually entered value wins for that date.
  const byDate = new Map<string, { ts: number; date: string; value: number; source: "manual" | "health" }>();
  for (const item of healthHistory) {
    const existing = byDate.get(item.date);
    if (!existing || existing.source !== "manual") byDate.set(item.date, item);
  }
  for (const item of manualHistory) byDate.set(item.date, item);

  const history = [...byDate.values()].sort((a, b) => b.ts - a.ts);
  const latest = history[0];
  const weekAgo = daysAgo(7).getTime();
  const recent = history.filter((item) => item.ts >= weekAgo);
  const weekChangeKg =
    recent.length >= 2 ? recent[0].value - recent[recent.length - 1].value : undefined;

  return {
    weightKg: latest?.value,
    weekChangeKg,
    history: history.map(({ date, value }) => ({ date, value })),
  };
}

async function getNutrition(): Promise<NutritionData> {
  const today = new Date();
  const { start, end } = localDayBounds(today);
  const [result, userId] = await Promise.all([
    aggregate("Nutrition", startOfToday()),
    currentUserId(),
  ]);

  const healthCalories = num(
    result?.ENERGY_TOTAL?.inKilocalories ??
      (result?.ENERGY_TOTAL?.inCalories != null
        ? num(result.ENERGY_TOTAL.inCalories) / 1000
        : 0),
  );
  const healthProtein = num(result?.PROTEIN_TOTAL?.inGrams);
  const healthCarbs = num(result?.TOTAL_CARBOHYDRATE_TOTAL?.inGrams);
  const healthFat = num(result?.TOTAL_FAT_TOTAL?.inGrams);

  let manual = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  if (userId) {
    const { data, error } = await supabase
      .from("food_logs")
      .select("calories_kcal, protein_g, carbs_g, fat_g")
      .eq("user_id", userId)
      .gte("consumed_at", start)
      .lt("consumed_at", end);

    if (error) {
      console.warn("[Supabase] Could not load manual nutrition logs:", error.message);
    } else {
      manual = (data ?? []).reduce((sum: typeof manual, row: any) => ({
        calories: sum.calories + num(row.calories_kcal),
        proteinG: sum.proteinG + num(row.protein_g),
        carbsG: sum.carbsG + num(row.carbs_g),
        fatG: sum.fatG + num(row.fat_g),
      }), manual);
    }
  }

  return {
    calories: healthCalories + manual.calories,
    proteinG: healthProtein + manual.proteinG,
    carbsG: healthCarbs + manual.carbsG,
    fatG: healthFat + manual.fatG,
    meals: [],
  };
}

async function getDailyScore(): Promise<DailyScore> {
  const [activity, hydration, sleep] = await Promise.all([
    getActivity(),
    getHydration(),
    getSleep(),
  ]);

  const goals = [
    activity.steps >= activity.stepGoal,
    hydration.intakeMl >= hydration.targetMl,
    sleep.durationMin >= (sleep.targetMin ?? GOALS.sleepMin),
  ];

  const goalsComplete = goals.filter(Boolean).length;

  return {
    value: Math.round((goalsComplete / goals.length) * 100),
    goalsComplete,
    goalsTotal: goals.length,
  };
}

export const healthDataSource: HealthDataSource = {
  getDailyScore,
  getActivity,
  getNutrition,
  getHydration,
  getSleep,
  getBody,
};
