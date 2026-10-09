import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/spacing";
import { Text } from "./Text";

interface ProgressLineProps {
  /** 0..1 */
  value: number;
  /** Spoken description, e.g. "Steps: 84% of your 10,000 goal". */
  label: string;
  /** Visible caption under the bar. */
  caption?: string;
  /** Fill color. Defaults to the accent; pass a ring color to match a tile. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** A rounded goal-progress bar with an optional caption. */
export function ProgressLine({
  value,
  label,
  caption,
  color,
  style,
}: ProgressLineProps) {
  const { colors } = useTheme();
  const safe = Number.isFinite(value) ? value : 0;
  const clamped = Math.min(1, Math.max(0, safe));

  return (
    <View style={style}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
        style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${clamped * 100}%`,
              backgroundColor: color ?? colors.primary,
            },
          ]}
        />
      </View>

      {caption ? (
        <Text variant="bodySmall" tone="secondary" style={styles.caption}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  caption: {
    marginTop: spacing.sm,
  },
});