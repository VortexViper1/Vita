import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { AnimatedSplash } from "./AnimatedSplash";
import { useSplashTheme } from "./Splashtheme";

// Keep the native splash up until the animated one has drawn its first frame.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 600, fade: true });

/**
 * Module-level on purpose: it survives navigation and re-renders, and resets
 * only on a cold start. So the animation plays on initial launch only.
 */
let hasPlayedThisLaunch = false;

export function SplashGate({
  children,
  ready = true,
}: {
  children: React.ReactNode;
  /** Keeps the splash up until your app (e.g. session restore) is ready. */
  ready?: boolean;
}) {
  const theme = useSplashTheme();
  const [visible, setVisible] = useState(!hasPlayedThisLaunch);

  const handleShown = useCallback(() => {
    // One extra frame so the animated splash is on screen before the native one goes.
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

  const handleFinish = useCallback(() => {
    hasPlayedThisLaunch = true;
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) SplashScreen.hideAsync().catch(() => {});
  }, [visible]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* App mounts underneath so auth/session restore runs while the splash plays. */}
      {children}
      {visible ? (
        <AnimatedSplash
          ready={ready}
          onShown={handleShown}
          onFinish={handleFinish}
        />
      ) : null}
    </View>
  );
}