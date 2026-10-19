import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { TabScreen } from "../../src/components/navigation/TabScreen";
import { RingHero } from "../../src/components/ui/Ringhero";
import { AsyncView } from "../../src/components/ui/AsyncView";
import { BarChart } from "../../src/components/ui/BarChart";
import Card from "../../src/components/ui/Card";
import { Metric } from "../../src/components/ui/Metric";
import { Section } from "../../src/components/ui/Section";
import { UnavailableState } from "../../src/components/ui/states";
import { formatVolume, progressOf } from "../../src/data/format";
import { useHydration } from "../../src/data/hooks";
import { refreshProps } from "../../src/data/resource";
import type { HydrationData } from "../../src/data/types";
import { supabase } from "../../src/lib/supabase";
import { useKeyboardHeight } from "../../src/lib/Usekeyboardheight";
import { useTheme } from "../../src/theme/ThemeProvider";
import { layout } from "../../src/theme/spacing";

type ManualWaterLog = {
  id: string;
  amount_ml: number;
  logged_at: string;
  log_date: string;
  note: string | null;
};

const QUICK_AMOUNTS = [150, 250, 350, 500];

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function volumeText(ml: number): string {
  const { value, unit } = formatVolume(ml);
  return `${value} ${unit}`;
}

function friendlyTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Just now" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function friendlyDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function useBrand() {
  const { colors, resolvedMode } = useTheme();
  const dark = resolvedMode === "dark";
  return {
    dark,
    bg: colors.background,
    panel: dark ? "#172923" : "#FFFEFA",
    ink: dark ? "#F4F1E8" : "#10241D",
    soft: dark ? "#A9B5AE" : "#607067",
    line: dark ? "rgba(247,244,236,0.14)" : "rgba(24,61,50,0.14)",
    accent: colors.blue ?? (dark ? "#B7E6CB" : "#183D32"),
    gold: colors.amber ?? "#D9822B",
    danger: colors.red ?? "#C94D4D",
  };
}

export default function HydrationScreen() {
  const hydration = useHydration();
  const brand = useBrand();
  const { height } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const [logs, setLogs] = useState<ManualWaterLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [amount, setAmount] = useState("250");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ManualWaterLog | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setLogs([]);
        return;
      }
      const { data, error } = await supabase
        .from("hydration_logs")
        .select("id, amount_ml, logged_at, log_date, note")
        .order("logged_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setLogs((data ?? []) as ManualWaterLog[]);
    } catch (error) {
      console.error("Unable to load manual hydration logs:", error);
      setErrorMessage("Manual water history could not load. Check the hydration_logs table and its RLS policies.");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => { void loadLogs(); }, [loadLogs]);

  const today = localDateString();
  const todayLogs = useMemo(() => logs.filter((entry) => entry.log_date === today), [logs, today]);
  const manualTodayMl = todayLogs.reduce((sum, entry) => sum + entry.amount_ml, 0);

  const showToast = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 2800);
  }, []);

  const closeAddModal = useCallback(() => {
    if (saving) return;
    Keyboard.dismiss();
    setShowAddModal(false);
  }, [saving]);

  const saveWater = useCallback(async (preset?: number) => {
    Keyboard.dismiss();
    setErrorMessage(null);
    const amountMl = preset ?? Number(amount.trim());
    if (!Number.isInteger(amountMl) || amountMl < 1 || amountMl > 5000) {
      setErrorMessage("Enter a whole-number amount between 1 and 5000 ml.");
      return;
    }
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setErrorMessage("Please sign in to save a manual water entry.");
        return;
      }
      const now = new Date();
      const { error } = await supabase.from("hydration_logs").insert({
        user_id: authData.user.id,
        amount_ml: amountMl,
        logged_at: now.toISOString(),
        log_date: localDateString(now),
        note: note.trim() || null,
        source: "manual",
      });
      if (error) throw error;
      setShowAddModal(false);
      setAmount("250");
      setNote("");
      await loadLogs();
      showToast(`${volumeText(amountMl)} added to your water log`);
    } catch (error) {
      console.error("Unable to save water entry:", error);
      setErrorMessage("Could not save water entry. Confirm the hydration_logs SQL setup has been run.");
    } finally {
      setSaving(false);
    }
  }, [amount, note, loadLogs, showToast]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || deletingId) return;
    setDeletingId(pendingDelete.id);
    setErrorMessage(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Sign in required");
      const { error } = await supabase.from("hydration_logs").delete().eq("id", pendingDelete.id).eq("user_id", authData.user.id);
      if (error) throw error;
      setLogs((current) => current.filter((entry) => entry.id !== pendingDelete.id));
      setPendingDelete(null);
      showToast("Water entry deleted");
    } catch (error) {
      console.error("Unable to delete water entry:", error);
      setErrorMessage("Could not delete this entry. Check the hydration_logs DELETE policy in Supabase.");
      setPendingDelete(null);
    } finally {
      setDeletingId(null);
    }
  }, [pendingDelete, deletingId, showToast]);

  return (
    <TabScreen title="Hydration" subtitle="DAILY" {...refreshProps(hydration)}>
      <View style={styles.page}>
        <AsyncView
          resource={hydration}
          unavailable={<UnavailableState description="Health data is not available right now. Your manual water log below will still work." />}
        >
          {(data) => <HydrationSummary data={data} manualTodayMl={manualTodayMl} logs={logs} brand={brand} />}
        </AsyncView>

        <Section title="Log water" description="Quick add or enter the amount you drank.">
          <View style={[styles.quickAdd, { borderColor: brand.line }]}>
            {QUICK_AMOUNTS.map((ml) => (
              <Pressable key={ml} onPress={() => void saveWater(ml)} disabled={saving} style={({ pressed }) => [styles.quickButton, { backgroundColor: brand.panel, borderColor: brand.line, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.quickAmount, { color: brand.ink }]}>{ml}</Text>
                <Text style={[styles.quickUnit, { color: brand.soft }]}>ml</Text>
                <Text style={[styles.quickPlus, { color: brand.accent }]}>+</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => { setErrorMessage(null); setShowAddModal(true); }} style={({ pressed }) => [styles.customAddButton, { backgroundColor: brand.accent, opacity: pressed ? 0.84 : 1 }]}>
            <Text style={[styles.customAddText, { color: brand.dark ? "#10241D" : "#F7F4EC" }]}>＋  Add custom amount</Text>
          </Pressable>
          <Text style={[styles.smallNote, { color: brand.soft }]}>Manual entries are kept separate from Health Connect / device-synced data.</Text>
        </Section>

        <Section title="Today's manual log" description={`${todayLogs.length} ${todayLogs.length === 1 ? "entry" : "entries"} · ${volumeText(manualTodayMl)}`}>
          {loadingLogs ? (
            <View style={styles.loadingRow}><ActivityIndicator color={brand.accent} /><Text style={[styles.bodyText, { color: brand.soft }]}>Loading entries…</Text></View>
          ) : todayLogs.length === 0 ? (
            <View style={[styles.emptyState, { borderColor: brand.line }]}>
              <Text style={[styles.emptyTitle, { color: brand.ink }]}>Nothing logged manually yet</Text>
              <Text style={[styles.bodyText, { color: brand.soft }]}>Use a quick-add amount above after you drink water.</Text>
            </View>
          ) : (
            <View style={[styles.logList, { borderTopColor: brand.line }]}>
              {todayLogs.map((entry) => (
                <View key={entry.id} style={[styles.logRow, { borderBottomColor: brand.line }]}>
                  <View style={[styles.waterDot, { backgroundColor: brand.dark ? "rgba(183,230,203,0.14)" : "rgba(24,61,50,0.08)" }]}><Text style={{ color: brand.accent, fontSize: 17 }}>↗</Text></View>
                  <View style={styles.logInfo}>
                    <Text style={[styles.logAmount, { color: brand.ink }]}>{volumeText(entry.amount_ml)}</Text>
                    <Text style={[styles.bodyText, { color: brand.soft }]}>{friendlyTime(entry.logged_at)}{entry.note ? ` · ${entry.note}` : ""}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${entry.amount_ml} ml entry`} onPress={() => setPendingDelete(entry)} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={18} color={brand.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Section>

        {errorMessage && !showAddModal ? <Text accessibilityRole="alert" style={[styles.inlineMessage, { color: brand.danger }]}>{errorMessage}</Text> : null}
      </View>

      {successMessage ? (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={[styles.toast, { backgroundColor: brand.dark ? "#B7E6CB" : "#183D32" }]}>
            <Text style={[styles.toastText, { color: brand.dark ? "#10241D" : "#F7F4EC" }]}>{successMessage}</Text>
          </View>
        </View>
      ) : null}

      {/* Add custom amount — the dialog is pushed up by the keyboard height */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={closeAddModal} statusBarTranslucent>
        <View style={[styles.modalOverlay, { paddingBottom: 22 + keyboardHeight }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAddModal} accessibilityLabel="Close" />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: brand.panel, borderColor: brand.line, maxHeight: Math.max(260, height - keyboardHeight - 60) },
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: brand.ink }]}>Add water</Text>
                  <Text style={[styles.bodyText, { color: brand.soft }]}>Record the amount you drank.</Text>
                </View>
                <Pressable accessibilityLabel="Close" onPress={closeAddModal} style={styles.closeButton}><Text style={{ color: brand.soft, fontSize: 24 }}>×</Text></Pressable>
              </View>

              <Text style={[styles.fieldLabel, { color: brand.soft }]}>AMOUNT (ML)</Text>
              <TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="250" placeholderTextColor={brand.soft} selectTextOnFocus style={[styles.input, { color: brand.ink, backgroundColor: brand.bg, borderColor: brand.line }]} />

              <Text style={[styles.fieldLabel, { color: brand.soft }]}>NOTE (OPTIONAL)</Text>
              <TextInput value={note} onChangeText={setNote} placeholder="e.g. After a workout" placeholderTextColor={brand.soft} style={[styles.input, { color: brand.ink, backgroundColor: brand.bg, borderColor: brand.line }]} maxLength={120} />

              {errorMessage ? <Text accessibilityRole="alert" style={[styles.inlineMessage, { color: brand.danger }]}>{errorMessage}</Text> : null}

              <View style={styles.modalActions}>
                <Pressable disabled={saving} onPress={closeAddModal} style={[styles.actionButton, { borderColor: brand.line }]}><Text style={[styles.actionText, { color: brand.ink }]}>Cancel</Text></Pressable>
                <Pressable disabled={saving} onPress={() => void saveWater()} style={[styles.actionButton, { backgroundColor: brand.accent, borderColor: brand.accent, opacity: saving ? 0.7 : 1 }]}>
                  {saving ? <ActivityIndicator color={brand.dark ? "#10241D" : "#FFFFFF"} /> : null}
                  <Text style={[styles.actionText, { color: brand.dark ? "#10241D" : "#FFFFFF" }]}>{saving ? "Saving…" : "Save water"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={pendingDelete !== null} transparent animationType="fade" onRequestClose={() => !deletingId && setPendingDelete(null)} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !deletingId && setPendingDelete(null)} accessibilityLabel="Cancel delete" />
          <View style={[styles.modalCard, { backgroundColor: brand.panel, borderColor: brand.line }]}>
            <View style={[styles.deleteDialogIcon, { backgroundColor: `${brand.danger}18` }]}>
              <Ionicons name="trash-outline" size={24} color={brand.danger} />
            </View>
            <Text style={[styles.modalTitle, { color: brand.ink }]}>Delete water entry?</Text>
            <Text style={[styles.bodyText, { color: brand.soft, marginTop: 2 }]}>
              {pendingDelete ? `${volumeText(pendingDelete.amount_ml)} · ${friendlyTime(pendingDelete.logged_at)}` : "This water entry will be removed."}
            </Text>
            <Text style={[styles.bodyText, { color: brand.soft, marginTop: 2 }]}>Only this manual log will be deleted. Health Connect data will remain unchanged.</Text>
            <View style={styles.modalActions}>
              <Pressable disabled={!!deletingId} onPress={() => setPendingDelete(null)} style={[styles.actionButton, { backgroundColor: brand.bg, borderColor: brand.line }]}>
                <Text style={[styles.actionText, { color: brand.ink }]}>Cancel</Text>
              </Pressable>
              <Pressable disabled={!!deletingId} onPress={() => void confirmDelete()} style={[styles.actionButton, { backgroundColor: brand.danger, borderColor: brand.danger, opacity: deletingId ? 0.7 : 1 }]}>
                {deletingId ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="trash-outline" size={16} color="#FFFFFF" />}
                <Text style={[styles.actionText, { color: "#FFFFFF" }]}>{deletingId ? "Deleting…" : "Delete"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </TabScreen>
  );
}

function HydrationSummary({ data, manualTodayMl, logs, brand }: { data: HydrationData; manualTodayMl: number; logs: ManualWaterLog[]; brand: ReturnType<typeof useBrand> }) {
  const manualByDate = useMemo(() => {
    const totals = new Map<string, number>();
    for (const log of logs) totals.set(log.log_date, (totals.get(log.log_date) ?? 0) + log.amount_ml);
    return totals;
  }, [logs]);

  const syncedMl = data.intakeMl ?? 0;
  const totalToday = syncedMl + manualTodayMl;
  const target = data.targetMl || 2500;
  const remaining = formatVolume(Math.max(0, target - totalToday));

  const week = (data.week ?? []).map((point, index, all) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (all.length - 1 - index));
    const key = localDateString(date);
    return {
      ...point,
      date: key,
      value: point.value + (manualByDate.get(key) ?? 0),
    };
  });

  return (
    <>
      <RingHero rings={[{ label: "Water today", value: `${volumeText(totalToday)} of ${volumeText(target)}`, color: brand.accent, progress: progressOf(totalToday, target) }]} />
      <View style={styles.metricsRow}>
        <View style={styles.metricCell}><Metric tile square size="small" label="Remaining" accent={brand.accent} value={remaining.value} unit={remaining.unit} /></View>
        <View style={styles.metricCell}><Metric tile square size="small" label="Manual today" accent={brand.gold} value={formatVolume(manualTodayMl).value} unit={formatVolume(manualTodayMl).unit} /></View>
      </View>
      <Text style={[styles.sourceLine, { color: brand.soft }]}>
        {volumeText(syncedMl)} synced from your connected health source{manualTodayMl > 0 ? ` · ${volumeText(manualTodayMl)} logged here` : ""}
      </Text>
      {week.length > 0 ? (
        <Section title="Last 7 days" description={`Daily intake · target ${volumeText(target)}`}>
          <Card>
            <BarChart title="Water intake" data={week} goal={target} color={brand.accent} formatValue={volumeText} />
          </Card>
        </Section>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  page: { gap: 4 },
  metricsRow: { flexDirection: "row", alignItems: "flex-start", gap: layout.tileGap, marginTop: layout.tileGap },
  metricCell: { flex: 1 },
  sourceLine: { fontSize: 12, lineHeight: 18, marginTop: 10, marginBottom: 6 },
  quickAdd: { flexDirection: "row", gap: 8, borderRadius: 16 },
  quickButton: { flex: 1, minHeight: 82, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingVertical: 10, position: "relative" },
  quickAmount: { fontSize: 18, fontWeight: "700", letterSpacing: -0.4 },
  quickUnit: { fontSize: 11, marginTop: 1 },
  quickPlus: { position: "absolute", top: 5, right: 8, fontSize: 17, fontWeight: "500" },
  customAddButton: { minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 10 },
  customAddText: { fontSize: 14, fontWeight: "700" },
  smallNote: { fontSize: 11, lineHeight: 16, marginTop: 9 },
  emptyState: { paddingVertical: 17, paddingHorizontal: 15, borderWidth: 1, borderRadius: 13 },
  emptyTitle: { fontSize: 14, fontWeight: "600", marginBottom: 5 },
  bodyText: { fontSize: 12, lineHeight: 18 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  logList: { borderTopWidth: 1 },
  logRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, gap: 11 },
  waterDot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  logInfo: { flex: 1 },
  logAmount: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  deleteButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  inlineMessage: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  toastWrap: { position: "absolute", bottom: 22, left: 16, right: 16, alignItems: "center", zIndex: 20 },
  toast: { borderRadius: 14, paddingHorizontal: 17, paddingVertical: 12, maxWidth: 360 },
  toastText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "center", alignItems: "center", padding: 22 },
  modalCard: { width: "100%", maxWidth: 410, borderWidth: 1, borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 18 },
  modalTitle: { fontSize: 21, fontWeight: "700", letterSpacing: -0.5 },
  deleteDialogIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  closeButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center", marginTop: -4 },
  fieldLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 7, marginTop: 8 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, fontSize: 14 },
  modalActions: { flexDirection: "row", gap: 9, marginTop: 20 },
  actionButton: { flex: 1, minHeight: 44, borderRadius: 11, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 10 },
  actionText: { fontSize: 13, fontWeight: "700" },
});