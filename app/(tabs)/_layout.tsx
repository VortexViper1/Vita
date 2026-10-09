
import { Stack } from "expo-router";

import { useTheme } from "../../src/theme/ThemeProvider";
import { ResponsiveShell } from "../../src/components/navigation/ResponsiveShell";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <ResponsiveShell>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
    </ResponsiveShell>
  );
}
