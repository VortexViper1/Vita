
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../../theme/ThemeProvider";

const GOLD = "#D6B47A";
const MINT = "#B7E6CB";
const LEAF = "#3E8F6F";
const DEEP = "#183D32";

function Hoop({
  size,
  color,
  axis,
  duration,
  tilt,
}: {
  size: number;
  color: string;
  axis: "x" | "y";
  duration: number;
  tilt: number;
}) {
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;

    rotation.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => cancelAnimation(rotation);
  }, [duration, reducedMotion, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateZ: `${tilt}deg` },
      {
        [axis === "x" ? "rotateX" : "rotateY"]:
          `${rotation.value * 360}deg`,
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: color,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          position: "absolute",
          top: -5,
          left: size / 2 - 4,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
    </Animated.View>
  );
}

export function RotatingVitaRing({
  size = 180,
}: {
  size?: number;
}) {
  const { resolvedMode } = useTheme();
  const dark = resolvedMode === "dark";
  const coreSize = size * 0.34;

  return (
    <View
      accessible
      accessibilityLabel="Vīta rotating wellness ring"
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: size * 0.82,
          height: size * 0.82,
          borderRadius: size,
          backgroundColor: MINT,
          opacity: dark ? 0.12 : 0.25,
        }}
      />

      <Hoop
        size={size}
        color={GOLD}
        axis="y"
        duration={7000}
        tilt={0}
      />

      <Hoop
        size={size * 0.8}
        color={dark ? MINT : LEAF}
        axis="x"
        duration={5600}
        tilt={35}
      />

      <Hoop
        size={size * 0.6}
        color={DEEP}
        axis="y"
        duration={4200}
        tilt={-40}
      />

      <View
        style={{
          width: coreSize,
          height: coreSize,
          borderRadius: coreSize / 2,
          overflow: "hidden",
          backgroundColor: "#285F4B",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.5)",
          elevation: 12,
          shadowColor: DEEP,
          shadowOpacity: 0.3,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <View
          style={{
            position: "absolute",
            width: coreSize * 0.8,
            height: coreSize * 0.8,
            borderRadius: coreSize,
            top: -coreSize * 0.15,
            left: -coreSize * 0.08,
            backgroundColor: "#8FC8A3",
          }}
        />
        <View
          style={{
            position: "absolute",
            width: coreSize * 0.7,
            height: coreSize * 0.7,
            borderRadius: coreSize,
            bottom: -coreSize * 0.1,
            right: -coreSize * 0.05,
            backgroundColor: "#102E27",
            opacity: 0.8,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: coreSize * 0.18,
            left: coreSize * 0.2,
            width: coreSize * 0.24,
            height: coreSize * 0.1,
            borderRadius: coreSize,
            backgroundColor: "#FFFFFF",
            opacity: 0.8,
            transform: [{ rotate: "-35deg" }],
          }}
        />
      </View>
    </View>
  );
}
