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

export const useSleep = () => useResource(healthDataSource.getSleep ?? null);

export const useBody = () => useResource(healthDataSource.getBody ?? null);