import {
  DailyHealthData,
  HealthPermissionState,
} from "./healthTypes";

export interface HealthService {
  isAvailable(): Promise<boolean>;

  requestPermissions(): Promise<HealthPermissionState>;

  getToday(): Promise<DailyHealthData>;

  getDailyHistory(
    days: number,
  ): Promise<DailyHealthData[]>;
}