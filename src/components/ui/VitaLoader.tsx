import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Path } from "react-native-svg";

import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme/spacing";
import { Text } from "./Text";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const BOX = 200;
const V_PATH = "M74 78 L100 128 L126 78";
const V_LEN = 116;
const ARC = 0.7; // visible share of each orbit ring

/** One orbit: draws itself in, then spins forever (negative spin = counter-clockwise). */
function OrbitRing({
  r,
  color,
  delay,
  spin,
}: {
  r: number;
  color: string;
  delay: number;
  spin: number;
}) {
  const C = 2 * Math.PI * r;
  const draw = useSharedValue(0);
  const rot = useSharedValue(0);

  useEffect(() => {
    draw.value = withDelay(delay, withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
    rot.value = withRepeat(withTiming(1, { duration: Math.abs(spin), easing: Easing.linear }), -1, false);
  }, [draw, rot, delay, spin]);

  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - ARC * draw.value) }));
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(spin < 0 ? -1 : 1) * rot.value * 360}deg` }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
      <Svg width={BOX} height={BOX}>
        <Circle cx={100} cy={100} r={r} stroke={color} strokeOpacity={0.14} strokeWidth={6} fill="none" />
        <G rotation="-90" origin="100, 100">
          <AnimatedCircle
            cx={100}
            cy={100}
            r={r}
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${C} ${C}`}
            animatedProps={arcProps}
            fill="none"
          />
        </G>
      </Svg>
    </Animated.View>
  );
}

/** The "V" draws in with a soft glow underneath, then a dot above it pulses like a heartbeat. */
function VMark() {
  const { colors } = useTheme();
  const draw = useSharedValue(0);
  const show = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    draw.value = withDelay(300, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
    show.value = withDelay(750, withTiming(1, { duration: 300 }));
    pulse.value = withDelay(900, withRepeat(withTiming(1, { duration: 650 }), -1, true));
  }, [draw, show, pulse]);

  const vProps = useAnimatedProps(() => ({ strokeDashoffset: V_LEN * (1 - draw.value) }));
  const dotProps = useAnimatedProps(() => ({ r: 4.5 + 2.5 * pulse.value, fillOpacity: show.value }));

  return (
    <Svg width={BOX} height={BOX} style={StyleSheet.absoluteFill}>
      <AnimatedPath
        d={V_PATH}
        stroke={colors.ringExercise}
        strokeOpacity={0.28}
        strokeWidth={17}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${V_LEN} ${V_LEN}`}
        animatedProps={vProps}
        fill="none"
      />
      <AnimatedPath
        d={V_PATH}
        stroke={colors.text}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${V_LEN} ${V_LEN}`}
        animatedProps={vProps}
        fill="none"
      />
      <AnimatedCircle cx={100} cy={58} fill={colors.ringMove} animatedProps={dotProps} />
    </Svg>
  );
}

function useReveal(delay: number) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
  }, [v, delay]);
  return useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * 14 }],
  }));
}

/** Vīta brand loader: three orbiting activity rings, a self-drawing V, wordmark and tagline. */
export function VitaLoader() {
  const { colors } = useTheme();
  const word = useReveal(600);
  const tag = useReveal(850);

  return (
    <View style={styles.center}>
      <View style={styles.box}>
        <OrbitRing r={88} color={colors.ringMove} delay={0} spin={5200} />
        <OrbitRing r={72} color={colors.ringExercise} delay={120} spin={-4000} />
        <OrbitRing r={56} color={colors.ringStand} delay={240} spin={3000} />
        <VMark />
      </View>

      <Animated.View style={word}>
        <Text variant="display" style={styles.word}>
          Vīta
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

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  box: { width: BOX, height: BOX, marginBottom: spacing.xl },
  word: { letterSpacing: 3, marginBottom: spacing.xs },
});