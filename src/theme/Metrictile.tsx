import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeProvider";
import { typography } from "../theme/typography";

type Props = {
  label: string;
  /** null/undefined shows "--" (e.g. HealthKit unavailable on Android). */
  value: string | number | null | undefined;
  unit?: string;
  /** Accent for the label and icon. */
  accent?: string;
  icon?: React.ReactNode;
  /** Slot for a mini chart or ring at the bottom of the tile. */
  children?: React.ReactNode;
  onPress?: () => void;
};

/**
 * Square tile (OriginOS Health style). Put two per row with
 * `flex: 1` wrappers and `layout.tileGap` between them.
 */
export function MetricTile({
  label,
  value,
  unit,
  accent,
  icon,
  children,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const tint = accent ?? colors.primary;
  const display = value === null || value === undefined ? "--" : String(value);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}, ${display}${unit ? ` ${unit}` : ""}`}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colors.surface,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.header}>
        {icon}
        <Text style={[typography.bodySmall, { color: tint, fontWeight: "600" }]}>
          {label}
        </Text>
      </View>

      <View style={styles.body}>{children}</View>

      <View style={styles.valueRow}>
        <Text style={[typography.metric, { color: colors.text }]}>{display}</Text>
        {unit ? (
          <Text
            style={[
              typography.bodySmall,
              { color: colors.textMuted, marginLeft: spacing.xs, marginBottom: 5 },
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  body: { flex: 1, justifyContent: "center" },
  valueRow: { flexDirection: "row", alignItems: "flex-end" },
});