import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Appearance, ColorSchemeName } from "react-native";

import { AppColors, darkColors, lightColors } from "./colors";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  colors: AppColors;
  /**
   * True once the persisted theme preference has been read from storage
   * (successfully or not). Consumers that want to avoid a theme flash on
   * cold start (e.g. a splash screen) can gate on this.
   */
  isReady: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const STORAGE_KEY = "@health_tracker/theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function resolveTheme(
  mode: ThemeMode,
  systemScheme: ColorSchemeName,
): ResolvedThemeMode {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  return systemScheme === "light" ? "light" : "dark";
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isReady, setIsReady] = useState(false);

  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    () => Appearance.getColorScheme() ?? "dark",
  );

  // Set once the user has explicitly picked a mode, so a late-resolving
  // storage read can't overwrite a choice made while it was in flight.
  const userOverrodeRef = useRef(false);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? "dark");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!mounted || userOverrodeRef.current) {
          return;
        }

        if (isThemeMode(stored)) {
          setModeState(stored);
        }
      })
      .catch(() => {
        // Keep system mode if storage fails.
      })
      .finally(() => {
        if (mounted) {
          setIsReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode): Promise<void> => {
    userOverrodeRef.current = true;
    setModeState(nextMode);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // Theme still changes for the current session even if persistence fails.
    }
  }, []);

  const resolvedMode = resolveTheme(mode, systemScheme);

  const colors: AppColors =
    resolvedMode === "dark" ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      colors,
      isReady,
      setMode,
    }),
    [mode, resolvedMode, colors, isReady, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}