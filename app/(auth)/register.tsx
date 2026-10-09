
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState } from "react";
import {
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
import { useTransitionNavigate } from "../../src/components/navigation/Transitionprovider";
import { Button } from "../../src/components/ui/Button";
import { TextField } from "../../src/components/ui/TextField";
import { TextLink } from "../../src/components/ui/TextLink";
import { BrandLogo } from "../../src/theme/Brandlogo";
import { useTheme } from "../../src/theme/ThemeProvider";
import { spacing } from "../../src/theme/spacing";

type FormField = "fullName" | "email" | "password" | "confirmPassword";
type FormValues = Record<FormField, string>;
type FormErrors = Partial<Record<FormField, string>>;

const MIN_PASSWORD_LENGTH = 8;
const FIELD_ORDER: FormField[] = [
  "fullName",
  "email",
  "password",
  "confirmPassword",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GREEN = "#183D32";
const GOLD = "#D6B47A";
const MINT = "#B7E6CB";

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "Enter your full name.";
  } else if (values.fullName.trim().length < 2) {
    errors.fullName = "Name must be at least 2 characters.";
  }

  if (!values.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Enter a password.";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export default function RegisterScreen() {
  const { colors, resolvedMode } = useTheme();
  const insets = useSafeAreaInsets();
  const go = useTransitionNavigate();
  const dark = resolvedMode === "dark";

  const bg = dark ? colors.background : "#F7F4EC";
  const ink = dark ? "#F4F1E8" : "#10241D";
  const soft = dark ? "#A9B5AE" : "#4C5E56";
  const accent = dark ? MINT : GREEN;
  const line = dark
    ? "rgba(247,244,236,0.16)"
    : "rgba(24,61,50,0.18)";

  const [values, setValues] = useState<FormValues>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<FormField, boolean>>({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const fullNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const inputRefs = {
    fullName: fullNameRef,
    email: emailRef,
    password: passwordRef,
    confirmPassword: confirmPasswordRef,
  };

  const errors = useMemo(() => validate(values), [values]);

  const visibleError = (field: FormField) =>
    touched[field] || hasSubmitted ? errors[field] : undefined;

  const completed = FIELD_ORDER.filter(
    (field) => values[field] && !errors[field],
  ).length;

  const markTouched = useCallback((field: FormField) => {
    setTouched((previous) => ({ ...previous, [field]: true }));
  }, []);

  const updateField = useCallback((field: FormField, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setFormError(undefined);
    setStatusMessage(undefined);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setHasSubmitted(true);
    setFormError(undefined);
    setStatusMessage(undefined);

    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);

    if (firstInvalid) {
      inputRefs[firstInvalid].current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          data: {
            full_name: values.fullName.trim(),
          },
        },
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data.session) {
        // AuthGate will also observe the session change.
        go("/(tabs)");
      } else {
        setStatusMessage(
          "Account created. Check your email to confirm your account before signing in.",
        );
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [errors, go, isSubmitting, values]);

  const handleBack = useCallback(
    () => go("/(auth)/welcome"),
    [go],
  );

  const handleSignIn = useCallback(
    () => go("/(auth)/login"),
    [go],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          { backgroundColor: MINT, opacity: dark ? 0.06 : 0.3 },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.glowGold,
          { backgroundColor: GOLD, opacity: dark ? 0.04 : 0.15 },
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
          entering={FadeIn.duration(450)}
          style={styles.topBar}
        >
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back to welcome"
            hitSlop={12}
            style={[styles.back, { borderColor: line }]}
          >
            <Ionicons name="chevron-back" size={20} color={ink} />
          </Pressable>

          <BrandLogo height={30} />

          <Text style={[styles.step, { color: soft }]}>01 / 02</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(600)}
          style={styles.intro}
        >

          <Text
            accessibilityRole="header"
            style={[styles.title, { color: ink }]}
          >
            Make room{"\n"}for{" "}
            <Text style={[styles.titleAccent, { color: accent }]}>
              better.
            </Text>
          </Text>

          <Text style={[styles.subtitle, { color: soft }]}>
            Create your personal space to understand your health, one day at a
            time.
          </Text>

          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`${completed} of ${FIELD_ORDER.length} details complete`}
            style={styles.progress}
          >
            {FIELD_ORDER.map((field, index) => (
              <View
                key={field}
                style={[
                  styles.progressSegment,
                  { backgroundColor: index < completed ? GOLD : line },
                ]}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(600)}
          style={styles.form}
        >
          <TextField
            label="Full name"
            inputRef={fullNameRef}
            value={values.fullName}
            onChangeText={(value) => updateField("fullName", value)}
            onBlur={() => markTouched("fullName")}
            error={visibleError("fullName")}
            placeholder="Your full name"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          <TextField
            label="Email address"
            inputRef={emailRef}
            value={values.email}
            onChangeText={(value) => updateField("email", value)}
            onBlur={() => markTouched("email")}
            error={visibleError("email")}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <TextField
            label="Password"
            inputRef={passwordRef}
            value={values.password}
            onChangeText={(value) => updateField("password", value)}
            onBlur={() => markTouched("password")}
            error={visibleError("password")}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
            placeholder="Create a strong password"
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            action={{
              label: passwordVisible ? "Hide" : "Show",
              accessibilityLabel: passwordVisible
                ? "Hide passwords"
                : "Show passwords",
              onPress: () => setPasswordVisible((previous) => !previous),
            }}
          />

          <TextField
            label="Confirm password"
            inputRef={confirmPasswordRef}
            value={values.confirmPassword}
            onChangeText={(value) => updateField("confirmPassword", value)}
            onBlur={() => markTouched("confirmPassword")}
            error={visibleError("confirmPassword")}
            placeholder="Enter your password again"
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          {formError ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.message, { color: colors.red }]}
            >
              {formError}
            </Text>
          ) : null}

          {statusMessage ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.message, { color: accent }]}
            >
              {statusMessage}
            </Text>
          ) : null}

          <Button
            label={isSubmitting ? "Creating your space…" : "Create my account"}
            onPress={handleSubmit}
            loading={isSubmitting}
          />

          <View style={styles.note}>
            <Ionicons name="lock-closed-outline" size={14} color={accent} />
            <Text style={[styles.noteText, { color: soft }]}>
              Your health data deserves care and respect.
            </Text>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <TextLink
            prompt="Already part of Vīta?"
            actionLabel="Sign in"
            onPress={handleSignIn}
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
    right: -130,
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  glowGold: {
    position: "absolute",
    bottom: -160,
    left: -140,
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
    marginBottom: spacing.xxl,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  step: {
    width: 45,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  intro: { marginBottom: spacing.xxl },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.lg,
  },
  eyebrowLine: { width: 24, height: 2 },
  eyebrowText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "600",
    letterSpacing: -2.2,
  },
  titleAccent: {
    fontFamily: Platform.select({ ios: "Georgia", default: "serif" }),
    fontStyle: "italic",
    fontWeight: "400",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.md,
    maxWidth: 320,
  },
  progress: {
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.xl,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  form: { gap: spacing.lg },
  message: { fontSize: 13, lineHeight: 19 },
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
