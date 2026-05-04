"use client";

import type { ReactNode } from "react";
import { AppShellLayout, type ShellMenuItem } from "./AppShellLayout";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Inbox as InboxIcon } from "lucide-react";
import api from "@/lib/api";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();

  const { data: unreadCount } = useQuery({
    queryKey: ["agency-replies-unread"],
    queryFn: async () => {
      const res = await api.get("/replies/agency/replies", { params: { limit: 1 } });
      return res.data.data.unread || 0;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const menuItems: ShellMenuItem[] = [
    { id: "dashboard", label: "Dashboard", icon: "/figmaAssets/svg-8.svg", path: "/dashboard" },
    { id: "opportunities", label: "Opportunities", icon: "/figmaAssets/svg-14.svg", path: "/opportunities" },
    { id: "applications", label: "Applications", icon: "/figmaAssets/svg-11.svg", path: "/applications" },
    { id: "inbox", label: "Inbox", icon: InboxIcon, path: "/inbox", badge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : undefined },
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
