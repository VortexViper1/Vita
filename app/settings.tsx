
import React, { useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  ThemeMode,
  useTheme,
} from "../src/theme/ThemeProvider";

import {
  radius,
  spacing,
} from "../src/theme/spacing";

// ========================================
// THEME OPTIONS
// ========================================

const modes: {
  value: ThemeMode;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "system",
    label: "System default",
    description: "Follow your device appearance",
    icon: "phone-portrait-outline",
  },
  {
    value: "light",
    label: "Light mode",
    description: "Clean, bright and minimal",
    icon: "sunny-outline",
  },
  {
    value: "dark",
    label: "Dark mode",
    description: "Easy on the eyes in low light",
    icon: "moon-outline",
  },
];

// ========================================
// SETTINGS SCREEN
// ========================================

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();

  const [savingMode, setSavingMode] =
    useState<ThemeMode | null>(null);

  const changeTheme = async (nextMode: ThemeMode) => {
    if (nextMode === mode || savingMode !== null) {
      return;
    }

    setSavingMode(nextMode);

    try {
      await setMode(nextMode);
    } finally {
      setSavingMode(null);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/" as never);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              pressed && {
                backgroundColor: colors.surfaceMuted,
                transform: [{ scale: 0.96 }],
              },
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={colors.text}
            />
          </Pressable>

          <View style={styles.headerLabel}>
            <Text
              style={[
                styles.eyebrow,
                { color: colors.textMuted },
              ]}
            >
              PERSONALIZE YOUR SPACE
            </Text>

            <Text
              style={[
                styles.headerCaption,
                { color: colors.textSecondary },
              ]}
            >
              Vīta preferences
            </Text>
          </View>

          <View
            style={[
              styles.brandMark,
              { backgroundColor: colors.surface },
            ]}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={colors.primary}
            />
          </View>
        </View>

        {/* PAGE INTRODUCTION */}

        <View style={styles.intro}>
          <Text
            style={[
              styles.title,
              { color: colors.text },
            ]}
          >
            Settings
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: colors.textSecondary },
            ]}
          >
            Make Vīta feel like yours. Adjust your
            experience to fit your everyday routine.
          </Text>
        </View>

        {/* APPEARANCE HERO */}

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: colors.surfaceMuted },
            ]}
          >
            <Ionicons
              name={
                mode === "dark"
                  ? "moon"
                  : mode === "light"
                    ? "sunny"
                    : "contrast-outline"
              }
              size={25}
              color={colors.primary}
            />
          </View>

          <View style={styles.heroContent}>
            <Text
              style={[
                styles.heroTitle,
                { color: colors.text },
              ]}
            >
              Your appearance
            </Text>

            <Text
              style={[
                styles.heroDescription,
                { color: colors.textSecondary },
              ]}
            >
              {mode === "system"
                ? "Currently following your device settings"
                : mode === "dark"
                  ? "A calm, darker interface"
                  : "A bright, minimal interface"}
            </Text>
          </View>

          <View
            style={[
              styles.statusDot,
              { backgroundColor: colors.primary },
            ]}
          />
        </View>

        {/* APPEARANCE OPTIONS */}

        <View style={styles.sectionHeader}>
          <View>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text },
              ]}
            >
              Appearance
            </Text>

            <Text
              style={[
                styles.sectionDescription,
                { color: colors.textMuted },
              ]}
            >
              Choose your preferred theme
            </Text>
          </View>

          <Ionicons
            name="color-palette-outline"
            size={20}
            color={colors.textMuted}
          />
        </View>

        <View
          style={[
            styles.options,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {modes.map((item, index) => {
            const selected = mode === item.value;
            const saving = savingMode === item.value;

            return (
              <React.Fragment key={item.value}>
                {index > 0 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}

                <Pressable
                  disabled={savingMode !== null}
                  onPress={() => changeTheme(item.value)}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: selected,
                    disabled: savingMode !== null,
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    selected && {
                      backgroundColor: colors.surfaceMuted,
                    },
                    pressed && {
                      opacity: 0.82,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      {
                        backgroundColor: selected
                          ? colors.background
                          : colors.surfaceMuted,
                        borderColor: selected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={21}
                      color={
                        selected
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </View>

                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionTitle,
                        { color: colors.text },
                      ]}
                    >
                      {item.label}
                    </Text>

                    <Text
                      style={[
                        styles.optionDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.description}
                    </Text>
                  </View>

                  {saving ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                    />
                  ) : (
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      {selected && (
                        <View
                          style={[
                            styles.radioInner,
                            {
                              backgroundColor: colors.primary,
                            },
                          ]}
                        />
                      )}
                    </View>
                  )}
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {/* FOOTER NOTE */}

        <View style={styles.footer}>
          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color={colors.textMuted}
          />

          <Text
            style={[
              styles.footerText,
              { color: colors.textMuted },
            ]}
          >
            Your theme preference is managed by Vīta.
          </Text>
        </View>

        <Text
          style={[
            styles.version,
            { color: colors.textMuted },
          ]}
        >
          VĪTA  ·  YOUR DAILY RECORD
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerLabel: {
    flex: 1,
    gap: 3,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  headerCaption: {
    fontSize: 12,
  },

  brandMark: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  intro: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
  },

  title: {
    fontSize: 36,
    lineHeight: 43,
    fontWeight: "300",
    letterSpacing: -1.2,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 21,
    marginTop: spacing.sm,
    maxWidth: 400,
  },

  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },

  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  heroContent: {
    flex: 1,
    gap: 5,
  },

  heroTitle: {
    fontSize: 15,
    fontWeight: "600",
  },

  heroDescription: {
    fontSize: 11,
    lineHeight: 17,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  sectionHeader: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
  },

  sectionDescription: {
    fontSize: 11,
    marginTop: 4,
  },

  options: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    overflow: "hidden",
  },

  option: {
    minHeight: 76,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },

  optionIcon: {
    width: 43,
    height: 43,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  optionContent: {
    flex: 1,
    gap: 5,
  },

  optionTitle: {
    fontSize: 13,
    fontWeight: "600",
  },

  optionDescription: {
    fontSize: 10,
    lineHeight: 15,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
  },

  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  footer: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },

  footerText: {
    fontSize: 10,
  },

  version: {
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: spacing.xxxl,
  },
});
