"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/AppShell";

const STANDALONE_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/otp-verification",
  "/create-password",
  "/onboarding",
  "/privacy-policy",
  "/terms-of-use",
];

function usesStandaloneLayout(pathname: string | null): boolean {
  if (!pathname) return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  return STANDALONE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function ConditionalAppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (usesStandaloneLayout(pathname)) {
    return <>{children}</>;
  }
  return <AppShell>{children}</AppShell>;
}
