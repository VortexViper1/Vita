import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabScreen } from "../../src/components/navigation/TabScreen";
import { Button } from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";
import { ErrorState, LoadingState } from "../../src/components/ui/states";
import { Text } from "../../src/components/ui/Text";
import { TextField } from "../../src/components/ui/TextField";
import {
  addSupplement,
  deleteSupplement,
  getSupplements,
  toggleSupplement,
  type Supplement,
} from "../../src/data/supplements";
import { useKeyboardHeight } from "../../src/lib/Usekeyboardheight";
import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, spacing } from "../../src/theme/spacing";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TIME_PRESETS = ["Morning", "Afternoon", "Evening", "Bedtime"];

// Without a timeout, a stalled request leaves the spinner up forever.
const LOAD_TIMEOUT_MS = 15000;

function animate() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export default function SupplementsScreen() {
  const { colors, resolvedMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string; kind: "success" | "error" } | null>(null);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("");

  const mounted = useRef(true);
  const requestId = useRef(0);

  const onAccent = resolvedMode === "dark" ? colors.background : colors.white;
  const mutedSurface = colors.surfaceAlt;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Only the latest request may update state, so overlapping loads
  // (refresh, retry, add) can't overwrite newer data with older data.
  const load = useCallback(async (animated = false) => {
    const id = ++requestId.current;
    try {
      const items = await withTimeout(getSupplements(), LOAD_TIMEOUT_MS);
      if (!mounted.current || id !== requestId.current) return;
      if (animated) animate();
      setSupplements(items);
      setLoadError(false);
    } catch {
      if (!mounted.current || id !== requestId.current) return;
      setLoadError(true);
    } finally {
      if (mounted.current && id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const takenCount = useMemo(() => supplements.filter((s) => s.takenToday).length, [supplements]);
  const total = supplements.length;
  const progress = total ? takenCount / total : 0;
  const allDone = total > 0 && takenCount === total;
  const remaining = Math.max(0, total - takenCount);

  function resetForm() { setName(""); setDosage(""); setTime(""); }
  function closeAdd() {
    if (saving) return;
    setShowAdd(false);
    resetForm();
  }

  async function handleAdd() {
    const trimmedName = name.trim();
    if (!trimmedName || saving) return;
    setSaving(true);
    try {
      await addSupplement(trimmedName, dosage.trim(), time.trim());
      setShowAdd(false);
      resetForm();
      setFeedback({ title: "Added to your routine", message: `${trimmedName} is now in your daily list.`, kind: "success" });
      // Reload in the background instead of making the user wait for it.
      void load(true);
    } catch {
      setFeedback({ title: "Couldn’t save", message: "Your supplement wasn’t added. Please try again.", kind: "error" });
    } finally { setSaving(false); }
  }

  async function handleToggle(id: string) {
    const previous = supplements;
    // Animate immediately with the optimistic update, not after the server replies.
    animate();
    setSupplements((items) => items.map((s) => s.id === id ? { ...s, takenToday: !s.takenToday } : s));
    try {
      await toggleSupplement(id);
    } catch {
      animate();
      setSupplements(previous);
      setFeedback({ title: "Couldn’t update", message: "That change didn’t save. Please try again.", kind: "error" });
    }
  }

  function handleDelete(item: Supplement) { setDeleteTarget(item); }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    const item = deleteTarget;
    setDeleting(true);
    try {
      await deleteSupplement(item.id);
      setSupplements((items) => items.filter((s) => s.id !== item.id));
      setDeleteTarget(null);
      animate();
      setFeedback({ title: "Supplement deleted", message: `${item.name} was removed from your daily list.`, kind: "success" });
    } catch {
      setDeleteTarget(null);
      void load();
      setFeedback({ title: "Couldn’t delete", message: "The supplement could not be deleted. Please try again.", kind: "error" });
    } finally { setDeleting(false); }
  }

  const canSave = name.trim().length > 0 && !saving;

  return (
    <TabScreen title="Supplements" subtitle="Your daily ritual">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        {loading ? <LoadingState /> : loadError && total === 0 ? (
          <ErrorState onRetry={() => { setLoading(true); void load(); }} />
        ) : (
          <>
            <View style={[styles.hero, { backgroundColor: colors.primary }]}>
              <View pointerEvents="none" style={[styles.heroOrb, { borderColor: `${onAccent}20` }]} />
              <View pointerEvents="none" style={[styles.heroOrbSmall, { borderColor: `${onAccent}16` }]} />
              <View style={styles.heroTop}>
                <View style={[styles.heroEyebrow, { backgroundColor: `${onAccent}16` }]}>
                  <View style={[styles.liveDot, { backgroundColor: colors.ringExercise }]} />
                  <Text variant="caption" style={{ color: onAccent, letterSpacing: 1.3, fontWeight: "700" }}></Text>
                </View>
                <Text variant="bodySmall" style={{ color: `${onAccent}B8` }}>TODAY</Text>
              </View>
              <Text variant="display" style={[styles.heroTitle, { color: onAccent }]}>
                {allDone ? "Beautifully done." : "Small habits.\nStronger you."}
              </Text>
              <Text variant="bodySmall" style={[styles.heroSubtitle, { color: `${onAccent}C9` }]}>
                {total === 0 ? "Build a routine that supports you." : allDone ? "You’ve completed your supplement routine." : `${remaining} ${remaining === 1 ? "supplement" : "supplements"} left in your routine today.`}
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: `${onAccent}25` }]}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.ringExercise }]} />
              </View>
              <View style={styles.heroBottom}>
                <View>
                  <Text variant="caption" style={{ color: `${onAccent}B8` }}>YOUR PROGRESS</Text>
                  <Text variant="heading2" style={{ color: onAccent }}>{takenCount}<Text variant="heading2" style={{ color: `${onAccent}A8` }}> / {total}</Text></Text>
                </View>
                <View style={[styles.progressBadge, { backgroundColor: `${onAccent}15`, borderColor: `${onAccent}22` }]}>
                  <Text variant="bodySmall" style={{ color: onAccent, fontWeight: "700" }}>{total ? `${Math.round(progress * 100)}% complete` : "Start your list"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text variant="heading2">Your routine</Text>
                <Text variant="bodySmall" tone="muted" style={styles.sectionSub}>{total ? "One mindful check-in at a time." : "Start with the supplements you take regularly."}</Text>
              </View>
              <Pressable onPress={() => setShowAdd(true)} accessibilityRole="button" style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 }]}>
                <Text style={{ color: onAccent, fontSize: 21, lineHeight: 23, fontWeight: "400" }}>+</Text>
                <Text variant="bodySmall" style={{ color: onAccent, fontWeight: "700" }}>Add</Text>
              </Pressable>
            </View>

            {total === 0 ? (
              <Card style={styles.emptyCard}>
                <View style={[styles.emptyIcon, { backgroundColor: mutedSurface }]}><Text style={{ fontSize: 28 }}>✳</Text></View>
                <Text variant="heading3">Make it your own</Text>
                <Text tone="secondary" style={styles.emptyText}>Add a supplement, dose, and preferred time. Your daily checklist will be ready whenever you are.</Text>
                <Button label="Create my routine" onPress={() => setShowAdd(true)} />
              </Card>
            ) : (
              <View style={[styles.routineCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                {supplements.map((item, index) => {
                  const taken = !!item.takenToday;
                  return (
                    <View key={item.id} style={[styles.routineRow, index < total - 1 && { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                      <Pressable onPress={() => void handleToggle(item.id)} accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityHint="Mark this supplement as taken" accessibilityState={{ checked: taken }} style={({ pressed }) => [styles.checkHit, { opacity: pressed ? 0.72 : 1 }]}>
                        <View style={[styles.check, { borderColor: taken ? colors.ringExercise : colors.borderStrong, backgroundColor: taken ? colors.ringExercise : "transparent" }]}>
                          {taken ? <Text style={{ color: onAccent, fontWeight: "900", fontSize: 15 }}>✓</Text> : null}
                        </View>
                      </Pressable>
                      <Pressable style={styles.routineInfo} onPress={() => void handleToggle(item.id)} onLongPress={() => handleDelete(item)} delayLongPress={450} accessibilityHint="Tap to mark as taken. Press and hold to delete.">
                        <Text variant="bodyMedium" numberOfLines={1} style={[styles.supplementName, taken && styles.takenName]}>{item.name}</Text>
                        <View style={styles.metaLine}>
                          {!!item.dosage && <Text variant="caption" tone="muted" numberOfLines={1}>{item.dosage}</Text>}
                          {!!item.dosage && !!item.time && <View style={[styles.metaDot, { backgroundColor: colors.borderStrong }]} />}
                          {!!item.time && <Text variant="caption" tone="muted" numberOfLines={1}>{item.time}</Text>}
                        </View>
                      </Pressable>
                      <Pressable onPress={() => handleDelete(item)} accessibilityRole="button" accessibilityLabel={`Delete ${item.name}`} hitSlop={10} style={({ pressed }) => [styles.moreButton, { backgroundColor: pressed ? mutedSurface : "transparent" }]}>
                        <Text style={{ color: colors.text, fontSize: 21, lineHeight: 22 }}>⋯</Text>
                      </Pressable>
                    </View>
                  );
                })}
                <View style={[styles.listFooter, { backgroundColor: mutedSurface }]}>
                  <Text variant="caption" tone="muted">Tap the circle when you’ve taken a supplement.</Text>
                  <Text variant="caption" style={{ color: colors.primary, fontWeight: "700" }}>{takenCount}/{total}</Text>
                </View>
              </View>
            )}

            {total > 0 && allDone ? (
              <View style={[styles.doneNote, { backgroundColor: `${colors.ringExercise}18`, borderColor: `${colors.ringExercise}45` }]}>
                <Text style={{ fontSize: 20 }}>✦</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyMedium">Routine complete</Text>
                  <Text variant="caption" tone="muted">Consistency is built one day at a time.</Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Add supplement sheet — lifts above the keyboard */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={closeAdd} statusBarTranslucent>
        <View style={styles.modalContainer}>
          <Pressable style={styles.backdrop} onPress={closeAdd} accessibilityLabel="Close add supplement" />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                maxHeight: height - insets.top - spacing.md,
                paddingBottom: (keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, 16)) + 8,
              },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.lg }}
            >
              <View style={styles.sheetHeading}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="heading2">Add to your routine</Text>
                  <Text variant="bodySmall" tone="muted">Keep your daily wellness simple.</Text>
                </View>
                <Pressable onPress={closeAdd} disabled={saving} style={[styles.closeButton, { backgroundColor: mutedSurface }]} accessibilityRole="button" accessibilityLabel="Close">
                  <Text style={{ color: colors.text, fontSize: 20 }}>×</Text>
                </Pressable>
              </View>
              <TextField label="Supplement name" placeholder="e.g. Vitamin D3" value={name} onChangeText={setName} autoCapitalize="words" maxLength={60} />
              <TextField label="Dose (optional)" placeholder="e.g. 1000 mg" value={dosage} onChangeText={setDosage} maxLength={40} />
              <View style={{ gap: spacing.sm }}>
                <Text variant="bodyMedium">When do you take it?</Text>
                <TextField label="Time (optional)" placeholder="Choose below or enter a time" value={time} onChangeText={setTime} maxLength={30} />
                <View style={styles.chips}>
                  {TIME_PRESETS.map((preset) => {
                    const active = time === preset;
                    return (
                      <Pressable key={preset} onPress={() => setTime(active ? "" : preset)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, { backgroundColor: active ? colors.primary : mutedSurface, borderColor: active ? colors.primary : colors.line }]}>
                        <Text variant="caption" style={{ color: active ? onAccent : colors.text, fontWeight: "700" }}>{preset}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <Button label={saving ? "Saving…" : "Save supplement"} onPress={() => void handleAdd()} disabled={!canSave} loading={saving} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Consistent delete confirmation — deletion only happens after confirmation */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => !deleting && setDeleteTarget(null)} statusBarTranslucent>
        <View style={styles.dialogOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !deleting && setDeleteTarget(null)} accessibilityLabel="Cancel delete" />
          <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={[styles.dialogIcon, { backgroundColor: `${colors.red ?? "#C94B4B"}18` }]}><Text style={{ color: colors.red ?? "#C94B4B", fontSize: 25, fontWeight: "600" }}>×</Text></View>
            <Text variant="heading2">Delete supplement?</Text>
            <Text tone="secondary" style={styles.dialogMessage}>{deleteTarget ? `${deleteTarget.name} will be removed from your daily list.` : "This supplement will be removed from your daily list."} This can’t be undone.</Text>
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setDeleteTarget(null)} disabled={deleting} style={[styles.dialogButton, { backgroundColor: mutedSurface }]}><Text variant="bodyMedium" style={{ color: colors.text, fontWeight: "700" }}>Cancel</Text></Pressable>
              <Pressable onPress={() => void confirmDelete()} disabled={deleting} style={[styles.dialogButton, { backgroundColor: colors.red ?? "#C94B4B", opacity: deleting ? 0.7 : 1 }]}>
                {deleting ? <ActivityIndicator color={colors.white} /> : <Text variant="bodyMedium" style={{ color: colors.white, fontWeight: "800" }}>Delete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme-aware in-app feedback */}
      <Modal visible={!!feedback} transparent animationType="fade" onRequestClose={() => setFeedback(null)} statusBarTranslucent>
        <Pressable style={styles.feedbackOverlay} onPress={() => setFeedback(null)}>
          <Pressable onPress={() => setFeedback(null)} style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={[styles.feedbackMark, { backgroundColor: feedback?.kind === "success" ? colors.ringExercise : (colors.red ?? colors.primary) }]}><Text style={{ color: onAccent, fontWeight: "900" }}>{feedback?.kind === "success" ? "✓" : "!"}</Text></View>
            <View style={styles.feedbackCopy}><Text variant="bodyMedium">{feedback?.title ?? ""}</Text><Text variant="bodySmall" tone="secondary">{feedback?.message ?? ""}</Text></View>
            <Text variant="bodyMedium" style={{ color: colors.text }}>×</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: "flex-end" },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.xl },
  hero: { overflow: "hidden", borderRadius: radius.card + 8, padding: spacing.xl, minHeight: 265, gap: spacing.md },
  heroOrb: { position: "absolute", width: 230, height: 230, borderRadius: 115, borderWidth: 1, right: -85, top: -90 },
  heroOrbSmall: { position: "absolute", width: 150, height: 150, borderRadius: 75, borderWidth: 1, right: -45, top: -50 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroEyebrow: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  heroTitle: { fontSize: 29, lineHeight: 35, letterSpacing: -0.8, fontWeight: "700", marginTop: spacing.xs },
  heroSubtitle: { lineHeight: 20, maxWidth: 270 },
  progressTrack: { height: 6, borderRadius: 4, overflow: "hidden", marginTop: spacing.xs },
  progressFill: { height: "100%", borderRadius: 4 },
  heroBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  progressBadge: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xs },
  sectionSub: { marginTop: 4, lineHeight: 19 },
  addButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill },
  emptyCard: { padding: spacing.xl, gap: spacing.md, alignItems: "flex-start" },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  emptyText: { lineHeight: 21, marginBottom: spacing.sm },
  routineCard: { borderRadius: radius.card + 4, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingTop: spacing.xs, overflow: "hidden" },
  routineRow: { flexDirection: "row", alignItems: "center", minHeight: 76, paddingVertical: spacing.sm, gap: spacing.sm },
  checkHit: { minWidth: 42, minHeight: 48, alignItems: "center", justifyContent: "center" },
  check: { width: 27, height: 27, borderRadius: 14, borderWidth: 1.8, alignItems: "center", justifyContent: "center" },
  routineInfo: { flex: 1, justifyContent: "center", gap: 5, minWidth: 0, paddingVertical: 5 },
  supplementName: { fontWeight: "700" },
  takenName: { textDecorationLine: "line-through", opacity: 0.68 },
  metaLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaDot: { width: 3, height: 3, borderRadius: 2 },
  moreButton: { width: 36, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  listFooter: { marginHorizontal: -spacing.md, marginTop: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  doneNote: { borderRadius: radius.card, borderWidth: 1, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.48)" },
  sheet: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopLeftRadius: radius.card + 8, borderTopRightRadius: radius.card + 8, gap: spacing.lg },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, marginBottom: spacing.xs },
  sheetHeading: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { minHeight: 38, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dialogOverlay: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, backgroundColor: "rgba(0,0,0,0.5)" },
  dialog: { width: "100%", maxWidth: 420, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card + 4, padding: spacing.xl, alignItems: "flex-start", gap: spacing.md },
  dialogIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  dialogMessage: { lineHeight: 21 },
  dialogActions: { flexDirection: "row", alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.sm },
  dialogButton: { minHeight: 48, flex: 1, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  feedbackOverlay: { flex: 1, justifyContent: "flex-end", paddingHorizontal: spacing.lg, paddingBottom: 36, backgroundColor: "rgba(0,0,0,0.12)" },
  feedbackCard: { maxWidth: 520, width: "100%", alignSelf: "center", flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth },
  feedbackMark: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  feedbackCopy: { flex: 1, gap: 3 },
});