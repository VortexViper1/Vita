import type { TrendPoint } from "./types";

/**
 * Parses "YYYY-MM-DD" as a *local* date. `new Date("2026-09-29")` would be
 * UTC midnight, which shows the previous day in timezones behind UTC.
 */
export function parseDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  return new Date(value);
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(
    value,
  );
}

/** 432 -> "7 h 12 min", 45 -> "45 min", 480 -> "8 h" */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest} min`;
  }

  if (rest === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${rest} min`;
}

export function formatVolume(ml: number): { value: string; unit: string } {
  if (ml >= 1000) {
    return { value: formatNumber(ml / 1000, 2), unit: "L" };
  }

  return { value: formatNumber(ml), unit: "ml" };
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(parseDate(iso));
}

export function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
    parseDate(date),
  );
}

export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(parseDate(date));
}

/** 0..1, safe for a zero goal. */
export function progressOf(value: number, goal: number): number {
  if (goal <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, value / goal));
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/**
 * Average of every point except the last (today). Needs at least three prior
 * days, otherwise a comparison would be noise.
 */
export function averageOfPrevious(
  points: TrendPoint[] | undefined,
): number | undefined {
  if (!points || points.length < 4) {
    return undefined;
  }

  const previous = points.slice(0, -1);
  return previous.reduce((sum, point) => sum + point.value, 0) / previous.length;
}

/** "12% above your weekly average" (or undefined when there is no baseline). */
export function compareToAverage(
  value: number,
  average: number | undefined,
  label: string,
): string | undefined {
  if (average === undefined || average <= 0) {
    return undefined;
  }

  const change = (value - average) / average;
  const percent = Math.round(Math.abs(change) * 100);

  if (percent === 0) {
    return `In line with ${label}`;
  }

  return `${percent}% ${change > 0 ? "above" : "below"} ${label}`;
}

export function describeWeekChange(kg: number): string {
  const rounded = Math.round(Math.abs(kg) * 10) / 10;

  if (rounded === 0) {
    return "No change this week";
  }

  return `${formatNumber(rounded, 1)} kg ${kg > 0 ? "up" : "down"} this week`;
}