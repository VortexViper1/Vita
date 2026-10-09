import React from "react";
import { StyleSheet, View } from "react-native";

import { formatWeekday } from "../../data/format";
import type { TrendPoint } from "../../data/types";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/spacing";
import { Text } from "./Text";

interface BarChartProps {
  /** Oldest first; the last point is highlighted as the current day. */
  data: TrendPoint[];
  /** Reference line (e.g. a daily goal), in the same unit as the data. */
  goal?: number;
  height?: number;
  /** Highlight color for today. Defaults to the accent. */
  color?: string;
  /** Spoken value for one bar, e.g. "6,200 steps". */
  formatValue: (value: number) => string;
  /** Spoken chart title. The whole chart reads as one sentence. */
  title: string;
}

/**
 * A minimal daily bar chart built from Views (no chart dependency). Past days
 * are quiet, today carries the accent, the goal is a single hairline.
 */
export function BarChart({
  data,
  goal,
  height = 120,
  color,
  formatValue,
  title,
}: BarChartProps) {
  const { colors } = useTheme();

  if (data.length === 0) {
    return null;
  }

  const max = Math.max(goal ?? 0, ...data.map((point) => point.value), 1);

  const summary = data
    .map((point) => `${formatWeekday(point.date)}: ${formatValue(point.value)}`)
    .join(". ");

  return (
    <View accessible accessibilityLabel={`${title}. ${summary}`}>
      <View style={{ height }}>
        <View style={[styles.bars, { height }]}>
          {data.map((point, index) => {
            const isLatest = index === data.length - 1;

            return (
              <View key={point.date} style={styles.slot}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(6, (point.value / max) * height),
                      backgroundColor: isLatest
                        ? (color ?? colors.primary)
                        : colors.surfaceMuted,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {goal !== undefined && goal > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.goalLine,
              {
                bottom: (goal / max) * height,
                backgroundColor: colors.textMuted,
              },
            ]}
          />
        ) : null}
      </View>

      <View style={styles.labels}>
        {data.map((point, index) => (
          <Text
            key={point.date}
            variant="caption"
            tone={index === data.length - 1 ? "primary" : "muted"}
            style={styles.label}
          >
            {formatWeekday(point.date)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  slot: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: {
    width: "75%",
    maxWidth: 32,
    borderRadius: 8,
  },
  goalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.5,
  },
  labels: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  label: {
    flex: 1,
    textAlign: "center",
  },
});