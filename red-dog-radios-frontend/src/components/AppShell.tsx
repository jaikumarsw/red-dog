"use client";

import type { ReactNode } from "react";
import { AppShellLayout, type ShellMenuItem } from "./AppShellLayout";
import { useAuth } from "@/lib/AuthContext";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();

  const menuItems: ShellMenuItem[] = [
    { id: "dashboard", label: "Dashboard", icon: "/figmaAssets/svg-8.svg", path: "/dashboard" },
    { id: "opportunities", label: "Opportunities", icon: "/figmaAssets/svg-14.svg", path: "/opportunities" },
    { id: "applications", label: "Applications", icon: "/figmaAssets/svg-11.svg", path: "/applications" },
    { id: "outbox", label: "Outbox", icon: "/figmaAssets/svg-9.svg", path: "/outbox" },
    { id: "weekly-summary", label: "Weekly Summary", icon: "/figmaAssets/svg-3.svg", path: "/weekly-summary" },
    { id: "billing", label: "Billing", icon: "/figmaAssets/svg-6.svg", path: "/account/billing" },
  ];

  return (
    <AppShellLayout
      menuItems={menuItems}
      activePathMatchesPrefix={false}
      user={user}
      onLogout={logout}
      signOutRedirectPath="/login"
      profilePath="/settings"
      showAshleen
    >
      {children}
    </AppShellLayout>
  );
};
