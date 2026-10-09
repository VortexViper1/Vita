import React from "react";
import { StyleSheet, View } from "react-native";

import { spacing } from "../../theme/spacing";
import { ActivityRings } from "../ui/Activityrings";
import Card from "../ui/Card";
import { Text } from "../ui/Text";

export interface HeroRing {
  label: string;
  value: string;
  color: string;
  /** 0 to 1 */
  progress: number;
}

/** Apple Fitness style hero: concentric rings on the left, colored legend on the right. */
export function RingHero({ rings, size = 150 }: { rings: HeroRing[]; size?: number }) {
  return (
    <Card
      accessible
      accessibilityLabel={rings.map((r) => `${r.label}: ${r.value}`).join(". ")}
      style={styles.card}
    >
      <ActivityRings
        size={size}
        stroke={rings.length > 1 ? 16 : 24}
        rings={rings}
      />

      <View style={styles.legend}>
        {rings.map((ring) => (
          <View key={ring.label}>
            <Text variant="bodySmall" style={{ color: ring.color, fontWeight: "600" }}>
              {ring.label}
            </Text>
            <Text variant="heading3">{ring.value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
  },
  legend: {
    flex: 1,
    gap: spacing.md,
  },
});