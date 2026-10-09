import React from "react";
import { StyleSheet, View } from "react-native";

import { TabScreen } from "../../src/components/navigation/TabScreen";
import { RingHero } from "../../src/components/ui/Ringhero";
import { AsyncView } from "../../src/components/ui/AsyncView";
import { BarChart } from "../../src/components/ui/BarChart";
import Card from "../../src/components/ui/Card";
import { Metric } from "../../src/components/ui/Metric";
import { Section } from "../../src/components/ui/Section";
import { UnavailableState } from "../../src/components/ui/states";

import { formatVolume, progressOf } from "../../src/data/format";
import { useHydration } from "../../src/data/hooks";
import { refreshProps } from "../../src/data/resource";
import type { HydrationData } from "../../src/data/types";

import { useTheme } from "../../src/theme/ThemeProvider";
import { layout } from "../../src/theme/spacing";

function volumeText(ml: number): string {
  const { value, unit } = formatVolume(ml);
  return `${value} ${unit}`;
}

export default function HydrationScreen() {
  const hydration = useHydration();

  return (
    <TabScreen title="Hydration" subtitle="DAILY" {...refreshProps(hydration)}>
      <AsyncView
        resource={hydration}
        unavailable={<UnavailableState description="Water intake against your daily target." />}
      >
        {(data) => <HydrationContent data={data} />}
      </AsyncView>
    </TabScreen>
  );
}

function HydrationContent({ data }: { data: HydrationData }) {
  const { colors } = useTheme();

  const remaining = formatVolume(Math.max(0, data.targetMl - data.intakeMl));
  const week = data.week ?? [];
  const average =
    week.length > 0
      ? formatVolume(week.reduce((sum, point) => sum + point.value, 0) / week.length)
      : undefined;

  return (
    <>
      <RingHero
        rings={[
          {
            label: "Water",
            value: `${volumeText(data.intakeMl)} of ${volumeText(data.targetMl)}`,
            color: colors.blue,
            progress: progressOf(data.intakeMl, data.targetMl),
          },
        ]}
      />

      <View style={styles.grid}>
        <View style={styles.cell}>
          <Metric
            tile
            square
            size="small"
            label="Remaining"
            accent={colors.blue}
            value={remaining.value}
            unit={remaining.unit}
          />
        </View>
        <View style={styles.cell}>
          <Metric
            tile
            square
            size="small"
            label="7-day average"
            accent={colors.ringStand}
            value={average?.value}
            unit={average?.unit}
          />
        </View>
      </View>

      {week.length > 0 ? (
        <Section
          title="Last 7 days"
          description={`Line marks your ${volumeText(data.targetMl)} target`}
        >
          <Card>
            <BarChart
              title="Water over the last 7 days"
              data={week}
              goal={data.targetMl}
              color={colors.blue}
              formatValue={volumeText}
            />
          </Card>
        </Section>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: layout.tileGap,
    marginTop: layout.tileGap,
  },
  cell: {
    flex: 1,
  },
});