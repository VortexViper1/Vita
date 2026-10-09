import React from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../theme/ThemeProvider";
import { layout, spacing } from "../../theme/spacing";

interface ScreenProps {
  /** Fixed above the scrolling content so navigation stays reachable. */
  header?: React.ReactNode;
  /** Rendered first inside the safe area (e.g. a drawer). */
  overlay?: React.ReactNode;
  /** Passing `onRefresh` enables pull-to-refresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}

/**
 * Shared screen scaffold: safe area, fixed header, scrolling content, and a
 * readable max width on tablets and web.
 */
export function Screen({
  header,
  overlay,
  refreshing = false,
  onRefresh,
  children,
}: ScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      {overlay}

      {header ? (
        <View style={[styles.column, styles.header]}>{header}</View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textMuted}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surfaceAlt}
            />
          ) : undefined
        }
      >
        <View style={styles.column}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  column: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
  },
  header: {
    paddingTop: spacing.sm,
  },
  scrollContent: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.section,
  },
});