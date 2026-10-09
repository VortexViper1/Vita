import type { Href } from "expo-router";
import type { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

export interface NavItem {
  label: string;
  route: Href;
  icon: IconName;
  /**
   * Set to false when the item shares a route with another item, so only
   * the primary one shows as active (and appears in the icon-only rail).
   */
  highlight?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const overviewItem: NavItem = {
  label: "Today",
  route: "/" as Href,
  icon: "grid-outline",
};

export const coreItems: NavItem[] = [
  { label: "Body", route: "/body" as Href, icon: "body-outline" },
  { label: "Nutrition", route: "/nutrition" as Href, icon: "restaurant-outline" },
  { label: "Activity", route: "/activity" as Href, icon: "walk-outline" },
];

export const dailyItems: NavItem[] = [
  { label: "Hydration", route: "/hydration" as Href, icon: "water-outline" },
  { label: "Sleep", route: "/sleep" as Href, icon: "moon-outline" },
  { label: "Supplements", route: "/supplements" as Href, icon: "medical-outline" },
];

export const advancedItems: NavItem[] = [
  { label: "Vitals", route: "/vitals" as Href, icon: "pulse-outline" },
  { label: "Progress", route: "/progress" as Href, icon: "analytics-outline" },
];

export const settingsItem: NavItem = {
  label: "Settings",
  route: "/settings" as Href,
  icon: "settings-outline",
};

/** Grouped navigation shown by both the drawer and the desktop rail. */
export const navSections: NavSection[] = [
  { title: "Core", items: coreItems },
  { title: "Daily", items: dailyItems },
  { title: "Advanced", items: advancedItems },
];

/**
 * `Href` can be a plain path string or an object with a `pathname` field.
 * Route/pathname comparisons must go through this so active-state and
 * navigate-guard logic behave correctly for both forms.
 */
export function toPathname(href: Href): string {
  if (typeof href === "string") {
    return href;
  }

  if (href && typeof href === "object" && "pathname" in href) {
    return String((href as { pathname: string }).pathname);
  }

  return String(href);
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.highlight !== false && toPathname(item.route) === pathname;
}