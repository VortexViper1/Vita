
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../../src/lib/supabase";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      try {
        const url = await Linking.getInitialURL();

        if (!url) {
          setMessage("No verification link was received. Please open the email link again.");
          return;
        }

        const parsed = Linking.parse(url);
        const code =
          typeof parsed.queryParams?.code === "string"
            ? parsed.queryParams.code
            : undefined;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const hash = url.split("#")[1];
          const params = new URLSearchParams(hash ?? "");
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const authError = params.get("error_description");

          if (authError) throw new Error(authError);

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
          } else {
            throw new Error("The link did not contain a valid authentication response.");
          }
        }

        if (active) {
          setMessage("Email verified! Opening Vīta...");
          router.replace("/(tabs)");
        }
      } catch (error) {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Verification failed. Please request a new email."
          );
        }
      }
    }

    handleCallback();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0A0F0D",
        alignItems: "center",
        justifyContent: "center",
        padding: 24 ,
      }}
    >
      <ActivityIndicator size="large" color="#D9822B" />
      <Text style={{ color: "#F7F4EC", marginTop: 20, textAlign: "center" }}>
        {message}
      </Text>
    </View>
  );
}
