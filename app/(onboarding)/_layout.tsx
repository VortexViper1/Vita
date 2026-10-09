import { Stack } from "expo-router";

import { useTheme } from "../../src/theme/ThemeProvider";

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      initialRouteName="profiles"
      screenOptions={{
        headerShown: false,
        // Platform-default transitions: each step forward should read as a
        // push, and Back as a pop, rather than a cross-fade.
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}