import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";

import { BrandLogo } from "../../theme/Brandlogo";
import { spacing } from "../../theme/spacing";
import { Text } from "../ui/Text";
import { useSplashTheme, type SplashTheme } from "./Splashtheme";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* ----------------------------- timeline (ms) ----------------------------- */
const EXIT_AT = 3000;
const EXIT_AT_REDUCED = 900;
const EXIT_DURATION = 450;

/* -------------------------------- artwork -------------------------------- */
const HEART_PATH =
  "M100 168 C40 124 22 92 22 64 C22 40 40 24 62 24 C80 24 94 34 100 48 C106 34 120 24 138 24 C160 24 178 40 178 64 C178 92 160 124 100 168 Z";
const HEART_LEN = 500; // real length is ~480; slight overestimate is safe

const ECG_PATH =
  "M6 100 L52 100 L64 100 L74 82 L84 118 L96 40 L108 150 L120 92 L128 100 L194 100";
const ECG_LEN = 445; // real length is ~442
const ECG_WIN = 120; // visible length of the travelling ECG trace
const ECG_SWEEPS = 2;
const ECG_SWEEP_MS = 1000;
// Where the trace's leading edge hits the R spike and the smaller second beat,
// as a fraction of one sweep. The heart pulse is derived from these.
const BEAT_1 = 195 / (ECG_LEN + ECG_WIN);
const BEAT_2 = 305 / (ECG_LEN + ECG_WIN);

/**
 * Round line caps draw a dot even on a zero-length stroke, so every stroke
 * fades in over its first few percent of progress.
 */
const ramp = (progress: number) => {
  "worklet";
  return Math.min(1, progress * 12);
};

function useReveal(delay: number, reduce: boolean) {
  const v = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) {
      v.value = 1;
      return;
    }
    v.value = withDelay(
      delay,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    return () => cancelAnimation(v);
  }, [v, delay, reduce]);

  return useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * 12 }],
  }));
}

/* ------------------------- heart + ECG + soft glow ------------------------ */
function HeartPulse({
  size,
  theme,
  reduce,
}: {
  size: number;
  theme: SplashTheme;
  reduce: boolean;
}) {
  const draw = useSharedValue(reduce ? 1 : 0);
  const fill = useSharedValue(reduce ? 1 : 0);
  const ecg = useSharedValue(0);

  useEffect(() => {
    if (reduce) {
      draw.value = 1;
      fill.value = 1;
      return;
    }
    draw.value = withDelay(
      150,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
    fill.value = withDelay(900, withTiming(1, { duration: 500 }));
    ecg.value = withDelay(
      800,
      withRepeat(
        withTiming(1, { duration: ECG_SWEEP_MS, easing: Easing.linear }),
        ECG_SWEEPS,
        false,
      ),
    );

    return () => {
      cancelAnimation(draw);
      cancelAnimation(fill);
      cancelAnimation(ecg);
    };
  }, [draw, fill, ecg, reduce]);

  // "lub-dub": driven by the same value as the ECG trace, so they stay in sync.
  const pulse = useDerivedValue(() => {
    const a = (ecg.value - BEAT_1) / 0.045;
    const b = (ecg.value - BEAT_2) / 0.045;
    return Math.exp(-a * a) + 0.4 * Math.exp(-b * b);
  });

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.07 * pulse.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: fill.value * (0.45 + 0.55 * Math.min(1, pulse.value)),
    transform: [{ scale: 1 + 0.1 * pulse.value }],
  }));

  const fillProps = useAnimatedProps(() => ({
    fillOpacity: 0.1 * fill.value,
  }));

  const heartGlowProps = useAnimatedProps(() => ({
    strokeDashoffset: HEART_LEN * (1 - draw.value),
    strokeOpacity: 0.22 * ramp(draw.value),
  }));

  const heartCoreProps = useAnimatedProps(() => ({
    strokeDashoffset: HEART_LEN * (1 - draw.value),
    strokeOpacity: ramp(draw.value),
  }));

  const ecgGlowProps = useAnimatedProps(() => {
    const p = ecg.value;
    return {
      strokeDashoffset: ECG_WIN - p * (ECG_LEN + ECG_WIN),
      strokeOpacity: 0.25 * Math.min(1, p * 14, (1 - p) * 14),
    };
  });

  const ecgCoreProps = useAnimatedProps(() => {
    const p = ecg.value;
    return {
      strokeDashoffset: ECG_WIN - p * (ECG_LEN + ECG_WIN),
      strokeOpacity: Math.min(1, p * 14, (1 - p) * 14),
    };
  });

  const heartH = size * 0.95;

  return (
    <View style={styles.center} pointerEvents="none">
      <Animated.View style={[{ width: size * 1.5, height: size * 1.5 }, glowStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="vitaGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={theme.mint} stopOpacity={0.5} />
              <Stop offset="1" stopColor={theme.mint} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={50} r={50} fill="url(#vitaGlow)" />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, styles.center, heartStyle]}>
        <Svg width={size} height={heartH} viewBox="0 0 200 190">
          <AnimatedPath
            d={HEART_PATH}
            fill={theme.heartbeat}
            stroke="none"
            animatedProps={fillProps}
          />
          <AnimatedPath
            d={HEART_PATH}
            stroke={theme.mint}
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${HEART_LEN} ${HEART_LEN}`}
            animatedProps={heartGlowProps}
            fill="none"
          />
          <AnimatedPath
            d={HEART_PATH}
            stroke={theme.heartbeat}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${HEART_LEN} ${HEART_LEN}`}
            animatedProps={heartCoreProps}
            fill="none"
          />

          <AnimatedPath
            d={ECG_PATH}
            stroke={theme.amber}
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${ECG_WIN} ${ECG_LEN + ECG_WIN}`}
            animatedProps={ecgGlowProps}
            fill="none"
          />
          <AnimatedPath
            d={ECG_PATH}
            stroke={theme.amber}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${ECG_WIN} ${ECG_LEN + ECG_WIN}`}
            animatedProps={ecgCoreProps}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

/* ------------------------------ scanner rings ----------------------------- */
function ScannerRings({
  size,
  theme,
  reduce,
}: {
  size: number;
  theme: SplashTheme;
  reduce: boolean;
}) {
  const show = useSharedValue(0);
  const spinA = useSharedValue(0);
  const spinB = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    show.value = withDelay(500, withTiming(1, { duration: 600 }));
    spinA.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.linear }),
      -1,
      false,
    );
    spinB.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(show);
      cancelAnimation(spinA);
      cancelAnimation(spinB);
    };
  }, [show, spinA, spinB, reduce]);

  const styleA = useAnimatedStyle(() => ({
    opacity: show.value,
    transform: [{ rotate: `${spinA.value * 360}deg` }],
  }));
  const styleB = useAnimatedStyle(() => ({
    opacity: show.value,
    transform: [{ rotate: `${-spinB.value * 360}deg` }],
  }));

  if (reduce) return null;

  const rA = 48;
  const rB = 41;
  const cA = 2 * Math.PI * rA;
  const cB = 2 * Math.PI * rB;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, styleA]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={rA} stroke={theme.heartbeat} strokeOpacity={0.12} strokeWidth={1} fill="none" />
          <Circle
            cx={50}
            cy={50}
            r={rA}
            stroke={theme.mint}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeDasharray={`${cA * 0.25} ${cA * 0.75}`}
            fill="none"
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, styleB]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={rB} stroke={theme.amber} strokeOpacity={0.1} strokeWidth={0.8} fill="none" />
          <Circle
            cx={50}
            cy={50}
            r={rB}
            stroke={theme.amber}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeDasharray={`${cB * 0.14} ${cB * 0.86}`}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

/* -------------------------------- particles ------------------------------- */
const PARTICLE_COUNT = 12;

function Particle({
  index,
  size,
  color,
  clock,
  show,
}: {
  index: number;
  size: number;
  color: string;
  clock: SharedValue<number>;
  show: SharedValue<number>;
}) {
  // Deterministic layout (no Math.random), so re-renders never move particles.
  const spec = useMemo(() => {
    const angle = ((index * 137.5) % 360) * (Math.PI / 180);
    const frac = ((index * 37) % 10) / 10;
    const radius = size * (0.37 + 0.09 * frac);
    const dot = 3 + (index % 3);
    return {
      dot,
      left: size / 2 + Math.cos(angle) * radius - dot / 2,
      top: size / 2 + Math.sin(angle) * radius - dot / 2,
      phase: (index * 0.083) % 1,
    };
  }, [index, size]);

  const style = useAnimatedStyle(() => {
    const p = (clock.value + spec.phase) % 1;
    const wave = Math.sin(Math.PI * p);
    return {
      opacity: show.value * wave * 0.8,
      transform: [{ translateY: -p * size * 0.12 }, { scale: 0.6 + 0.6 * wave }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: spec.left,
          top: spec.top,
          width: spec.dot,
          height: spec.dot,
          borderRadius: spec.dot / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function Particles({
  size,
  theme,
  reduce,
}: {
  size: number;
  theme: SplashTheme;
  reduce: boolean;
}) {
  const clock = useSharedValue(0);
  const show = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    show.value = withDelay(900, withTiming(1, { duration: 600 }));
    clock.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(show);
      cancelAnimation(clock);
    };
  }, [clock, show, reduce]);

  if (reduce) return null;

  const colors = [theme.mint, theme.amber, theme.heartbeat];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <Particle
          key={i}
          index={i}
          size={size}
          color={colors[i % colors.length]}
          clock={clock}
          show={show}
        />
      ))}
    </View>
  );
}

/* ---------------------------- activity indicators ------------------------- */
const MINI_R = 10;
const MINI_C = 2 * Math.PI * MINI_R;

function MiniRing({
  color,
  target,
  delay,
  reduce,
}: {
  color: string;
  target: number;
  delay: number;
  reduce: boolean;
}) {
  const p = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) {
      p.value = 1;
      return;
    }
    p.value = withDelay(
      delay,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
    return () => cancelAnimation(p);
  }, [p, delay, reduce]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: MINI_C * (1 - target * p.value),
    strokeOpacity: ramp(p.value),
  }));

  return (
    <View style={styles.miniRing}>
      <Svg width={28} height={28} viewBox="0 0 28 28">
        <Circle cx={14} cy={14} r={MINI_R} stroke={color} strokeOpacity={0.18} strokeWidth={3.5} fill="none" />
        <AnimatedCircle
          cx={14}
          cy={14}
          r={MINI_R}
          stroke={color}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={`${MINI_C} ${MINI_C}`}
          animatedProps={arcProps}
          fill="none"
        />
      </Svg>
    </View>
  );
}

/* --------------------------------- splash -------------------------------- */
export function AnimatedSplash({
  ready = true,
  onShown,
  onFinish,
}: {
  /** Splash won't fade out until this is true (and the minimum time has passed). */
  ready?: boolean;
  /** Called once the first frame has laid out. Hide the native splash here. */
  onShown?: () => void;
  /** Called after the fade-out completes. Unmount the splash here. */
  onFinish: () => void;
}) {
  const theme = useSplashTheme();
  const reduce = useReducedMotion();
  const { width, height } = useWindowDimensions();

  const stage = Math.round(Math.min(300, width * 0.74, height * 0.36));
  const heartSize = stage * 0.7;

  const exit = useSharedValue(0);
  const shownRef = useRef(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const logoStyle = useReveal(1500, reduce);
  const nameStyle = useReveal(1700, reduce);
  const tagStyle = useReveal(1850, reduce);
  const dotsStyle = useReveal(1900, reduce);

  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const id = setTimeout(
      () => setMinElapsed(true),
      reduce ? EXIT_AT_REDUCED : EXIT_AT,
    );
    return () => clearTimeout(id);
  }, [reduce]);

  useEffect(() => {
    if (!minElapsed || !ready) return;

    exit.value = withTiming(1, {
      duration: EXIT_DURATION,
      easing: Easing.inOut(Easing.cubic),
    });
    const finishTimer = setTimeout(() => finishRef.current(), EXIT_DURATION + 40);

    return () => {
      clearTimeout(finishTimer);
      cancelAnimation(exit);
    };
  }, [exit, minElapsed, ready]);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ scale: 1 + 0.04 * exit.value }],
  }));

  return (
    <Animated.View
      collapsable={false}
      accessible
      accessibilityLabel="Vīta is loading"
      onLayout={() => {
        if (shownRef.current) return;
        shownRef.current = true;
        onShown?.();
      }}
      style={[styles.root, { backgroundColor: theme.background }, rootStyle]}
    >
      <View style={{ width: stage, height: stage }}>
        <ScannerRings size={stage} theme={theme} reduce={reduce} />
        <Particles size={stage} theme={theme} reduce={reduce} />
        <HeartPulse size={heartSize} theme={theme} reduce={reduce} />
      </View>

      <View style={styles.brand}>
        <Animated.View style={logoStyle}>
          <BrandLogo height={26} />
        </Animated.View>

        <Animated.View style={nameStyle}>
          <Text variant="display" style={styles.name}>
            Vīta
          </Text>
        </Animated.View>

        <Animated.View style={tagStyle}>
          <Text variant="label" tone="muted">
            A daily record
          </Text>
        </Animated.View>

        <Animated.View style={[styles.dots, dotsStyle]}>
          <MiniRing color={theme.move} target={0.82} delay={1900} reduce={reduce} />
          <MiniRing color={theme.exercise} target={0.64} delay={2000} reduce={reduce} />
          <MiniRing color={theme.stand} target={0.9} delay={2100} reduce={reduce} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    ...StyleSheet.absoluteFill,
  },
  brand: {
    alignItems: "center",
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  name: { letterSpacing: 3 },
  dots: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  miniRing: {
    width: 28,
    height: 28,
    transform: [{ rotate: "-90deg" }],
  },
});