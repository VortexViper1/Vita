import React, { useState } from "react";

import { Screen } from "../ui/Screen";
import AppDrawer from "./AppDrawer";
import AppHeader from "./AppHeader";

interface TabScreenProps {
  title: string;
  subtitle: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}

/** Screen with the standard app header and drawer. */
export function TabScreen({
  title,
  subtitle,
  refreshing,
  onRefresh,
  children,
}: TabScreenProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      overlay={
        <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      }
      header={
        <AppHeader
          onMenuPress={() => setDrawerOpen(true)}
          title={title}
          subtitle={subtitle}
        />
      }
    >
      {children}
    </Screen>
  );
}