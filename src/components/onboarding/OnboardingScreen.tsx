import { Feather } from "@expo/vector-icons";
import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export const ONBOARDING_TOTAL_STEPS = 3;

interface OnboardingScreenProps {
  /** 1-based position in the flow. */
  step: number;
  title: string;
  subtitle: string;
  onBack: () => void;
  /** Pinned below the scrolling content; usually the primary button. */
  footer: ReactNode;
  /**
   * Let children span the full screen width (e.g. hairline-divided lists).
   * Children are then responsible for their own horizontal padding.
   */
  edgeToEdge?: boolean;
  children: ReactNode;
}

export function OnboardingScreen({
  step,
  title,
  subtitle,
  onBack,
  footer,
  edgeToEdge = false,
  children,
}: OnboardingScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={22} color={colors.inkSoft} />
          <Text style={[typography.body, { color: colors.inkSoft }]}>Back</Text>
        </Pressable>

        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Setup progress"
          accessibilityValue={{
            min: 1,
            max: ONBOARDING_TOTAL_STEPS,
            now: step,
            text: `Step ${step} of ${ONBOARDING_TOTAL_STEPS}`,
          }}
          style={styles.progress}
        >
          {Array.from({ length: ONBOARDING_TOTAL_STEPS }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressSegment,
                {
                  backgroundColor:
                    index < step ? colors.green : colors.lineStrong,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={[typography.heading1, { color: colors.ink }]}
          >
            {title}
          </Text>
          <Text style={[typography.body, styles.subtitle, { color: colors.inkSoft }]}>
            {subtitle}
          </Text>
        </View>

        <View style={edgeToEdge ? undefined : styles.body}>{children}</View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        {footer}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xxl,
  },
  backButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    // Pull the chevron's visual edge onto the content margin.
    marginLeft: -spacing.xs,
  },
  progress: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  progressSegment: {
    width: 20,
    height: 4,
    borderRadius: radius.pill,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  body: {
    paddingHorizontal: spacing.xxl,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
});