import React from "react";

import { Pressable, StyleSheet, View } from "react-native";

import { useTransitionNavigate } from "../../src/components/navigation/Transitionprovider";
import type { Href } from "expo-router";

import { TabScreen } from "../../src/components/navigation/TabScreen";

import { HeroRing, RingHero } from "../../src/components/ui/Ringhero";
import Card from "../../src/components/ui/Card";
import { ListRow } from "../../src/components/ui/ListRow";
import { Metric } from "../../src/components/ui/Metric";

import {
  PhotoStack,
  type StackItem,
} from "../../src/components/ui/Photostack";

import { Section } from "../../src/components/ui/Section";
import { TileGrid } from "../../src/components/ui/Tilegrid";
import { Text } from "../../src/components/ui/Text";
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
  useDailyScore,
  useHydration,
  useSleep,
} from "../../src/data/hooks";

import type { Resource } from "../../src/data/resource";
import type { DailyScore } from "../../src/data/types";

import { useTheme } from "../../src/theme/ThemeProvider";
import { layout, spacing } from "../../src/theme/spacing";

// Shown only in the "not connected" state.
const STEP_GOAL = "10,000";
const HYDRATION_TARGET = "2.5 L";
function formatDate(): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function scoreContext(score: DailyScore): string | undefined {
  const parts = [
    score.streakDays !== undefined
      ? `${score.streakDays}-day streak`
      : undefined,

    score.goalsComplete !== undefined &&
    score.goalsTotal !== undefined
      ? `${score.goalsComplete} of ${score.goalsTotal} goals complete`
      : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function dataOf<T>(resource: Resource<T>): T | undefined {
  return resource.status === "ready" ? resource.data : undefined;
}

function statusText(
  resource: Resource<unknown>,
): string | undefined {
  if (resource.status === "loading") return "Loading…";
  if (resource.status === "error") return "Couldn't load";
  return undefined;
}

function volumeText(ml: number): string {
  const { value, unit } = formatVolume(ml);
  return `${value} ${unit}`;
}

export default function TodayScreen() {
  const { colors } = useTheme();
  const stackSize = useStackSize();

  // IMPORTANT:
  // The hook must be inside the component.
  const go = useTransitionNavigate();

  const score = useDailyScore();
  const activity = useActivity();
  const hydration = useHydration();
  const sleep = useSleep();
  const body = useBody();

  const resources: Resource<unknown>[] = [
    score,
    activity,
    hydration,
    sleep,
    body,
  ];

  const hasSource = resources.some(
    (r) => r.status !== "unavailable",
  );

  const ready = resources.filter(
    (
      r,
    ): r is Extract<
      Resource<unknown>,
      { status: "ready" }
    > => r.status === "ready",
  );

  const refreshing = ready.some((r) => r.refreshing);

  const onRefresh =
    ready.length > 0
      ? () => ready.forEach((r) => r.refresh())
      : undefined;

  const a = dataOf(activity);
  const h = dataOf(hydration);
  const s = dataOf(sleep);
  const b = dataOf(body);

  /*
   * ============================
   * HERO RINGS
   * ============================
   */

  const rings: HeroRing[] = [];

  if (activity.status !== "unavailable") {
    rings.push({
      label: "Steps",
      value: a
        ? `${formatNumber(a.steps)} / ${formatNumber(
            a.stepGoal,
          )}`
        : "—",
      color: colors.ringMove,
      progress: a
        ? progressOf(a.steps, a.stepGoal)
        : 0,
    });
  }

  if (hydration.status !== "unavailable") {
    rings.push({
      label: "Hydration",
      value: h
        ? volumeText(h.intakeMl)
        : "—",
      color: colors.ringStand,
      progress: h
        ? progressOf(
            h.intakeMl,
            h.targetMl,
          )
        : 0,
    });
  }

  if (sleep.status !== "unavailable") {
    rings.push({
      label: "Sleep",
      value: s
        ? formatDuration(s.durationMin)
        : "—",
      color: colors.blue,
      progress: s
        ? progressOf(
            s.durationMin,
            s.targetMin ?? 480,
          )
        : 0,
    });
  }

  /*
   * ============================
   * HIGHLIGHTS
   * ============================
   *
   * PhotoStack expects:
   *
   * image: {
   *   uri: "..."
   * }
   */

  const highlights = [
    a && {
      title: "Steps",
      subtitle: `${formatNumber(
        a.steps,
      )} of ${formatNumber(a.stepGoal)}`,
      image: {
        uri: "https://images.pexels.com/photos/260044/pexels-photo-260044.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
      },
    },

    h && {
      title: "Hydration",
      subtitle: volumeText(h.intakeMl),
      image: {
        uri: "https://images.pexels.com/photos/10415537/pexels-photo-10415537.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
      },
    },

    s && {
      title: "Sleep",
      subtitle: formatDuration(s.durationMin),
      image: {
        uri: "https://images.pexels.com/photos/6754022/pexels-photo-6754022.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
      },
    },

    b &&
      b.weightKg !== undefined && {
        title: "Weight",
        subtitle: `${formatNumber(
          b.weightKg,
          1,
        )} kg`,
        image: {
          uri: "https://images.pexels.com/photos/27810154/pexels-photo-27810154.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
        },
      },
  ].filter(Boolean) as StackItem[];

  const kcal = a?.activeKcal;

  const water = h
    ? formatVolume(h.intakeMl)
    : undefined;

  return (
    <TabScreen
      title="Today"
      subtitle="YOUR HEALTH"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Text
        variant="label"
        tone="muted"
      >
        {formatDate()}
      </Text>

      {hasSource ? (
        <>
          {rings.length > 0 ? (
            <Pressable
              onPress={() =>
                go("/activity" as Href)
              }
              accessibilityRole="button"
              accessibilityHint="Opens activity details"
              style={styles.hero}
            >
              <RingHero rings={rings} />
            </Pressable>
          ) : null}

          {score.status === "ready" ? (
            <View style={styles.score}>
              <Metric
                tile
                label="Daily score"
                accent={colors.amber}
                value={formatNumber(
                  score.data.value,
                )}
                unit="/100"
                context={scoreContext(
                  score.data,
                )}
              />
            </View>
          ) : null}

          <TileGrid>
            {activity.status !==
            "unavailable" ? (
              <NavTile
                href="/activity"
                spoken={`Active energy: ${
                  kcal !== undefined
                    ? `${formatNumber(
                        kcal,
                      )} kcal`
                    : "no data"
                }`}
              >
                <Metric
                  tile
                  square
                  size="small"
                  label="Active energy"
                  accent={
                    colors.ringExercise
                  }
                  value={
                    kcal !== undefined
                      ? formatNumber(kcal)
                      : undefined
                  }
                  unit={
                    kcal !== undefined
                      ? "kcal"
                      : undefined
                  }
                  context={statusText(
                    activity,
                  )}
                />
              </NavTile>
            ) : null}

            {hydration.status !==
            "unavailable" ? (
              <NavTile
                href="/hydration"
                spoken={`Hydration: ${
                  h
                    ? volumeText(
                        h.intakeMl,
                      )
                    : "no data"
                }`}
              >
                <Metric
                  tile
                  square
                  size="small"
                  label="Hydration"
                  accent={
                    colors.ringStand
                  }
                  value={water?.value}
                  unit={water?.unit}
                  context={statusText(
                    hydration,
                  )}
                />
              </NavTile>
            ) : null}

            {sleep.status !==
            "unavailable" ? (
              <NavTile
                href="/sleep"
                spoken={`Sleep: ${
                  s
                    ? formatDuration(
                        s.durationMin,
                      )
                    : "no data"
                }`}
              >
                <Metric
                  tile
                  square
                  size="small"
                  label="Sleep"
                  accent={colors.blue}
                  value={
                    s
                      ? formatDuration(
                          s.durationMin,
                        )
                      : undefined
                  }
                  context={
                    s?.score !== undefined
                      ? `Score ${s.score}`
                      : statusText(sleep)
                  }
                />
              </NavTile>
            ) : null}

            {body.status !==
            "unavailable" ? (
              <NavTile
                href="/body"
                spoken={`Weight: ${
                  b?.weightKg !== undefined
                    ? `${formatNumber(
                        b.weightKg,
                        1,
                      )} kg`
                    : "no data"
                }`}
              >
                <Metric
                  tile
                  square
                  size="small"
                  label="Weight"
                  accent={colors.mint}
                  value={
                    b?.weightKg !==
                    undefined
                      ? formatNumber(
                          b.weightKg,
                          1,
                        )
                      : undefined
                  }
                  unit={
                    b?.weightKg !==
                    undefined
                      ? "kg"
                      : undefined
                  }
                  context={statusText(
                    body,
                  )}
                />
              </NavTile>
            ) : null}
          </TileGrid>

          {highlights.length > 0 ? (
            <Section
              title="Highlights"
              description="Tap the stack to flip through."
            >
              <PhotoStack
                items={highlights}
                size={stackSize}
              />
            </Section>
          ) : null}
        </>
      ) : (
        <ConnectPrompt />
      )}
    </TabScreen>
  );
}

/**
 * A tile that opens its detail screen.
 */
function NavTile({
  href,
  spoken,
  children,
}: {
  href: string;
  spoken: string;
  children: React.ReactNode;
}) {
  // IMPORTANT:
  // Use the transition hook here as well.
  const go = useTransitionNavigate();

  return (
    <Pressable
      onPress={() => go(href as Href)}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint="Opens details"
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        transform: [
          {
            scale: pressed ? 0.98 : 1,
          },
        ],
      })}
    >
      {children}
    </Pressable>
  );
}

/**
 * Shown when no health source is connected.
 */
function ConnectPrompt() {
  const stackSize = useStackSize();

  return (
    <>
      <Text
        variant="heading1"
        accessibilityRole="header"
        style={styles.headline}
      >
        Connect a health source
      </Text>

      <Text
        tone="secondary"
        style={styles.lead}
      >
        Your activity, sleep, hydration
        and recovery metrics will appear
        here once a supported health source
        is connected.
      </Text>

      <View style={styles.preview}>
        <PhotoStack
          size={stackSize}
          items={[
            {
              title: "Activity",
              subtitle: "Steps & movement",
              image: {
                uri: "https://images.pexels.com/photos/260044/pexels-photo-260044.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
              },
            },
            {
              title: "Sleep",
              subtitle: "Rest & recovery",
              image: {
                uri: "https://images.pexels.com/photos/6754022/pexels-photo-6754022.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
              },
            },
            {
              title: "Hydration",
              subtitle: "Daily water intake",
              image: {
                uri: "https://images.pexels.com/photos/10415537/pexels-photo-10415537.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
              },
            },
          ]}
        />
      </View>

      <Section title="What you'll see here">
        <Card>
          <ListRow
            icon="speedometer-outline"
            label="Daily score"
            description="Your score, day streak and goals remaining"
          />

          <ListRow
            icon="footsteps-outline"
            label="Activity"
            description={`Steps toward ${STEP_GOAL}, distance and active calories`}
          />

          <ListRow
            icon="water-outline"
            label="Hydration"
            description={`Water intake against your ${HYDRATION_TARGET} target`}
          />

          <ListRow
            icon="moon-outline"
            label="Sleep"
            description="Last night's duration and Deep, REM and Light stages"
          />

          <ListRow
            icon="body-outline"
            label="Body"
            description="Weight and BMI"
            last
          />
        </Card>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: spacing.md,
  },

  score: {
    marginTop: layout.tileGap,
  },

  headline: {
    marginTop: spacing.sm,
  },

  lead: {
    marginTop: spacing.sm,
    maxWidth: 520,
  },

  preview: {
    marginTop: spacing.xl,
  },
});