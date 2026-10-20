
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import { usePathname } from "expo-router";
import type { Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import { NavRow } from "./NavRow";

import {
  isNavItemActive,
  navSections,
  overviewItem,
  settingsItem,
  toPathname,
} from "./navItems";

// Re-export existing navigation items.
export type { NavItem } from "./navItems";

export {
  advancedItems,
  coreItems,
  dailyItems,
  overviewItem,
  settingsItem,
} from "./navItems";

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const ANIMATION_MS = 240;
const NAVIGATE_CLOSE_DELAY_MS = ANIMATION_MS + 20;
const BACKDROP_OPACITY = 0.5;

export default function AppDrawer({
  visible,
  onClose,
}: AppDrawerProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // IMPORTANT: Hooks must be called inside the component.
  const go = useTransitionNavigate();

  const drawerWidth = Math.min(width * 0.84, 360);

  const progress = useRef(new Animated.Value(0)).current;

  const navigateTimeout =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isMounted, setIsMounted] = useState(visible);

  // ========================================
  // DRAWER ANIMATION
  // ========================================

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
    }

    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished && !visible) {
        setIsMounted(false);
      }
    });

    return () => {
      animation.stop();
    };
  }, [visible, progress]);

  // ========================================
  // CLEANUP
  // ========================================

  useEffect(() => {
    return () => {
      if (navigateTimeout.current) {
        clearTimeout(navigateTimeout.current);
      }
    };
  }, []);

  // ========================================
  // SIDEBAR NAVIGATION
  // ========================================

  const navigate = useCallback(
    (route: Href) => {
      // Close the drawer first.
      onClose();

      // Do not navigate to the current section.
      if (toPathname(route) === pathname) {
        return;
      }

      // Cancel any previously queued navigation.
      if (navigateTimeout.current) {
        clearTimeout(navigateTimeout.current);
      }

      // Start the shared Vita transition after the drawer closes.
      navigateTimeout.current = setTimeout(() => {
        navigateTimeout.current = null;
        go(route);
      }, NAVIGATE_CLOSE_DELAY_MS);
    },
    [onClose, pathname, go],
  );

  // ========================================
  // DRAWER STYLES
  // ========================================

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BACKDROP_OPACITY],
  });

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      visible={isMounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <View
        style={styles.modal}
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        />

        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessible={false}
          importantForAccessibility="no"
        />

        <Animated.View
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              backgroundColor: colors.backgroundElevated,
              borderRightColor: colors.border,
              paddingTop: insets.top + spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              transform: [{ translateX }],
            },
          ]}
        >
          {/* HEADER */}

          <View style={styles.header}>
            <View>
              <Text variant="heading2">Vita</Text>

              <Text
                variant="label"
                tone="muted"
                style={styles.tagline}
              >
                A daily record
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              style={({ pressed }) => [
                styles.closeButton,
                pressed && {
                  backgroundColor: colors.surfaceAlt,
                },
              ]}
            >
              <Ionicons
                name="close"
                size={22}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* NAVIGATION ITEMS */}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <NavRow
              item={overviewItem}
              active={isNavItemActive(
                overviewItem,
                pathname,
              )}
              onPress={navigate}
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
                    onPress={navigate}
                  />
                ))}
              </View>
            ))}
          </ScrollView>

          {/* SETTINGS */}

          <View
            style={[
              styles.bottom,
              { borderTopColor: colors.border },
            ]}
          >
            <NavRow
              item={settingsItem}
              active={isNavItemActive(
                settingsItem,
                pathname,
              )}
              onPress={navigate}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    flexDirection: "row",
  },

  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },

  drawer: {
    flexShrink: 0,
    borderRightWidth: borderWidth.hairline,
    paddingHorizontal: spacing.lg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
    paddingLeft: spacing.md,
  },

  tagline: {
    marginTop: 2,
  },

  closeButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: spacing.lg,
  },

  group: {
    marginTop: spacing.xl,
  },

  groupTitle: {
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },

  bottom: {
    borderTopWidth: borderWidth.hairline,
    paddingTop: spacing.sm,
  },
});
