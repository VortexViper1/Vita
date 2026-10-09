import React from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../theme/ThemeProvider";
import { borderWidth, layout, radius, spacing } from "../../theme/spacing";
import { Text } from "../ui/Text";
import { TABLET_MIN_WIDTH } from "./ResponsiveShell";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  onMenuPress: () => void;
  /** The avatar is only shown when there is somewhere for it to go. */
  onProfilePress?: () => void;
  profileInitial?: string;
}

export default function AppHeader({
  title,
  subtitle,
  onMenuPress,
  onProfilePress,
  profileInitial = "G",
}: AppHeaderProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  // On tablet/desktop, ResponsiveShell already renders a rail with its own
  // navigation, so a menu button here would be a redundant second way in.
  const showMenuButton = width < TABLET_MIN_WIDTH;

  return (
    <View style={styles.container}>
      {showMenuButton ? (
        <Pressable
          onPress={onMenuPress}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          style={({ pressed }) => [
            styles.slot,
            styles.leadingSlot,
            pressed && { backgroundColor: colors.surfaceAlt },
          ]}
        >
          <Ionicons name="menu-outline" size={24} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.slot} />
      )}

      <View style={styles.center}>
        {title ? (
          <Text
            variant="heading3"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            accessibilityRole="header"
          >
            {title}
          </Text>
        ) : null}

        {subtitle ? (
          <Text
            variant="label"
            tone="muted"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={styles.subtitle}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {onProfilePress ? (
        <Pressable
          onPress={onProfilePress}
          accessibilityRole="button"
          accessibilityLabel="Account"
          style={styles.slot}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.avatar,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceAlt : "transparent",
                },
              ]}
            >
              <Text variant="bodySmall" tone="accent" style={styles.avatarText}>
                {profileInitial}
              </Text>
            </View>
          )}
        </Pressable>
      ) : (
        <View style={styles.slot} />
      )}
    </View>
  );
}

const SLOT_SIZE = layout.minTouchTarget;

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  leadingSlot: {
    borderRadius: radius.pill,
    // Optically aligns the icon with the content edge below.
    marginLeft: -spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  subtitle: {
    marginTop: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: borderWidth.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "600",
  },
});