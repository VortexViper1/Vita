import { Platform } from "react-native";

import { useTheme } from "./ThemeProvider";

/** System serif for editorial accents (no font dependency needed). */
export const serif = Platform.select({ ios: "Georgia", default: "serif" });

/**
 * Vīta brand palette for the auth/onboarding screens: botanical green, mint,
 * champagne gold, warm ivory. Follows the app's light/dark mode.
 */
export function useBrand() {
  const { resolvedMode, colors } = useTheme();
  const dark = resolvedMode === "dark";

  return {
    dark,
    bg: dark ? colors.background : "#F7F4EC", // warm ivory in light mode
    ink: dark ? "#F4F1E8" : "#10241D",
    inkSoft: dark ? "#A9B5AE" : "#4C5E56",
    accent: dark ? "#B7E6CB" : "#183D32", // links, eyebrow text, accent words
    onAccent: dark ? "#10241D" : "#FFFFFF",
    line: dark ? "rgba(247,244,236,0.16)" : "rgba(24,61,50,0.18)",
    deep: "#183D32",
    leaf: "#3E8F6F",
    mint: "#B7E6CB",
    gold: "#D6B47A",
  };
}