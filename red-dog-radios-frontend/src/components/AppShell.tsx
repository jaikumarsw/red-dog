"use client";

import type { ReactNode } from "react";
import { AppShellLayout, type ShellMenuItem } from "./AppShellLayout";
import { useAuth } from "@/lib/AuthContext";

const menuItems: ShellMenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "/figmaAssets/svg-8.svg", path: "/dashboard" },
  { id: "opportunities", label: "Opportunities", icon: "/figmaAssets/svg-14.svg", path: "/opportunities" },
  { id: "applications", label: "Applications", icon: "/figmaAssets/svg-11.svg", path: "/applications" },
  { id: "funders", label: "Funders", icon: "/figmaAssets/svg-12.svg", path: "/funders" },
  { id: "weekly-summary", label: "Weekly Summary", icon: "/figmaAssets/svg-3.svg", path: "/weekly-summary" },
];

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();

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
