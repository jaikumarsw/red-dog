"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useAdminAuth } from "@/lib/AdminAuthContext";

const AGENCY_AUTH_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/otp-verification",
  "/create-password",
];

function isAgencyAuthPath(pathname: string | null) {
  if (!pathname) return false;
  return AGENCY_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Sends already-signed-in users away from auth screens (login, signup, password flows, staff login).
 * If both portal sessions exist, staff wins. Staff-only session still allows agency login/forgot-password flows.
 */
export function useAuthGateRedirects() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated: agencyAuthed, user } = useAuth();
  const { isAuthenticated: adminAuthed } = useAdminAuth();

  useEffect(() => {
    if (pathname?.startsWith("/admin")) {
      if ((pathname === "/admin/login" || pathname.startsWith("/admin/login/")) && adminAuthed) {
        router.replace("/admin/dashboard");
      }
      return;
    }

    if (adminAuthed && agencyAuthed) {
      router.replace("/admin/dashboard");
      return;
    }

    if (agencyAuthed && user) {
      router.replace(user.onboardingCompleted ? "/dashboard" : "/onboarding");
      return;
    }

    if (adminAuthed && isAgencyAuthPath(pathname)) {
      return;
    }

    if (adminAuthed) {
      router.replace("/admin/dashboard");
    }
  }, [adminAuthed, agencyAuthed, user, router, pathname]);
}
