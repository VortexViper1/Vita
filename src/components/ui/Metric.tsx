import React from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { borderWidth, radius, spacing } from "../../theme/spacing";
import { Text } from "./Text";

type StatusTone = "neutral" | "positive" | "attention" | "negative";
type MetricSize = "default" | "small";

export interface MetricProps {
  label: string;
  value?: string | number;
  unit?: string;
  context?: string;
  status?: string;
  statusTone?: StatusTone;
  size?: MetricSize;
  /** Card-style tile (OriginOS). Without it, the original ruled layout. */
  tile?: boolean;
  /** Forces a tile to be square. Put two per row for the 2-column grid. */
  square?: boolean;
  /** Colors the label (and icon slot), e.g. a ring color. */
  accent?: string;
  icon?: React.ReactNode;
}

function Metric({
  label,
  value,
  unit,
  context,
  status,
  statusTone = "neutral",
  size = "default",
  tile = false,
  square = false,
  accent,
  icon,
}: MetricProps) {
  const { colors } = useTheme();

  const statusColor = {
    neutral: colors.inkSoft,
    positive: colors.green,
    attention: colors.amber,
    negative: colors.red,
  }[statusTone];

  const displayValue =
    value !== undefined && value !== null ? String(value) : "—";
  const spokenValue = unit ? `${displayValue} ${unit}` : displayValue;
  const supportingText = context ?? status;

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${spokenValue}${
        supportingText ? `. ${supportingText}` : ""
      }`}
      style={[
        styles.container,
        tile
          ? {
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: spacing.xl,
              justifyContent: "space-between",
              aspectRatio: square ? 1 : undefined,
            }
          : {
              borderTopWidth: borderWidth.hairline,
              borderTopColor: colors.line,
              paddingTop: spacing.md,
            },
      ]}
    >
      <View style={styles.header}>
        {icon}
        <Text
          variant="bodySmall"
          style={{
            color: accent ?? colors.inkSoft,
            fontWeight: accent ? "600" : "400",
          }}
        >
          {label}
        </Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.valueRow}>
          <Text variant={size === "small" ? "metricSmall" : "metric"}>
            {displayValue}
          </Text>
          {unit ? (
            <Text tone="secondary" style={styles.unit}>
              {unit}
            </Text>
          ) : null}
        </View>

        {supportingText ? (
          <Text
            variant="bodySmall"
            style={{
              color: status !== undefined ? statusColor : colors.inkSoft,
            }}
          >
            {supportingText}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default Metric;
export { Metric };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  bottom: {
    gap: spacing.xs,
  },
  valueRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
  },
  unit: {
    marginLeft: spacing.xs,
  },
});