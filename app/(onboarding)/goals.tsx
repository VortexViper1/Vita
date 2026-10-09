import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTransitionNavigate } from "../../src/components/navigation/Transitionprovider";
import { OnboardingScreen } from "../../src/components/onboarding/OnboardingScreen";
import { Button } from "../../src/components/ui/Button";
import { useTheme } from "../../src/theme/ThemeProvider";
import { borderWidth, radius, spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

interface GoalOption {
  id: string;
  label: string;
  description: string;
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: "move-more",
    label: "Move more",
    description: "Build a consistent activity habit.",
  },
  {
    id: "sleep-better",
    label: "Sleep better",
    description: "Improve sleep duration and consistency.",
  },
  {
    id: "build-strength",
    label: "Build strength",
    description: "Track training and recovery.",
  },
  {
    id: "manage-weight",
    label: "Manage weight",
    description: "Monitor trends over time, not just a number.",
  },
  {
    id: "general-wellness",
    label: "General wellness",
    description: "A balanced view across all metrics.",
  },
];

const CURRENT_STEP = 2;

export default function GoalsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const go = useTransitionNavigate();
  const handleSelect = useCallback((goalId: string) => {
    setSelectedGoalId(goalId);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleContinue = useCallback(() => {
    if (!selectedGoalId) {
      return;
    }
    // Note: the selected goal is not persisted anywhere yet.
    go("/permissions");
  }, [router, selectedGoalId]);

  return (
    <OnboardingScreen
      step={CURRENT_STEP}
      title="What matters most right now?"
      subtitle="Choose one focus. You can change this later in settings."
      onBack={handleBack}
      edgeToEdge
      footer={
        <Button
          label="Continue"
          onPress={handleContinue}
          disabled={!selectedGoalId}
        />
      }
    >
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Health focus"
        style={[styles.list, { borderTopColor: colors.line }]}
      >
        {GOAL_OPTIONS.map((goal) => {
          const isSelected = goal.id === selectedGoalId;

          return (
            <Pressable
              key={goal.id}
              onPress={() => handleSelect(goal.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, selected: isSelected }}
              accessibilityLabel={goal.label}
              accessibilityHint={goal.description}
              style={({ pressed }) => [
                styles.row,
                {
                  borderBottomColor: colors.line,
                  backgroundColor: pressed ? colors.surfaceAlt : "transparent",
                },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={[typography.heading3, { color: colors.ink }]}>
                  {goal.label}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.inkSoft }]}>
                  {goal.description}
                </Text>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  {
                    borderColor: isSelected ? colors.green : colors.borderStrong,
                  },
                ]}
              >
                {isSelected ? (
                  <View
                    style={[styles.radioInner, { backgroundColor: colors.green }]}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    borderTopWidth: borderWidth.hairline,
  },
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderBottomWidth: borderWidth.hairline,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
  },
});