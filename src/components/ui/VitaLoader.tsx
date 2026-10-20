import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { spacing } from "../../theme/spacing";
import { RotatingVitaRing } from "./RotatingVitaRing";
import { Text } from "./Text";

const BOX = 200;

function useReveal(delay: number) {
  const v = useSharedValue(0);

  useEffect(() => {
    v.value = withDelay(
      delay,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }),
    );
    return () => cancelAnimation(v);
  }, [v, delay]);

  return useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * 14 }],
  }));
}

/** Vita brand loader: three orbiting activity rings, a self-drawing V, wordmark and tagline. */
export function VitaLoader() {
  const word = useReveal(600);
  const tag = useReveal(850);

  return (
    <View
      style={styles.center}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading Vita"
    >
      <View style={styles.box}>
        <RotatingVitaRing size={BOX} />
      </View>

      <Animated.View style={word}>
        <Text variant="display" style={styles.word}>
          Vita
        </Text>
      </Animated.View>
      <Animated.View style={tag}>
        <Text variant="label" tone="muted">
          A daily record
        </Text>
      </Animated.View>
    </View>
  );
}

export default VitaLoader;

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  box: { width: BOX, height: BOX, marginBottom: spacing.xl },
  word: { letterSpacing: 3, marginBottom: spacing.xs },
});