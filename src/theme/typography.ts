/**
 * Type scale (system fonts: SF Pro on iOS, Roboto on Android).
 *
 * - Headings are semibold with slightly negative tracking, which keeps large
 *   text tight and legible on small screens.
 * - Body is 16pt for comfortable reading; nothing user-facing drops below 11pt.
 * - `metric` / `metricSmall` use tabular numerals so values don't shift width
 *   as they change.
 * - `label` is the uppercase overline used above sections and metrics.
 *
 * Existing variant names are unchanged; `bodyMedium`, `label` and
 * `metricSmall` are additions.
 */

export const typography = {
  display: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "600" as const,
    letterSpacing: -0.9,
  },

  heading1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600" as const,
    letterSpacing: -0.6,
  },

  heading2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600" as const,
    letterSpacing: -0.35,
  },

  heading3: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },

  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
    letterSpacing: -0.1,
  },

  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
    letterSpacing: -0.1,
  },

  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
  },

  caption: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500" as const,
    letterSpacing: 0.2,
  },

  label: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },

  metric: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "600" as const,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"] as "tabular-nums"[],
  },

  metricSmall: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600" as const,
    letterSpacing: -0.35,
    fontVariant: ["tabular-nums"] as "tabular-nums"[],
  },
} as const;

export type TypographyVariant = keyof typeof typography;