// src/data/source.ios.ts
// iOS implementation selected automatically by Expo/Metro for imports of "./source".
// Uses Apple HealthKit through @appeeky/expo-healthkit and preserves manual Supabase logs.

import * as HealthKit from "@appeeky/expo-healthkit";
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
const YEAR_DAYS = 365;

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

function localDayBounds(date = new Date()): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function currentUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    return error || !data.user ? null : data.user.id;
  } catch {
    return null;
  }
}

// HealthKit read permission is intentionally requested once per JS process.
// HealthKit does not reveal whether a user denied read access; empty results are valid.
let authorizationPromise: Promise<void> | null = null;

async function requestHealthAuthorization(): Promise<void> {
  if (!authorizationPromise) {
    authorizationPromise = (async () => {
      const available = await HealthKit.isAvailable();
      if (!available) {
        throw new Error(
          "Apple Health is unavailable. Use an iPhone/iOS 16.4+ device and a native development build.",
        );
      }

      await HealthKit.requestAuthorization({
        toRead: [
          HealthKit.QuantityType.stepCount,
          HealthKit.QuantityType.distanceWalkingRunning,
          HealthKit.QuantityType.activeEnergyBurned,
          HealthKit.CategoryType.sleepAnalysis,
          HealthKit.QuantityType.bodyMass,
          HealthKit.QuantityType.height,
          HealthKit.WorkoutType.workout,
          HealthKit.QuantityType.dietaryEnergyConsumed,
          HealthKit.QuantityType.dietaryWater,
          HealthKit.QuantityType.dietaryCarbohydrates,
          HealthKit.QuantityType.dietaryProtein,
          HealthKit.QuantityType.dietaryFatTotal,
        ],
      });
    })().catch((error) => {
      authorizationPromise = null;
      throw error;
    });
  }
  await authorizationPromise;
}

async function statisticSum(
  type: any,
  unit: any,
  from: Date,
  to = new Date(),
): Promise<number> {
  try {
    await requestHealthAuthorization();
    const result = await HealthKit.queryStatistics({
      type,
      unit,
      from,
      to,
      options: HealthKit.StatisticsOption.cumulativeSum,
    } as any);
    return num((result as any)?.sum);
  } catch (error) {
    console.warn("[HealthKit] Could not read statistic:", error);
    return 0;
  }
}

async function quantitySamples(type: any, unit: any, from: Date, to = new Date(), limit = 1000): Promise<any[]> {
  try {
    await requestHealthAuthorization();
    const rows = await HealthKit.queryQuantitySamples({
      type,
      unit,
      from,
      to,
      limit,
      ascending: false,
    } as any);
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn("[HealthKit] Could not read quantity samples:", error);
    return [];
  }
}

async function categorySamples(type: any, from: Date, to = new Date(), limit = 1000): Promise<any[]> {
  try {
    await requestHealthAuthorization();
    const rows = await HealthKit.queryCategorySamples({
      type,
      from,
      to,
      limit,
      ascending: false,
    } as any);
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn("[HealthKit] Could not read category samples:", error);
    return [];
  }
}

async function getActivity(): Promise<ActivityData> {
  const today = startOfToday();
  const [steps, distanceMeters, activeKcal, workoutRows] = await Promise.all([
    statisticSum(HealthKit.QuantityType.stepCount, HealthKit.Unit.count, today),
    statisticSum(HealthKit.QuantityType.distanceWalkingRunning, HealthKit.Unit.meter, today),
    statisticSum(HealthKit.QuantityType.activeEnergyBurned, HealthKit.Unit.kilocalorie, today),
    (async () => {
      try {
        await requestHealthAuthorization();
        return await HealthKit.queryWorkouts({ from: today, to: new Date(), limit: 100, ascending: false } as any);
      } catch (error) {
        console.warn("[HealthKit] Could not read workouts:", error);
        return [];
      }
    })(),
  ]);

  const workouts = (Array.isArray(workoutRows) ? workoutRows : []).map((record: any, index: number) => {
    const start = record.startDate ?? record.startDateTime ?? record.start;
    const end = record.endDate ?? record.endDateTime ?? record.end;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    return {
      id: String(record.uuid ?? record.id ?? `${start}-${index}`),
      name: String(record.activityName ?? record.workoutActivityType ?? record.activityType ?? "Workout"),
      startedAt: Number.isFinite(startMs) ? new Date(startMs).toISOString() : new Date().toISOString(),
      durationMin: Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
        ? Math.round((endMs - startMs) / 60000)
        : 0,
      activeKcal: num(record.totalEnergyBurned ?? record.energyBurned) || undefined,
    };
  });

  const week = await Promise.all(Array.from({ length: 7 }, async (_, index) => {
    const from = daysAgo(6 - index);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    // Query only completed calendar days; today's bucket ends at the current time.
    const end = to > new Date() ? new Date() : to;
    return {
      date: localDate(from),
      value: Math.round(await statisticSum(HealthKit.QuantityType.stepCount, HealthKit.Unit.count, from, end)),
    };
  }));

  return {
    steps: Math.round(steps),
    stepGoal: GOALS.steps,
    distanceKm: distanceMeters / 1000,
    activeKcal,
    week,
    workouts,
  };
}

async function getHydration(): Promise<HydrationData> {
  const today = startOfToday();
  const userId = await currentUserId();
  const [healthToday, healthWeek, manualTodayResult, manualWeekResult] = await Promise.all([
    statisticSum(HealthKit.QuantityType.dietaryWater, HealthKit.Unit.milliliter, today),
    Promise.all(Array.from({ length: 7 }, async (_, index) => {
      const from = daysAgo(6 - index);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      return {
        date: localDate(from),
        value: await statisticSum(HealthKit.QuantityType.dietaryWater, HealthKit.Unit.milliliter, from, to),
      };
    })),
    userId
      ? supabase.from("hydration_logs").select("amount_ml, log_date").eq("user_id", userId).eq("log_date", localDate(today))
      : Promise.resolve({ data: [], error: null } as any),
    userId
      ? supabase.from("hydration_logs").select("amount_ml, log_date").eq("user_id", userId)
          .gte("log_date", localDate(daysAgo(6))).lte("log_date", localDate(today))
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (manualTodayResult.error) console.warn("[Supabase] Could not load today's manual hydration:", manualTodayResult.error.message);
  if (manualWeekResult.error) console.warn("[Supabase] Could not load manual hydration history:", manualWeekResult.error.message);

  const manualTodayMl = (manualTodayResult.data ?? []).reduce((sum: number, row: any) => sum + num(row.amount_ml), 0);
  const manualByDate = new Map<string, number>();
  for (const row of manualWeekResult.data ?? []) {
    const date = String(row.log_date);
    manualByDate.set(date, (manualByDate.get(date) ?? 0) + num(row.amount_ml));
  }

  return {
    intakeMl: Math.round(healthToday + manualTodayMl),
    targetMl: GOALS.waterMl,
    week: healthWeek.map((entry: { date: string; value: number }) => ({ ...entry, value: Math.round(entry.value + (manualByDate.get(entry.date) ?? 0)) })),
  };
}

type SleepStage = "inBed" | "awake" | "unspecified" | "core" | "deep" | "rem" | "unknown";

type SleepInterval = { start: number; end: number; stage: SleepStage };

function classifySleepValue(value: unknown): SleepStage {
  // Native bridge versions may return HealthKit's numeric enum or a symbolic string.
  const raw = String(value ?? "").toLowerCase();
  const normalized = raw.replace(/[^a-z0-9]/g, "");
  const sleepValues = (HealthKit as any).SleepAnalysisValue ?? {};

  if (value === sleepValues.inBed || normalized.includes("inbed") || raw === "0") return "inBed";
  if (value === sleepValues.awake || normalized.includes("awake") || raw === "2") return "awake";
  if (value === sleepValues.asleepCore || normalized.includes("asleepcore") || normalized === "core" || raw === "3") return "core";
  if (value === sleepValues.asleepDeep || normalized.includes("asleepdeep") || normalized === "deep" || raw === "4") return "deep";
  if (value === sleepValues.asleepREM || normalized.includes("asleeprem") || normalized === "rem" || raw === "5") return "rem";
  if (value === sleepValues.asleepUnspecified || normalized.includes("asleepunspecified") || normalized === "asleep" || raw === "1") return "unspecified";
  return "unknown";
}

/** Merge overlapping intervals so duplicate HealthKit sources do not inflate sleep duration. */
function mergedDurationMs(intervals: Array<{ start: number; end: number }>): number {
  if (!intervals.length) return 0;
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let start = sorted[0].start;
  let end = sorted[0].end;
  let total = 0;
  for (const interval of sorted.slice(1)) {
    if (interval.start <= end) {
      end = Math.max(end, interval.end);
    } else {
      total += end - start;
      start = interval.start;
      end = interval.end;
    }
  }
  return total + end - start;
}

async function getSleep(): Promise<SleepData> {
  // Sleep is commonly recorded overnight, so include last evening and today.
  const from = new Date();
  from.setDate(from.getDate() - 1);
  from.setHours(18, 0, 0, 0);
  const records = await categorySamples(HealthKit.CategoryType.sleepAnalysis, from, new Date(), 1000);
  const samples: SleepInterval[] = records.map((record: any) => {
    const start = new Date(record.startDate ?? record.startDateTime ?? record.start).getTime();
    const end = new Date(record.endDate ?? record.endDateTime ?? record.end).getTime();
    const value = record.value ?? record.categoryValue ?? record.sleepAnalysisValue;
    return { start, end, stage: classifySleepValue(value) };
  }).filter((row: SleepInterval) => Number.isFinite(row.start) && Number.isFinite(row.end) && row.end > row.start);

  // Never treat in-bed/awake/unknown intervals as asleep. Do not invent stages when
  // the source only supplies an unspecified asleep category.
  const asleep = samples.filter((row) => ["unspecified", "core", "deep", "rem"].includes(row.stage));
  const durationMin = Math.round(mergedDurationMs(asleep) / 60000);
  const earliest = asleep.length ? Math.min(...asleep.map((row) => row.start)) : undefined;
  const latest = asleep.length ? Math.max(...asleep.map((row) => row.end)) : undefined;

  const deepMin = Math.round(mergedDurationMs(asleep.filter((row) => row.stage === "deep")) / 60000);
  const remMin = Math.round(mergedDurationMs(asleep.filter((row) => row.stage === "rem")) / 60000);
  const lightMin = Math.round(mergedDurationMs(asleep.filter((row) => row.stage === "core")) / 60000);
  const hasStageData = deepMin > 0 || remMin > 0 || lightMin > 0;
  const awakeMin = Math.round(mergedDurationMs(samples.filter((row) => row.stage === "awake")) / 60000);

  return {
    durationMin,
    targetMin: GOALS.sleepMin,
    score: durationMin > 0 ? Math.min(100, Math.round((durationMin / GOALS.sleepMin) * 100)) : undefined,
    bedtime: earliest === undefined ? undefined : new Date(earliest).toISOString(),
    wakeTime: latest === undefined ? undefined : new Date(latest).toISOString(),
    // Omit stage breakdown if HealthKit only provides generic asleep samples.
    stages: hasStageData ? { deepMin, remMin, lightMin, awakeMin } : undefined,
  };
}

async function getBody(): Promise<BodyData> {
  const [records, heightRecords] = await Promise.all([
    quantitySamples(HealthKit.QuantityType.bodyMass, HealthKit.Unit.kilogram, daysAgo(YEAR_DAYS), new Date(), 1000),
    quantitySamples(HealthKit.QuantityType.height, HealthKit.Unit.meter, daysAgo(YEAR_DAYS), new Date(), 100),
  ]);
  const healthHistory = records.map((record: any) => {
    const timestampValue = record.startDate ?? record.startDateTime ?? record.date ?? record.start;
    const timestamp = new Date(timestampValue).getTime();
    const value = num(record.value ?? record.quantity ?? record.weight);
    return {
      ts: timestamp,
      date: Number.isFinite(timestamp) ? localDate(new Date(timestamp)) : "",
      value,
      source: "health" as const,
    };
  }).filter((row: any) => row.value > 0 && Number.isFinite(row.ts) && row.date.length > 0);

  const userId = await currentUserId();
  let manualHistory: Array<{ ts: number; date: string; value: number; source: "manual" }> = [];
  if (userId) {
    const { data, error } = await supabase.from("body_measurements")
      .select("measured_on, weight_kg, source")
      .eq("user_id", userId).eq("source", "manual")
      .gte("measured_on", localDate(daysAgo(YEAR_DAYS)))
      .order("measured_on", { ascending: false });
    if (error) {
      console.warn("[Supabase] Could not load manual weight entries:", error.message);
    } else {
      manualHistory = (data ?? []).map((row: any) => ({
        ts: new Date(`${row.measured_on}T12:00:00`).getTime(),
        date: String(row.measured_on),
        value: num(row.weight_kg),
        source: "manual" as const,
      })).filter((row: { ts: number; date: string; value: number; source: "manual" }) => row.value > 0 && Number.isFinite(row.ts));
    }
  }

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
  const weekChangeKg = recent.length >= 2 ? recent[0].value - recent[recent.length - 1].value : undefined;

  const latestHeightRecord = heightRecords
    .map((record: any) => ({
      timestamp: new Date(record.startDate ?? record.startDateTime ?? record.date ?? record.start).getTime(),
      meters: num(record.value ?? record.quantity ?? record.height),
    }))
    .filter((record: { timestamp: number; meters: number }) => Number.isFinite(record.timestamp) && record.meters > 0)
    .sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp)[0];
  const bmi = latest?.value && latestHeightRecord?.meters
    ? latest.value / (latestHeightRecord.meters * latestHeightRecord.meters)
    : undefined;

  return {
    weightKg: latest?.value,
    bmi: bmi && Number.isFinite(bmi) && bmi > 0 ? Math.round(bmi * 10) / 10 : undefined,
    weekChangeKg,
    history: history.map(({ date, value }) => ({ date, value })),
  };
}

async function getNutrition(): Promise<NutritionData> {
  const today = startOfToday();
  const { start, end } = localDayBounds(today);
  const userId = await currentUserId();

  const [healthCalories, healthProtein, healthCarbs, healthFat, manualTodayResult, manualWeekResult] = await Promise.all([
    statisticSum(HealthKit.QuantityType.dietaryEnergyConsumed, HealthKit.Unit.kilocalorie, today),
    statisticSum(HealthKit.QuantityType.dietaryProtein, HealthKit.Unit.gram, today),
    statisticSum(HealthKit.QuantityType.dietaryCarbohydrates, HealthKit.Unit.gram, today),
    statisticSum(HealthKit.QuantityType.dietaryFatTotal, HealthKit.Unit.gram, today),
    userId
      ? supabase.from("food_logs")
          .select("id, food_name, meal_type, consumed_at, calories_kcal, protein_g, carbs_g, fat_g")
          .eq("user_id", userId).gte("consumed_at", start).lt("consumed_at", end)
          .order("consumed_at", { ascending: true })
      : Promise.resolve({ data: [], error: null } as any),
    userId
      ? supabase.from("food_logs")
          .select("consumed_at, calories_kcal")
          .eq("user_id", userId)
          .gte("consumed_at", localDayBounds(daysAgo(6)).start)
          .lt("consumed_at", end)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (manualTodayResult.error) console.warn("[Supabase] Could not load today's food logs:", manualTodayResult.error.message);
  if (manualWeekResult.error) console.warn("[Supabase] Could not load nutrition history:", manualWeekResult.error.message);

  const manualRows = manualTodayResult.data ?? [];
  const manual = manualRows.reduce((sum: { calories: number; proteinG: number; carbsG: number; fatG: number }, row: any) => ({
    calories: sum.calories + num(row.calories_kcal),
    proteinG: sum.proteinG + num(row.protein_g),
    carbsG: sum.carbsG + num(row.carbs_g),
    fatG: sum.fatG + num(row.fat_g),
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });

  const manualCaloriesByDate = new Map<string, number>();
  for (const row of manualWeekResult.data ?? []) {
    const date = localDate(new Date(row.consumed_at));
    manualCaloriesByDate.set(date, (manualCaloriesByDate.get(date) ?? 0) + num(row.calories_kcal));
  }

  // Keep meal names and categories from the app's food journal. HealthKit's daily
  // nutrient aggregates do not reliably identify complete meals, so don't invent them.
  const meals = manualRows.map((row: any) => ({
    id: String(row.id),
    name: String(row.food_name ?? "Food"),
    eatenAt: new Date(row.consumed_at).toISOString(),
    calories: num(row.calories_kcal),
    proteinG: num(row.protein_g),
    carbsG: num(row.carbs_g),
    fatG: num(row.fat_g),
  }));

  const week = await Promise.all(Array.from({ length: 7 }, async (_, index) => {
    const from = daysAgo(6 - index);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    const endOfBucket = to > new Date() ? new Date() : to;
    const healthValue = await statisticSum(HealthKit.QuantityType.dietaryEnergyConsumed, HealthKit.Unit.kilocalorie, from, endOfBucket);
    return { date: localDate(from), value: Math.round(healthValue + (manualCaloriesByDate.get(localDate(from)) ?? 0)) };
  }));

  return {
    calories: healthCalories + manual.calories,
    proteinG: healthProtein + manual.proteinG,
    carbsG: healthCarbs + manual.carbsG,
    fatG: healthFat + manual.fatG,
    meals,
    week,
  };
}

async function getDailyScore(): Promise<DailyScore> {
  const [activity, hydration, sleep] = await Promise.all([getActivity(), getHydration(), getSleep()]);
  const goals = [
    activity.steps >= activity.stepGoal,
    hydration.intakeMl >= hydration.targetMl,
    sleep.durationMin >= (sleep.targetMin ?? GOALS.sleepMin),
  ];
  const goalsComplete = goals.filter(Boolean).length;
  return { value: Math.round((goalsComplete / goals.length) * 100), goalsComplete, goalsTotal: goals.length };
}

export const healthDataSource: HealthDataSource = {
  getDailyScore,
  getActivity,
  getNutrition,
  getHydration,
  getSleep,
  getBody,
};
