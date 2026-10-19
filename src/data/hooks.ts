import { useResource } from "./resource";
import { healthDataSource } from "./source";

export const useDailyScore = () =>
  useResource(healthDataSource.getDailyScore ?? null);

export const useActivity = () =>
  useResource(healthDataSource.getActivity ?? null);

export const useNutrition = () =>
  useResource(healthDataSource.getNutrition ?? null);

export const useHydration = () =>
  useResource(healthDataSource.getHydration ?? null);

export const useSleep = () =>
  useResource(healthDataSource.getSleep ?? null);

/**
 * Weight data is loaded by healthDataSource.getBody in source.ts. That loader
 * merges Health Connect readings with manual body_measurements from Supabase.
 * The returned Resource exposes refresh() when its state supports refreshing;
 * screens should guard that call because unavailable resources have no refresh.
 */
export const useBody = () =>
  useResource(healthDataSource.getBody ?? null);
