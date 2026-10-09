
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../../src/lib/supabase";
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
    line: dark
      ? "rgba(247,244,236,0.16)"
      : "rgba(24,61,50,0.18)",
  };
}

export default function LoginScreen() {
  const b = useBrand();
  const insets = useSafeAreaInsets();
  const go = useTransitionNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState<string | undefined>();

  const emailError =
    emailTouched && !email.trim()
      ? "Enter your email address."
      : emailTouched && !EMAIL_PATTERN.test(email.trim())
        ? "Enter a valid email address."
        : undefined;

  const passwordError =
    passwordTouched && !password
      ? "Enter your password."
      : undefined;

  const handleBack = useCallback(
    () => go("/(auth)/welcome"),
    [go],
  );

  const handleRegister = useCallback(
    () => go("/(auth)/register"),
    [go],
  );

  const handleForgotPassword = useCallback(async () => {
    setFormError(undefined);
    setStatusMessage(undefined);

    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailTouched(true);
      setFormError("Enter your email address first.");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
      );

      if (error) {
        setFormError(error.message);
        return;
      }

      setStatusMessage(
        "If an account exists for this email, a password reset link will be sent.",
      );
    } catch {
      setFormError("Unable to request a reset link. Please try again.");
    }
  }, [email]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setEmailTouched(true);
    setPasswordTouched(true);
    setFormError(undefined);
    setStatusMessage(undefined);

    if (!EMAIL_PATTERN.test(email.trim()) || !password) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setFormError(
          error.message === "Invalid login credentials"
            ? "Email or password is incorrect."
            : error.message,
        );
        return;
      }

      // AuthGate listens for the session and redirects to /(tabs).
    } catch {
      setFormError("Unable to sign in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isSubmitting, password]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: b.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.topBar}
        >
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

        <Animated.View
          entering={FadeInDown.duration(650)}
          style={styles.hero}
        >
          <View style={styles.ringCorner}>
            <RotatingVitaRing size={116} />
          </View>

          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={1.2}
            style={[styles.title, { color: b.ink }]}
          >
            Good to{"\n"}
            <Text style={[styles.accent, { color: b.accent }]}>
              see you.
            </Text>
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
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setFormError(undefined);
              setStatusMessage(undefined);
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
          />

          <TextField
            label="Password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setFormError(undefined);
              setStatusMessage(undefined);
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

          <Pressable
            onPress={handleForgotPassword}
            accessibilityRole="button"
            style={styles.forgotPassword}
          >
            <Text style={[styles.forgotText, { color: b.accent }]}>
              Forgot password?
            </Text>
          </Pressable>

          {formError ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.message, { color: b.red }]}
            >
              {formError}
            </Text>
          ) : null}

          {statusMessage ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.message, { color: b.accent }]}
            >
              {statusMessage}
            </Text>
          ) : null}

          <Button
            label={isSubmitting ? "Signing in…" : "Continue to Vīta"}
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
            prompt="New to Vīta?"
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
  forgotPassword: {
    alignSelf: "flex-end",
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
  },
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
