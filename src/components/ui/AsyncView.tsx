import React from "react";

import type { Resource } from "../../data/resource";
import { ErrorState, LoadingState } from "./states";

interface AsyncViewProps<T> {
  resource: Resource<T>;
  /** Rendered when no data source is connected. */
  unavailable: React.ReactNode;
  children: (data: T) => React.ReactNode;
}

/** Renders the right thing for each state of a resource. */
export function AsyncView<T>({
  resource,
  unavailable,
  children,
}: AsyncViewProps<T>) {
  switch (resource.status) {
    case "unavailable":
      return <>{unavailable}</>;
    case "loading":
      return <LoadingState />;
    case "error":
      return <ErrorState onRetry={resource.retry} />;
    case "ready":
      return <>{children(resource.data)}</>;
  }
}