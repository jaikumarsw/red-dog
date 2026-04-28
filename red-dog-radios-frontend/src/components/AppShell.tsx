"use client";

import type { ReactNode } from "react";
import { AppShellLayout, type ShellMenuItem } from "./AppShellLayout";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { qk } from "@/lib/queryKeys";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const { data: unread } = useQuery<{ unread: number }>({
    queryKey: qk.repliesMyUnread(),
    queryFn: async () => {
      const res = await api.get("/replies/my/unread-count");
      return res.data.data as { unread: number };
    },
    enabled: !!user,
    retry: false,
    refetchInterval: 60_000,
  });

  const menuItems: ShellMenuItem[] = [
    { id: "dashboard", label: "Dashboard", icon: "/figmaAssets/svg-8.svg", path: "/dashboard" },
    { id: "opportunities", label: "Opportunities", icon: "/figmaAssets/svg-14.svg", path: "/opportunities" },
    { id: "applications", label: "Applications", icon: "/figmaAssets/svg-11.svg", path: "/applications" },
    { id: "funders", label: "Funders", icon: "/figmaAssets/svg-12.svg", path: "/funders" },
    { id: "outbox", label: "Outbox", icon: "/figmaAssets/svg-9.svg", path: "/outbox" },
    {
      id: "replies",
      label: "Replies",
      icon: "/figmaAssets/svg-4.svg",
      path: "/replies",
      badge: unread?.unread ? String(unread.unread) : undefined,
    },
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
