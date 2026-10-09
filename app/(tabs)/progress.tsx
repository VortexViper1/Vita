import React from "react";

import { TabScreen } from "../../src/components/navigation/TabScreen";
import { RingHero } from "../../src/components/ui/Ringhero";
import { AsyncView } from "../../src/components/ui/AsyncView";
import { BarChart } from "../../src/components/ui/BarChart";
import Card from "../../src/components/ui/Card";
import { Metric } from "../../src/components/ui/Metric";
import { PhotoStack } from "../../src/components/ui/Photostack";
import { Section } from "../../src/components/ui/Section";
import { TileGrid } from "../../src/components/ui/Tilegrid";
import { UnavailableState } from "../../src/components/ui/states";
import { useStackSize } from "../../src/components/ui/Usestacksize";

import {
  formatDuration,
  formatNumber,
  formatVolume,
  progressOf,
} from "../../src/data/format";
import { useActivity, useBody, useHydration, useSleep } from "../../src/data/hooks";
import { refreshProps } from "../../src/data/resource";
import type { ActivityData, BodyData, HydrationData, SleepData } from "../../src/data/types";

import { useTheme } from "../../src/theme/ThemeProvider";

const na = (text: string) => <UnavailableState description={text} />;

export default function ProgressScreen() {
  const activity = useActivity();
  const hydration = useHydration();
  const sleep = useSleep();
  const body = useBody();

  return (
    <TabScreen title="Progress" subtitle="OVERVIEW" {...refreshProps(activity)}>
      <AsyncView
        resource={activity}
        unavailable={na("Your health progress will appear here as connected data becomes available.")}
      >
        {(a) => (
          <AsyncView resource={hydration} unavailable={na("Hydration data is currently unavailable.")}>
            {(h) => (
              <AsyncView resource={sleep} unavailable={na("Sleep data is currently unavailable.")}>
                {(s) => (
                  <AsyncView resource={body} unavailable={na("Body data is currently unavailable.")}>
                    {(b) => <ProgressContent activity={a} hydration={h} sleep={s} body={b} />}
                  </AsyncView>
                )}
              </AsyncView>
            )}
          </AsyncView>
        )}
      </AsyncView>
    </TabScreen>
  );
}

function ProgressContent({
  activity,
  hydration,
  sleep,
  body,
}: {
  activity: ActivityData;
  hydration: HydrationData;
  sleep: SleepData;
  body: BodyData;
}) {
  const { colors } = useTheme();
  const stackSize = useStackSize();

  const sleepTarget = sleep.targetMin ?? 480;
  const water = formatVolume(hydration.intakeMl);
  const waterText = `${water.value} ${water.unit}`;

  return (
    <>
      <RingHero
        rings={[
          {
            label: "Steps",
            value: `${formatNumber(activity.steps)} / ${formatNumber(activity.stepGoal)}`,
            color: colors.ringMove,
            progress: progressOf(activity.steps, activity.stepGoal),
          },
          {
            label: "Hydration",
            value: waterText,
            color: colors.ringStand,
            progress: progressOf(hydration.intakeMl, hydration.targetMl),
          },
          {
            label: "Sleep",
            value: formatDuration(sleep.durationMin),
            color: colors.blue,
            progress: progressOf(sleep.durationMin, sleepTarget),
          },
        ]}
      />

      <TileGrid>
        <Metric
          tile
          square
          size="small"
          label="Distance"
          accent={colors.ringMove}
          value={activity.distanceKm !== undefined ? formatNumber(activity.distanceKm, 1) : undefined}
          unit={activity.distanceKm !== undefined ? "km" : undefined}
        />
        <Metric
          tile
          square
          size="small"
          label="Active energy"
          accent={colors.ringExercise}
          value={activity.activeKcal !== undefined ? formatNumber(activity.activeKcal) : undefined}
          unit={activity.activeKcal !== undefined ? "kcal" : undefined}
        />
        <Metric
          tile
          square
          size="small"
          label="Weight"
          accent={colors.blue}
          value={body.weightKg !== undefined ? formatNumber(body.weightKg, 1) : undefined}
          unit={body.weightKg !== undefined ? "kg" : undefined}
        />
        <Metric
          tile
          square
          size="small"
          label="Sleep score"
          accent={colors.blue}
          value={sleep.score}
          context={sleep.score === undefined ? "No sleep score" : undefined}
        />
      </TileGrid>

<Section title="Highlights" description="Tap the stack to flip through.">
  <PhotoStack
    size={stackSize}
    items={[
      {
        title: "Steps",
        subtitle: `${formatNumber(activity.steps)} today`,
        image: { uri: "https://images.pexels.com/photos/260044/pexels-photo-260044.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop" },
      },
      {
        title: "Hydration",
        subtitle: waterText,
        image: { uri: "https://images.pexels.com/photos/10415537/pexels-photo-10415537.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop" },
      },
      {
        title: "Sleep",
        subtitle: formatDuration(sleep.durationMin),
        image: { uri: "https://images.pexels.com/photos/6754022/pexels-photo-6754022.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop" },
      },
    ]}
  />
</Section>

      {hydration.week?.length ? (
        <Section title="Hydration trend" description="Water intake over the last 7 days.">
          <Card>
            <BarChart
              title="Water"
              data={hydration.week}
              goal={hydration.targetMl}
              color={colors.ringStand}
              formatValue={(value) => {
                const v = formatVolume(value);
                return `${v.value} ${v.unit}`;
              }}
            />
          </Card>
        </Section>
      ) : null}
    </>
  );
}