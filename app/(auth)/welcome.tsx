import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTransitionNavigate } from "../../src/components/navigation/Transitionprovider";
import { RotatingVitaRing } from "../../src/components/ui/RotatingVitaRing";
import { Button } from "../../src/components/ui/Button";
import { BrandLogo } from "../../src/theme/Brandlogo";
import { useTheme } from "../../src/theme/ThemeProvider";
import { spacing } from "../../src/theme/spacing";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });
const MINT = "#B7E6CB";
const DEEP = "#183D32";
const MAX_RING = 270;
const MIN_RING = 120;

function useBrand() {
  const { colors, resolvedMode } = useTheme();
  const dark = resolvedMode === "dark";

  return {
    dark,
    bg: dark ? colors.background : "#F7F4EC",
    ink: dark ? "#F4F1E8" : "#10241D",
    soft: dark ? "#A9B5AE" : "#4C5E56",
    accent: dark ? MINT : DEEP,
  };
}

export default function WelcomeScreen() {
  const b = useBrand();
  const insets = useSafeAreaInsets();
  const go = useTransitionNavigate();

  // Size the ring from the space that is actually left, so it can never
  // overflow into the headline or the buttons on short screens.
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);

  const onStageLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStage((previous) =>
      previous && previous.w === width && previous.h === height
        ? previous
        : { w: width, h: height },
    );
  }, []);

  const ringSize = stage
    ? Math.max(MIN_RING, Math.min(MAX_RING, stage.h - spacing.md * 2, stage.w))
    : 0;

  const handleCreateAccount = useCallback(
    () => go("/(auth)/register"),
    [go],
  );

  const handleSignIn = useCallback(
    () => go("/(auth)/login"),
    [go],
  );

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: b.bg,
          paddingTop: insets.top + spacing.sm,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: MINT,
            opacity: b.dark ? 0.06 : 0.35,
          },
        ]}
      />

      <Animated.View entering={FadeIn.duration(500)} style={styles.topBar}>
        <BrandLogo height={30} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in to your account"
          onPress={handleSignIn}
          hitSlop={12}
          style={styles.signIn}
        >
          <Text style={[styles.signInText, { color: b.soft }]}>Sign in</Text>
          <Ionicons
            name="arrow-up-outline"
            size={14}
            color={b.ink}
            style={styles.arrow}
          />
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(650)} style={styles.hero}>
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.2}
          style={[styles.headline, { color: b.ink }]}
        >
          Know your{"\n"}
          <Text style={[styles.accent, { color: b.accent }]}>body.</Text>
          {"\n"}Find your balance.
        </Text>

        <Text style={[styles.description, { color: b.soft }]}>
          A clearer picture of your daily wellbeing. Small insights, better
          habits, a healthier you.
        </Text>
      </Animated.View>

      <View style={styles.ringStage} onLayout={onStageLayout}>
        {ringSize > 0 ? <RotatingVitaRing size={ringSize} /> : null}
      </View>

      <Animated.View
        entering={FadeInUp.delay(250).duration(600)}
        style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <Button label="Begin your journey" onPress={handleCreateAccount} />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={handleSignIn}
        />
        <Text style={[styles.footnote, { color: b.soft }]}>
          YOUR WELLBEING. YOUR PACE. YOUR Vita.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -150,
    right: -130,
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  signIn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  signInText: {
    fontSize: 14,
    fontWeight: "600",
  },
  arrow: {
    transform: [{ rotate: "45deg" }],
    marginLeft: 4,
  },
  hero: {
    paddingTop: spacing.xl,
  },
  headline: {
    fontSize: 46,
    lineHeight: 50,
    fontWeight: "600",
    letterSpacing: -2.4,
  },
  accent: {
    fontFamily: SERIF,
    fontStyle: "italic",
    fontWeight: "400",
    letterSpacing: -1.5,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 310,
    marginTop: spacing.lg,
  },
  ringStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: MIN_RING + spacing.md * 2,
  },
  bottom: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  footnote: {
    textAlign: "center",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginTop: spacing.sm,
  },
});