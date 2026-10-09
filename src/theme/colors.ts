/**
 * Application color tokens.
 *
 * Direction
 * - Dark (Apple Fitness): pure black canvas, #1C1C1E-style raised cards,
 *   neon activity-ring colors. Depth comes from surface steps, not shadows.
 * - Light (OriginOS Health): soft cool-gray canvas with pure white cards,
 *   so tiles float on the background.
 *
 * All existing token names are unchanged; `ring*` tokens are additions.
 * `darkColors` is the source of truth for the key set.
 */

export const darkColors = {
  // Backgrounds
  background: "#000000",
  backgroundRaised: "#0A0A0C",
  backgroundElevated: "#1C1C1E",

  // Surfaces (each step is one notch lighter than the last)
  surface: "#1C1C1E",
  surfaceAlt: "#2C2C2E",
  surfaceMuted: "#3A3A3C",

  // Borders / rules
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.16)",
  border: "rgba(255,255,255,0.14)",
  borderStrong: "rgba(255,255,255,0.28)",

  // Text
  ink: "#FFFFFF",
  text: "#FFFFFF",
  inkSoft: "#B5B5BA",
  textSecondary: "#B5B5BA",
  inkMuted: "#8E8E93",
  textMuted: "#8E8E93",

  // Brand / accent (positive, primary actions)
  green: "#4CC38A",
  greenStrong: "#3DAA75",
  greenDeep: "#1F6B49",
  primary: "#4CC38A",
  mint: "#86D9AE",

  // Semantic accents
  cream: "#D8D2C4",
  amber: "#FFB340",
  red: "#FF453A",
  blue: "#0A84FF",

  // Activity rings
  ringMove: "#FA114F",
  ringExercise: "#92E82A",
  ringStand: "#1EEAEF",

  // Base
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const lightColors = {
  // Backgrounds
  background: "#F2F3F7",
  backgroundRaised: "#FFFFFF",
  backgroundElevated: "#FFFFFF",

  // Surfaces (cards are white on the gray canvas; each step is darker)
  surface: "#FFFFFF",
  surfaceAlt: "#F5F6FA",
  surfaceMuted: "#E8EAF0",

  // Borders / rules
  line: "rgba(60,60,67,0.10)",
  lineStrong: "rgba(60,60,67,0.20)",
  border: "rgba(60,60,67,0.18)",
  borderStrong: "rgba(60,60,67,0.34)",

  // Text
  ink: "#16171A",
  text: "#16171A",
  inkSoft: "#4E4F57",
  textSecondary: "#4E4F57",
  inkMuted: "#797B85",
  textMuted: "#797B85",

  // Brand / accent (positive, primary actions)
  green: "#1E7F52",
  greenStrong: "#186B44",
  greenDeep: "#125236",
  primary: "#1E7F52",
  mint: "#2FA36B",

  // Semantic accents
  cream: "#7A705C",
  amber: "#A86200",
  red: "#D7352F",
  blue: "#0066CC",

  // Activity rings
  ringMove: "#F0104A",
  ringExercise: "#6FCB10",
  ringStand: "#12BFC4",

  // Base
  white: "#FFFFFF",
  black: "#000000",
} as const;

export type AppColors = {
  [K in keyof typeof darkColors]: string;
};

export type ColorKey = keyof AppColors;