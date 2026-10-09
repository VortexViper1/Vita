import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export default function SectionHeader({
  title,
  action,
  onActionPress,
}: {
  title: string;
  /** Text shown on the right, e.g. "See all". */
  action?: string;
  /**
   * Makes the action tappable. Without it the action renders as plain,
   * muted text, so nothing looks tappable that isn't.
   */
  onActionPress?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text
        accessibilityRole="header"
        style={[typography.heading3, { color: colors.ink }]}
      >
        {title}
      </Text>

      {action ? (
        onActionPress ? (
          <Pressable
            onPress={onActionPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`${action}, ${title}`}
            style={styles.action}
          >
            <Text
              style={[
                typography.bodySmall,
                styles.actionText,
                { color: colors.green },
              ]}
            >
              {action}
            </Text>
          </Pressable>
        ) : (
          <Text style={[typography.bodySmall, { color: colors.inkSoft }]}>
            {action}
          </Text>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  action: {
    minHeight: 44,
    justifyContent: "center",
  },
  actionText: {
    fontWeight: "500",
  },
});