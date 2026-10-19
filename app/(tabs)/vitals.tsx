import React, { useCallback, useRef } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TabScreen } from "../../src/components/navigation/TabScreen";
import { AsyncView } from "../../src/components/ui/AsyncView";
import { BarChart } from "../../src/components/ui/BarChart";
import Card from "../../src/components/ui/Card";
import { Metric } from "../../src/components/ui/Metric";
import { Section } from "../../src/components/ui/Section";
import { TileGrid } from "../../src/components/ui/Tilegrid";
import { UnavailableState } from "../../src/components/ui/states";

import { formatNumber, formatShortDate } from "../../src/data/format";
import { useBody } from "../../src/data/hooks";
import { refreshProps } from "../../src/data/resource";
import type { BodyData } from "../../src/data/types";

import { useTheme } from "../../src/theme/ThemeProvider";

const EMPTY_DESCRIPTION =
  "Weight history appears here after you add a measurement or connect a source that shares weight data.";

type HistoryEntry = NonNullable<BodyData["history"]>[number];

export default function VitalsScreen() {
  const body = useBody();

  // Keep the latest resource in a ref so the focus callback stays stable.
  // Depending on `body` directly caused an endless refresh loop: refresh()
  // updates state -> new `body` object -> new callback -> effect re-runs.
  const bodyRef = useRef(body);
  bodyRef.current = body;
  const hasFocusedOnce = useRef(false);

  // Refresh the shared body resource only when this tab becomes active again.
  useFocusEffect(
    useCallback(() => {
      // Skip the first focus: useBody() is expected to load on mount.
      // If it does not, remove this check.
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        return;
      }

      const current = bodyRef.current;
      if ("refresh" in current && typeof current.refresh === "function") {
        void current.refresh();
      }
    }, []),
  );

  return (
    <TabScreen title="Vitals" subtitle="HEALTH OVERVIEW" {...refreshProps(body)}>
      <AsyncView
        resource={body}
        unavailable={
          <UnavailableState description={EMPTY_DESCRIPTION} />
        }
      >
        {(data) => <VitalsContent data={data} />}
      </AsyncView>
    </TabScreen>
  );
}

function VitalsContent({ data }: { data: BodyData }) {
  const { colors, resolvedMode } = useTheme();
  const router = useRouter();
  const dark = resolvedMode === "dark";
  const panel = dark ? "#172923" : "#FFFEFA";
  const ink = dark ? "#F4F1E8" : "#10241D";
  const muted = dark ? "#A9B5AE" : "#607067";
  const border = dark ? "rgba(247,244,236,0.14)" : "rgba(24,61,50,0.14)";

  const history: HistoryEntry[] = [...(data.history ?? [])]
    .filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const recentHistory = history.slice(-7);
  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : undefined;
  const latestChange = latest && previous ? latest.value - previous.value : undefined;
  const weeklyChange = data.weekChangeKg;

  const weightContext =
    weeklyChange !== undefined
      ? `${weeklyChange > 0 ? "+" : weeklyChange < 0 ? "−" : ""}${formatNumber(Math.abs(weeklyChange), 1)} kg over the last week`
      : latestChange !== undefined
        ? `${latestChange > 0 ? "+" : latestChange < 0 ? "−" : ""}${formatNumber(Math.abs(latestChange), 1)} kg since previous entry`
        : data.weightKg === undefined
          ? "Add your first measurement"
          : "Keep logging to see your trend";

  const openBody = () => router.push("/(tabs)/body" as never);

  return (
    <>
      <View style={[styles.hero, { backgroundColor: panel, borderColor: border }]}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={[styles.eyebrow, { color: muted }]}>CURRENT WEIGHT</Text>
            <View style={styles.weightLine}>
              <Text style={[styles.weightValue, { color: ink }]}>
                {data.weightKg !== undefined ? formatNumber(data.weightKg, 1) : "—"}
              </Text>
              {data.weightKg !== undefined ? <Text style={[styles.weightUnit, { color: muted }]}>kg</Text> : null}
            </View>
            <Text style={[styles.context, { color: muted }]}>{weightContext}</Text>
          </View>
          <View style={[styles.weightIcon, { backgroundColor: dark ? "rgba(183,230,203,0.12)" : "#EAF3EC" }]}>
            <Text style={{ fontSize: 25, color: colors.blue }}>↗</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={openBody}
          style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.amber ?? "#D9822B", opacity: pressed ? 0.82 : 1 }]}
        >
          <Text style={styles.primaryButtonText}>Manage weight & history</Text>
          <Text style={styles.buttonArrow}>›</Text>
        </Pressable>
      </View>

      <Section title="Body measurements" description="Your latest available measurements and change over time.">
        <TileGrid>
          <Metric
            tile
            square
            size="small"
            label="Weight"
            accent={colors.blue}
            value={data.weightKg !== undefined ? formatNumber(data.weightKg, 1) : undefined}
            unit={data.weightKg !== undefined ? "kg" : undefined}
            context={data.weightKg === undefined ? "No weight data" : "Latest recorded value"}
          />
          <Metric
            tile
            square
            size="small"
            label="Weekly change"
            accent={weeklyChange === undefined ? colors.ringExercise : weeklyChange > 0 ? colors.amber : colors.ringStand}
            value={weeklyChange !== undefined ? `${weeklyChange > 0 ? "+" : weeklyChange < 0 ? "−" : ""}${formatNumber(Math.abs(weeklyChange), 1)}` : undefined}
            unit={weeklyChange !== undefined ? "kg" : undefined}
            context={weeklyChange === undefined ? "Needs 2+ recent entries" : "Newest minus oldest"}
          />
          <Metric
            tile
            square
            size="small"
            label="BMI"
            accent={colors.ringExercise}
            context="Add height to calculate"
          />
        </TileGrid>
      </Section>

      <Section title="Weight trend" description="Your most recent recorded measurements.">
        <Card>
          {recentHistory.length >= 2 ? (
            <BarChart
              title="Weight (kg)"
              data={recentHistory.map((entry) => ({ date: formatShortDate(entry.date), value: entry.value }))}
              color={colors.blue}
              formatValue={(value) => `${formatNumber(value, 1)} kg`}
            />
          ) : (
            <View style={styles.emptyTrend}>
              <Text style={[styles.emptyTitle, { color: ink }]}>Build your trend</Text>
              <Text style={[styles.emptyText, { color: muted }]}>
                {history.length === 1
                  ? `Your first entry is ${formatNumber(history[0].value, 1)} kg. Add another measurement to see a trend.`
                  : EMPTY_DESCRIPTION}
              </Text>
              <Pressable accessibilityRole="button" onPress={openBody}>
                <Text style={[styles.inlineLink, { color: colors.blue }]}>Add a weight entry →</Text>
              </Pressable>
            </View>
          )}
          {latest ? (
            <Text style={[styles.lastUpdated, { color: muted }]}>Latest entry: {formatShortDate(latest.date)}</Text>
          ) : null}
        </Card>
      </Section>

      <Section title="Additional vitals" description="These metrics appear when a supported device or service provides them.">
        <TileGrid>
          <Metric tile square size="small" label="Heart rate" accent={colors.ringMove} context="No connected reading" />
          <Metric tile square size="small" label="HRV" accent={colors.ringExercise} context="No connected reading" />
          <Metric tile square size="small" label="Blood oxygen" accent={colors.ringStand} context="No connected reading" />
          <Metric tile square size="small" label="Blood pressure" accent={colors.amber} context="No connected reading" />
        </TileGrid>
      </Section>

      <View style={[styles.note, { borderColor: border, backgroundColor: panel }]}>
        <Text style={[styles.noteTitle, { color: ink }]}>Data note</Text>
        <Text style={[styles.noteText, { color: muted }]}>Manual weight entries take priority over synced entries for the same date. BMI is left blank until a reliable height value is available; the other vitals are not estimated.</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { borderWidth: 1, borderRadius: 24, padding: 20, marginBottom: 8 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  heroCopy: { flex: 1, gap: 5 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.6 },
  weightLine: { flexDirection: "row", alignItems: "baseline", gap: 7 },
  weightValue: { fontSize: 42, fontWeight: "800", letterSpacing: -1.8 },
  weightUnit: { fontSize: 15, fontWeight: "700" },
  context: { fontSize: 12, lineHeight: 18 },
  weightIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  primaryButton: { minHeight: 46, borderRadius: 14, paddingHorizontal: 15, marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  buttonArrow: { color: "#FFFFFF", fontSize: 24, lineHeight: 26 },
  emptyTrend: { paddingVertical: 8, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyText: { fontSize: 12, lineHeight: 18 },
  inlineLink: { fontSize: 12, fontWeight: "800", marginTop: 3 },
  lastUpdated: { fontSize: 10, marginTop: 12 },
  note: { borderWidth: 1, borderRadius: 18, padding: 15, marginTop: 8, marginBottom: 20, gap: 5 },
  noteTitle: { fontSize: 13, fontWeight: "800" },
  noteText: { fontSize: 11, lineHeight: 17 },
});