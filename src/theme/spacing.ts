import { StyleSheet } from "react-native";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  /** Gap between major sections of a screen. */
  section: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  /** Large cards and square tiles (Fitness / OriginOS style). */
  card: 28,
  pill: 999,
} as const;

export const borderWidth = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
} as const;

export const layout = {
  screenPadding: spacing.xl,
  minTouchTarget: 44,
  maxContentWidth: 720,
  /** Gap between tiles in the two-column metric grid. */
  tileGap: spacing.md,
} as const;