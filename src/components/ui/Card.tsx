import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { borderWidth, radius, spacing } from "../../theme/spacing";

/**
 * Large rounded surface (Fitness / OriginOS). The edge is defined by the
 * surface step against the canvas plus a barely-there hairline, so cards
 * stay quiet in both themes.
 */
export default function Card({ children, style, ...props }: ViewProps) {
  const { colors } = useTheme();

  return (
    <View
      {...props}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    padding: spacing.xl,
  },
});