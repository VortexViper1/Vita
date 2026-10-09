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
  formatNumber,
  progressOf,
} from "../../src/data/format";
import { useNutrition } from "../../src/data/hooks";
import { refreshProps } from "../../src/data/resource";
import type { NutritionData } from "../../src/data/types";

import { useTheme } from "../../src/theme/ThemeProvider";

const MEALS = [
  {
    title: "Breakfast",
    subtitle: "Start your day right",
    image: {
      uri: "https://images.pexels.com/photos/36878898/pexels-photo-36878898.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
    },
  },
  {
    title: "Lunch",
    subtitle: "Balanced midday meal",
    image: {
      uri: "https://images.pexels.com/photos/32557575/pexels-photo-32557575.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
    },
  },
  {
    title: "Dinner",
    subtitle: "Healthy evening meal",
    image: {
      uri: "https://images.pexels.com/photos/4020143/pexels-photo-4020143.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
    },
  },
];

export default function NutritionScreen() {
  const nutrition = useNutrition();

  return (
    <TabScreen
      title="Nutrition"
      subtitle="TODAY'S INTAKE"
      {...refreshProps(nutrition)}
    >
      <AsyncView
        resource={nutrition}
        unavailable={
          <UnavailableState description="Connect a nutrition source to track calories and macros." />
        }
      >
        {(data) => <NutritionContent data={data} />}
      </AsyncView>
    </TabScreen>
  );
}

function macroProgress(
  value: number,
  goal?: number,
): number {
  return goal !== undefined && goal > 0
    ? progressOf(value, goal)
    : 0;
}

function NutritionContent({
  data,
}: {
  data: NutritionData;
}) {
  const { colors } = useTheme();
  const stackSize = useStackSize();

  const goal = data.calorieGoal;

  const hasGoal =
    goal !== undefined && goal > 0;

  const left = hasGoal
    ? goal - data.calories
    : undefined;

  return (
    <>
      {/* Macro Rings */}
      <RingHero
        rings={[
          {
            label: "Protein",
            value: `${formatNumber(
              data.proteinG,
            )} g`,
            color: colors.ringMove,
            progress: macroProgress(
              data.proteinG,
              data.proteinGoalG,
            ),
          },
          {
            label: "Carbs",
            value: `${formatNumber(
              data.carbsG,
            )} g`,
            color: colors.ringExercise,
            progress: macroProgress(
              data.carbsG,
              data.carbsGoalG,
            ),
          },
          {
            label: "Fat",
            value: `${formatNumber(
              data.fatG,
            )} g`,
            color: colors.ringStand,
            progress: macroProgress(
              data.fatG,
              data.fatGoalG,
            ),
          },
        ]}
      />

      {/* Calories */}
      <TileGrid>
        <Metric
          tile
          square
          size="small"
          label="Calories"
          accent={colors.amber}
          value={formatNumber(
            data.calories,
          )}
          unit="kcal"
          context={
            hasGoal
              ? `Goal ${formatNumber(goal)}`
              : undefined
          }
        />

        <Metric
          tile
          square
          size="small"
          label={
            left !== undefined &&
            left < 0
              ? "Over goal"
              : "Remaining"
          }
          accent={colors.amber}
          value={
            left !== undefined
              ? formatNumber(
                  Math.abs(left),
                )
              : undefined
          }
          unit={
            left !== undefined
              ? "kcal"
              : undefined
          }
          context={
            hasGoal
              ? undefined
              : "Set a calorie goal"
          }
        />
      </TileGrid>

      {/* Meals */}
      <Section
        title="Meals"
        description="Tap the stack to flip through."
      >
        <PhotoStack
          items={MEALS}
          size={stackSize}
        />
      </Section>

      {/* Weekly Calories */}
      {data.week &&
      data.week.length > 0 ? (
        <Section
          title="Last 7 days"
          description={
            hasGoal
              ? `Line marks your ${formatNumber(
                  goal,
                )} kcal goal`
              : undefined
          }
        >
          <Card>
            <BarChart
              title="Calories over the last 7 days"
              data={data.week}
              goal={
                hasGoal
                  ? goal
                  : undefined
              }
              color={colors.amber}
              formatValue={(value) =>
                `${formatNumber(
                  value,
                )} kcal`
              }
            />
          </Card>
        </Section>
      ) : null}
    </>
  );
}