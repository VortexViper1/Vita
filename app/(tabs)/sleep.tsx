import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabScreen } from "../../src/components/navigation/TabScreen";
import { RingHero } from "../../src/components/ui/Ringhero";
import { AsyncView } from "../../src/components/ui/AsyncView";
import { BarChart } from "../../src/components/ui/BarChart";
import Card from "../../src/components/ui/Card";
import { Metric } from "../../src/components/ui/Metric";
import { Section } from "../../src/components/ui/Section";
import { UnavailableState } from "../../src/components/ui/states";

import { formatClock, formatDuration, progressOf } from "../../src/data/format";
import { useSleep } from "../../src/data/hooks";
import { refreshProps } from "../../src/data/resource";
import type { SleepData } from "../../src/data/types";

import { supabase } from "../../src/lib/supabase";
import { useAnimatedKeyboardPadding } from "../../src/lib/Useanimatedkeyboardpadding"
import { withTimeout } from "../../src/lib/Withtimeout";
import { useTheme } from "../../src/theme/ThemeProvider";
import { layout } from "../../src/theme/spacing";

type ManualSleep = {
  id: string;
  sleep_date: string;
  bedtime: string;
  wake_time: string;
  duration_min: number;
  note: string | null;
  source: "manual";
};

const TARGET_MIN = 480;
const LOAD_TIMEOUT_MS = 15000;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeToMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function calculateDuration(bedtime: string, wakeTime: string) {
  const start = timeToMinutes(bedtime);
  const end = timeToMinutes(wakeTime);
  if (start === null || end === null || start === end) return null;
  return end > start ? end - start : 1440 - start + end;
}

function friendlyDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function useBrand() {
  const { colors, resolvedMode } = useTheme();
  const dark = resolvedMode === "dark";
  return {
    dark,
    bg: dark ? colors.background : "#F7F4EC",
    panel: dark ? "#172923" : "#FFFEFA",
    ink: dark ? "#F4F1E8" : "#10241D",
    soft: dark ? "#A9B5AE" : "#607067",
    line: dark ? "rgba(247,244,236,0.14)" : "rgba(24,61,50,0.14)",
    accent: dark ? "#B7E6CB" : "#183D32",
    gold: colors.amber ?? "#D6B47A",
    danger: colors.red ?? "#C94D4D",
  };
}

// getSession() reads the local session; getUser() makes a network round trip
// to the auth server on every call. Row-level security still enforces ownership.
async function getSessionUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
}

async function fetchManualEntries(): Promise<ManualSleep[] | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("manual_sleep_logs")
    .select("id, sleep_date, bedtime, wake_time, duration_min, note, source")
    .order("sleep_date", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as ManualSleep[];
}

export default function SleepScreen() {
  const sleep = useSleep();
  const brand = useBrand();
  const [manualEntries, setManualEntries] = useState<ManualSleep[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sleepDate, setSleepDate] = useState(localDateString());
  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ManualSleep | null>(null);
  const [deleting, setDeleting] = useState(false);

  const mounted = useRef(true);
  const loadId = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const duration = useMemo(
    () => calculateDuration(bedtime, wakeTime),
    [bedtime, wakeTime],
  );

  const showToast = useCallback((message: string) => {
    setSuccessMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSuccessMessage(null), 3500);
  }, []);

  // Only the latest request may update state. `silent` reloads (after a save)
  // don't bring the loading spinner back.
  const loadManualEntries = useCallback(async (silent = false) => {
    const id = ++loadId.current;
    if (!silent) {
      setLoadingEntries(true);
      setErrorMessage(null);
    }

    try {
      const rows = await withTimeout(fetchManualEntries(), LOAD_TIMEOUT_MS);
      if (!mounted.current || id !== loadId.current) return;
      if (rows === null) {
        setManualEntries([]);
        setErrorMessage("Sign in to save and view your manual sleep entries.");
        return;
      }
      setManualEntries(rows);
    } catch (error) {
      if (!mounted.current || id !== loadId.current) return;
      console.error("Unable to load manual sleep logs:", error);
      setErrorMessage(
        "Manual sleep history could not be loaded. Check your connection and that the manual_sleep_logs table and its RLS policies are set up.",
      );
    } finally {
      if (mounted.current && id === loadId.current) setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    void loadManualEntries();
  }, [loadManualEntries]);

  const saveManualSleep = useCallback(async () => {
    Keyboard.dismiss();
    setErrorMessage(null);

    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(sleepDate) &&
      !Number.isNaN(new Date(`${sleepDate}T12:00:00`).getTime());
    const calculated = calculateDuration(bedtime, wakeTime);

    if (!validDate) {
      setErrorMessage("Enter a valid date in YYYY-MM-DD format.");
      return;
    }
    if (timeToMinutes(bedtime) === null || timeToMinutes(wakeTime) === null) {
      setErrorMessage("Enter bedtime and wake-up time in 24-hour HH:MM format.");
      return;
    }
    if (calculated === null || calculated < 1 || calculated > 960) {
      setErrorMessage("Check the times. Sleep duration must be between 1 minute and 16 hours.");
      return;
    }

    setSaving(true);
    try {
      const user = await getSessionUser();
      if (!user) {
        setErrorMessage("Please sign in before saving sleep.");
        return;
      }

      // Store the times as local wall-clock values for the selected sleep date.
      // If bedtime is after midnight relative to the wake time, the wake date is next day.
      const start = new Date(`${sleepDate}T${bedtime}:00`);
      const wakeDate = new Date(start);
      if (timeToMinutes(wakeTime)! <= timeToMinutes(bedtime)!) {
        wakeDate.setDate(wakeDate.getDate() + 1);
      }
      const [wakeHour, wakeMinute] = wakeTime.split(":").map(Number);
      wakeDate.setHours(wakeHour, wakeMinute, 0, 0);

      const { error } = await supabase.from("manual_sleep_logs").insert({
        user_id: user.id,
        sleep_date: sleepDate,
        bedtime: start.toISOString(),
        wake_time: wakeDate.toISOString(),
        duration_min: calculated,
        note: note.trim() || null,
        source: "manual",
      });
      if (error) throw error;

      setShowForm(false);
      setNote("");
      setSleepDate(localDateString());
      setBedtime("23:00");
      setWakeTime("07:00");
      showToast(`${formatDuration(calculated)} of sleep added to your history.`);
      // Reload in the background instead of making the user wait for it.
      void loadManualEntries(true);
    } catch (error) {
      console.error("Unable to save manual sleep:", error);
      setErrorMessage(
        "Could not save sleep. Confirm the SQL setup has been run and try again.",
      );
    } finally {
      setSaving(false);
    }
  }, [bedtime, wakeTime, sleepDate, note, loadManualEntries, showToast]);

  const deleteManualSleep = useCallback((entry: ManualSleep) => {
    setErrorMessage(null);
    setPendingDelete(entry);
  }, []);

  const confirmDeleteSleep = useCallback(async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setErrorMessage(null);
    try {
      const user = await getSessionUser();
      if (!user) {
        setErrorMessage("Please sign in to delete this entry.");
        setPendingDelete(null);
        return;
      }
      const { error, count } = await supabase
        .from("manual_sleep_logs")
        .delete({ count: "exact" })
        .eq("id", pendingDelete.id)
        .eq("user_id", user.id);
      if (error) throw error;
      if (count === 0) {
        void loadManualEntries(true);
        setErrorMessage("This entry was not deleted. Check the DELETE policy for manual_sleep_logs in Supabase.");
        return;
      }
      setManualEntries((current) => current.filter((item) => item.id !== pendingDelete.id));
      showToast("Sleep entry deleted.");
    } catch (error) {
      console.error("Unable to delete sleep entry:", error);
      setErrorMessage("Could not delete this entry. Check your connection and the manual_sleep_logs DELETE policy.");
    } finally {
      setPendingDelete(null);
      setDeleting(false);
    }
  }, [pendingDelete, deleting, loadManualEntries, showToast]);

  // Props shared by both render paths below.
  const contentProps: Omit<SleepContentProps, "data"> = {
    brand,
    manualEntries,
    loadingEntries,
    showForm,
    setShowForm,
    sleepDate,
    setSleepDate,
    bedtime,
    setBedtime,
    wakeTime,
    setWakeTime,
    note,
    setNote,
    duration,
    saving,
    errorMessage,
    onSave: saveManualSleep,
    onDelete: deleteManualSleep,
    onRefreshManual: loadManualEntries,
  };

  return (
    <TabScreen title="Sleep" subtitle="REST & RECOVERY" {...refreshProps(sleep)}>
      <AsyncView
        resource={sleep}
        unavailable={
          <>
            <UnavailableState description="Connect your health source to see synced sleep data, or add a sleep session manually below." />
            {/* Manual journal stays usable even when synced data is unavailable. */}
            <SleepContent {...contentProps} />
          </>
        }
      >
        {(data) => <SleepContent data={data} {...contentProps} />}
      </AsyncView>
      {successMessage ? (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={[styles.toast, { backgroundColor: brand.dark ? "#B7E6CB" : "#183D32" }]}>
            <Text style={[styles.toastText, { color: brand.dark ? "#10241D" : "#F7F4EC" }]}>{successMessage}</Text>
          </View>
        </View>
      ) : null}
      <Modal
        visible={pendingDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setPendingDelete(null)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: brand.panel, borderColor: brand.line }]}>
            <View style={[styles.modalIcon, { backgroundColor: brand.dark ? "rgba(201,77,77,0.16)" : "#FBE9E5" }]}>
              <Text style={[styles.modalIconText, { color: brand.danger }]}>!</Text>
            </View>
            <Text style={[styles.confirmTitle, { color: brand.ink }]}>Delete sleep entry?</Text>
            <Text style={[styles.confirmDescription, { color: brand.soft }]}>
              {pendingDelete ? `${friendlyDate(pendingDelete.sleep_date)} · ${formatDuration(pendingDelete.duration_min)} of sleep` : "This entry will be removed from your history."}
            </Text>
            <Text style={[styles.confirmHint, { color: brand.soft }]}>This action cannot be undone.</Text>
            <View style={styles.modalActions}>
              <Pressable
                disabled={deleting}
                onPress={() => setPendingDelete(null)}
                style={({ pressed }) => [styles.modalButton, styles.cancelButton, { borderColor: brand.line, opacity: pressed ? 0.75 : 1 }]}
              >
                <Text style={[styles.modalButtonText, { color: brand.ink }]}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={deleting}
                onPress={() => void confirmDeleteSleep()}
                style={({ pressed }) => [styles.modalButton, { backgroundColor: brand.danger, opacity: deleting ? 0.65 : pressed ? 0.82 : 1 }]}
              >
                {deleting ? <ActivityIndicator color="#FFFFFF" /> : null}
                <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>{deleting ? "Deleting..." : "Delete entry"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </TabScreen>
  );
}

type Brand = ReturnType<typeof useBrand>;

type SleepContentProps = {
  data?: SleepData;
  brand: Brand;
  manualEntries: ManualSleep[];
  loadingEntries: boolean;
  showForm: boolean;
  setShowForm: (value: boolean) => void;
  sleepDate: string;
  setSleepDate: (value: string) => void;
  bedtime: string;
  setBedtime: (value: string) => void;
  wakeTime: string;
  setWakeTime: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  duration: number | null;
  saving: boolean;
  errorMessage: string | null;
  onSave: () => void;
  onDelete: (entry: ManualSleep) => void;
  onRefreshManual: () => Promise<void>;
};

function SleepContent({
  data,
  brand,
  manualEntries,
  loadingEntries,
  showForm,
  setShowForm,
  sleepDate,
  setSleepDate,
  bedtime,
  setBedtime,
  wakeTime,
  setWakeTime,
  note,
  setNote,
  duration,
  saving,
  errorMessage,
  onSave,
  onDelete,
  onRefreshManual,
}: SleepContentProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Sheet padding glides with the keyboard instead of jumping to its height.
  const sheetPadding = useAnimatedKeyboardPadding(insets.bottom + 16, 16);
  const target = data?.targetMin ?? TARGET_MIN;
  const stages = data?.stages
    ? [
        { label: "Deep", minutes: data.stages.deepMin, color: brand.dark ? "#9FA8FF" : "#534AB7" },
        { label: "REM", minutes: data.stages.remMin, color: brand.dark ? "#B7E6CB" : "#6FAD91" },
        { label: "Light", minutes: data.stages.lightMin, color: brand.dark ? "#D6B47A" : "#A8CDB9" },
      ]
    : [];

  const closeForm = () => {
    if (saving) return;
    Keyboard.dismiss();
    setShowForm(false);
  };

  return (
    <>
      {data ? (
        <>
          <RingHero
            rings={[
              {
                label: "Time asleep",
                value: formatDuration(data.durationMin),
                color: brand.dark ? "#9FA8FF" : "#534AB7",
                progress: progressOf(data.durationMin, target),
              },
              ...(data.score !== undefined
                ? [{
                    label: "Sleep score",
                    value: String(data.score),
                    color: brand.dark ? "#B7E6CB" : "#6FAD91",
                    progress: data.score / 100,
                  }]
                : []),
            ]}
          />

          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <Metric
                tile
                square
                size="small"
                label="Bedtime"
                accent={brand.dark ? "#9FA8FF" : "#534AB7"}
                value={data.bedtime ? formatClock(data.bedtime) : "—"}
              />
            </View>
            <View style={styles.summaryCell}>
              <Metric
                tile
                square
                size="small"
                label="Wake-up"
                accent={brand.dark ? "#B7E6CB" : "#6FAD91"}
                value={data.wakeTime ? formatClock(data.wakeTime) : "—"}
              />
            </View>
          </View>
        </>
      ) : null}

      <View style={[styles.manualHero, { backgroundColor: brand.panel, borderColor: brand.line }]}>
        <View style={styles.manualHeroText}>
          <Text style={[styles.eyebrow, { color: brand.soft }]}>YOUR SLEEP JOURNAL</Text>
          <Text style={[styles.manualTitle, { color: brand.ink }]}>Add a night manually</Text>
          <Text style={[styles.bodyText, { color: brand.soft }]}>
            No watch? No problem. Enter your sleep and wake-up times and Vīta calculates your duration.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowForm(true)}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: brand.accent, opacity: pressed ? 0.82 : 1 },
          ]}
        >
          <Text style={[styles.addButtonText, { color: brand.dark ? "#10241D" : "#F7F4EC" }]}>
            + Add sleep
          </Text>
        </Pressable>
      </View>

      {/* Add-sleep sheet: glides up with the keyboard so inputs are never covered */}
      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={closeForm}
        statusBarTranslucent
      >
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={closeForm} accessibilityLabel="Close" />
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: brand.panel,
                borderColor: brand.line,
                maxHeight: height - insets.top - 12,
                paddingBottom: sheetPadding,
              },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: brand.line }]} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
            >
              <View style={styles.sheetHead}>
                <Text style={[styles.manualTitle, { color: brand.ink, flex: 1 }]}>Add sleep</Text>
                <Pressable onPress={closeForm} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                  <Text style={{ color: brand.soft, fontSize: 26, lineHeight: 28 }}>×</Text>
                </Pressable>
              </View>

              <Text style={[styles.fieldLabel, { color: brand.ink }]}>Sleep date</Text>
              <TextInput
                value={sleepDate}
                onChangeText={setSleepDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={brand.soft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[styles.input, { color: brand.ink, borderColor: brand.line, backgroundColor: brand.bg }]}
              />
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={[styles.fieldLabel, { color: brand.ink }]}>Bedtime (24h)</Text>
                  <TextInput
                    value={bedtime}
                    onChangeText={setBedtime}
                    placeholder="23:00"
                    placeholderTextColor={brand.soft}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    style={[styles.input, { color: brand.ink, borderColor: brand.line, backgroundColor: brand.bg }]}
                  />
                </View>
                <View style={styles.timeField}>
                  <Text style={[styles.fieldLabel, { color: brand.ink }]}>Wake-up (24h)</Text>
                  <TextInput
                    value={wakeTime}
                    onChangeText={setWakeTime}
                    placeholder="07:00"
                    placeholderTextColor={brand.soft}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    style={[styles.input, { color: brand.ink, borderColor: brand.line, backgroundColor: brand.bg }]}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: brand.ink }]}>Note (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Woke up once during the night"
                placeholderTextColor={brand.soft}
                multiline
                maxLength={300}
                style={[styles.input, styles.noteInput, { color: brand.ink, borderColor: brand.line, backgroundColor: brand.bg }]}
              />

              <View style={[styles.durationPreview, { backgroundColor: brand.bg, borderColor: brand.line }]}>
                <Text style={[styles.bodyText, { color: brand.soft }]}>Calculated duration</Text>
                <Text style={[styles.durationText, { color: brand.ink }]}>
                  {duration === null ? "Check your times" : formatDuration(duration)}
                </Text>
                {duration !== null ? (
                  <Text style={[styles.bodyText, { color: brand.soft }]}>
                    {duration >= target ? "Sleep goal reached" : `${formatDuration(target - duration)} to your ${formatDuration(target)} goal`}
                  </Text>
                ) : null}
              </View>

              {errorMessage ? (
                <Text accessibilityRole="alert" style={[styles.errorText, { color: brand.danger }]}>{errorMessage}</Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={onSave}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: brand.accent, opacity: saving ? 0.6 : pressed ? 0.82 : 1 },
                ]}
              >
                {saving ? <ActivityIndicator color={brand.dark ? "#10241D" : "#F7F4EC"} /> : null}
                <Text style={[styles.addButtonText, { color: brand.dark ? "#10241D" : "#F7F4EC" }]}>
                  {saving ? "Saving..." : "Save sleep entry"}
                </Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {errorMessage && !showForm ? (
        <Text accessibilityRole="alert" style={[styles.errorText, { color: brand.danger }]}>{errorMessage}</Text>
      ) : null}

      {stages.some((stage) => stage.minutes > 0) ? (
        <Section title="Sleep stages" description="Stages appear when your connected source provides them.">
          <View style={styles.stages}>
            {stages.map((stage) => (
              <View key={stage.label} style={styles.stageCell}>
                <Metric tile size="small" label={stage.label} accent={stage.color} value={formatDuration(stage.minutes)} />
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {data?.week && data.week.length > 0 ? (
        <Section title="Last 7 nights" description={`Line marks your ${formatDuration(target)} target`}>
          <Card>
            <BarChart title="Synced sleep over the last 7 nights" data={data.week} goal={target} color={brand.dark ? "#9FA8FF" : "#534AB7"} formatValue={formatDuration} />
          </Card>
        </Section>
      ) : null}

      <Section title="Manual sleep history" description="Only entries saved to your Vīta account appear here.">
        <View style={[styles.historyCard, { backgroundColor: brand.panel, borderColor: brand.line }]}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: brand.ink }]}>Recent entries</Text>
            <Pressable onPress={() => void onRefreshManual()} accessibilityRole="button">
              <Text style={[styles.refreshText, { color: brand.accent }]}>Refresh</Text>
            </Pressable>
          </View>
          {loadingEntries ? (
            <ActivityIndicator color={brand.accent} style={{ padding: 18 }} />
          ) : manualEntries.length === 0 ? (
            <Text style={[styles.bodyText, { color: brand.soft }]}>No manual entries yet. Add your first night above.</Text>
          ) : (
            manualEntries.map((entry) => (
              <View key={entry.id} style={[styles.historyEntry, { borderTopColor: brand.line }]}>
                <View style={styles.historyMain}>
                  <Text style={[styles.historyDate, { color: brand.ink }]}>{friendlyDate(entry.sleep_date)}</Text>
                  <Text style={[styles.bodyText, { color: brand.soft }]}>
                    {formatClock(entry.bedtime)} – {formatClock(entry.wake_time)}
                  </Text>
                  {entry.note ? <Text style={[styles.noteText, { color: brand.soft }]}>{entry.note}</Text> : null}
                </View>
                <View style={styles.historyRight}>
                  <Text style={[styles.historyDuration, { color: brand.ink }]}>{formatDuration(Number(entry.duration_min))}</Text>
                  <Pressable onPress={() => onDelete(entry)} accessibilityRole="button" accessibilityLabel={`Delete sleep entry from ${entry.sleep_date}`}>
                    <Text style={[styles.deleteText, { color: brand.danger }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </Section>
      <Text style={[styles.disclaimer, { color: brand.soft }]}>
        Manual entries are kept separate from Health Connect data. They do not include estimated deep or REM stages and are not automatically merged into the synced weekly chart.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: "absolute", top: 18, left: 20, right: 20, alignItems: "center", zIndex: 1000 },
  toast: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18, maxWidth: 420, width: "100%", shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  toastText: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(6, 15, 11, 0.56)", justifyContent: "center", alignItems: "center", padding: 24 },
  confirmCard: { width: "100%", maxWidth: 390, borderWidth: 1, borderRadius: 24, padding: 22, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  modalIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  modalIconText: { fontSize: 24, fontWeight: "800" },
  confirmTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4, textAlign: "center" },
  confirmDescription: { fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 9 },
  confirmHint: { fontSize: 11, marginTop: 8 },
  modalActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 22 },
  modalButton: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, paddingHorizontal: 10 },
  cancelButton: { borderWidth: 1 },
  modalButtonText: { fontSize: 13, fontWeight: "700" },
  sheetRoot: { flex: 1 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(6, 15, 11, 0.56)" },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 18, paddingTop: 10 },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, marginBottom: 12 },
  sheetContent: { gap: 10, paddingBottom: 4 },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryRow: {
    flexDirection: "row",
    gap: layout.tileGap,
    marginTop: layout.tileGap,
  },
  summaryCell: { flex: 1 },
  manualHero: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginTop: layout.tileGap,
    gap: 16,
  },
  manualHeroText: { gap: 6 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  manualTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  bodyText: { fontSize: 13, lineHeight: 19 },
  addButton: {
    alignSelf: "flex-start",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: "center",
  },
  addButtonText: { fontSize: 13, fontWeight: "700" },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  timeRow: { flexDirection: "row", gap: 10 },
  timeField: { flex: 1, gap: 8 },
  noteInput: { minHeight: 72, textAlignVertical: "top" },
  durationPreview: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    marginTop: 4,
  },
  durationText: { fontSize: 25, fontWeight: "700", letterSpacing: -0.7 },
  saveButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  errorText: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  stages: { flexDirection: "row", gap: layout.tileGap },
  stageCell: { flex: 1 },
  historyCard: { borderWidth: 1, borderRadius: 20, padding: 15 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  historyTitle: { fontSize: 15, fontWeight: "700" },
  refreshText: { fontSize: 12, fontWeight: "700" },
  historyEntry: {
    borderTopWidth: 1,
    paddingTop: 13,
    paddingBottom: 8,
    marginTop: 10,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  historyMain: { flex: 1, gap: 4 },
  historyDate: { fontSize: 14, fontWeight: "700" },
  noteText: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  historyRight: { alignItems: "flex-end", gap: 8 },
  historyDuration: { fontSize: 15, fontWeight: "700" },
  deleteText: { fontSize: 12, fontWeight: "600" },
  disclaimer: { fontSize: 11, lineHeight: 17, marginBottom: 20 },
});