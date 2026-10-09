import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G } from "react-native-svg";

import { useTheme } from "../../theme/ThemeProvider";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type Ring = {
  /** 0 to 1 (values above 1 are clamped). null/NaN renders an empty ring. */
  progress: number | null | undefined;
  color: string;
};

type Props = {
  rings: Ring[];
  size?: number;
  stroke?: number;
  gap?: number;
  children?: React.ReactNode;
};

function RingArc({
  radius,
  stroke,
  color,
  progress,
  center,
}: {
  radius: number;
  stroke: number;
  color: string;
  progress: number;
  center: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withTiming(progress, {
      duration: 1100,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }));

  return (
    <G rotation="-90" origin={`${center}, ${center}`}>
      {/* Track: same hue at low opacity, like Apple's rings */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeOpacity={0.2}
        strokeWidth={stroke}
        fill="none"
      />
      <AnimatedCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={animatedProps}
        fill="none"
      />
    </G>
  );
}

export function ActivityRings({
  rings,
  size = 180,
  stroke = 22,
  gap = 3,
  children,
}: Props) {
  // Keeps the hook order stable and ensures a theme is mounted.
  useTheme();
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {rings.map((ring, i) => {
          const radius = center - stroke / 2 - i * (stroke + gap);
          const raw = ring.progress;
          const safe =
            typeof raw === "number" && Number.isFinite(raw)
              ? Math.min(Math.max(raw, 0), 1)
              : 0;
          return (
            <RingArc
              key={i}
              center={center}
              radius={radius}
              stroke={stroke}
              color={ring.color}
              progress={safe}
            />
          );
        })}
      </Svg>
      {children ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}