import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated as RNAnimated,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G } from "react-native-svg";
import { TabScreen } from "../../src/components/navigation/TabScreen";
import { Button } from "../../src/components/ui/Button";
import { Text } from "../../src/components/ui/Text";
import { supabase } from "../../src/lib/supabase";
import { useAnimatedKeyboardPadding } from "../../src/lib/Useanimatedkeyboardpadding";
import { withTimeout } from "../../src/lib/Withtimeout";
import { radius, spacing } from "../../src/theme/spacing";
import { useTheme } from "../../src/theme/ThemeProvider";

type Food = {
  id: number;
  food_name: string;
  state: string | null;
  category: string | null;
  serving_size_g: number | string;
  calories_kcal: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
  fiber_g: number | string;
  nutrition_source: string | null;
};

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

type FoodLog = {
  id: number;
  food_id: number;
  food_name: string;
  quantity_g: number | string;
  calories_kcal: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
  fiber_g: number | string;
  meal_type: MealType;
  consumed_at: string;
};

type Nutrients = { calories: number; protein: number; carbs: number; fat: number; fiber: number };

type Recent = { food_id: number; food_name: string };

const FOOD_COLUMNS =
  "id, food_name, state, category, serving_size_g, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, nutrition_source";

const LOG_COLUMNS =
  "id, food_id, food_name, quantity_g, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, meal_type, consumed_at";

const MEALS: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

const CALORIE_GOAL = 2100;
const PROTEIN_GOAL = 110;
const CARBS_GOAL = 250;
const FAT_GOAL = 70;
const MAX_SUGGESTIONS = 6;
const LOAD_TIMEOUT_MS = 15000;

const n = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmt = (value: number, digits = 0) =>
  value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });

const round1 = (value: number) => Math.round(value * 10) / 10;

const ratio = (value: number, goal: number) => Math.min(1, Math.max(0, value / goal));

function localDayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function defaultMeal(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return "Breakfast";
  if (hour < 15) return "Lunch";
  if (hour < 18) return "Snack";
  return "Dinner";
}

/** Prefix matches first ("app" -> Apple), then word-start matches, then anything containing it. */
function rank(foods: Food[], q: string): Food[] {
  const needle = q.toLowerCase();
  const score = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.startsWith(needle)) return 0;
    if (lower.includes(` ${needle}`)) return 1;
    return 2;
  };
  return [...foods]
    .sort((a, b) => score(a.food_name) - score(b.food_name) || a.food_name.length - b.food_name.length)
    .slice(0, MAX_SUGGESTIONS);
}

async function fetchToday(uid: string): Promise<FoodLog[]> {
  const { start, end } = localDayBounds();
  const { data, error } = await supabase
    .from("food_logs")
    .select(LOG_COLUMNS)
    .eq("user_id", uid)
    .gte("consumed_at", start)
    .lt("consumed_at", end)
    .order("consumed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FoodLog[];
}

async function fetchRecents(uid: string): Promise<Recent[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("food_logs")
    .select("food_id, food_name")
    .eq("user_id", uid)
    .gte("consumed_at", since)
    .order("consumed_at", { ascending: false })
    .limit(40);
  const seen = new Set<number>();
  const unique: Recent[] = [];
  for (const row of (data ?? []) as Recent[]) {
    if (!seen.has(row.food_id)) {
      seen.add(row.food_id);
      unique.push(row);
    }
  }
  return unique.slice(0, MAX_SUGGESTIONS);
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function Ring({ size, stroke, progress, color, track }: { size: number; stroke: number; progress: number; color: string; track: string }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const value = useSharedValue(0);
  useEffect(() => {
    value.value = withTiming(progress, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress, value]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - value.value) }));
  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          animatedProps={props}
          fill="none"
        />
      </G>
    </Svg>
  );
}

/** Bolds the part of the name the user has typed. */
function Highlight({ name, query, color }: { name: string; query: string; color: string }) {
  const index = name.toLowerCase().indexOf(query.toLowerCase());
  if (!query || index < 0) return <Text variant="bodyMedium">{name}</Text>;
  return (
    <Text variant="body" numberOfLines={1}>
      {name.slice(0, index)}
      <Text variant="bodyMedium" style={{ color, fontWeight: "800" }}>
        {name.slice(index, index + query.length)}
      </Text>
      {name.slice(index + query.length)}
    </Text>
  );
}

export default function NutritionScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Sheet padding glides with the keyboard instead of jumping to its height.
  const sheetPadding = useAnimatedKeyboardPadding(insets.bottom + spacing.lg, spacing.lg);
  const [userId, setUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FoodLog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [meal, setMeal] = useState<MealType>(defaultMeal());
  const [saving, setSaving] = useState(false);
  const searchSeq = useRef(0);
  const refreshId = useRef(0);
  const mounted = useRef(true);
  const quantityG = Math.max(0, Number(quantity) || 0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const preview = useMemo<Nutrients>(() => {
    if (!selectedFood || quantityG <= 0) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    const factor = quantityG / Math.max(1, n(selectedFood.serving_size_g));
    return {
      calories: n(selectedFood.calories_kcal) * factor,
      protein: n(selectedFood.protein_g) * factor,
      carbs: n(selectedFood.carbs_g) * factor,
      fat: n(selectedFood.fat_g) * factor,
      fiber: n(selectedFood.fiber_g) * factor,
    };
  }, [selectedFood, quantityG]);

  const totals = useMemo<Nutrients>(
    () =>
      logs.reduce(
        (sum, row) => ({
          calories: sum.calories + n(row.calories_kcal),
          protein: sum.protein + n(row.protein_g),
          carbs: sum.carbs + n(row.carbs_g),
          fat: sum.fat + n(row.fat_g),
          fiber: sum.fiber + n(row.fiber_g),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      ),
    [logs],
  );

  // Only the latest request may update state, and a stalled request ends in
  // an error instead of an endless spinner.
  const refresh = useCallback(async () => {
    const id = ++refreshId.current;
    setError(null);
    try {
      const result = await withTimeout(
        (async () => {
          // getSession() reads the local session; getUser() makes a network
          // round trip to the auth server on every call.
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          const user = data.session?.user ?? null;
          if (!user) return null;
          const [todayLogs, recentFoods] = await Promise.all([fetchToday(user.id), fetchRecents(user.id)]);
          return { uid: user.id, todayLogs, recentFoods };
        })(),
        LOAD_TIMEOUT_MS,
        "Loading took too long. Pull down to try again.",
      );
      if (!mounted.current || id !== refreshId.current) return;
      if (!result) {
        setUserId(null);
        setLogs([]);
        setError("Please sign in to record your meals.");
        return;
      }
      setUserId(result.uid);
      setLogs(result.todayLogs);
      setRecents(result.recentFoods);
    } catch (e) {
      if (!mounted.current || id !== refreshId.current) return;
      setError(e instanceof Error ? e.message : "Couldn't load your nutrition data.");
    } finally {
      if (mounted.current && id === refreshId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Nothing is listed until the user types: the database is only queried for what they are looking for.
  useEffect(() => {
    const q = query.trim();
    if (!sheetOpen || !q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      try {
        const { data, error: foodsError } = await supabase
          .from("foods")
          .select(FOOD_COLUMNS)
          .ilike("food_name", `%${q.replace(/[%_\\]/g, "\\$&")}%`)
          .order("food_name", { ascending: true })
          .limit(30);
        if (seq !== searchSeq.current) return;
        if (foodsError) setError(foodsError.message);
        else setResults(rank((data ?? []) as Food[], q));
      } catch (e) {
        if (seq === searchSeq.current) setError(e instanceof Error ? e.message : "Search failed. Please try again.");
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query, sheetOpen]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const openSheet = useCallback((forMeal?: MealType) => {
    setMeal(forMeal ?? defaultMeal());
    setQuery("");
    setResults([]);
    setSelectedFood(null);
    setQuantity("100");
    setError(null);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    if (saving) return;
    Keyboard.dismiss();
    setSheetOpen(false);
  }, [saving]);

  const chooseFood = useCallback((food: Food) => {
    setSelectedFood(food);
    setQuantity(String(n(food.serving_size_g) || 100));
    setError(null);
  }, []);

  const chooseRecent = useCallback(
    async (recent: Recent) => {
      const { data } = await supabase.from("foods").select(FOOD_COLUMNS).eq("id", recent.food_id).maybeSingle();
      if (data) chooseFood(data as Food);
    },
    [chooseFood],
  );

  const addFood = useCallback(async () => {
    if (!userId) return setError("Please sign in before adding food.");
    if (!selectedFood) return setError("Choose a food from the suggestions first.");
    if (!Number.isFinite(quantityG) || quantityG <= 0) return setError("Enter a quantity greater than 0 grams.");
    setSaving(true);
    setError(null);
    try {
      const row = {
        user_id: userId,
        food_id: selectedFood.id,
        food_name: selectedFood.food_name,
        quantity_g: round1(quantityG),
        calories_kcal: round1(preview.calories),
        protein_g: round1(preview.protein),
        carbs_g: round1(preview.carbs),
        fat_g: round1(preview.fat),
        fiber_g: round1(preview.fiber),
        meal_type: meal,
        consumed_at: new Date().toISOString(),
      };
      // Ask for the saved row back so the list can update instantly,
      // instead of waiting for two full reloads before closing the sheet.
      const { data: inserted, error: insertError } = await supabase
        .from("food_logs")
        .insert(row)
        .select(LOG_COLUMNS)
        .single();
      if (insertError) throw insertError;

      if (inserted) {
        setLogs((current) => [inserted as FoodLog, ...current]);
      } else {
        void refresh();
      }
      void fetchRecents(userId)
        .then((items) => {
          if (mounted.current) setRecents(items);
        })
        .catch(() => undefined);

      setNotice(`${selectedFood.food_name} added to ${meal.toLowerCase()}.`);
      setSelectedFood(null);
      setQuery("");
      Keyboard.dismiss();
      setSheetOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this food.");
    } finally {
      setSaving(false);
    }
  }, [userId, selectedFood, quantityG, preview, meal, refresh]);

  const removeFood = useCallback(async () => {
    if (!userId || !pendingDelete || deleting) return;
    const item = pendingDelete;
    setDeleting(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("food_logs")
        .delete()
        .eq("id", item.id)
        .eq("user_id", userId);
      if (deleteError) throw deleteError;
      setLogs((current) => current.filter((row) => row.id !== item.id));
      setPendingDelete(null);
      setNotice(`${item.food_name} removed from today's log.`);
    } catch (e) {
      setPendingDelete(null);
      setError(e instanceof Error ? e.message : "Couldn't remove this entry.");
    } finally {
      setDeleting(false);
    }
  }, [userId, pendingDelete, deleting]);

  const confirmRemove = (row: FoodLog) => setPendingDelete(row);

  const left = CALORIE_GOAL - totals.calories;
  const today = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const portions = selectedFood
    ? Array.from(new Set([n(selectedFood.serving_size_g), 50, 100, 150, 200].filter((value) => value > 0)))
    : [];

  const macros = [
    { label: "Protein", value: totals.protein, goal: PROTEIN_GOAL, color: colors.ringMove },
    { label: "Carbs", value: totals.carbs, goal: CARBS_GOAL, color: colors.ringExercise },
    { label: "Fat", value: totals.fat, goal: FAT_GOAL, color: colors.ringStand },
  ];

  return (
    <TabScreen
      title="Nutrition"
      subtitle="FOOD JOURNAL"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void refresh();
      }}
    >
      <Text variant="label" tone="muted">
        {today}
      </Text>

      <Animated.View entering={FadeInDown.duration(550)} style={styles.hero}>
        <View style={styles.ringBox}>
          <Ring size={176} stroke={16} progress={ratio(totals.calories, CALORIE_GOAL)} color={left >= 0 ? colors.amber : colors.red} track={colors.surfaceMuted} />
          <View style={styles.ringCenter} pointerEvents="none">
            <Text variant="metric" style={{ color: left >= 0 ? colors.text : colors.red }}>
              {fmt(Math.abs(left))}
            </Text>
            <Text variant="caption" tone="muted">
              {left >= 0 ? "KCAL LEFT" : "KCAL OVER"}
            </Text>
          </View>
        </View>

        <View style={styles.macros}>
          {macros.map((macro) => (
            <View
              key={macro.label}
              accessible
              accessibilityLabel={`${macro.label}: ${fmt(macro.value, 1)} of ${macro.goal} grams`}
            >
              <View style={styles.macroTop}>
                <Text variant="bodySmall" style={{ color: macro.color, fontWeight: "700" }}>
                  {macro.label}
                </Text>
                <Text variant="caption" tone="muted">
                  {fmt(macro.value)} / {macro.goal} g
                </Text>
              </View>
              <View style={[styles.macroTrack, { backgroundColor: colors.surfaceMuted }]}>
                <View style={[styles.macroFill, { width: `${ratio(macro.value, macro.goal) * 100}%`, backgroundColor: macro.color }]} />
              </View>
            </View>
          ))}
          <Text variant="caption" tone="muted">
            Eaten {fmt(totals.calories)} of {fmt(CALORIE_GOAL)} kcal · Fiber {fmt(totals.fiber, 1)} g
          </Text>
        </View>
      </Animated.View>

      {error && !sheetOpen ? (
        <View style={[styles.banner, { borderColor: colors.red }]} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={18} color={colors.red} />
          <Text variant="bodySmall" style={{ color: colors.red, flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : null}

      {notice ? (
        <View style={[styles.banner, { borderColor: colors.line, backgroundColor: colors.surface }]} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
          <Text variant="bodySmall" style={{ flex: 1 }}>
            {notice}
          </Text>
        </View>
      ) : null}

      <View style={styles.addWrap}>
        <Button label="Log food" onPress={() => openSheet()} accessibilityHint="Opens food search" />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        MEALS.map((mealName, index) => {
          const rows = logs.filter((row) => row.meal_type === mealName);
          const kcal = rows.reduce((sum, row) => sum + n(row.calories_kcal), 0);
          return (
            <Animated.View key={mealName} entering={FadeInDown.delay(80 * index).duration(450)} style={styles.meal}>
              <View style={[styles.rail, { borderLeftColor: colors.line }]}>
                <View style={[styles.node, { backgroundColor: rows.length ? colors.primary : colors.surfaceMuted, borderColor: colors.background }]} />
                <View style={styles.mealHead}>
                  <View style={{ flex: 1 }}>
                    <Text variant="heading3">{mealName}</Text>
                    <Text variant="caption" tone="muted">
                      {rows.length ? `${fmt(kcal)} kcal` : "Nothing logged"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => openSheet(mealName)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add food to ${mealName}`}
                    hitSlop={8}
                    style={[styles.plus, { backgroundColor: colors.surfaceAlt }]}
                  >
                    <Ionicons name="add" size={20} color={colors.text} />
                  </Pressable>
                </View>

                {rows.map((row) => (
                  <Pressable
                    key={row.id}
                    onLongPress={() => confirmRemove(row)}
                    delayLongPress={450}
                    accessibilityLabel={`${row.food_name}, ${fmt(n(row.calories_kcal))} kilocalories`}
                    accessibilityHint="Long press to remove"
                    accessibilityActions={[{ name: "delete", label: "Remove" }]}
                    onAccessibilityAction={(e) => e.nativeEvent.actionName === "delete" && confirmRemove(row)}
                    style={({ pressed }) => [styles.entry, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" numberOfLines={1}>
                        {row.food_name}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {fmt(n(row.quantity_g), 1)} g · P {fmt(n(row.protein_g))} · C {fmt(n(row.carbs_g))} · F {fmt(n(row.fat_g))}
                      </Text>
                    </View>
                    <Text variant="heading3">{fmt(n(row.calories_kcal))}</Text>
                    <Pressable
                      onPress={() => confirmRemove(row)}
                      disabled={deleting}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${row.food_name}`}
                      hitSlop={8}
                      style={({ pressed }) => [styles.deleteEntryButton, { backgroundColor: pressed ? colors.surfaceAlt : "transparent", opacity: deleting ? 0.6 : 1 }]}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.red ?? "#C94B4B"} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          );
        })
      )}

      {logs.length > 0 ? (
        <Text variant="caption" tone="muted" style={styles.hint}>
          Press and hold an entry to remove it.
        </Text>
      ) : null}

      <Modal visible={pendingDelete !== null} transparent animationType="fade" onRequestClose={() => !deleting && setPendingDelete(null)} statusBarTranslucent>
        <View style={styles.deleteOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !deleting && setPendingDelete(null)} accessibilityLabel="Cancel delete" />
          <View style={[styles.deleteDialog, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={[styles.deleteDialogIcon, { backgroundColor: `${colors.red ?? "#C94B4B"}18` }]}>
              <Ionicons name="trash-outline" size={24} color={colors.red ?? "#C94B4B"} />
            </View>
            <Text variant="heading2">Remove food entry?</Text>
            <Text variant="bodySmall" tone="secondary" style={styles.deleteDialogMessage}>
              {pendingDelete ? `${pendingDelete.food_name} will be removed from today's food log.` : "This food entry will be removed from today's log."} This cannot be undone.
            </Text>
            <View style={styles.deleteDialogActions}>
              <Pressable onPress={() => setPendingDelete(null)} disabled={deleting} style={[styles.deleteDialogButton, { backgroundColor: colors.surfaceAlt }]}>
                <Text variant="bodyMedium" style={{ color: colors.text, fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void removeFood()} disabled={deleting} style={[styles.deleteDialogButton, { backgroundColor: colors.red ?? "#C94B4B", opacity: deleting ? 0.7 : 1 }]}>
                {deleting ? <ActivityIndicator color={colors.white} /> : <Ionicons name="trash-outline" size={16} color={colors.white} />}
                <Text variant="bodyMedium" style={{ color: colors.white, fontWeight: "800" }}>{deleting ? "Removing…" : "Remove"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={closeSheet} statusBarTranslucent>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.backdrop} onPress={closeSheet} accessibilityLabel="Close" />
          <RNAnimated.View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                maxHeight: height - insets.top - spacing.md,
                // When the keyboard is open, the sheet glides up above it.
                paddingBottom: sheetPadding,
              },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.lg }}>
              {!selectedFood ? (
                <>
                  <View style={styles.sheetHead}>
                    <Text variant="heading2" style={{ flex: 1 }}>
                      Add food
                    </Text>
                    <Pressable onPress={closeSheet} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                      <Ionicons name="close" size={22} color={colors.textMuted} />
                    </Pressable>
                  </View>

                  <View style={[styles.search, { backgroundColor: colors.surfaceAlt }]}>
                    <Ionicons name="search-outline" size={19} color={colors.textMuted} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      autoCorrect={false}
                      autoCapitalize="none"
                      placeholder="Search a food"
                      placeholderTextColor={colors.textMuted}
                      accessibilityLabel="Search a food"
                      style={[styles.searchInput, { color: colors.text }]}
                    />
                    {searching ? <ActivityIndicator size="small" color={colors.primary} /> : query ? (
                      <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Clear search">
                        <Ionicons name="close-circle" size={19} color={colors.textMuted} />
                      </Pressable>
                    ) : null}
                  </View>

                  {!query.trim() ? (
                    recents.length > 0 ? (
                      <View style={{ gap: spacing.sm }}>
                        <Text variant="label" tone="muted">
                          Recent
                        </Text>
                        <View style={styles.chips}>
                          {recents.map((recent) => (
                            <Pressable
                              key={recent.food_id}
                              onPress={() => void chooseRecent(recent)}
                              accessibilityRole="button"
                              style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}
                            >
                              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                              <Text variant="bodySmall">{recent.food_name}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <Text variant="bodySmall" tone="muted">
                        Start typing and the closest matches appear here.
                      </Text>
                    )
                  ) : results.length === 0 && !searching ? (
                    <Text variant="bodySmall" tone="muted">
                      No match for “{query.trim()}”. Try another spelling.
                    </Text>
                  ) : (
                    <View>
                      {results.map((food, index) => {
                        const best = index === 0 && food.food_name.toLowerCase().startsWith(query.trim().toLowerCase());
                        return (
                          <Pressable
                            key={food.id}
                            onPress={() => chooseFood(food)}
                            accessibilityRole="button"
                            accessibilityLabel={`${food.food_name}, ${fmt(n(food.calories_kcal))} kilocalories per ${fmt(n(food.serving_size_g))} grams`}
                            style={({ pressed }) => [
                              styles.result,
                              { borderBottomColor: colors.line, borderBottomWidth: index === results.length - 1 ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.6 : 1 },
                            ]}
                          >
                            <View style={{ flex: 1, gap: 2 }}>
                              <Highlight name={food.food_name} query={query.trim()} color={colors.primary} />
                              <Text variant="caption" tone="muted" numberOfLines={1}>
                                {food.category || "Food"} · {fmt(n(food.calories_kcal))} kcal per {fmt(n(food.serving_size_g))} g
                              </Text>
                            </View>
                            {best ? (
                              <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
                                <Text variant="caption" style={{ color: colors.primary, fontWeight: "800" }}>
                                  BEST MATCH
                                </Text>
                              </View>
                            ) : null}
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.sheetHead}>
                    <Pressable onPress={() => setSelectedFood(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back to search">
                      <Ionicons name="chevron-back" size={22} color={colors.text} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text variant="heading2" numberOfLines={2}>
                        {selectedFood.food_name}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {selectedFood.category || "Food"} · per {fmt(n(selectedFood.serving_size_g))} g
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepper}>
                    <Pressable
                      accessibilityLabel="Decrease by 10 grams"
                      onPress={() => setQuantity(String(Math.max(1, quantityG - 10)))}
                      style={[styles.stepButton, { backgroundColor: colors.surfaceAlt }]}
                    >
                      <Ionicons name="remove" size={22} color={colors.text} />
                    </Pressable>
                    <View style={styles.qtyBox}>
                      <TextInput
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        accessibilityLabel="Quantity in grams"
                        style={[styles.qtyInput, { color: colors.text }]}
                      />
                      <Text variant="caption" tone="muted">
                        GRAMS
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Increase by 10 grams"
                      onPress={() => setQuantity(String(quantityG + 10))}
                      style={[styles.stepButton, { backgroundColor: colors.surfaceAlt }]}
                    >
                      <Ionicons name="add" size={22} color={colors.text} />
                    </Pressable>
                  </View>

                  <View style={styles.chips}>
                    {portions.map((grams) => {
                      const active = quantityG === grams;
                      return (
                        <Pressable
                          key={grams}
                          onPress={() => setQuantity(String(grams))}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surfaceAlt }]}
                        >
                          <Text variant="bodySmall" style={{ color: active ? colors.background : colors.text, fontWeight: "600" }}>
                            {fmt(grams)} g
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.chips}>
                    {MEALS.map((item) => {
                      const active = meal === item;
                      return (
                        <Pressable
                          key={item}
                          onPress={() => setMeal(item)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                          style={[styles.chip, { borderWidth: 1, borderColor: active ? colors.primary : colors.line, backgroundColor: "transparent" }]}
                        >
                          <Text variant="bodySmall" style={{ color: active ? colors.primary : colors.textSecondary, fontWeight: "600" }}>
                            {item}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={[styles.previewBox, { backgroundColor: colors.surfaceAlt }]}>
                    <View style={{ alignItems: "flex-start" }}>
                      <Text variant="metric">{fmt(preview.calories)}</Text>
                      <Text variant="caption" tone="muted">
                        KCAL
                      </Text>
                    </View>
                    {[
                      { label: "Protein", value: preview.protein, color: colors.ringMove },
                      { label: "Carbs", value: preview.carbs, color: colors.ringExercise },
                      { label: "Fat", value: preview.fat, color: colors.ringStand },
                    ].map((macro) => (
                      <View key={macro.label}>
                        <Text variant="bodyMedium" style={{ color: macro.color }}>
                          {fmt(macro.value, 1)} g
                        </Text>
                        <Text variant="caption" tone="muted">
                          {macro.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {error ? (
                    <Text variant="bodySmall" accessibilityRole="alert" style={{ color: colors.red }}>
                      {error}
                    </Text>
                  ) : null}

                  <Button
                    label={saving ? "Saving…" : `Add to ${meal.toLowerCase()}`}
                    onPress={() => void addFood()}
                    loading={saving}
                    disabled={quantityG <= 0}
                  />
                </>
              )}
            </ScrollView>
          </RNAnimated.View>
        </View>
      </Modal>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.xl, marginTop: spacing.lg },
  ringBox: { width: 176, height: 176, alignItems: "center", justifyContent: "center" },
  ringCenter: { position: "absolute", alignItems: "center" },
  macros: { flex: 1, gap: spacing.md },
  macroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 },
  macroTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  macroFill: { height: "100%", borderRadius: 3 },
  banner: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  addWrap: { marginTop: spacing.xl },
  meal: { marginTop: spacing.xl },
  rail: { borderLeftWidth: 2, marginLeft: 6, paddingLeft: spacing.xl, gap: spacing.sm },
  node: { position: "absolute", left: -7, top: 6, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  mealHead: { flexDirection: "row", alignItems: "center" },
  plus: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  entry: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48, paddingVertical: spacing.xs },
  deleteEntryButton: { width: 34, height: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  deleteOverlay: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.xl, backgroundColor: "rgba(0,0,0,0.5)" },
  deleteDialog: { width: "100%", maxWidth: 420, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card + 4, padding: spacing.xl, alignItems: "flex-start", gap: spacing.md },
  deleteDialogIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  deleteDialogMessage: { lineHeight: 21 },
  deleteDialogActions: { flexDirection: "row", alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.sm },
  deleteDialogButton: { minHeight: 48, flex: 1, borderRadius: radius.pill, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  hint: { textAlign: "center", marginTop: spacing.xl },
  sheetRoot: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3 },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: 50 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 38, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: "center" },
  result: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 58, paddingVertical: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepButton: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  qtyBox: { alignItems: "center" },
  qtyInput: { fontSize: 44, fontWeight: "600", letterSpacing: -1.5, textAlign: "center", minWidth: 120, padding: 0 },
  previewBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: radius.xl, padding: spacing.lg },
});