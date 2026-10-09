import React from "react";
import { Pressable, StyleSheet, View, ViewProps } from "react-native";

import { spacing } from "../../theme/spacing";
import { Text } from "./Text";

interface SectionAction {
  label: string;
  onPress: () => void;
}

interface SectionProps extends ViewProps {
  title: string;
  description?: string;
  /** A tappable link on the trailing edge, e.g. "Details". */
  action?: SectionAction;
}

/**
 * A titled group of content. Sections are separated by whitespace and type,
 * not by boxes.
 */
export function Section({
  title,
  description,
  action,
  children,
  style,
  ...props
}: SectionProps) {
  return (
    <View {...props} style={[styles.section, style]}>
      <View style={[styles.header, action ? styles.headerWithAction : null]}>
        <Text variant="heading3" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>

        {action ? (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${action.label}, ${title}`}
            style={styles.action}
          >
            <Text variant="bodySmall" tone="accent" style={styles.actionText}>
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {description ? (
        <Text variant="bodySmall" tone="secondary" style={styles.description}>
          {description}
        </Text>
      ) : null}

      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.section,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerWithAction: {
    minHeight: 44,
  },
  title: {
    flex: 1,
  },
  action: {
    minHeight: 44,
    justifyContent: "center",
    paddingLeft: spacing.md,
  },
  actionText: {
    fontWeight: "500",
  },
  description: {
    marginTop: spacing.xs,
  },
  body: {
    marginTop: spacing.md,
  },
});