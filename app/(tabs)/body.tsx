import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  InteractionManager,
  Keyboard,
  Modal,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { TabScreen } from "../../src/components/navigation/TabScreen";
import { AsyncView } from "../../src/components/ui/AsyncView";
import { UnavailableState } from "../../src/components/ui/states";
import { formatNumber, formatShortDate } from "../../src/data/format";
import {
  getProgressPhotos,
  setProgressPhoto,
  type PhotoSlot,
  type ProgressPhotos,
} from "../../src/data/Progressphotos";
import { useBody } from "../../src/data/hooks";
import { supabase } from "../../src/lib/supabase";
import { useAnimatedKeyboardPadding } from "../../src/lib/Useanimatedkeyboardpadding";
import { refreshProps } from "../../src/data/resource";
import type { BodyData } from "../../src/data/types";
import { useTheme } from "../../src/theme/ThemeProvider";
import { spacing } from "../../src/theme/spacing";

const MAX_HISTORY_ROWS = 7;

const SLOTS: { key: PhotoSlot; label: string }[] = [
  { key: "front", label: "Front" },
  { key: "side", label: "Side" },
  { key: "back", label: "Back" },
];

const C = {
  ink: "#16221D",
  primary: "#1F4D3F",
  primaryTint: "#E8F0EB",
  surface: "#FFFFFF",
  track: "#EEF1EE",
  muted: "#66726B",
  red: "#C94444",
  redTint: "#FCEDEB",
  white: "#FFFFFF",
  border: "rgba(120,138,127,0.28)",
  backdrop: "rgba(8,16,12,0.55)",
};

type PhotoAction = "camera" | "library" | "remove";
type WeightEntry = { date: string; value: number };

// Remembers what was last synced to Supabase, so revisiting the screen
// doesn't repeat three network calls when nothing has changed.
let lastSyncedSignature: string | null = null;

export default function BodyScreen() {
  const body = useBody();

  return (
    <TabScreen title="Body" subtitle="Weight and progress photos" {...refreshProps(body)}>
      <AsyncView
        resource={body}
        unavailable={
          <UnavailableState description="Your real weight measurements and body progress will appear here when data is available." />
        }
      >
        {(data) => <BodyContent data={data} />}
      </AsyncView>
    </TabScreen>
  );
}

function changeFromPrevious(
  current: number,
  previous: number | undefined,
): string | undefined {
  if (previous === undefined) return undefined;
  const difference = Math.round((current - previous) * 10) / 10;
  if (difference === 0) return "No change";
  return `${difference > 0 ? "+" : "−"}${formatNumber(Math.abs(difference), 1)} kg`;
}

function BodyContent({ data }: { data: BodyData }) {
  const { colors } = useTheme();
  // The weight dialog glides up with the keyboard instead of jumping.
  const weightDialogPadding = useAnimatedKeyboardPadding(24, 24);
  const [photos, setPhotos] = useState<ProgressPhotos>({});
  const [active, setActive] = useState(0);
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);

  // Manual weight history and deletion confirmation
  const [manualRows, setManualRows] = useState<WeightEntry[]>([]);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WeightEntry | null>(null);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const slot = SLOTS[active];
  const activePhoto = photos[slot.key];
  const hasPhoto = Boolean(activePhoto);
  const photoCount = SLOTS.filter((item) => Boolean(photos[item.key])).length;

  useEffect(() => {
    let mounted = true;
    getProgressPhotos()
      .then((result) => {
        if (mounted) setPhotos(result);
      })
      .catch(() => {
        if (mounted) {
          setError(true);
          setFeedback("Progress photos could not be loaded.");
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const healthEntries = useMemo(
    () =>
      [...(data.history ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [data.history],
  );

  const entries = useMemo(() => {
    const byDate = new Map<string, { date: string; value: number }>();
    // Manual entries take precedence for a date when both sources have a value.
    for (const entry of healthEntries) {
      if (!byDate.has(entry.date)) byDate.set(entry.date, entry);
    }
    for (const entry of manualRows) byDate.set(entry.date, entry);
    return [...byDate.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, MAX_HISTORY_ROWS + 1);
  }, [healthEntries, manualRows]);

  const rows = useMemo(() => entries.slice(0, MAX_HISTORY_ROWS), [entries]);

  useEffect(() => {
    let cancelled = false;

    async function loadManualMeasurements() {
      try {
        // getSession() reads the local session; getUser() makes a network
        // round trip to the auth server on every call.
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (sessionError || !user) return;

        const { data: saved, error: queryError } = await supabase
          .from("body_measurements")
          .select("measured_on, weight_kg, source")
          .eq("user_id", user.id)
          .eq("source", "manual")
          .order("measured_on", { ascending: false });

        if (queryError) throw queryError;
        if (!cancelled) {
          setManualRows(
            (saved ?? []).map((row) => ({
              date: row.measured_on,
              value: Number(row.weight_kg),
            })),
          );
        }
      } catch (loadError) {
        console.warn("Manual measurements could not be loaded:", loadError);
      }
    }

    void loadManualMeasurements();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save real readings from the connected health platform to the signed-in user's account.
  // Runs after the screen has finished rendering, and only when the readings changed.
  useEffect(() => {
    if (healthEntries.length === 0) return;
    let cancelled = false;

    async function syncMeasurements() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (sessionError || !user || cancelled) return;

        const signature = `${user.id}|${healthEntries.map((entry) => `${entry.date}:${entry.value}`).join(",")}`;
        if (signature === lastSyncedSignature) return;

        // Do not let a synced reading overwrite a manual measurement for the same date.
        const { data: manualRowsForDates, error: manualQueryError } = await supabase
          .from("body_measurements")
          .select("measured_on")
          .eq("user_id", user.id)
          .eq("source", "manual");

        if (manualQueryError) throw manualQueryError;
        if (cancelled) return;
        const manualDates = new Set(
          (manualRowsForDates ?? []).map((row) => String(row.measured_on)),
        );

        const syncedAt = new Date().toISOString();
        const source = Platform.OS === "ios" ? "healthkit" : "health_connect";
        const records = healthEntries
          .filter((entry) => !manualDates.has(entry.date))
          .map((entry) => ({
            user_id: user.id,
            measured_on: entry.date,
            weight_kg: entry.value,
            source,
            health_data_synced_at: syncedAt,
          }));

        if (records.length === 0) {
          lastSyncedSignature = signature;
          return;
        }

        const { error: syncError } = await supabase
          .from("body_measurements")
          .upsert(records, { onConflict: "user_id,measured_on" });

        if (syncError) {
          if (!cancelled) {
            console.warn("Body measurements could not be synced to Supabase:", syncError.message);
          }
          return;
        }
        lastSyncedSignature = signature;
      } catch (syncError) {
        if (!cancelled) console.warn("Body measurement sync failed:", syncError);
      }
    }

    const task = InteractionManager.runAfterInteractions(() => {
      void syncMeasurements();
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [healthEntries]);

  function showSyncHelp() {
    const hasSynced = rows.some((entry) =>
      healthEntries.some((health) => health.date === entry.date),
    );
    Alert.alert(
      hasSynced ? "Health sync" : "No measurements synced",
      Platform.OS === "ios"
        ? "Vita reads weight from Apple Health when Body Mass access is allowed. Open the Health app, check your Weight records and Vita's read permission, then return and refresh."
        : "Vita reads weight from Health Connect when Body Mass access is allowed. Open Health Connect, check app permissions and make sure a connected app has saved a Weight record, then return and refresh.",
      [{ text: "OK" }],
    );
  }

  function closeWeightModal() {
    if (savingWeight) return;
    Keyboard.dismiss();
    setWeightModalVisible(false);
  }

  async function saveManualWeight() {
    const value = Number(weightInput.trim().replace(",", "."));
    if (!weightInput.trim() || !Number.isFinite(value) || value <= 0 || value > 500) {
      Alert.alert("Check the weight", "Enter a valid weight in kilograms.");
      return;
    }

    Keyboard.dismiss();

    try {
      setSavingWeight(true);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData.session?.user;
      if (!user) {
        throw new Error("Please sign in before saving a measurement.");
      }

      const today = (() => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      })();

      const { error: saveError } = await supabase
        .from("body_measurements")
        .upsert(
          {
            user_id: user.id,
            measured_on: today,
            weight_kg: Math.round(value * 100) / 100,
            source: "manual",
            health_data_synced_at: null,
          },
          { onConflict: "user_id,measured_on" },
        );

      if (saveError) throw saveError;

      setManualRows((current) => [
        { date: today, value: Math.round(value * 100) / 100 },
        ...current.filter((entry) => entry.date !== today),
      ]);
      setWeightInput("");
      setWeightModalVisible(false);
      Alert.alert("Weight saved", "Your measurement has been saved to your account.");
    } catch (saveError) {
      Alert.alert(
        "Couldn't save weight",
        saveError instanceof Error ? saveError.message : "Please try again.",
      );
    } finally {
      setSavingWeight(false);
    }
  }

  async function confirmDeleteWeight() {
    if (!pendingDelete || deletingDate) return;

    const entryToDelete = pendingDelete;
    setDeletingDate(entryToDelete.date);
    setFeedback("");
    setError(false);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData.session?.user;
      if (!user) throw new Error("Please sign in to delete a measurement.");

      const { data: deletedRows, error: deleteError } = await supabase
        .from("body_measurements")
        .delete()
        .eq("user_id", user.id)
        .eq("measured_on", entryToDelete.date)
        .eq("source", "manual")
        .select("measured_on");

      if (deleteError) throw deleteError;
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error(
          "The entry was not deleted. Check the body_measurements DELETE policy in Supabase.",
        );
      }

      setManualRows((current) =>
        current.filter((entry) => entry.date !== entryToDelete.date),
      );
      setPendingDelete(null);
      setSuccessMessage("Weight entry deleted");
    } catch (deleteError) {
      console.error("Unable to delete weight entry:", deleteError);
      setError(true);
      setFeedback(
        deleteError instanceof Error
          ? deleteError.message
          : "Couldn't delete this weight entry. Please try again.",
      );
      setPendingDelete(null);
    } finally {
      setDeletingDate(null);
    }
  }

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(""), 2400);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  async function performPhotoAction(action: PhotoAction) {
    setPhotoMenuVisible(false);
    setError(false);
    setFeedback("");

    if (action === "remove") {
      setConfirmRemove(true);
      return;
    }

    try {
      setBusy(true);

      if (action === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError(true);
          setFeedback("Allow camera access in your device settings to take a progress photo.");
          return;
        }
      }

      const options = {
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.8,
      };

      const result =
        action === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync({
              ...options,
              mediaTypes: ["images"],
            });

      if (result.canceled || !result.assets[0]) return;

      const updated = await setProgressPhoto(slot.key, result.assets[0].uri);
      setPhotos(updated);
      setFeedback(`${slot.label} progress photo saved.`);
    } catch {
      setError(true);
      setFeedback("Couldn't save the photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCurrentPhoto() {
    try {
      setBusy(true);
      const updated = await setProgressPhoto(slot.key, null);
      setPhotos(updated);
      setConfirmRemove(false);
      setFeedback(`${slot.label} photo removed.`);
      setError(false);
    } catch {
      setError(true);
      setFeedback("Couldn't remove this photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* WEIGHT */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Weight</Text>
            <Text style={styles.sectionSubtitle}>From your health app and manual entries</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Health sync help"
            onPress={showSyncHelp}
            hitSlop={6}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="help-circle-outline" size={22} color={C.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setWeightModalVisible(true)}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color={C.white} />
            <Text style={styles.addButtonText}>Add weight</Text>
          </Pressable>
        </View>

        {rows.length > 0 ? (
          <View style={styles.card}>
            {rows.map((entry, index) => {
              const previous = entries[index + 1]?.value;
              const difference =
                previous === undefined ? undefined : entry.value - previous;
              const isManualOnly =
                manualRows.some((manual) => manual.date === entry.date) &&
                !healthEntries.some((health) => health.date === entry.date);
              const isLast = index === rows.length - 1;

              return (
                <View
                  key={entry.date}
                  style={[styles.row, !isLast && styles.rowDivider]}
                >
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowDate}>{formatShortDate(entry.date)}</Text>
                    <View style={styles.rowMeta}>
                      {difference !== undefined && difference !== 0 ? (
                        <Ionicons
                          name={difference < 0 ? "arrow-down" : "arrow-up"}
                          size={12}
                          color={C.muted}
                        />
                      ) : null}
                      <Text style={styles.rowMetaText}>
                        {changeFromPrevious(entry.value, previous) ??
                          (isManualOnly ? "Added by you" : "From health app")}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.rowWeight}>
                    {formatNumber(entry.value, 1)}
                    <Text style={styles.rowUnit}> kg</Text>
                  </Text>

                  {isManualOnly ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete weight entry for ${formatShortDate(entry.date)}`}
                      disabled={deletingDate === entry.date}
                      onPress={() => setPendingDelete(entry)}
                      style={({ pressed }) => [styles.rowDelete, pressed && styles.pressed]}
                      hitSlop={6}
                    >
                      {deletingDate === entry.date ? (
                        <ActivityIndicator size="small" color={C.red} />
                      ) : (
                        <Ionicons name="trash-outline" size={19} color={C.muted} />
                      )}
                    </Pressable>
                  ) : (
                    <View style={styles.rowDeleteSpacer} />
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.card, styles.empty]}>
            <Text style={styles.emptyTitle}>No weight entries yet</Text>
            <Text style={styles.emptyText}>
              Add your weight now, or sync readings from your health app.
            </Text>
            <View style={styles.emptyActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setWeightModalVisible(true)}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
              >
                <Ionicons name="add" size={18} color={C.white} />
                <Text style={styles.addButtonText}>Add weight</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={showSyncHelp}
                style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
              >
                <Text style={styles.textButtonText}>Set up health sync</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* PROGRESS PHOTOS */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Progress photos</Text>
            <Text style={styles.sectionSubtitle}>{photoCount} of 3 added</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.segment} accessibilityRole="tablist">
            {SLOTS.map((item, index) => {
              const selected = active === index;
              const filled = Boolean(photos[item.key]);
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${item.label}${filled ? ", photo added" : ""}`}
                  onPress={() => setActive(index)}
                  style={[styles.segmentItem, selected && styles.segmentItemActive]}
                >
                  <Text
                    style={[styles.segmentText, selected && styles.segmentTextActive]}
                  >
                    {item.label}
                  </Text>
                  {filled ? (
                    <Ionicons name="checkmark-circle" size={14} color={C.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hasPhoto ? `Change ${slot.label.toLowerCase()} photo` : `Add ${slot.label.toLowerCase()} photo`}
            disabled={busy}
            onPress={() => setPhotoMenuVisible(true)}
            style={styles.preview}
          >
            {activePhoto ? (
              <Image source={{ uri: activePhoto }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewEmpty}>
                <Ionicons name="camera-outline" size={30} color={C.muted} />
                <Text style={styles.previewEmptyTitle}>
                  No {slot.label.toLowerCase()} photo yet
                </Text>
                <Text style={styles.previewEmptyText}>Tap to add one</Text>
              </View>
            )}
            {busy ? (
              <View style={styles.previewBusy}>
                <ActivityIndicator color={C.white} />
              </View>
            ) : null}
          </Pressable>

          <View style={styles.photoActions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setPhotoMenuVisible(true)}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              <Ionicons
                name={hasPhoto ? "swap-horizontal" : "add"}
                size={19}
                color={C.white}
              />
              <Text style={styles.primaryButtonText}>
                {hasPhoto ? "Change photo" : "Add photo"}
              </Text>
            </Pressable>

            {hasPhoto ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${slot.label.toLowerCase()} photo`}
                disabled={busy}
                onPress={() => setConfirmRemove(true)}
                style={({ pressed }) => [
                  styles.squareButton,
                  pressed && styles.pressed,
                  busy && styles.disabled,
                ]}
              >
                <Ionicons name="trash-outline" size={20} color={C.red} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {/* FEEDBACK */}
      {feedback ? (
        <View
          accessibilityRole="alert"
          style={[styles.feedback, error && styles.feedbackError]}
        >
          <Ionicons
            name={error ? "alert-circle" : "checkmark-circle"}
            size={20}
            color={error ? C.red : C.primary}
          />
          <Text style={styles.feedbackText}>{feedback}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss message"
            onPress={() => setFeedback("")}
            hitSlop={10}
          >
            <Ionicons name="close" size={18} color={C.muted} />
          </Pressable>
        </View>
      ) : null}

      {/* ADD WEIGHT — dialog glides up with the keyboard so the input stays visible */}
      <Modal
        visible={weightModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeWeightModal}
      >
        <Animated.View style={[styles.dialogRoot, { paddingBottom: weightDialogPadding }]}>
          <Pressable
            style={styles.backdrop}
            disabled={savingWeight}
            onPress={closeWeightModal}
            accessibilityLabel="Close"
          />
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Add weight</Text>
            <Text style={styles.dialogText}>
              Enter your weight for today. It's saved to your Vita account.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder="68.5"
                placeholderTextColor="#98A29C"
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={() => void saveManualWeight()}
                editable={!savingWeight}
                accessibilityLabel="Weight in kilograms"
                style={styles.input}
                autoFocus
              />
              <Text style={styles.inputUnit}>kg</Text>
            </View>
            <View style={styles.dialogButtons}>
              <Pressable
                accessibilityRole="button"
                disabled={savingWeight}
                onPress={() => {
                  Keyboard.dismiss();
                  setWeightModalVisible(false);
                  setWeightInput("");
                }}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={savingWeight}
                onPress={() => void saveManualWeight()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.dialogPrimary,
                  pressed && styles.pressed,
                ]}
              >
                {savingWeight ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Modal>

      {successMessage ? (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={styles.toast}>
            <Ionicons name="checkmark-circle" size={18} color={C.white} />
            <Text style={styles.toastText}>{successMessage}</Text>
          </View>
        </View>
      ) : null}

      {/* DELETE WEIGHT CONFIRMATION */}
      <Modal
        visible={pendingDelete !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !deletingDate && setPendingDelete(null)}
      >
        <View style={styles.dialogRoot}>
          <Pressable
            style={styles.backdrop}
            disabled={!!deletingDate}
            onPress={() => !deletingDate && setPendingDelete(null)}
            accessibilityLabel="Cancel delete"
          />
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Delete this entry?</Text>
            <Text style={styles.dialogText}>
              {pendingDelete
                ? `${formatNumber(pendingDelete.value, 1)} kg on ${formatShortDate(pendingDelete.date)}. `
                : ""}
              Only this manual entry is removed. Records from your health app stay as they are.
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable
                accessibilityRole="button"
                disabled={!!deletingDate}
                onPress={() => setPendingDelete(null)}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!!deletingDate}
                onPress={() => void confirmDeleteWeight()}
                style={({ pressed }) => [
                  styles.dangerButton,
                  pressed && styles.pressed,
                  deletingDate ? styles.disabled : null,
                ]}
              >
                {deletingDate ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={styles.dangerButtonText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* PHOTO ACTION SHEET */}
      <Modal
        visible={photoMenuVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setPhotoMenuVisible(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setPhotoMenuVisible(false)}
            accessibilityLabel="Close"
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{slot.label} photo</Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.sheetOption, pressed && styles.pressed]}
              onPress={() => performPhotoAction("camera")}
            >
              <Ionicons name="camera-outline" size={24} color={C.primary} />
              <Text style={styles.sheetOptionText}>Take a photo</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.sheetOption, pressed && styles.pressed]}
              onPress={() => performPhotoAction("library")}
            >
              <Ionicons name="images-outline" size={24} color={C.primary} />
              <Text style={styles.sheetOptionText}>Choose from gallery</Text>
            </Pressable>

            {hasPhoto ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.sheetOption, pressed && styles.pressed]}
                onPress={() => performPhotoAction("remove")}
              >
                <Ionicons name="trash-outline" size={24} color={C.red} />
                <Text style={[styles.sheetOptionText, { color: C.red }]}>Remove photo</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.sheetCancel, pressed && styles.pressed]}
              onPress={() => setPhotoMenuVisible(false)}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* REMOVE PHOTO CONFIRMATION */}
      <Modal
        visible={confirmRemove}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!busy) setConfirmRemove(false);
        }}
      >
        <View style={styles.dialogRoot}>
          <Pressable
            style={styles.backdrop}
            disabled={busy}
            onPress={() => setConfirmRemove(false)}
            accessibilityLabel="Cancel"
          />
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Remove this photo?</Text>
            <Text style={styles.dialogText}>
              Your {slot.label.toLowerCase()} progress photo will be removed. Your weight entries aren't affected.
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setConfirmRemove(false)}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>Keep photo</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={removeCurrentPhoto}
                style={({ pressed }) => [
                  styles.dangerButton,
                  pressed && styles.pressed,
                  busy && styles.disabled,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={styles.dangerButtonText}>Remove</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: 12 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },

  // Section headers
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 13, color: C.muted, marginTop: 2 },

  // Shared card
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },

  // Buttons
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 40,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  addButtonText: { color: C.white, fontSize: 14, fontWeight: "600" },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  textButton: { minHeight: 40, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  textButtonText: { color: C.primary, fontSize: 14, fontWeight: "600" },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: { color: C.white, fontSize: 15, fontWeight: "600" },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: C.track,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { color: C.ink, fontSize: 15, fontWeight: "600" },
  dangerButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButtonText: { color: C.white, fontSize: 15, fontWeight: "600" },
  squareButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.redTint,
    alignItems: "center",
    justifyContent: "center",
  },

  // Weight list
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 64 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowInfo: { flex: 1, minWidth: 0 },
  rowDate: { color: C.ink, fontSize: 15, fontWeight: "600" },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  rowMetaText: { color: C.muted, fontSize: 13 },
  rowWeight: { color: C.ink, fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },
  rowUnit: { color: C.muted, fontSize: 13, fontWeight: "500" },
  rowDelete: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  rowDeleteSpacer: { width: 36 },

  // Empty state
  empty: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20 },
  emptyTitle: { color: C.ink, fontSize: 16, fontWeight: "700" },
  emptyText: { color: C.muted, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6, maxWidth: 280 },
  emptyActions: { alignItems: "center", gap: 4, marginTop: 16 },

  // Photos
  segment: { flexDirection: "row", backgroundColor: C.track, borderRadius: 12, padding: 3 },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 10,
  },
  segmentItemActive: { backgroundColor: C.surface, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { color: C.muted, fontSize: 14, fontWeight: "500" },
  segmentTextActive: { color: C.ink, fontWeight: "700" },
  preview: {
    marginTop: 12,
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: C.track,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  previewEmpty: { alignItems: "center", gap: 4, padding: 20 },
  previewEmptyTitle: { color: C.ink, fontSize: 15, fontWeight: "600", marginTop: 6 },
  previewEmptyText: { color: C.muted, fontSize: 13 },
  previewBusy: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  photoActions: { flexDirection: "row", gap: 10, marginTop: 12 },

  // Feedback + toast
  feedback: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, padding: 14, backgroundColor: C.primaryTint },
  feedbackError: { backgroundColor: C.redTint },
  feedbackText: { flex: 1, color: C.ink, fontSize: 14, lineHeight: 20 },
  toastWrap: { position: "absolute", bottom: 22, left: 16, right: 16, alignItems: "center", zIndex: 20 },
  toast: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, maxWidth: 360, backgroundColor: C.ink },
  toastText: { fontSize: 14, fontWeight: "600", color: C.white },

  // Modals
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: C.backdrop },
  dialogRoot: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 380, backgroundColor: C.surface, borderRadius: 20, padding: 22 },
  dialogTitle: { color: C.ink, fontSize: 20, fontWeight: "700" },
  dialogText: { color: C.muted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 20 },
  dialogButtons: { flexDirection: "row", gap: 10 },
  dialogPrimary: { flex: 1 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  input: { flex: 1, color: C.ink, fontSize: 22, fontWeight: "600", paddingVertical: 14 },
  inputUnit: { color: C.muted, fontSize: 16, fontWeight: "500" },

  // Photo action sheet
  sheetRoot: { flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  sheetHandle: { height: 4, width: 40, borderRadius: 2, backgroundColor: "#D3D9D5", alignSelf: "center", marginBottom: 16 },
  sheetTitle: { color: C.ink, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  sheetOption: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 14 },
  sheetOptionText: { color: C.ink, fontSize: 16, fontWeight: "500" },
  sheetCancel: { minHeight: 48, borderRadius: 12, backgroundColor: C.track, alignItems: "center", justifyContent: "center", marginTop: 10 },
});