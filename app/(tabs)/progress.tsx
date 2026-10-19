import React, { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

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
import {
  useActivity,
  useBody,
  useHydration,
  useSleep,
} from "../../src/data/hooks";
import { refreshProps } from "../../src/data/resource";
import type { ActivityData, BodyData, HydrationData, SleepData } from "../../src/data/types";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/theme/ThemeProvider";

const na = (text: string) => <UnavailableState description={text} />;

function refreshIfAvailable(resource: unknown) {
  if (resource && typeof resource === "object" && "refresh" in resource) {
    const refresh = (resource as { refresh?: unknown }).refresh;
    if (typeof refresh === "function") void refresh.call(resource);
  }
}

type ManualSleepRow = {
  sleep_date: string;
  duration_min: number;
  created_at?: string;
};

export default function ProgressScreen() {
  const activity = useActivity();
  const hydration = useHydration();
  const sleep = useSleep();
  const body = useBody();
  const [manualSleepMin, setManualSleepMin] = useState<number | undefined>();

  // Keep the latest resources in a ref so the focus callback stays stable.
  // Depending on them directly caused an endless refresh loop: refresh()
  // updates state -> new resource object -> new callback -> effect re-runs.
  const resourcesRef = useRef({ activity, hydration, sleep, body });
  resourcesRef.current = { activity, hydration, sleep, body };
  const hasFocusedOnce = useRef(false);

  // Refresh health data and database-backed manual measurements whenever this
  // tab comes back into focus. Resource states may be unavailable, so guard calls.
  useFocusEffect(
    useCallback(() => {
      // Skip the resource refresh on the first focus: the hooks are expected
      // to load on mount. If they do not, remove this check.
      if (hasFocusedOnce.current) {
        const current = resourcesRef.current;
        refreshIfAvailable(current.activity);
        refreshIfAvailable(current.hydration);
        refreshIfAvailable(current.sleep);
        refreshIfAvailable(current.body);
      } else {
        hasFocusedOnce.current = true;
      }

      let active = true;
      const loadManualSleep = async () => {
        try {
          const { data: authData, error: authError } = await supabase.auth.getUser();
          if (authError) throw authError;
          if (!authData.user) {
            if (active) setManualSleepMin(undefined);
            return;
          }

          const { data, error } = await supabase
            .from("manual_sleep_logs")
            .select("sleep_date, duration_min, created_at")
            .eq("user_id", authData.user.id)
            .order("sleep_date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) throw error;
          if (active) {
            setManualSleepMin(data ? Number((data as ManualSleepRow).duration_min) : undefined);
          }
        } catch (error) {
          console.warn("Unable to load manual sleep for Progress:", error);
        }
      };
      void loadManualSleep();
      return () => { active = false; };
    }, []),
  );

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
                    {(b) => (
                      <ProgressContent
                        activity={a}
                        hydration={h}
                        sleep={s}
                        body={b}
                        manualSleepMin={manualSleepMin}
                      />
                    )}
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
  manualSleepMin,
}: {
  activity: ActivityData;
  hydration: HydrationData;
  sleep: SleepData;
  body: BodyData;
  manualSleepMin?: number;
}) {
  const { colors } = useTheme();
  const stackSize = useStackSize();

  const sleepTarget = sleep.targetMin ?? 480;
  // If a manual sleep journal entry exists, use it for the headline duration.
  // This makes manually logged sleep visible on Progress even without a watch.
  const displayedSleepMin = manualSleepMin ?? sleep.durationMin;
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
            value: formatDuration(displayedSleepMin),
            color: colors.blue,
            progress: progressOf(displayedSleepMin, sleepTarget),
          },
        ]}
      />

      <TileGrid>
        <Metric
          tile square size="small" label="Distance" accent={colors.ringMove}
          value={activity.distanceKm !== undefined ? formatNumber(activity.distanceKm, 1) : undefined}
          unit={activity.distanceKm !== undefined ? "km" : undefined}
        />
        <Metric
          tile square size="small" label="Active energy" accent={colors.ringExercise}
          value={activity.activeKcal !== undefined ? formatNumber(activity.activeKcal) : undefined}
          unit={activity.activeKcal !== undefined ? "kcal" : undefined}
        />
        <Metric
          tile square size="small" label="Weight" accent={colors.blue}
          value={body.weightKg !== undefined ? formatNumber(body.weightKg, 1) : undefined}
          unit={body.weightKg !== undefined ? "kg" : undefined}
        />
        <Metric
          tile square size="small" label="Sleep score" accent={colors.blue}
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
              subtitle: formatDuration(displayedSleepMin),
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