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

import { formatClock, formatDuration, progressOf } from "../../src/data/format";
import { useSleep } from "../../src/data/hooks";
import { refreshProps } from "../../src/data/resource";
import type { SleepData } from "../../src/data/types";

import { useTheme } from "../../src/theme/ThemeProvider";
import { layout } from "../../src/theme/spacing";

export default function SleepScreen() {
  const sleep = useSleep();

  return (
    <TabScreen title="Sleep" subtitle="DAILY" {...refreshProps(sleep)}>
      <AsyncView
        resource={sleep}
        unavailable={
          <UnavailableState description="Sleep duration, stages, consistency and recovery trends." />
        }
      >
        {(data) => <SleepContent data={data} />}
      </AsyncView>
    </TabScreen>
  );
}

function SleepContent({ data }: { data: SleepData }) {
  const { colors } = useTheme();
  const target = data.targetMin ?? 480;

  const stages = data.stages
    ? [
        { label: "Deep", minutes: data.stages.deepMin, color: colors.blue },
        { label: "REM", minutes: data.stages.remMin, color: colors.ringStand },
        { label: "Light", minutes: data.stages.lightMin, color: colors.mint },
      ]
    : [];

  return (
    <>
      <RingHero
        rings={[
          {
            label: "Time asleep",
            value: formatDuration(data.durationMin),
            color: colors.blue,
            progress: progressOf(data.durationMin, target),
          },
          ...(data.score !== undefined
            ? [
                {
                  label: "Sleep score",
                  value: String(data.score),
                  color: colors.ringStand,
                  progress: data.score / 100,
                },
              ]
            : []),
        ]}
      />

      {data.bedtime || data.wakeTime ? (
        <View style={styles.grid}>
          <View style={styles.cell}>
            <Metric
              tile
              square
              size="small"
              label="Bedtime"
              accent={colors.blue}
              value={data.bedtime ? formatClock(data.bedtime) : undefined}
            />
          </View>
          <View style={styles.cell}>
            <Metric
              tile
              square
              size="small"
              label="Woke up"
              accent={colors.ringStand}
              value={data.wakeTime ? formatClock(data.wakeTime) : undefined}
            />
          </View>
        </View>
      ) : null}

      {stages.some((stage) => stage.minutes > 0) ? (
        <Section title="Sleep stages">
          <View style={styles.stages}>
            {stages.map((stage) => (
              <View key={stage.label} style={styles.cell}>
                <Metric
                  tile
                  size="small"
                  label={stage.label}
                  accent={stage.color}
                  value={formatDuration(stage.minutes)}
                />
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {data.week && data.week.length > 0 ? (
        <Section
          title="Last 7 nights"
          description={`Line marks your ${formatDuration(target)} target`}
        >
          <Card>
            <BarChart
              title="Sleep over the last 7 nights"
              data={data.week}
              goal={target}
              color={colors.blue}
              formatValue={formatDuration}
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
  stages: {
    flexDirection: "row",
    gap: layout.tileGap,
  },
  cell: {
    flex: 1,
  },
});