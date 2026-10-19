import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform } from "react-native";

/**
 * Returns the current on-screen keyboard height (0 when hidden).
 * Works inside <Modal statusBarTranslucent>, where KeyboardAvoidingView is
 * unreliable on Android. Add this value as bottom padding to the sheet/dialog
 * so the focused input always sits above the keyboard.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const subs =
      Platform.OS === "ios"
        ? [
            Keyboard.addListener("keyboardWillChangeFrame", (e) => {
              const hidden = e.endCoordinates.screenY >= Dimensions.get("window").height;
              setHeight(hidden ? 0 : e.endCoordinates.height);
            }),
            Keyboard.addListener("keyboardWillHide", () => setHeight(0)),
          ]
        : [
            Keyboard.addListener("keyboardDidShow", (e) => setHeight(e.endCoordinates.height)),
            Keyboard.addListener("keyboardDidHide", () => setHeight(0)),
          ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  return height;
}