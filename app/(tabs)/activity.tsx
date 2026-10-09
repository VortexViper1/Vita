import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { TabScreen } from "../../src/components/navigation/TabScreen";
import { RingHero } from "../../src/components/ui/Ringhero";
import { AsyncView } from "../../src/components/ui/AsyncView";
import { BarChart } from "../../src/components/ui/BarChart";
import Card from "../../src/components/ui/Card";
import { ListRow } from "../../src/components/ui/ListRow";
import { Metric } from "../../src/components/ui/Metric";
import { PhotoStack } from "../../src/components/ui/Photostack";
import { Section } from "../../src/components/ui/Section";
import { Text } from "../../src/components/ui/Text";
import { UnavailableState } from "../../src/components/ui/states";

import {
  formatClock,
  formatDuration,
  formatNumber,
  progressOf,
} from "../../src/data/format";
import { useActivity } from "../../src/data/hooks";
import { refreshProps } from "../../src/data/resource";
import type { ActivityData } from "../../src/data/types";

import { useTheme } from "../../src/theme/ThemeProvider";
import { layout } from "../../src/theme/spacing";

// Placeholder daily goals for the rings; move to settings later.
const ENERGY_GOAL_KCAL = 500;
const WORKOUT_GOAL_MIN = 30;

// Same image structure used in the working Progress screen
const SUGGESTIONS = [
  {
    title: "Strength",
    subtitle: "Build strength",
    image: {
      uri: "https://images.pexels.com/photos/7551226/pexels-photo-7551226.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
    },
  },
  {
    title: "Run",
    subtitle: "Improve endurance",
    image: {
      uri: "https://images.pexels.com/photos/30290631/pexels-photo-30290631.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
    },
  },
  {
    title: "Yoga",
    subtitle: "Mobility & recovery",
    image: {
      uri: "https://images.pexels.com/photos/8436400/pexels-photo-8436400.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
    },
  },
];

export default function ActivityScreen() {
  const activity = useActivity();

  return (
    <TabScreen title="Activity" subtitle="CORE" {...refreshProps(activity)}>
      <AsyncView
        resource={activity}
        unavailable={
          <UnavailableState description="Steps, distance, calories and workouts will be connected to your health data." />
        }
      >
        {(data) => <ActivityContent data={data} />}
      </AsyncView>
    </TabScreen>
  );
}

function ActivityContent({ data }: { data: ActivityData }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const stackSize =
    Math.min(width, layout.maxContentWidth) -
    layout.screenPadding * 2;

  const workouts = data.workouts ?? [];

  const workoutMin = workouts.reduce(
    (sum, w) => sum + w.durationMin,
    0
  );

  const kcal = data.activeKcal ?? 0;

  /*
   * If workouts exist:
   *   Show today's workouts.
   *
   * If no workouts exist:
   *   Show the image-based Discover cards.
   */
  const stackItems =
    workouts.length > 0
      ? workouts.map((w) => ({
          title: w.name,
          subtitle: `${formatClock(w.startedAt)} · ${formatDuration(
            w.durationMin
          )}`,
        }))
      : SUGGESTIONS;

  return (
    <>
      <RingHero
        rings={[
          {
            label: "Steps",
            value: `${formatNumber(data.steps)} / ${formatNumber(
              data.stepGoal
            )}`,
            color: colors.ringMove,
            progress: progressOf(data.steps, data.stepGoal),
          },
          {
            label: "Active energy",
            value: `${formatNumber(kcal)} kcal`,
            color: colors.ringExercise,
            progress: progressOf(kcal, ENERGY_GOAL_KCAL),
          },
          {
            label: "Workouts",
            value: formatDuration(workoutMin),
            color: colors.ringStand,
            progress: progressOf(workoutMin, WORKOUT_GOAL_MIN),
          },
        ]}
      />

      <View style={styles.grid}>
        <View style={styles.cell}>
          <Metric
            tile
            square
            size="small"
            label="Distance"
            accent={colors.ringMove}
            value={
              data.distanceKm !== undefined
                ? formatNumber(data.distanceKm, 1)
                : undefined
            }
            unit={data.distanceKm !== undefined ? "km" : undefined}
          />
        </View>

        <View style={styles.cell}>
          <Metric
            tile
            square
            size="small"
            label="Active energy"
            accent={colors.ringExercise}
            value={
              data.activeKcal !== undefined
                ? formatNumber(data.activeKcal)
                : undefined
            }
            unit={data.activeKcal !== undefined ? "kcal" : undefined}
          />
        </View>
      </View>

      <Section
        title={workouts.length > 0 ? "Today's workouts" : "Discover"}
        description="Tap the stack to flip through."
      >
        <PhotoStack
          size={stackSize}
          items={stackItems}
        />
      </Section>

      {data.week && data.week.length > 0 ? (
        <Section
          title="Last 7 days"
          description={`Line marks your ${formatNumber(
            data.stepGoal
          )} step goal`}
        >
          <Card>
            <BarChart
              title="Steps over the last 7 days"
              data={data.week}
              goal={data.stepGoal}
              color={colors.ringMove}
              formatValue={(value) =>
                `${formatNumber(value)} steps`
              }
            />
          </Card>
        </Section>
      ) : null}

      {data.workouts ? (
        <Section title="Workouts">
          {workouts.length === 0 ? (
            <Text tone="secondary">
              No workouts recorded today.
            </Text>
          ) : (
            <Card>
              {workouts.map((workout, index) => (
                <ListRow
                  key={workout.id}
                  label={workout.name}
                  description={`${formatClock(
                    workout.startedAt
                  )} · ${formatDuration(
                    workout.durationMin
                  )}`}
                  value={
                    workout.activeKcal !== undefined
                      ? `${formatNumber(
                          workout.activeKcal
                        )} kcal`
                      : undefined
                  }
                  last={index === workouts.length - 1}
                />
              ))}
            </Card>
          )}
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