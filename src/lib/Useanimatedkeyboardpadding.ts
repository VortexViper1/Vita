import { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, Keyboard, KeyboardEvent, Platform } from "react-native";

const ANDROID_DURATION = 220;
const IOS_FALLBACK_DURATION = 250;
const easing = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Returns an animated padding value that smoothly follows the keyboard.
 *
 * padding = max(restPadding, keyboardHeight + keyboardGap)
 *
 * Example (bottom sheet):  useAnimatedKeyboardPadding(insets.bottom + 16, 16)
 * Example (centered card): useAnimatedKeyboardPadding(22, 22)
 *
 * Use it as `paddingBottom` on an <Animated.View>.
 * Layout props can't use the native driver, so this runs on the JS thread,
 * which is fine for a single small container.
 */
export function useAnimatedKeyboardPadding(restPadding: number, keyboardGap = 0) {
  const keyboard = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateTo = (toValue: number, duration: number) => {
      Animated.timing(keyboard, {
        toValue,
        duration,
        easing,
        useNativeDriver: false,
      }).start();
    };

    const subscriptions =
      Platform.OS === "ios"
        ? [
            // One event covers show, hide and keyboard-type changes.
            Keyboard.addListener("keyboardWillChangeFrame", (event: KeyboardEvent) => {
              const windowHeight = Dimensions.get("window").height;
              const height = Math.max(0, windowHeight - event.endCoordinates.screenY);
              animateTo(height, event.duration || IOS_FALLBACK_DURATION);
            }),
          ]
        : [
            Keyboard.addListener("keyboardDidShow", (event: KeyboardEvent) =>
              animateTo(event.endCoordinates.height, ANDROID_DURATION),
            ),
            Keyboard.addListener("keyboardDidHide", () => animateTo(0, ANDROID_DURATION)),
          ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [keyboard]);

  return useMemo(() => {
    const breakpoint = restPadding - keyboardGap;

    if (breakpoint <= 0) {
      return keyboard.interpolate({
        inputRange: [0, 1],
        outputRange: [keyboardGap, keyboardGap + 1],
        extrapolateLeft: "clamp",
        extrapolateRight: "extend",
      });
    }

    return keyboard.interpolate({
      inputRange: [0, breakpoint, breakpoint + 1],
      outputRange: [restPadding, restPadding, restPadding + 1],
      extrapolateLeft: "clamp",
      extrapolateRight: "extend",
    });
  }, [keyboard, restPadding, keyboardGap]);
}