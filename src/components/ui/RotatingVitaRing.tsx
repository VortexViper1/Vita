import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { useTheme } from "../../theme/ThemeProvider";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// All artwork is drawn in a 200x200 space and scaled with a viewBox,
// so the ring looks identical at any `size`.
const VIEW_BOX = "0 0 200 200";
const V_PATH = "M74 78 L100 128 L126 78";
const V_LEN = 114; // real length is ~112.7
const ARC = 0.7; // visible share of each orbit ring

/**
 * Round line caps draw a dot even on a zero-length dash. That made a blob
 * flash at the start of every stroke before it began drawing. Fading the
 * stroke in over the first few percent of progress hides it.
 */
const fadeIn = (progress: number) => {
  "worklet";
  return Math.min(1, progress * 12);
};

/** One orbit: draws itself in, then spins forever (negative spin = counter-clockwise). */
function OrbitRing({
  size,
  r,
  color,
  delay,
  spin,
}: {
  size: number;
  r: number;
  color: string;
  delay: number;
  spin: number;
}) {
  const C = 2 * Math.PI * r;
  const draw = useSharedValue(0);
  const rot = useSharedValue(0);

  useEffect(() => {
    draw.value = withDelay(
      delay,
      withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }),
    );
    rot.value = withRepeat(
      withTiming(1, { duration: Math.abs(spin), easing: Easing.linear }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(draw);
      cancelAnimation(rot);
    };
  }, [draw, rot, delay, spin]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: C * (1 - ARC * draw.value),
    strokeOpacity: fadeIn(draw.value),
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(spin < 0 ? -1 : 1) * rot.value * 360}deg` }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
      <Svg width={size} height={size} viewBox={VIEW_BOX}>
        <Circle
          cx={100}
          cy={100}
          r={r}
          stroke={color}
          strokeOpacity={0.14}
          strokeWidth={6}
          fill="none"
        />
        {/* The whole ring spins, so the old -90deg start rotation was unnecessary. */}
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
      </Svg>
    </Animated.View>
  );
}

/** The "V" draws in with a soft glow underneath, then a dot above it pulses like a heartbeat. */
function VMark({ size }: { size: number }) {
  const { colors } = useTheme();
  const draw = useSharedValue(0);
  const show = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    draw.value = withDelay(
      300,
      withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }),
    );
    show.value = withDelay(750, withTiming(1, { duration: 300 }));
    pulse.value = withDelay(
      900,
      withRepeat(withTiming(1, { duration: 650 }), -1, true),
    );

    return () => {
      cancelAnimation(draw);
      cancelAnimation(show);
      cancelAnimation(pulse);
    };
  }, [draw, show, pulse]);

  const glowProps = useAnimatedProps(() => ({
    strokeDashoffset: V_LEN * (1 - draw.value),
    strokeOpacity: 0.28 * fadeIn(draw.value),
  }));

  const coreProps = useAnimatedProps(() => ({
    strokeDashoffset: V_LEN * (1 - draw.value),
    strokeOpacity: fadeIn(draw.value),
  }));

  const dotProps = useAnimatedProps(() => ({
    r: 4.5 + 2.5 * pulse.value,
    fillOpacity: show.value,
  }));

  return (
    <Svg
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      style={StyleSheet.absoluteFill}
    >
      <AnimatedPath
        d={V_PATH}
        stroke={colors.ringExercise}
        strokeWidth={17}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${V_LEN} ${V_LEN}`}
        animatedProps={glowProps}
        fill="none"
      />
      <AnimatedPath
        d={V_PATH}
        stroke={colors.text}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${V_LEN} ${V_LEN}`}
        animatedProps={coreProps}
        fill="none"
      />
      <AnimatedCircle
        cx={100}
        cy={58}
        r={4.5}
        fill={colors.ringMove}
        fillOpacity={0}
        animatedProps={dotProps}
      />
    </Svg>
  );
}

/** Three orbiting activity rings around a self-drawing V. Scales to any size. */
export function RotatingVitaRing({ size = 200 }: { size?: number }) {
  const { colors } = useTheme();

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      <OrbitRing size={size} r={88} color={colors.ringMove} delay={0} spin={5200} />
      <OrbitRing size={size} r={72} color={colors.ringExercise} delay={120} spin={-4000} />
      <OrbitRing size={size} r={56} color={colors.ringStand} delay={240} spin={3000} />
      <VMark size={size} />
    </View>
  );
}

export default RotatingVitaRing;