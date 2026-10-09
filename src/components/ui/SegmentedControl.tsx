import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  /** `null` means nothing is selected yet. */
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

/**
 * Neutral by design: the accent color is reserved for primary actions and
 * positive states, so choosing an option doesn't compete with "Continue".
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors, resolvedMode } = useTheme();
  const isDark = resolvedMode === "dark";

  // Cards are white on a gray canvas in light mode, so the track must be the
  // darker step and the raised segment white. In dark mode it is the reverse.
  const trackBackground = isDark ? colors.surfaceAlt : colors.surfaceMuted;
  const selectedBackground = isDark ? colors.surfaceMuted : colors.white;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: trackBackground }]}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: isSelected, selected: isSelected }}
            style={({ pressed }) => [
              styles.segment,
              isSelected && { backgroundColor: selectedBackground },
              !isSelected && pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                typography.body,
                {
                  color: isSelected ? colors.ink : colors.inkSoft,
                  fontWeight: isSelected ? "600" : "400",
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: 3,
    borderRadius: radius.pill,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});