import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../src/theme/ThemeProvider";

/** "#RRGGBB" + alpha (0..1) -> "#RRGGBBAA". Theme tokens are all 6-digit hex. */
function hexA(hex: string, alpha: number): string {
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
}

/** A ring spinning around one axis under perspective, so it reads as a real 3D hoop. */
function Hoop({
  box,
  size,
  color,
  axis,
  duration,
  offset,
  tilt,
}: {
  box: number;
  size: number;
  color: string;
  axis: "x" | "y";
  duration: number;
  offset: number;
  tilt: number;
}) {
  const rot = useSharedValue(offset);

  useEffect(() => {
    rot.value = withRepeat(
      withTiming(offset + 1, { duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rot, offset, duration]);

  const style = useAnimatedStyle(() => {
    const deg = `${rot.value * 360}deg`;
    return {
      transform: [
        { perspective: 900 },
        { rotateZ: `${tilt}deg` },
        axis === "x" ? { rotateX: deg } : { rotateY: deg },
      ],
    };
  });

  const r = size / 2 - 12;

  return (
    <Animated.View
      style={[
        { position: "absolute", width: size, height: size, left: (box - size) / 2, top: (box - size) / 2 },
        style,
      ]}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeOpacity={0.18} strokeWidth={20} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={8} fill="none" />
        <Circle cx={size / 2} cy={12} r={8} fill={color} />
      </Svg>
    </Animated.View>
  );
}

/** Floating glass sphere wrapped by three gyroscope hoops in the activity-ring colors. */
export function Orb3D({ size = 280 }: { size?: number }) {
  const { colors } = useTheme();
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -8 + float.value * 16 }],
  }));

  const core = size * 0.3;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, floatStyle]}
    >
      <Hoop box={size} size={size} color={colors.ringMove} axis="y" duration={7000} offset={0} tilt={0} />
      <Hoop box={size} size={size * 0.8} color={colors.ringExercise} axis="x" duration={5600} offset={0.25} tilt={35} />
      <Hoop box={size} size={size * 0.6} color={colors.ringStand} axis="y" duration={4200} offset={0.5} tilt={-40} />

      <LinearGradient
        colors={[colors.ringStand, colors.blue]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={{ width: core, height: core, borderRadius: core / 2 }}
      >
        {/* specular highlight, which is what makes the flat gradient read as a sphere */}
        <View
          style={{
            position: "absolute",
            top: core * 0.12,
            left: core * 0.18,
            width: core * 0.34,
            height: core * 0.22,
            borderRadius: core,
            backgroundColor: "#FFFFFF",
            opacity: 0.4,
            transform: [{ rotate: "-25deg" }],
          }}
        />
      </LinearGradient>
    </Animated.View>
  );
}

/** Ambient color glows plus the 3D orb, pinned behind the top of an auth screen. */
export function AuthBackdrop() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const blob = (color: string) => [hexA(color, 0.3), hexA(color, 0)] as [string, string];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={blob(colors.ringMove)}
        style={{ position: "absolute", top: -140, left: -120, width: 340, height: 340, borderRadius: 170 }}
      />
      <LinearGradient
        colors={blob(colors.blue)}
        style={{ position: "absolute", top: 120, right: -150, width: 340, height: 340, borderRadius: 170 }}
      />
      <View style={{ position: "absolute", top: insets.top - 20, right: -80 }}>
        <Orb3D size={290} />
      </View>
    </View>
  );
}