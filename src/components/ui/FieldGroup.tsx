import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface FieldGroupProps {
  label: string;
  /** One message for the whole group (e.g. a date made of three inputs). */
  error?: string;
  children: ReactNode;
}

/**
 * Label and error wrapper for controls that aren't a single text input:
 * segmented controls, or several inputs that form one value.
 */
export function FieldGroup({ label, error, children }: FieldGroupProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.group}>
      <Text style={[typography.bodySmall, styles.label, { color: colors.inkSoft }]}>
        {label}
      </Text>
      {children}
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[typography.bodySmall, { color: colors.red }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  label: {
    fontWeight: "500",
  },
});