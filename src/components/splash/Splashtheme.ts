import { useMemo } from "react";

import { useTheme } from "../../theme/ThemeProvider";

type ThemeColors = ReturnType<typeof useTheme>["colors"];

/**
 * Returns the first token that exists on the active theme palette.
 * Only token NAMES are listed here. No colour values live in this file,
 * so dark/light switching comes entirely from your ThemeProvider.
 */
function pick(colors: ThemeColors, names: string[], fallback: string): string {
  const bag = colors as unknown as Record<string, unknown>;
  for (const name of names) {
    const value = bag[name];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return fallback;
}

/**
 * EDIT THE NAME LISTS BELOW if your palette uses different token names for
 * "primary heartbeat", "mint glow" and "amber highlight". The tokens I could
 * confirm from your code are: background, text, ringMove, ringExercise,
 * ringStand, blue and red.
 */
export function useSplashTheme() {
  const { colors, resolvedMode } = useTheme();

  return useMemo(() => {
    const heartbeat = pick(
      colors,
      ["primary", "brand", "green", "success", "accent"],
      colors.ringStand,
    );
    const mint = pick(
      colors,
      ["mint", "accentSoft", "greenSoft", "successSoft", "primarySoft"],
      heartbeat,
    );
    const amber = pick(
      colors,
      ["amber", "orange", "warning", "yellow"],
      colors.ringExercise,
    );

    return {
      dark: resolvedMode === "dark",
      background: colors.background,
      text: colors.text,
      heartbeat,
      mint,
      amber,
      move: colors.ringMove,
      exercise: colors.ringExercise,
      stand: colors.ringStand,
    };
  }, [colors, resolvedMode]);
}

export type SplashTheme = ReturnType<typeof useSplashTheme>;