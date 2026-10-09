// src/data/source.ts

import * as HealthKit from "@appeeky/expo-healthkit";

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

/* -------------------------------------------------------------------------- */
/* Goals (move to user settings later)                                        */
/* -------------------------------------------------------------------------- */

const GOALS = {
  steps: 10000,
  waterMl: 2500,
  sleepMin: 480,
} as const;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/** YYYY-MM-DD in the device's local time (toISOString would shift the day). */
function toLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type StatsArgs = Parameters<typeof HealthKit.queryStatistics>[0];

/** Cumulative sum of a quantity between `from` and now. */
async function sumSince(
  type: StatsArgs["type"],
  unit: StatsArgs["unit"],
  from: Date,
): Promise<number> {
  const result = await HealthKit.queryStatistics({
    type,
    unit,
    from,
    to: new Date(),
    options: HealthKit.StatisticsOption.cumulativeSum,
  });
  return toNumber(result?.sum);
}

/* -------------------------------------------------------------------------- */
/* Permissions (requested once, shared by every getter)                       */
/* -------------------------------------------------------------------------- */

async function requestHealthPermission(): Promise<void> {
  const available = await HealthKit.isAvailable();

  if (!available) {
    throw new Error("Health data is not available on this device.");
  }

  await HealthKit.requestAuthorization({
    toRead: [
      HealthKit.QuantityType.stepCount,
      HealthKit.QuantityType.distanceWalkingRunning,
      HealthKit.QuantityType.activeEnergyBurned,
      HealthKit.CategoryType.sleepAnalysis,
      HealthKit.QuantityType.bodyMass,
      HealthKit.WorkoutType.workout,
      HealthKit.QuantityType.dietaryEnergyConsumed,
      HealthKit.QuantityType.dietaryWater,
      HealthKit.QuantityType.dietaryCarbohydrates,
      HealthKit.QuantityType.dietaryProtein,
      HealthKit.QuantityType.dietaryFatTotal,
    ],
  });
}

let permissionPromise: Promise<void> | null = null;

function ensurePermission(): Promise<void> {
  if (!permissionPromise) {
    permissionPromise = requestHealthPermission().catch((error) => {
      permissionPromise = null; // allow a retry after a failure
      throw error;
    });
  }
  return permissionPromise;
}

/* -------------------------------------------------------------------------- */
/* Activity                                                                   */
/* -------------------------------------------------------------------------- */

async function getActivity(): Promise<ActivityData> {
  await ensurePermission();

  const now = new Date();
  const today = startOfToday();

  const [steps, distanceM, activeKcal, workoutResults] = await Promise.all([
    sumSince(
      HealthKit.QuantityType.stepCount,
      HealthKit.Unit.count,
      today,
    ),
    sumSince(
      HealthKit.QuantityType.distanceWalkingRunning,
      HealthKit.Unit.meter,
      today,
    ),
    sumSince(
      HealthKit.QuantityType.activeEnergyBurned,
      HealthKit.Unit.kilocalorie,
      today,
    ),
    HealthKit.queryWorkouts({
      from: today,
      to: now,
      limit: 50,
      ascending: false,
    }),
  ]);

  const workouts = Array.isArray(workoutResults)
    ? workoutResults.map((workout: any) => ({
        id: String(
          workout.uuid ??
            workout.id ??
            `${workout.startDate}-${workout.activityType}`,
        ),
        name: String(
          workout.activityTypeName ?? workout.activityType ?? "Workout",
        ),
        startedAt: new Date(workout.startDate).toISOString(),
        durationMin: toNumber(workout.duration) / 60,
        activeKcal:
          workout.energyBurned !== undefined
            ? toNumber(workout.energyBurned)
            : undefined,
      }))
    : [];

  return {
    steps,
    stepGoal: GOALS.steps,
    distanceKm: distanceM / 1000,
    activeKcal,
    workouts,
  };
}

/* -------------------------------------------------------------------------- */
/* Sleep                                                                      */
/* -------------------------------------------------------------------------- */

type Stage = "awake" | "deep" | "rem" | "light" | "unspecified";
type Interval = [start: number, end: number];

/** HealthKit values: 0 inBed, 1 asleepUnspecified, 2 awake, 3 core, 4 deep, 5 REM. */
function classifyStage(raw: unknown): Stage | null {
  if (typeof raw === "number") {
    if (raw === 1) return "unspecified";
    if (raw === 2) return "awake";
    if (raw === 3) return "light";
    if (raw === 4) return "deep";
    if (raw === 5) return "rem";
    return null; // 0 = inBed and anything unknown
  }

  const text = String(raw ?? "").toLowerCase();
  if (text.includes("inbed")) return null;
  if (text.includes("awake")) return "awake";
  if (text.includes("deep") || text.includes("slow_wave")) return "deep";
  if (text.includes("rem")) return "rem";
  if (text.includes("core") || text.includes("light")) return "light";
  if (text.includes("asleep")) return "unspecified";
  return null;
}

/** Total minutes covered by a set of intervals, counting overlaps once. */
function mergedMinutes(intervals: Interval[]): number {
  if (intervals.length === 0) return 0;

  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [curStart, curEnd] = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    if (start <= curEnd) {
      curEnd = Math.max(curEnd, end);
    } else {
      total += curEnd - curStart;
      curStart = start;
      curEnd = end;
    }
  }
  total += curEnd - curStart;

  return total / 60000;
}

async function getSleep(): Promise<SleepData> {
  await ensurePermission();

  // Yesterday 18:00 to now, so a night that started before midnight and a
  // late wake-up are both captured regardless of the time of the query.
  const from = daysAgo(1);
  from.setHours(18, 0, 0, 0);

  const samples = await HealthKit.queryCategorySamples({
    type: HealthKit.CategoryType.sleepAnalysis,
    from,
    to: new Date(),
    ascending: true,
  });

  const byStage: Record<Stage, Interval[]> = {
    awake: [],
    deep: [],
    rem: [],
    light: [],
    unspecified: [],
  };

  let firstSleepStart = Infinity;
  let lastSleepEnd = -Infinity;

  if (Array.isArray(samples)) {
    for (const sample of samples as any[]) {
      const start = new Date(sample.startDate).getTime();
      const end = new Date(sample.endDate).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        continue;
      }

      const stage = classifyStage(
        sample.value ?? sample.stage ?? sample.sleepStage,
      );
      if (!stage) continue;

      byStage[stage].push([start, end]);

      if (stage !== "awake") {
        firstSleepStart = Math.min(firstSleepStart, start);
        lastSleepEnd = Math.max(lastSleepEnd, end);
      }
    }
  }

  // If a device reports real stages (Apple Watch), ignore the generic
  // "asleep" samples other sources write for the same night, which would
  // otherwise be counted twice.
  const hasStages =
    byStage.deep.length + byStage.rem.length + byStage.light.length > 0;
  const lightIntervals = hasStages
    ? byStage.light
    : [...byStage.light, ...byStage.unspecified];

  const deepMin = mergedMinutes(byStage.deep);
  const remMin = mergedMinutes(byStage.rem);
  const lightMin = mergedMinutes(lightIntervals);
  const awakeMin = mergedMinutes(byStage.awake);
  const totalSleepMin = mergedMinutes([
    ...byStage.deep,
    ...byStage.rem,
    ...lightIntervals,
  ]);

  const hasSleep = Number.isFinite(firstSleepStart);

  return {
    durationMin: Math.round(totalSleepMin),
    targetMin: GOALS.sleepMin,
    score:
      totalSleepMin > 0
        ? Math.min(100, Math.round((totalSleepMin / GOALS.sleepMin) * 100))
        : undefined,
    bedtime: hasSleep ? new Date(firstSleepStart).toISOString() : undefined,
    wakeTime: hasSleep ? new Date(lastSleepEnd).toISOString() : undefined,
    stages: {
      deepMin: Math.round(deepMin),
      remMin: Math.round(remMin),
      lightMin: Math.round(lightMin),
      awakeMin: Math.round(awakeMin),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Body                                                                       */
/* -------------------------------------------------------------------------- */

async function getBody(): Promise<BodyData> {
  await ensurePermission();

  const samples = await HealthKit.queryQuantitySamples({
    type: HealthKit.QuantityType.bodyMass,
    unit: HealthKit.Unit.kilogram,
    from: daysAgo(30),
    to: new Date(),
    ascending: false, // newest first
  });

  const parsed = Array.isArray(samples)
    ? (samples as any[])
        .map((sample) => {
          const start = new Date(sample.startDate);
          return {
            ts: start.getTime(),
            date: toLocalDate(start),
            value: toNumber(
              sample.value ??
                sample.quantity ??
                sample.amount ??
                sample.quantityValue,
            ),
          };
        })
        .filter((item) => item.value > 0 && Number.isFinite(item.ts))
    : [];

  if (parsed.length === 0) {
    return { weightKg: undefined, history: [] };
  }

  // Change across the last 7 days only (needs at least two readings in it).
  const weekAgo = daysAgo(7).getTime();
  const lastWeek = parsed.filter((item) => item.ts >= weekAgo);
  const weekChangeKg =
    lastWeek.length >= 2
      ? lastWeek[0].value - lastWeek[lastWeek.length - 1].value
      : undefined;

  return {
    weightKg: parsed[0].value,
    weekChangeKg,
    history: parsed.map(({ date, value }) => ({ date, value })),
  };
}

/* -------------------------------------------------------------------------- */
/* Nutrition                                                                  */
/* -------------------------------------------------------------------------- */

async function getNutrition(): Promise<NutritionData> {
  await ensurePermission();

  const today = startOfToday();

  const [calories, proteinG, carbsG, fatG] = await Promise.all([
    sumSince(
      HealthKit.QuantityType.dietaryEnergyConsumed,
      HealthKit.Unit.kilocalorie,
      today,
    ),
    sumSince(HealthKit.QuantityType.dietaryProtein, HealthKit.Unit.gram, today),
    sumSince(
      HealthKit.QuantityType.dietaryCarbohydrates,
      HealthKit.Unit.gram,
      today,
    ),
    sumSince(HealthKit.QuantityType.dietaryFatTotal, HealthKit.Unit.gram, today),
  ]);

  return { calories, proteinG, carbsG, fatG, meals: [] };
}

/* -------------------------------------------------------------------------- */
/* Hydration                                                                  */
/* -------------------------------------------------------------------------- */

async function getHydration(): Promise<HydrationData> {
  await ensurePermission();

  const [intakeMl, weekResult] = await Promise.all([
    sumSince(
      HealthKit.QuantityType.dietaryWater,
      HealthKit.Unit.milliliter,
      startOfToday(),
    ),
    HealthKit.queryStatisticsCollection({
      type: HealthKit.QuantityType.dietaryWater,
      unit: HealthKit.Unit.milliliter,
      from: daysAgo(6),
      to: new Date(),
      interval: { day: 1 },
      options: HealthKit.StatisticsOption.cumulativeSum,
    }),
  ]);

  const week = Array.isArray(weekResult)
    ? weekResult
        .map((item: any) => ({
          date: String(item.date ?? item.startDate ?? ""),
          value: toNumber(item.sum),
        }))
        .filter((item) => item.date !== "")
    : [];

  return { intakeMl, targetMl: GOALS.waterMl, week };
}

/* -------------------------------------------------------------------------- */
/* Daily score                                                                */
/* -------------------------------------------------------------------------- */

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
  const goalsTotal = goals.length;

  return {
    value: Math.round((goalsComplete / goalsTotal) * 100),
    goalsComplete,
    goalsTotal,
  };
}

/* -------------------------------------------------------------------------- */

export const healthDataSource: HealthDataSource = {
  getDailyScore,
  getActivity,
  getNutrition,
  getHydration,
  getSleep,
  getBody,
};