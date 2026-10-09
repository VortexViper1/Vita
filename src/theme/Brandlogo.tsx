import React from "react";
import { Image, View } from "react-native";

import { useTheme } from "./ThemeProvider";
import { logoAssets } from "./Logoassets";

/** The real Vīta logo, never a text stand-in. Reserves its space until the asset is set. */
export function BrandLogo({ height = 30 }: { height?: number }) {
  const { resolvedMode } = useTheme();

  const source =
    (resolvedMode === "dark" ? logoAssets.dark : logoAssets.light) ??
    logoAssets.light ??
    logoAssets.dark;
  const width = height * logoAssets.aspectRatio;

  if (!source) {
    return <View accessibilityLabel="Vīta" style={{ height, width }} />;
  }

  return (
    <Image
      source={source}
      accessibilityLabel="Vīta"
      resizeMode="contain"
      style={{ height, width }}
    />
  );
}