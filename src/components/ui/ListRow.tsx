import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../theme/ThemeProvider";
import { borderWidth, spacing } from "../../theme/spacing";
import { Text } from "./Text";

type IconName = keyof typeof Ionicons.glyphMap;

const ROW_MIN_HEIGHT = 56;
const ICON_SIZE = 20;

interface ListRowProps {
  label: string;
  description?: string;
  /** Secondary text aligned to the trailing edge. */
  value?: string;
  icon?: IconName;
  /** Makes the row pressable. Shows a chevron unless it is an option. */
  onPress?: () => void;
  /**
   * Passing a boolean turns the row into a single-choice option: it is
   * announced as a radio button and shows a checkmark when selected.
   */
  selected?: boolean;
  /** Blocks presses without changing how the row looks. */
  disabled?: boolean;
  /** Omits the divider under the final row of a group. */
  last?: boolean;
}

/**
 * A hairline-separated row. Groups of rows replace the "box full of
 * boxes" pattern: structure comes from alignment and dividers.
 */
export function ListRow({
  label,
  description,
  value,
  icon,
  onPress,
  selected,
  disabled = false,
  last = false,
}: ListRowProps) {
  const { colors } = useTheme();

  const isOption = selected !== undefined;
  const isPressable = onPress !== undefined;

  const leading = icon ? (
    <View
      style={styles.iconSlot}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ionicons
        name={icon}
        size={ICON_SIZE}
        color={selected ? colors.primary : colors.textMuted}
      />
    </View>
  ) : null;

  let trailing: React.ReactNode = null;

  if (isOption && selected) {
    trailing = (
      <View
        style={styles.trailing}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Ionicons name="checkmark" size={ICON_SIZE} color={colors.primary} />
      </View>
    );
  } else if (value) {
    trailing = (
      <Text tone="muted" style={styles.trailing}>
        {value}
      </Text>
    );
  } else if (isPressable && !isOption) {
    trailing = (
      <View
        style={styles.trailing}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    );
  }

  const content = (
    <>
      {leading}

      <View style={styles.copy}>
        <Text
          variant="bodyMedium"
          tone={isOption && !selected ? "secondary" : "primary"}
        >
          {label}
        </Text>

        {description ? (
          <Text variant="bodySmall" tone="secondary" style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>

      {trailing}
    </>
  );

  const divider = {
    borderBottomColor: colors.border,
    borderBottomWidth: last ? 0 : borderWidth.hairline,
  };

  if (!isPressable) {
    return (
      <View
        accessible
        accessibilityLabel={[label, description, value]
          .filter(Boolean)
          .join(", ")}
        style={[styles.row, divider]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={isOption ? "radio" : "button"}
      accessibilityState={
        isOption ? { checked: selected, disabled } : { disabled }
      }
      style={({ pressed }) => [
        styles.row,
        divider,
        pressed && { backgroundColor: colors.surfaceAlt },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  iconSlot: {
    width: 28,
    marginRight: spacing.md,
    alignItems: "flex-start",
  },
  copy: {
    flex: 1,
  },
  description: {
    marginTop: 2,
  },
  trailing: {
    marginLeft: spacing.md,
  },
});