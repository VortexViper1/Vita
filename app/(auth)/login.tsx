import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../../src/lib/supabase";
import { useKeyboardVisible } from "../../src/hooks/Usekeyboardvisible";
import { useTransitionNavigate } from "../../src/components/navigation/Transitionprovider";
import { RotatingVitaRing } from "../../src/components/ui/RotatingVitaRing";
import { Button } from "../../src/components/ui/Button";
import { TextField } from "../../src/components/ui/TextField";
import { TextLink } from "../../src/components/ui/TextLink";
import { BrandLogo } from "../../src/theme/Brandlogo";
import { useTheme } from "../../src/theme/ThemeProvider";
import { spacing } from "../../src/theme/spacing";

const SERIF = Platform.select({ ios: "Georgia", default: "serif" });
const MINT = "#B7E6CB";
const DEEP = "#183D32";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function useBrand() {
  const { colors, resolvedMode } = useTheme();
  const dark = resolvedMode === "dark";

  return {
    dark,
    red: colors.red,
    bg: dark ? colors.background : "#F7F4EC",
    ink: dark ? "#F4F1E8" : "#10241D",
    soft: dark ? "#A9B5AE" : "#4C5E56",
    accent: dark ? MINT : DEEP,
    line: dark ? "rgba(247,244,236,0.16)" : "rgba(24,61,50,0.18)",
  };
}

export default function LoginScreen() {
  const b = useBrand();
  const insets = useSafeAreaInsets();
  const go = useTransitionNavigate();
  const keyboardVisible = useKeyboardVisible();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const emailError = !emailTouched
    ? undefined
    : !email.trim()
      ? "Enter your email address."
      : !EMAIL_PATTERN.test(email.trim())
        ? "Enter a valid email address."
        : undefined;

  const passwordError =
    passwordTouched && !password ? "Enter your password." : undefined;

  const handleBack = useCallback(() => go("/(auth)/welcome"), [go]);
  const handleRegister = useCallback(() => go("/(auth)/register"), [go]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setEmailTouched(true);
    setPasswordTouched(true);
    setFormError(undefined);

    if (!EMAIL_PATTERN.test(email.trim())) {
      emailRef.current?.focus();
      return;
    }
    if (!password) {
      passwordRef.current?.focus();
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          setFormError("Email or password is incorrect.");
        } else if (error.message === "Email not confirmed") {
          setFormError("Please confirm your email before signing in.");
        } else {
          setFormError(error.message);
        }
        return;
      }

      // Show Vita's transition splash, then open the dashboard.
      go("/(tabs)");
    } catch {
      setFormError("Unable to sign in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, go, isSubmitting, password]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: b.bg }]}
      // "padding" on both platforms: Android is edge-to-edge on current Expo
      // SDKs, so the OS no longer resizes the window for the keyboard.
      behavior="padding"
    >
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          { backgroundColor: MINT, opacity: b.dark ? 0.06 : 0.35 },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.md,
            // The keyboard already covers the bottom inset while open.
            paddingBottom: keyboardVisible
              ? spacing.xl
              : insets.bottom + spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.topBar}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back to welcome"
            hitSlop={12}
            style={[styles.back, { borderColor: b.line }]}
          >
            <Ionicons name="chevron-back" size={20} color={b.ink} />
          </Pressable>

          <BrandLogo height={30} />

          <View style={styles.backSpacer} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(650)} style={styles.hero}>
          <View pointerEvents="none" style={styles.ringCorner}>
            <RotatingVitaRing size={116} />
          </View>

          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={1.2}
            style={[styles.title, { color: b.ink }]}
          >
            Good to{"\n"}
            <Text style={[styles.accent, { color: b.accent }]}>see you.</Text>
          </Text>

          <Text style={[styles.subtitle, { color: b.soft }]}>
            Pick up where you left off. Your wellbeing journey is waiting.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150).duration(650)}
          style={styles.form}
        >
          <TextField
            label="Email address"
            inputRef={emailRef}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setFormError(undefined);
            }}
            onBlur={() => setEmailTouched(true)}
            error={emailError}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <TextField
            label="Password"
            inputRef={passwordRef}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setFormError(undefined);
            }}
            onBlur={() => setPasswordTouched(true)}
            error={passwordError}
            placeholder="Enter your password"
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            action={{
              label: passwordVisible ? "Hide" : "Show",
              accessibilityLabel: passwordVisible
                ? "Hide password"
                : "Show password",
              onPress: () => setPasswordVisible((previous) => !previous),
            }}
          />

          {formError ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.message, { color: b.red }]}
            >
              {formError}
            </Text>
          ) : null}

          <Button
            label={isSubmitting ? "Signing in…" : "Continue to Vita"}
            onPress={handleSubmit}
            loading={isSubmitting}
          />

          <View style={styles.note}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={b.accent}
            />
            <Text style={[styles.noteText, { color: b.soft }]}>
              Your health journey stays personal.
            </Text>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <TextLink
            prompt="New to Vita?"
            actionLabel="Create an account"
            onPress={handleRegister}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  glow: {
    position: "absolute",
    top: -140,
    left: -120,
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    marginBottom: spacing.xl,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backSpacer: { width: 40, height: 40 },
  hero: {
    marginBottom: spacing.xxxl,
  },
  ringCorner: {
    position: "absolute",
    right: -24,
    top: -18,
  },
  title: {
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
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.md,
    maxWidth: 300,
  },
  form: { gap: spacing.lg },
  message: {
    fontSize: 13,
    lineHeight: 19,
  },
  note: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  noteText: { fontSize: 12 },
  footer: {
    alignItems: "center",
    marginTop: spacing.xxl,
  },
});