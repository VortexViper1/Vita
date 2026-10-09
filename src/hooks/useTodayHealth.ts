import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

import {
  DailyHealthData,
} from "../services/health/healthTypes";

const emptyData: DailyHealthData = {
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

export function useTodayHealth() {
  const [data, setData] =
    useState<DailyHealthData>(
      emptyData,
    );

  const [loading, setLoading] =
    useState(true);

  const [available, setAvailable] =
    useState(false);

  const refresh = useCallback(
    async () => {
      setLoading(true);

      try {
        if (
          Platform.OS === "android"
        ) {
          const service =
            await import(
              "../services/health/healthConnect"
            );

          setData(
            await service.getHealthConnectToday(),
          );

          setAvailable(true);
        } else if (
          Platform.OS === "ios"
        ) {
          const service =
            await import(
              "../services/health/healthKit"
            );

          setData(
            await service.getHealthKitToday(),
          );

          setAvailable(true);
        } else {
          setData(emptyData);
          setAvailable(false);
        }
      } catch {
        setData(emptyData);
        setAvailable(false);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    loading,
    available,
    refresh,
  };
}