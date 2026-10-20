
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AccessibilityInfo,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import { router, usePathname } from "expo-router";
import type { Href } from "expo-router";

import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { useTheme } from "../../theme/ThemeProvider";
import { toPathname } from "./navItems";
import { VitaLoader } from "../ui/VitaLoader";

// ========================================
// TRANSITION TIMING
// ========================================

const COVER_MS = 450;
const HOLD_MS = 350;
const REVEAL_MS = 500;

// ========================================
// CONTEXT
// ========================================

type Go = (route: Href) => void;

const TransitionContext = createContext<Go | null>(null);

export function useTransitionNavigate(): Go {
  const context = useContext(TransitionContext);

  return (
    context ??
    ((route: Href) => {
      router.push(route);
    })
  );
}

// ========================================
// PROVIDER
// ========================================

export function TransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const [visible, setVisible] = useState(false);
  const cover = useSharedValue(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const navigating = useRef(false);
  const mounted = useRef(false);

  // ========================================
  // TIMER HELPERS
  // ========================================

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const after = useCallback(
    (ms: number, callback: () => void) => {
      const timer = setTimeout(() => {
        timers.current = timers.current.filter(
          (item) => item !== timer,
        );

        callback();
      }, ms);

      timers.current.push(timer);
      return timer;
    },
    [],
  );

  // ========================================
  // CLEANUP
  // ========================================

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  // ========================================
  // NAVIGATION
  // ========================================

  const go = useCallback<Go>(
    async (route) => {
      if (
        navigating.current ||
        toPathname(route) === pathRef.current
      ) {
        return;
      }

      navigating.current = true;

      let reduceMotion = false;

      try {
        reduceMotion =
          await AccessibilityInfo.isReduceMotionEnabled();
      } catch {
        reduceMotion = false;
      }

      if (!mounted.current) {
        navigating.current = false;
        return;
      }

      if (reduceMotion) {
        navigating.current = false;
        router.push(route);
        return;
      }

      clearTimers();

      cover.value = 0;
      setVisible(true);

      // 1. Cover the current screen.
      cover.value = withTiming(1, {
        duration: COVER_MS,
        easing: Easing.out(Easing.cubic),
      });

      // 2. Navigate after the cover animation.
      after(COVER_MS + 50, () => {
        if (!mounted.current) return;

        router.push(route);

        // 3. Keep the destination covered briefly.
        after(HOLD_MS, () => {
          if (!mounted.current) return;

          // 4. Reveal the destination screen.
          cover.value = withTiming(0, {
            duration: REVEAL_MS,
            easing: Easing.inOut(Easing.cubic),
          });

          // 5. Remove the overlay after the reveal.
          after(REVEAL_MS + 80, () => {
            if (!mounted.current) return;

            setVisible(false);
            navigating.current = false;
          });
        });
      });
    },
    [after, clearTimers, cover],
  );

  return (
    <TransitionContext.Provider value={go}>
      <View style={styles.root}>
        {children}

        {visible ? <Overlay cover={cover} /> : null}
      </View>
    </TransitionContext.Provider>
  );
}

// ========================================
// OVERLAY
// ========================================

function Overlay({
  cover,
}: {
  cover: SharedValue<number>;
}) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();

  const diameter = Math.hypot(width, height) * 1.05;

  // ========================================
  // IRIS
  // ========================================

  const iris = useAnimatedStyle(() => ({
    transform: [
      {
        scale: 0.001 + cover.value * 0.999,
      },
    ],
  }));

  // ========================================
  // OUTER EDGE
  // ========================================

  const edge = useAnimatedStyle(() => ({
    opacity: interpolate(
      cover.value,
      [0, 0.1, 0.92, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: 0.001 + cover.value * 0.999,
      },
    ],
  }));

  // ========================================
  // Vita LOADER
  // ========================================

  const logo = useAnimatedStyle(() => ({
    opacity: interpolate(
      cover.value,
      [0.5, 0.95],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const circle = {
    position: "absolute" as const,
    left: (width - diameter) / 2,
    top: (height - diameter) / 2,
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
  };

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
      ]}
      pointerEvents="auto"
      accessible
      accessibilityLabel="Loading"
      accessibilityViewIsModal
    >
      <Animated.View
        style={[
          circle,
          { backgroundColor: colors.background },
          iris,
        ]}
      />

      <Animated.View
        style={[
          circle,
          {
            borderWidth: 3,
            borderColor: colors.ringStand,
          },
          edge,
        ]}
      />

      <Animated.View style={[styles.logo, logo]}>
        <VitaLoader />
      </Animated.View>
    </View>
  );
}

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  overlay: {
    zIndex: 9999,
    elevation: 9999,
  },

  logo: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
