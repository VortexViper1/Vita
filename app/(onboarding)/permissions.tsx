import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { OnboardingScreen } from "../../src/components/onboarding/OnboardingScreen";
import { Button } from "../../src/components/ui/Button";
import { useTheme } from "../../src/theme/ThemeProvider";
import { borderWidth, radius, spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

type ConnectionStatus = "idle" | "unavailable";

const CURRENT_STEP = 3;

const PLATFORM_LABEL = Platform.OS === "ios" ? "Apple Health" : "Health Connect";
const PLATFORM_DESCRIPTION =
  Platform.OS === "ios"
    ? "Sync steps, sleep, heart rate, and workouts from Apple Health."
    : "Sync steps, sleep, heart rate, and workouts from Health Connect.";

export default function PermissionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [status, setStatus] = useState<ConnectionStatus>("idle");

  const isUnavailable = status === "unavailable";

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleConnect = useCallback(() => {
    // Health Connect / HealthKit integration is not wired up yet.
    // Intentionally not requesting or simulating a real permission grant.
    setStatus("unavailable");
  }, []);

  const handleContinue = useCallback(() => {
    router.replace("/");
  }, [router]);

  const statusLabel = isUnavailable ? "Not available yet" : "Not connected";

  return (
    <OnboardingScreen
      step={CURRENT_STEP}
      title="Connect your health data"
      subtitle="Grant access to see real metrics. You can connect this later from settings if you skip for now."
      onBack={handleBack}
      footer={
        isUnavailable ? (
          <Button label="Continue" onPress={handleContinue} />
        ) : (
          <>
            <Button
              label={`Connect ${PLATFORM_LABEL}`}
              onPress={handleConnect}
            />
            <Button
              label="Skip for now"
              onPress={handleContinue}
            />
          </>
        )
      }
    >
      <View
        style={[
          styles.source,
          {
            borderTopColor: colors.line,
            borderBottomColor: colors.line,
          },
        ]}
      >
        <Text style={[typography.heading2, { color: colors.ink }]}>
          {PLATFORM_LABEL}
        </Text>
        <Text style={[typography.body, { color: colors.inkSoft }]}>
          {PLATFORM_DESCRIPTION}
        </Text>

        <View
          accessible
          accessibilityLabel={`Status: ${statusLabel}`}
          style={styles.statusRow}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isUnavailable ? colors.amber : colors.inkMuted },
            ]}
          />
          <Text style={[typography.bodySmall, { color: colors.inkSoft }]}>
            {statusLabel}
          </Text>
        </View>

        {isUnavailable ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[typography.bodySmall, { color: colors.inkSoft }]}
          >
            {PLATFORM_LABEL} integration is coming in a future update. You can
            continue without it for now.
          </Text>
        ) : null}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  source: {
    borderTopWidth: borderWidth.hairline,
    borderBottomWidth: borderWidth.hairline,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
});