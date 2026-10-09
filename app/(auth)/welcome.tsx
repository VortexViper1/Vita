
import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import {
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTransitionNavigate } from "../../src/components/navigation/Transitionprovider";
import { RotatingVitaRing } from "../../src/components/ui/RotatingVitaRing";
import { Button } from "../../src/components/ui/Button";
import { useTheme } from "../../src/theme/ThemeProvider";
import { spacing } from "../../src/theme/spacing";

const LOGO: ImageSourcePropType | null = null;
const LOGO_ASPECT = 3;
const SERIF = Platform.select({ ios: "Georgia", default: "serif" });
const GOLD = "#D6B47A";
const MINT = "#B7E6CB";
const DEEP = "#183D32";

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
  const { height } = useWindowDimensions();

  const ringSize = Math.max(180, Math.min(270, height * 0.31));

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
        <View style={{ height: 30, width: 30 * LOGO_ASPECT }}>
          {LOGO ? (
            <Image
              source={LOGO}
              accessibilityLabel="Vīta"
              resizeMode="contain"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in to your account"
          onPress={handleSignIn}
          hitSlop={12}
          style={styles.signIn}
        >
          <Text style={[styles.signInText, { color: b.soft }]}>
            Sign in
          </Text>
          <Ionicons
            name="arrow-up-outline"
            size={14}
            color={b.ink}
            style={styles.arrow}
          />
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(650)} style={styles.hero}>
        <View style={styles.eyebrow}>
          <View style={[styles.eyebrowLine, { backgroundColor: GOLD }]} />
          <Text style={[styles.eyebrowText, { color: b.accent }]}>
            A MORE HUMAN APPROACH TO HEALTH
          </Text>
        </View>

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

      {/* Replaces the old 3D orb */}
      <View style={styles.ringStage}>
        <RotatingVitaRing size={ringSize} />
      </View>

      <Animated.View
        entering={FadeInUp.delay(250).duration(600)}
        style={[
          styles.bottom,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <Button
          label="Begin your journey"
          onPress={handleCreateAccount}
        />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={handleSignIn}
        />
        <Text style={[styles.footnote, { color: b.soft }]}>
          YOUR WELLBEING. YOUR PACE. YOUR VĪTA.
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
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.lg,
  },
  eyebrowLine: {
    width: 24,
    height: 2,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
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
    minHeight: 190,
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
