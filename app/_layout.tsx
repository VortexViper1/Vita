
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../src/lib/supabase";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { TransitionProvider } from "../src/components/navigation/Transitionprovider";

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the existing Supabase session and listen for auth changes.
  useEffect(() => {
    let alive = true;

    const restoreSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!alive) return;

        if (error) {
          console.error("Could not restore Supabase session:", error.message);
        }

        setSession(data.session);
      } catch (error) {
        console.error("Failed to restore Supabase session:", error);

        if (alive) {
          setSession(null);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!alive) return;

      setSession(newSession);
      setLoading(false);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  // Protect the tabs and redirect authenticated users away from auth screens.
  useEffect(() => {
    if (loading) return;

    const group = segments[0];

    // Wait until Expo Router has resolved the current route.
    if (!group) return;

    const inAuthGroup = group === "(auth)";
    const inTabsGroup = group === "(tabs)";

    if (!session && inTabsGroup) {
      router.replace("/(auth)/welcome");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [loading, session, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  return (
    <TransitionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
        }}
      />
    </TransitionProvider>
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
