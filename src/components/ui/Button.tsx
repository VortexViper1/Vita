import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

/**
 * primary   – the one main action on a screen (filled accent pill)
 * secondary – tinted pill, for a clear alternative
 * ghost     – text only, for low-emphasis actions like "Skip for now"
 */
type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Dims the button and blocks presses. */
  disabled?: boolean;
  /** Shows a spinner and blocks presses without dimming. */
  loading?: boolean;
  /** Explains why a button is unavailable or what it will do. */
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  accessibilityHint,
}: ButtonProps) {
  const { colors, resolvedMode } = useTheme();

  const isInert = disabled || loading;

  // Deeper green in light mode (white text), lighter green in dark mode
  // (dark text reads better on it).
  const onAccent = resolvedMode === "dark" ? colors.background : colors.white;

  const textColor =
    variant === "primary"
      ? onAccent
      : variant === "ghost"
        ? colors.textSecondary
        : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInert}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInert, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && {
          backgroundColor: pressed ? colors.greenStrong : colors.primary,
        },
        variant === "secondary" && {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surfaceAlt,
        },
        variant === "ghost" && {
          backgroundColor: pressed ? colors.surfaceAlt : "transparent",
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={textColor} /> : null}
      <Text style={[typography.heading3, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.5,
  },
});