import React from "react";
import { StyleSheet, View } from "react-native";

import {
  averageOfPrevious,
  compareToAverage,
  describeWeekChange,
  formatDuration,
  formatNumber,
  formatPercent,
  formatVolume,
  progressOf,
} from "../../data/format";
import type {
  ActivityData,
  BodyData,
  HydrationData,
  SleepData,
} from "../../data/types";
import { spacing } from "../../theme/spacing";
import Metric from "../ui/Metric";
import { ProgressLine } from "../ui/ProgressBar";

const WEEKLY_AVERAGE = "your weekly average";

function joinContext(parts: (string | undefined)[]): string | undefined {
  const text = parts.filter(Boolean).join(" · ");
  return text.length > 0 ? text : undefined;
}

export function StepsHeadline({ data }: { data: ActivityData }) {
  const progress = progressOf(data.steps, data.stepGoal);
  const goal = formatNumber(data.stepGoal);

  return (
    <View>
      <Metric
        label="Steps"
        value={formatNumber(data.steps)}
        unit="steps"
        context={compareToAverage(
          data.steps,
          averageOfPrevious(data.week),
          WEEKLY_AVERAGE,
        )}
      />

      <ProgressLine
        style={styles.progress}
        value={progress}
        label={`Steps: ${formatPercent(progress)} of your ${goal} goal`}
        caption={`${formatPercent(progress)} of ${goal} goal`}
      />
    </View>
  );
}

export function HydrationHeadline({ data }: { data: HydrationData }) {
  const intake = formatVolume(data.intakeMl);
  const target = formatVolume(data.targetMl);
  const progress = progressOf(data.intakeMl, data.targetMl);
  const targetText = `${target.value} ${target.unit}`;

  return (
    <View>
      <Metric label="Water" value={intake.value} unit={intake.unit} />

      <ProgressLine
        style={styles.progress}
        value={progress}
        label={`Water: ${formatPercent(progress)} of your ${targetText} target`}
        caption={`${formatPercent(progress)} of ${targetText} target`}
      />
    </View>
  );
}

export function SleepHeadline({ data }: { data: SleepData }) {
  const target = data.targetMin;

  return (
    <View>
      <Metric
        label="Last night"
        value={formatDuration(data.durationMin)}
        context={joinContext([
          data.score !== undefined
            ? `Sleep score ${formatNumber(data.score)}`
            : undefined,
          compareToAverage(
            data.durationMin,
            averageOfPrevious(data.week),
            WEEKLY_AVERAGE,
          ),
        ])}
      />

      {target !== undefined && target > 0 ? (
        <ProgressLine
          style={styles.progress}
          value={progressOf(data.durationMin, target)}
          label={`Sleep: ${formatPercent(
            progressOf(data.durationMin, target),
          )} of your ${formatDuration(target)} target`}
          caption={`${formatPercent(
            progressOf(data.durationMin, target),
          )} of ${formatDuration(target)} target`}
        />
      ) : null}
    </View>
  );
}

export function WeightHeadline({ data }: { data: BodyData }) {
  return (
    <Metric
      label="Weight"
      value={
        data.weightKg !== undefined
          ? formatNumber(data.weightKg, 1)
          : "—"
      }
      unit={data.weightKg !== undefined ? "kg" : undefined}
      context={joinContext([
        data.weekChangeKg !== undefined
          ? describeWeekChange(data.weekChangeKg)
          : data.weightKg === undefined
            ? "No weight data available"
            : undefined,
        data.bmi !== undefined
          ? `BMI ${formatNumber(data.bmi, 1)}`
          : undefined,
      ])}
    />
  );
}

const styles = StyleSheet.create({
  progress: {
    marginTop: spacing.lg,
  },
});