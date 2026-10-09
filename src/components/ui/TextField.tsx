import { Ref, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface TextFieldAction {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}

interface TextFieldProps
  extends Omit<TextInputProps, "style" | "accessibilityLabel"> {
  /** Visible label, and the accessibility label of the input. */
  label: string;
  /** Hide the visible label (it is still announced by screen readers). */
  labelHidden?: boolean;
  /** Validation message. Replaces the hint while present. */
  error?: string;
  /** Red border without a message, for when a parent group shows the message. */
  invalid?: boolean;
  /** Supporting text shown below the input when there is no error. */
  hint?: string;
  /** Unit shown inside the field after the value, e.g. "cm". */
  suffix?: string;
  /** Optional text action aligned with the label (e.g. Show / Hide). */
  action?: TextFieldAction;
  inputRef?: Ref<TextInput>;
}

export function TextField({
  label,
  labelHidden = false,
  error,
  invalid = false,
  hint,
  suffix,
  action,
  inputRef,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const hasError = Boolean(error) || invalid;
  const borderColor = hasError
    ? colors.red
    : isFocused
      ? colors.green
      : colors.border;

  return (
    <View style={styles.field}>
      {labelHidden ? null : (
        <View style={styles.labelRow}>
          <Text
            style={[
              typography.bodySmall,
              styles.label,
              { color: colors.inkSoft },
            ]}
          >
            {label}
          </Text>
          {action ? (
            <Pressable
              onPress={action.onPress}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
            >
              <Text style={[typography.bodySmall, { color: colors.green }]}>
                {action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <View
        style={[
          styles.control,
          { backgroundColor: colors.surface, borderColor },
        ]}
      >
        <TextInput
          ref={inputRef}
          {...inputProps}
          accessibilityLabel={suffix ? `${label} (${suffix})` : label}
          placeholderTextColor={colors.textMuted}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          style={[typography.body, styles.input, { color: colors.ink }]}
        />
        {suffix ? (
          <Text
            accessible={false}
            importantForAccessibility="no"
            style={[typography.body, styles.suffix, { color: colors.textMuted }]}
          >
            {suffix}
          </Text>
        ) : null}
      </View>

      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[typography.bodySmall, { color: colors.red }]}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text style={[typography.bodySmall, { color: colors.textMuted }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontWeight: "500",
  },
  control: {
    // minHeight (not height) so the field grows with larger system text.
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
  },
  suffix: {
    marginLeft: spacing.sm,
  },
}); 