import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { radius, spacing } from "../../theme/spacing";
import { useTheme } from "../../theme/ThemeProvider";
import { typography } from "../../theme/typography";

export type StackItem = {
  title: string;
  subtitle?: string;
  /** { uri: "https://..." } for a link, or require("...") for a local file. */
  image?: ImageSourcePropType;
};

type Props = {
  items: StackItem[];
  /** Square edge length. Defaults to a full-width square if you pass it. */
  size: number;
  /**
   * Photo slot. Leave undefined for blank placeholders; later return an
   * <Image style={StyleSheet.absoluteFill} /> for each index.
   */
  renderPhoto?: (index: number) => React.ReactNode;
  onChange?: (index: number) => void;
};

const VISIBLE = 3;
const OFFSET = 14;

function StackCard({
  depth,
  size,
  item,
  photo,
}: {
  depth: number;
  size: number;
  item: StackItem;
  photo?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const d = useSharedValue(depth);

  useEffect(() => {
    d.value = withTiming(depth, { duration: 340 });
  }, [depth, d]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateY: d.value * OFFSET },
      { scale: 1 - d.value * 0.06 },
    ],
    opacity: d.value > VISIBLE - 1 ? 0 : 1 - d.value * 0.22,
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        { width: size, height: size, zIndex: 10 - depth },
        animated,
      ]}
    >
      {/* Blank photo space */}
      <LinearGradient
        colors={[colors.surfaceAlt, colors.surfaceMuted]}
        style={StyleSheet.absoluteFill}
      />
      {photo}
      {item.image ? (
        <Image
          source={item.image}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessible={false}
        />
      ) : null}

      {/* Title overlay */}
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.62)"]}
        style={styles.overlay}
      >
        <Text style={[typography.heading2, { color: "#FFFFFF" }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text
            style={[typography.bodySmall, { color: "rgba(255,255,255,0.78)" }]}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        ) : null}
      </LinearGradient>
    </Animated.View>
  );
}

export function PhotoStack({ items, size, renderPhoto, onChange }: Props) {
  const [active, setActive] = useState(0);
  const count = items.length;

  if (count === 0) return null;

  const next = () => {
    const n = (active + 1) % count;
    setActive(n);
    onChange?.(n);
  };

  return (
    <Pressable
      onPress={next}
      accessibilityRole="button"
      accessibilityLabel={`${items[active].title}. Tap for next`}
      style={{ width: size, height: size + OFFSET * (VISIBLE - 1) + spacing.sm }}
    >
      <View style={{ width: size, height: size }}>
        {items.map((item, i) => (
          <StackCard
            key={i}
            depth={(i - active + count) % count}
            size={size}
            item={item}
            photo={renderPhoto?.(i)}
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    paddingTop: spacing.huge,
  },
});