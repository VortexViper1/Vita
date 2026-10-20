
import React, { useCallback, useState } from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import type { Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTransitionNavigate } from "./Transitionprovider";
import { useTheme } from "../../theme/ThemeProvider";
import {
  borderWidth,
  layout,
  radius,
  spacing,
} from "../../theme/spacing";
import { Text } from "../ui/Text";
import AppDrawer from "./AppDrawer";
import { NavRow } from "./NavRow";

import {
  isNavItemActive,
  navSections,
  overviewItem,
  settingsItem,
  type NavItem,
} from "./navItems";

export const TABLET_MIN_WIDTH = 700;
export const DESKTOP_MIN_WIDTH = 1100;

const DESKTOP_RAIL_WIDTH = 250;
const TABLET_RAIL_WIDTH = 72;
const CONTENT_MAX_WIDTH = 1400;
const RAIL_BUTTON_SIZE = 48;

/**
 * Icon-only rail destinations.
 * Items that should only be reached through the drawer are excluded.
 */
const TABLET_ITEMS: NavItem[] = [
  overviewItem,
  ...navSections.flatMap((section) => section.items),
].filter((item) => item.highlight !== false);

interface ResponsiveShellProps {
  children: React.ReactNode;
}

export function ResponsiveShell({
  children,
}: ResponsiveShellProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const pathname = usePathname();

  // The transition hook must be inside the React component.
  const go = useTransitionNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const isDesktop = width >= DESKTOP_MIN_WIDTH;
  const isTablet =
    width >= TABLET_MIN_WIDTH &&
    width < DESKTOP_MIN_WIDTH;

  const navigate = useCallback(
    (route: Href) => {
      if (route !== pathname) {
        go(route);
      }
    },
    [pathname, go],
  );

  if (isDesktop) {
    return (
      <View
        style={[
          styles.shell,
          { backgroundColor: colors.background },
        ]}
      >
        <DesktopRail
          pathname={pathname}
          onNavigate={navigate}
        />

        <View style={styles.desktopContent}>
          <View style={styles.desktopColumn}>
            {children}
          </View>
        </View>
      </View>
    );
  }

  if (isTablet) {
    return (
      <View
        style={[
          styles.shell,
          { backgroundColor: colors.background },
        ]}
      >
        <TabletRail
          pathname={pathname}
          isMenuOpen={drawerOpen}
          onOpenMenu={() => setDrawerOpen(true)}
          onNavigate={navigate}
        />

        <View style={styles.tabletContent}>
          {children}
        </View>

        <AppDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      </View>
    );
  }

  // Phone screens use their existing AppHeader and AppDrawer.
  return <>{children}</>;
}

// ========================================
// DESKTOP RAIL
// ========================================

interface DesktopRailProps {
  pathname: string;
  onNavigate: (route: Href) => void;
}

function DesktopRail({
  pathname,
  onNavigate,
}: DesktopRailProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.desktopRail,
        {
          borderRightColor: colors.border,
          backgroundColor: colors.backgroundRaised,
        },
      ]}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.xxxl,
          paddingBottom: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <Text variant="heading2">Vita</Text>

          <Text
            variant="label"
            tone="muted"
            style={styles.tagline}
          >
            A daily record
          </Text>
        </View>

        <NavRow
          item={overviewItem}
          active={isNavItemActive(
            overviewItem,
            pathname,
          )}
          onPress={onNavigate}
        />

        {navSections.map((section) => (
          <View
            key={section.title}
            style={styles.group}
          >
            <Text
              variant="label"
              tone="muted"
              accessibilityRole="header"
              style={styles.groupTitle}
            >
              {section.title}
            </Text>

            {section.items.map((item) => (
              <NavRow
                key={item.label}
                item={item}
                active={isNavItemActive(
                  item,
                  pathname,
                )}
                onPress={onNavigate}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.railBottom,
          {
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <NavRow
          item={settingsItem}
          active={isNavItemActive(
            settingsItem,
            pathname,
          )}
          onPress={onNavigate}
        />
      </View>
    </View>
  );
}

// ========================================
// TABLET RAIL
// ========================================

interface TabletRailProps {
  pathname: string;
  isMenuOpen: boolean;
  onOpenMenu: () => void;
  onNavigate: (route: Href) => void;
}

function TabletRail({
  pathname,
  isMenuOpen,
  onOpenMenu,
  onNavigate,
}: TabletRailProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabletRail,
        {
          borderRightColor: colors.border,
          backgroundColor: colors.backgroundRaised,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      <Pressable
        onPress={onOpenMenu}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        accessibilityState={{ expanded: isMenuOpen }}
        style={({ pressed }) => [
          styles.railButton,
          pressed && {
            backgroundColor: colors.surfaceMuted,
          },
        ]}
      >
        <Ionicons
          name="menu-outline"
          size={24}
          color={colors.text}
        />
      </Pressable>

      <ScrollView
        style={styles.tabletItems}
        contentContainerStyle={styles.tabletItemsContent}
        showsVerticalScrollIndicator={false}
      >
        {TABLET_ITEMS.map((item) => (
          <RailIconButton
            key={item.label}
            item={item}
            active={isNavItemActive(
              item,
              pathname,
            )}
            onPress={onNavigate}
          />
        ))}
      </ScrollView>

      <RailIconButton
        item={settingsItem}
        active={isNavItemActive(
          settingsItem,
          pathname,
        )}
        onPress={onNavigate}
      />
    </View>
  );
}

// ========================================
// TABLET ICON BUTTON
// ========================================

interface RailIconButtonProps {
  item: NavItem;
  active: boolean;
  onPress: (route: Href) => void;
}

function RailIconButton({
  item,
  active,
  onPress,
}: RailIconButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(item.route)}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.railButton,
        {
          backgroundColor: pressed
            ? colors.surfaceMuted
            : active
              ? colors.surfaceAlt
              : "transparent",
        },
      ]}
    >
      <Ionicons
        name={item.icon}
        size={22}
        color={
          active
            ? colors.primary
            : colors.textSecondary
        }
      />
    </Pressable>
  );
}

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  shell: {
    flex: 1,
    flexDirection: "row",
  },

  desktopContent: {
    flex: 1,
    alignItems: "center",
  },

  desktopColumn: {
    flex: 1,
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
  },

  desktopRail: {
    width: DESKTOP_RAIL_WIDTH,
    flexShrink: 0,
    borderRightWidth: borderWidth.hairline,
  },

  brand: {
    marginBottom: spacing.xxxl,
    paddingHorizontal: spacing.md,
  },

  tagline: {
    marginTop: 2,
  },

  group: {
    marginTop: spacing.xl,
  },

  groupTitle: {
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },

  railBottom: {
    borderTopWidth: borderWidth.hairline,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  tabletContent: {
    flex: 1,
  },

  tabletRail: {
    width: TABLET_RAIL_WIDTH,
    flexShrink: 0,
    borderRightWidth: borderWidth.hairline,
    alignItems: "center",
  },

  tabletItems: {
    flex: 1,
    alignSelf: "stretch",
    marginVertical: spacing.lg,
  },

  tabletItemsContent: {
    alignItems: "center",
    gap: spacing.xs,
  },

  railButton: {
    width: RAIL_BUTTON_SIZE,
    height: RAIL_BUTTON_SIZE,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
