import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

/**
 * The four states every data-driven screen has to handle.
 * - unavailable: no data source is connected for this data
 * - loading:     first load in progress
 * - error:       first load failed
 * - ready:       data is available (may be re-fetching in the background)
 */
export type Resource<T> =
  | { status: "unavailable" }
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | {
      status: "ready";
      data: T;
      /** True only while a user-initiated (pull-to-refresh) reload runs. */
      refreshing: boolean;
      refresh: () => void;
    };

/**
 * Loads data through `load` (or reports "unavailable" when it is null).
 * Re-fetches silently whenever the screen regains focus, and keeps showing
 * the previous data if a background refresh fails.
 *
 * `load` must be a stable reference (a module-level function).
 */
export function useResource<T>(load: (() => Promise<T>) | null): Resource<T> {
  const requestRef = useRef(0);
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    return () => {
      // Ignore any request still in flight after unmount.
      requestRef.current += 1;
    };
  }, []);

  const run = useCallback(
    async (manual: boolean) => {
      if (!load) {
        return;
      }

      const id = ++requestRef.current;

      if (manual) {
        setRefreshing(true);
      }

      try {
        const next = await load();

        if (id === requestRef.current) {
          setData(next);
          setFailed(false);
        }
      } catch (error) {
        if (id === requestRef.current) {
          console.warn("[useResource] load failed", error);
          setFailed(true);
        }
      } finally {
        if (id === requestRef.current) {
          setRefreshing(false);
        }
      }
    },
    [load],
  );

  useFocusEffect(
    useCallback(() => {
      run(false);
    }, [run]),
  );

  if (!load) {
    return { status: "unavailable" };
  }

  if (data !== null) {
    return {
      status: "ready",
      data,
      refreshing,
      refresh: () => {
        run(true);
      },
    };
  }

  if (failed) {
    return {
      status: "error",
      retry: () => {
        setFailed(false);
        run(false);
      },
    };
  }

  return { status: "loading" };
}

/** Pull-to-refresh props for a screen driven by a single resource. */
export function refreshProps<T>(resource: Resource<T>) {
  return resource.status === "ready"
    ? { refreshing: resource.refreshing, onRefresh: resource.refresh }
    : {};
}   