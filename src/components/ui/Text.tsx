import React from "react";
import { Text as RNText, TextProps as RNTextProps } from "react-native";

import { ColorKey } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeProvider";
import { typography, TypographyVariant } from "../../theme/typography";

export type TextTone = "primary" | "secondary" | "muted" | "accent";

const TONE_COLOR: Record<TextTone, ColorKey> = {
  primary: "text",
  secondary: "textSecondary",
  muted: "textMuted",
  accent: "primary",
};

/**
 * Large display text is capped so accessibility font sizes scale it up
 * without breaking layouts. Body-sized text is never capped.
 */
const LARGE_TEXT_CAP = 1.3;
const CAPPED_VARIANTS: readonly TypographyVariant[] = [
  "display",
  "heading1",
  "metric",
  "metricSmall",
];

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
}

/**
 * The only text component screens should use: type style comes from the
 * shared scale, color from a semantic tone.
 */
export function Text({
  variant = "body",
  tone = "primary",
  style,
  ...props
}: TextProps) {
  const { colors } = useTheme();

  return (
    <RNText
      maxFontSizeMultiplier={
        CAPPED_VARIANTS.includes(variant) ? LARGE_TEXT_CAP : undefined
      }
      {...props}
      style={[typography[variant], { color: colors[TONE_COLOR[tone]] }, style]}
    />
  );
}