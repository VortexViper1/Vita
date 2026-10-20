import { Stack } from "expo-router";

import { useBrand } from "../../src/theme/Brand";

// animation "none": the Vita iris transition (TransitionProvider) owns screen
// changes here, so a native animation would fight with it.
export default function AuthLayout() {
  const b = useBrand();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: { backgroundColor: b.bg },
      }}
    />
  );
}