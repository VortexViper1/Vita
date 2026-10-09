import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";

import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/spacing";
import { Text } from "../ui/Text";
import type { NavItem } from "./navItems";

interface NavRowProps {
  item: NavItem;
  active: boolean;
  onPress: (route: Href) => void;
}

/** One destination: icon and label. Used by the drawer and the desktop rail. */
export function NavRow({ item, active, onPress }: NavRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(item.route)}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed
            ? colors.surfaceMuted
            : active
              ? colors.surfaceAlt
              : "transparent",
        },
      ]}
    >
      <View
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Ionicons
          name={item.icon}
          size={20}
          color={active ? colors.primary : colors.textSecondary}
        />
      </View>

      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        tone={active ? "primary" : "secondary"}
        style={{ fontWeight: active ? "600" : "400" }}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  icon: {
    width: 28,
    marginRight: spacing.sm,
    alignItems: "flex-start",
  },
});