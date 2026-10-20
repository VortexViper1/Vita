import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../src/lib/supabase";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { TransitionProvider } from "../src/components/navigation/Transitionprovider";
import { SplashGate } from "../src/components/splash/splashgate";

// Note: SplashScreen.preventAutoHideAsync / setOptions / hideAsync now live in
// SplashGate, which hides the native splash once the animated one is on screen.

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
    // The animated splash covers the app until the session is restored
    // (minimum ~3s), then fades out to whichever screen the redirect chose.
    <SplashGate ready={!loading}>
      {loading ? null : (
        <TransitionProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "none",
            }}
          />
        </TransitionProvider>
      )}
    </SplashGate>
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