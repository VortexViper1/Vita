import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RingHero } from "../../src/components/ui/Ringhero";
import { TabScreen } from "../../src/components/navigation/TabScreen";
import { Button } from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";
import { PhotoStack } from "../../src/components/ui/Photostack";
import { Section } from "../../src/components/ui/Section";
import { ErrorState, LoadingState } from "../../src/components/ui/states";
import { Text } from "../../src/components/ui/Text";
import { TextField } from "../../src/components/ui/TextField";
import { useStackSize } from "../../src/components/ui/Usestacksize";

import {
  addSupplement,
  deleteSupplement,
  getSupplements,
  toggleSupplement,
  type Supplement,
} from "../../src/data/supplements";

import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, spacing } from "../../src/theme/spacing";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TIME_PRESETS = ["Morning", "Afternoon", "Evening", "Bedtime"];
const STACK_IMAGE = {
  uri: "https://images.pexels.com/photos/7615410/pexels-photo-7615410.jpeg?auto=compress&cs=tinysrgb&w=1000&h=1000&fit=crop",
};
function animate() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export default function SupplementsScreen() {
  const { colors, resolvedMode } = useTheme();
  const insets = useSafeAreaInsets();
  const stackSize = useStackSize();

  const onAccent = resolvedMode === "dark" ? colors.background : colors.white;

  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("");

  const dosageRef = useRef<TextInput>(null);
  const timeRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    try {
      setSupplements(await getSupplements());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const takenCount = useMemo(
    () => supplements.filter((s) => s.takenToday).length,
    [supplements],
  );
  const total = supplements.length;
  const allDone = total > 0 && takenCount === total;

  function resetForm() {
    setName("");
    setDosage("");
    setTime("");
  }

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
      animate();
      await load();
    } catch {
      Alert.alert("Couldn't save", "Your supplement wasn't added. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string) {
    setSupplements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, takenToday: !s.takenToday } : s)),
    );
    try {
      await toggleSupplement(id);
    } catch {
      await load();
      Alert.alert("Couldn't update", "That change didn't save. Try again.");
    }
  }

  function handleDelete(item: Supplement) {
    Alert.alert(`Delete ${item.name}?`, "It will be removed from your daily list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          animate();
          setSupplements((prev) => prev.filter((s) => s.id !== item.id));
          try {
            await deleteSupplement(item.id);
          } catch {
            await load();
            Alert.alert("Couldn't delete", "Try again.");
          }
        },
      },
    ]);
  }

  const canSave = name.trim().length > 0 && !saving;

  return (
    <TabScreen title="Supplements" subtitle="Daily">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <LoadingState />
        ) : loadError && total === 0 ? (
          <ErrorState
            onRetry={() => {
              setLoading(true);
              load();
            }}
          />
        ) : (
          <>
            <RingHero
              rings={[
                {
                  label: "Taken today",
                  value:
                    total === 0 ? "Nothing yet" : allDone ? "All done" : `${takenCount} of ${total}`,
                  color: colors.ringExercise,
                  progress: total > 0 ? takenCount / total : 0,
                },
              ]}
            />

            {total > 0 ? (
              <Section title="Your stack" description="Tap the stack to flip through.">
<PhotoStack
  size={stackSize}
  items={supplements.slice(0, 6).map((s) => ({
    title: s.name,
    subtitle: [s.dosage, s.time].filter(Boolean).join(" · "),
    image: STACK_IMAGE,
  }))}
/>
              </Section>
            ) : null}

            <Section
              title="Today"
              description="Your daily supplement routine."
              action={{ label: "Add", onPress: () => setShowAdd(true) }}
            >
              {total === 0 ? (
                <Card>
                  <Text variant="heading3">Your list is empty</Text>
                  <Text tone="secondary" style={styles.emptyText}>
                    Add a supplement with its dose and time of day, then check it off each day.
                  </Text>
                  <View style={styles.emptyAction}>
                    <Button label="Add supplement" onPress={() => setShowAdd(true)} />
                  </View>
                </Card>
              ) : (
                <Card style={styles.listCard}>
                  {supplements.map((item, index) => {
                    const taken = !!item.takenToday;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => handleToggle(item.id)}
                        onLongPress={() => handleDelete(item)}
                        delayLongPress={450}
                        accessibilityRole="checkbox"
                        accessibilityLabel={item.name}
                        accessibilityHint="Double tap to mark as taken. Long press to delete."
                        accessibilityState={{ checked: taken }}
                        accessibilityActions={[{ name: "delete", label: "Delete" }]}
                        onAccessibilityAction={(e) => {
                          if (e.nativeEvent.actionName === "delete") handleDelete(item);
                        }}
                        style={({ pressed }) => [
                          styles.row,
                          {
                            borderBottomColor: colors.line,
                            borderBottomWidth:
                              index === total - 1 ? 0 : StyleSheet.hairlineWidth,
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.check,
                            {
                              borderColor: taken ? colors.ringExercise : colors.borderStrong,
                              backgroundColor: taken ? colors.ringExercise : "transparent",
                            },
                          ]}
                        >
                          {taken ? (
                            <Text variant="caption" style={{ color: onAccent, fontWeight: "800" }}>
                              ✓
                            </Text>
                          ) : null}
                        </View>

                        <View style={styles.info}>
                          <Text
                            variant="bodyMedium"
                            numberOfLines={1}
                            tone={taken ? "muted" : "primary"}
                          >
                            {item.name}
                          </Text>
                          {item.dosage ? (
                            <Text variant="bodySmall" tone="muted" numberOfLines={1}>
                              {item.dosage}
                            </Text>
                          ) : null}
                        </View>

                        {item.time ? (
                          <Text variant="bodySmall" tone="muted" style={styles.time}>
                            {item.time}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </Card>
              )}

              {total > 0 ? (
                <Text variant="bodySmall" tone="muted" style={styles.hint}>
                  Tap to check off. Press and hold to delete.
                </Text>
              ) : null}
            </Section>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showAdd}
        transparent
        animationType="slide"
        onRequestClose={closeAdd}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={styles.backdrop}
            onPress={closeAdd}
            accessibilityLabel="Close"
          />

          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
              },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />

            <Text variant="heading2">New supplement</Text>

            <TextField
              label="Name"
              placeholder="Vitamin D"
              value={name}
              onChangeText={setName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={60}
              onSubmitEditing={() => dosageRef.current?.focus()}
            />

            <TextField
              label="Dose"
              placeholder="1000 mg"
              inputRef={dosageRef}
              value={dosage}
              onChangeText={setDosage}
              returnKeyType="next"
              maxLength={40}
              onSubmitEditing={() => timeRef.current?.focus()}
            />

            <TextField
              label="Time"
              placeholder="9:00 AM"
              inputRef={timeRef}
              value={time}
              onChangeText={setTime}
              returnKeyType="done"
              maxLength={30}
              onSubmitEditing={handleAdd}
            />

            <View style={styles.chips}>
              {TIME_PRESETS.map((preset) => {
                const active = time === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => setTime(active ? "" : preset)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? colors.primary : colors.surfaceAlt },
                    ]}
                  >
                    <Text
                      variant="bodySmall"
                      style={{
                        color: active ? onAccent : colors.text,
                        fontWeight: "600",
                      }}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button
              label={saving ? "Saving…" : "Add supplement"}
              onPress={handleAdd}
              disabled={!canSave}
              loading={saving}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },

  listCard: { paddingVertical: spacing.xs },
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md + 2,
  },
  info: { flex: 1, gap: 2 },
  time: { marginLeft: spacing.md },
  hint: { marginTop: spacing.md },

  emptyText: { marginTop: spacing.xs, maxWidth: 320 },
  emptyAction: { marginTop: spacing.lg },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    gap: spacing.lg,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});