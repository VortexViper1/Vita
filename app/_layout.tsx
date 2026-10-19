
import { useCallback, useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import * as SplashScreen from "expo-splash-screen";

import { supabase } from "../src/lib/supabase";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { TransitionProvider } from "../src/components/navigation/Transitionprovider";
import { VitaLoader } from "../src/components/ui/VitaLoader";

SplashScreen.setOptions({
  duration: 600,
  fade: true,
});

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rootLaidOut, setRootLaidOut] = useState(false);

  useEffect(() => {
    let alive = true;

    const restoreSession = async () => {
      const minDisplayTime = new Promise<void>((resolve) =>
        setTimeout(resolve, 1200)
      );

      try {
        const [{ data, error }] = await Promise.all([
          supabase.auth.getSession(),
          minDisplayTime,
        ]);

        if (!alive) return;

        if (error) {
          console.error(
            "Could not restore Supabase session:",
            error.message
          );
        }

        setSession(data.session);
      } catch (error) {
        console.error("Failed to restore Supabase session:", error);

        if (alive) setSession(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    void restoreSession();

    const safetyTimer = setTimeout(() => {
      if (alive) setLoading(false);
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!alive) return;

      setSession(newSession);
      setLoading(false);
    });

    return () => {
      alive = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const onLayoutRootView = useCallback(() => {
    setRootLaidOut(true);
  }, []);

  useEffect(() => {
    if (!rootLaidOut) return;

    void SplashScreen.hideAsync().catch(() => {});
  }, [rootLaidOut]);

  useEffect(() => {
    if (loading) return;

    const group = segments[0];
    if (!group) return;

    const inAuthGroup = group === "(auth)";
    const inTabsGroup = group === "(tabs)";

    if (!session && inTabsGroup) {
      router.replace("/(auth)/welcome");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [loading, session, segments, router]);

  return (
    <View
      onLayout={onLayoutRootView}
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      {loading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <VitaLoader />
        </View>
      ) : (
        <TransitionProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "none",
            }}
          />
        </TransitionProvider>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <AuthGate />
    </ThemeProvider>
  );
}
