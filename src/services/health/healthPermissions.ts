import { Platform } from "react-native";

import {
  HealthPermissionState,
} from "./healthTypes";

const emptyPermissions: HealthPermissionState = {
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

export async function requestHealthPermissions(): Promise<HealthPermissionState> {
  if (Platform.OS === "android") {
    const module =
      await import("./healthConnect");

    return module.requestHealthConnectPermissions();
  }

  if (Platform.OS === "ios") {
    const module =
      await import("./healthKit");

    return module.requestHealthKitPermissions();
  }

  return emptyPermissions;
}