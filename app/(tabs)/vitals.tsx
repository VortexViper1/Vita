import React from "react";

import { TabScreen } from "../../src/components/navigation/TabScreen";
import { AsyncView } from "../../src/components/ui/AsyncView";
import { Metric } from "../../src/components/ui/Metric";
import { Section } from "../../src/components/ui/Section";
import { TileGrid } from "../../src/components/ui/Tilegrid";
import { UnavailableState } from "../../src/components/ui/states";

import { formatNumber } from "../../src/data/format";
import { useBody } from "../../src/data/hooks";
import { refreshProps } from "../../src/data/resource";

import { useTheme } from "../../src/theme/ThemeProvider";

type VitalsData = { weightKg?: number; bmi?: number; weekChangeKg?: number };

export default function VitalsScreen() {
  const body = useBody();

  return (
    <TabScreen title="Vitals" subtitle="HEALTH" {...refreshProps(body)}>
      <AsyncView
        resource={body}
        unavailable={
          <UnavailableState description="Health measurements from your connected health data." />
        }
      >
        {(data) => <VitalsContent data={data} />}
      </AsyncView>
    </TabScreen>
  );
}

function VitalsContent({ data }: { data: VitalsData }) {
  const { colors } = useTheme();
  const change = data.weekChangeKg;

  const pending = (label: string, accent: string) => (
    <Metric
      tile
      square
      size="small"
      label={label}
      accent={accent}
      context="No supported data"
    />
  );

  return (
    <>
      <Section
        title="Body"
        description="Measurements available from your connected health data."
      >
        <TileGrid>
          <Metric
            tile
            square
            size="small"
            label="Weight"
            accent={colors.blue}
            value={data.weightKg !== undefined ? formatNumber(data.weightKg, 1) : undefined}
            unit={data.weightKg !== undefined ? "kg" : undefined}
            context={
              change !== undefined
                ? `${change > 0 ? "+" : change < 0 ? "−" : ""}${formatNumber(Math.abs(change), 1)} kg this week`
                : data.weightKg === undefined
                  ? "No weight data"
                  : undefined
            }
          />
          <Metric
            tile
            square
            size="small"
            label="BMI"
            accent={colors.ringExercise}
            value={data.bmi !== undefined ? formatNumber(data.bmi, 1) : undefined}
            context={data.bmi === undefined ? "Needs height and weight" : undefined}
          />
        </TileGrid>
      </Section>

      <Section
        title="Additional vitals"
        description="These measurements require a supported health source."
      >
        <TileGrid>
          {pending("Heart rate", colors.ringMove)}
          {pending("HRV", colors.ringExercise)}
          {pending("Blood oxygen", colors.ringStand)}
          {pending("Blood pressure", colors.amber)}
        </TileGrid>
      </Section>
    </>
  );
}