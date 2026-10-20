import type { ImageSourcePropType } from "react-native";

/**
 * Point these at your real Vita logo files, for example:
 *   light: require("../../../assets/images/vita-logo.png"),
 * `light` is the logo for light backgrounds, `dark` for dark backgrounds
 * (leave `dark` null to reuse `light`). Set aspectRatio to width / height.
 */
export const logoAssets: {
  light: ImageSourcePropType | null;
  dark: ImageSourcePropType | null;
  aspectRatio: number;
} = {
  light: null,
  dark: null,
  aspectRatio: 3,
};