import React, { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { supabase } from "../../src/lib/supabase";
import { useTransitionNavigate } from "../../src/components/navigation/Transitionprovider";

import type { Href } from "expo-router";
import { useFocusEffect } from "expo-router";

import { TabScreen } from "../../src/components/navigation/TabScreen";
import { HeroRing, RingHero } from "../../src/components/ui/Ringhero";
import Card from "../../src/components/ui/Card";
import { ListRow } from "../../src/components/ui/ListRow";
import { Metric } from "../../src/components/ui/Metric";
import { PhotoStack, type StackItem } from "../../src/components/ui/Photostack";
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
  useNutrition,
  useSleep,
} from "../../src/data/hooks";
import type { Resource } from "../../src/data/resource";
import type { DailyScore } from "../../src/data/types";
import { useTheme } from "../../src/theme/ThemeProvider";
import { layout, spacing } from "../../src/theme/spacing";

// Shown only in the "not connected" state.
const STEP_GOAL = "10,000";
const HYDRATION_TARGET = "2.5 L";

// Smaller than the original 1000px: these are shown as cards, so the extra
// pixels only slow the first load.
const IMG_STEPS = "https://images.pexels.com/photos/260044/pexels-photo-260044.jpeg?auto=compress&cs=tinysrgb&w=700&h=700&fit=crop";
const IMG_HYDRATION = "https://images.pexels.com/photos/10415537/pexels-photo-10415537.jpeg?auto=compress&cs=tinysrgb&w=700&h=700&fit=crop";
const IMG_SLEEP = "https://images.pexels.com/photos/6754022/pexels-photo-6754022.jpeg?auto=compress&cs=tinysrgb&w=700&h=700&fit=crop";
const IMG_WEIGHT = "https://images.pexels.com/photos/27810154/pexels-photo-27810154.jpeg?auto=compress&cs=tinysrgb&w=700&h=700&fit=crop";

function formatDate(): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function scoreContext(score: DailyScore): string | undefined {
  const parts = [
    score.streakDays !== undefined ? `${score.streakDays}-day streak` : undefined,
    score.goalsComplete !== undefined && score.goalsTotal !== undefined
      ? `${score.goalsComplete} of ${score.goalsTotal} goals complete`
      : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function dataOf<T>(resource: Resource<T>): T | undefined {
  return resource.status === "ready" ? resource.data : undefined;
}

function statusText(resource: Resource<unknown>): string | undefined {
  if (resource.status === "loading") return "Loading…";
  if (resource.status === "error") return "Couldn't load";
  return undefined;
}

function volumeText(ml: number): string {
  const { value, unit } = formatVolume(ml);
  return `${value} ${unit}`;
}

function refreshIfAvailable(resource: unknown) {
  if (resource && typeof resource === "object" && "refresh" in resource) {
    const refresh = (resource as { refresh?: unknown }).refresh;
    if (typeof refresh === "function") void refresh.call(resource);
  }
}

export default function TodayScreen() {
  const { colors } = useTheme();
  const stackSize = useStackSize();

  // IMPORTANT:
  // The hook must be inside the component.
  const go = useTransitionNavigate();

  const [username, setUsername] = useState("Your account");
  const [loggingOut, setLoggingOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        // getSession() reads the local session; getUser() makes a network
        // round trip to the auth server on every call.
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user || !active) return;

        // Show a name right away from the session, then upgrade it from the profile.
        setUsername(
          user.user_metadata?.full_name || user.email?.split("@")[0] || "Your account",
        );

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;
        if (!profileError && profile?.full_name) {
          setUsername(profile.full_name);
        }
      } catch {
        // Keep the default name if the profile can't be loaded.
      }
    }

    void loadProfile();
    return () => { active = false; };
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError("Unable to log out. Please try again.");
        return;
      }
      go("/(auth)/welcome");
    } catch {
      setAuthError("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const score = useDailyScore();
  const activity = useActivity();
  const hydration = useHydration();
  const nutrition = useNutrition();
  const sleep = useSleep();
  const body = useBody();

  // Keep the latest resources in a ref so the focus callback stays stable.
  // Depending on them directly caused an endless refresh loop: refresh()
  // updates state -> new resource objects -> new callback -> effect re-runs.
  const focusResources = useRef({ hydration, body, nutrition, score });
  focusResources.current = { hydration, body, nutrition, score };
  const hasFocusedOnce = useRef(false);

  // Refresh database-backed values only when returning to Today.
  useFocusEffect(
    useCallback(() => {
      // Skip the first focus: the hooks are expected to load on mount.
      // If they do not, remove this check.
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        return;
      }

      const current = focusResources.current;
      refreshIfAvailable(current.hydration);
      refreshIfAvailable(current.body);
      refreshIfAvailable(current.nutrition);
      refreshIfAvailable(current.score);
    }, []),
  );

  const resources: Resource<unknown>[] = [
    score,
    activity,
    hydration,
    nutrition,
    sleep,
    body,
  ];

  const hasSource = resources.some((r) => r.status !== "unavailable");

  const ready = resources.filter(
    (r): r is Extract<Resource<unknown>, { status: "ready" }> =>
      r.status === "ready",
  );

  const refreshing = ready.some((r) => r.refreshing);

  const onRefresh =
    ready.length > 0 ? () => ready.forEach((r) => r.refresh()) : undefined;

  const a = dataOf(activity);
  const h = dataOf(hydration);
  const n = dataOf(nutrition);
  const s = dataOf(sleep);
  const b = dataOf(body);

  /*
   * HERO RINGS
   */
  const rings: HeroRing[] = [];

  if (activity.status !== "unavailable") {
    rings.push({
      label: "Steps",
      value: a ? `${formatNumber(a.steps)} / ${formatNumber(a.stepGoal)}` : "—",
      color: colors.ringMove,
      progress: a ? progressOf(a.steps, a.stepGoal) : 0,
    });
  }

  if (hydration.status !== "unavailable") {
    rings.push({
      label: "Hydration",
      value: h ? volumeText(h.intakeMl) : "—",
      color: colors.ringStand,
      progress: h ? progressOf(h.intakeMl, h.targetMl) : 0,
    });
  }

  if (sleep.status !== "unavailable") {
    rings.push({
      label: "Sleep",
      value: s ? formatDuration(s.durationMin) : "—",
      color: colors.blue,
      progress: s ? progressOf(s.durationMin, s.targetMin ?? 480) : 0,
    });
  }

  /*
   * HIGHLIGHTS
   *
   * PhotoStack expects: image: { uri: "..." }
   */
  const highlights = [
    a && {
      title: "Steps",
      subtitle: `${formatNumber(a.steps)} of ${formatNumber(a.stepGoal)}`,
      image: { uri: IMG_STEPS },
    },
    h && {
      title: "Hydration",
      subtitle: volumeText(h.intakeMl),
      image: { uri: IMG_HYDRATION },
    },
    s && {
      title: "Sleep",
      subtitle: formatDuration(s.durationMin),
      image: { uri: IMG_SLEEP },
    },
    b &&
      b.weightKg !== undefined && {
        title: "Weight",
        subtitle: `${formatNumber(b.weightKg, 1)} kg`,
        image: { uri: IMG_WEIGHT },
      },
  ].filter(Boolean) as StackItem[];

  const kcal = a?.activeKcal;
  const water = h ? formatVolume(h.intakeMl) : undefined;

  return (
    <TabScreen
      title="Today"
      subtitle="YOUR HEALTH"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <Text variant="label" tone="muted">WELCOME BACK</Text>
          <Text variant="heading2" numberOfLines={1}>{username}</Text>
        </View>
        <View accessibilityLabel="Logged-in user profile" style={[styles.profileButton, { borderColor: colors.ringStand }]}>
          <Ionicons name="person-outline" size={22} color={colors.ringStand} />
        </View>
      </View>

      <Pressable
        onPress={handleLogout}
        disabled={loggingOut}
        accessibilityRole="button"
        accessibilityLabel="Log out"
        style={({ pressed }) => [styles.logoutButton, { opacity: loggingOut ? 0.55 : pressed ? 0.7 : 1 }]}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.amber} />
        <Text>{loggingOut ? "Signing out…" : "Log out"}</Text>
      </Pressable>

      {authError ? <Text>{authError}</Text> : null}

      <Text variant="label" tone="muted">
        {formatDate()}
      </Text>

      {hasSource ? (
        <>
          {rings.length > 0 ? (
            <Pressable
              onPress={() => go("/activity" as Href)}
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
                value={formatNumber(score.data.value)}
                unit="/100"
                context={scoreContext(score.data)}
              />
            </View>
          ) : null}

          <TileGrid>
            {activity.status !== "unavailable" ? (
              <NavTile
                href="/activity"
                spoken={`Active energy: ${kcal !== undefined ? `${formatNumber(kcal)} kcal` : "no data"}`}
              >
                <Metric
                  tile
                  square
                  size="small"
                  label="Active energy"
                  accent={colors.ringExercise}
                  value={kcal !== undefined ? formatNumber(kcal) : undefined}
                  unit={kcal !== undefined ? "kcal" : undefined}
                  context={statusText(activity)}
                />
              </NavTile>
            ) : null}

            {hydration.status !== "unavailable" ? (
              <NavTile
                href="/hydration"
                spoken={`Hydration: ${h ? volumeText(h.intakeMl) : "no data"}`}
              >
                <Metric
                  tile
                  square
                  size="small"
                  label="Hydration"
                  accent={colors.ringStand}
                  value={water?.value}
                  unit={water?.unit}
                  context={statusText(hydration)}
                />
              </NavTile>
            ) : null}

            {nutrition.status !== "unavailable" ? (
              <NavTile
                href="/nutrition"
                spoken={`Nutrition: ${n ? `${formatNumber(n.calories)} calories` : "no data"}`}
              >
                <Metric
                  tile
                  square
                  size="small"
                  label="Nutrition"
                  accent={colors.amber}
                  value={n ? formatNumber(n.calories) : undefined}
                  unit={n ? "kcal" : undefined}
                  context={n ? `P ${formatNumber(n.proteinG, 1)} g · C ${formatNumber(n.carbsG, 1)} g` : statusText(nutrition)}
                />
              </NavTile>
            ) : null}

            {sleep.status !== "unavailable" ? (
              <NavTile
                href="/sleep"
                spoken={`Sleep: ${s ? formatDuration(s.durationMin) : "no data"}`}
              >
                <Metric
                  tile
                  square
                  size="small"
                  label="Sleep"
                  accent={colors.blue}
                  value={s ? formatDuration(s.durationMin) : undefined}
                  context={s?.score !== undefined ? `Score ${s.score}` : statusText(sleep)}
                />
              </NavTile>
            ) : null}

            {body.status !== "unavailable" ? (
              <NavTile
                href="/body"
                spoken={`Weight: ${b?.weightKg !== undefined ? `${formatNumber(b.weightKg, 1)} kg` : "no data"}`}
              >
                <Metric
                  tile
                  square
                  size="small"
                  label="Weight"
                  accent={colors.mint}
                  value={b?.weightKg !== undefined ? formatNumber(b.weightKg, 1) : undefined}
                  unit={b?.weightKg !== undefined ? "kg" : undefined}
                  context={statusText(body)}
                />
              </NavTile>
            ) : null}
          </TileGrid>

          {highlights.length > 0 ? (
            <Section
              title="Highlights"
              description="Tap the stack to flip through."
            >
              <PhotoStack items={highlights} size={stackSize} />
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
        transform: [{ scale: pressed ? 0.98 : 1 }],
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

      <Text tone="secondary" style={styles.lead}>
        Your activity, sleep, hydration and recovery metrics will appear here
        once a supported health source is connected.
      </Text>

      <View style={styles.preview}>
        <PhotoStack
          size={stackSize}
          items={[
            {
              title: "Activity",
              subtitle: "Steps & movement",
              image: { uri: IMG_STEPS },
            },
            {
              title: "Sleep",
              subtitle: "Rest & recovery",
              image: { uri: IMG_SLEEP },
            },
            {
              title: "Hydration",
              subtitle: "Daily water intake",
              image: { uri: IMG_HYDRATION },
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
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  profileInfo: { flex: 1, gap: spacing.xs },
  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
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