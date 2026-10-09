import React, { useEffect, useRef } from "react";
import {
  Animated,
  DimensionValue,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/spacing";
import { Button } from "./Button";
import { Text } from "./Text";

interface SkeletonProps {
  width: DimensionValue;
  height: number;
  style?: StyleProp<ViewStyle>;
}

/** A quietly pulsing placeholder block. */
export function Skeleton({ width, height, style }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );

    loop.start();

    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius.sm,
          backgroundColor: colors.surfaceMuted,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Full-screen loading placeholder shaped like a typical detail screen. */
export function LoadingState() {
  return (
    <View
      accessible
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
    >
      <Skeleton width={96} height={12} />
      <Skeleton width={180} height={34} style={styles.gap} />
      <Skeleton width="70%" height={12} style={styles.gap} />
      <Skeleton width="100%" height={4} style={styles.gapLarge} />
      <Skeleton width="100%" height={120} style={styles.gapSection} />
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View>
      <Text variant="heading3" accessibilityRole="header">
        Couldn't load your data
      </Text>

      <Text tone="secondary" style={styles.errorCopy}>
        Please try again.
      </Text>

      <View style={styles.errorAction}>
        <Button label="Try again" variant="secondary" onPress={onRetry} />
      </View>
    </View>
  );
}

/** Shown when no data source is connected for a screen yet. */
export function UnavailableState({ description }: { description: string }) {
  return (
    <View>
      <Text variant="label" tone="accent">
        Coming soon
      </Text>

      <Text tone="secondary" style={styles.unavailableCopy}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    marginTop: spacing.md,
  },
  gapLarge: {
    marginTop: spacing.xl,
  },
  gapSection: {
    marginTop: spacing.section,
  },
  errorCopy: {
    marginTop: spacing.xs,
  },
  errorAction: {
    marginTop: spacing.lg,
  },
  unavailableCopy: {
    marginTop: spacing.sm,
    maxWidth: 520,
  },
});