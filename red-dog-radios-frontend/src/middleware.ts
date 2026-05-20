import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AGENCY_PUBLIC = [
  "/login",
  "/signup",
  "/forgot-password",
  "/otp-verification",
  "/create-password",
];

// Pages that must always render regardless of any session cookies. This
// prevents a stale/expired rdg_token cookie from bouncing users off these
// auth-flow screens into /dashboard (which would then 401 on data fetches
// and kick them to /login). All mid-flow auth screens MUST be listed here
// so a leftover cookie from a previous session cannot break sign-up, OTP,
// password reset, or sign-in.
const AGENCY_UNCONDITIONAL = [
  "/signup",
  "/otp-verification",
  "/forgot-password",
  "/create-password",
];

const PUBLIC_ALWAYS = ["/privacy-policy", "/terms-of-use"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/figmaAssets") ||
    pathname.includes(".") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_ALWAYS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const agencyToken = request.cookies.get("rdg_token")?.value;
  const adminToken = request.cookies.get("rdg_admin_token")?.value;
  const onboardingCookie = request.cookies.get("rdg_onboarding")?.value;

  const isAdminLogin = pathname === "/admin/login";
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminArea) {
    if (isAdminLogin) {
      if (adminToken) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      if (agencyToken) {
        const dest =
          onboardingCookie === "0" ? "/onboarding" : "/dashboard";
        return NextResponse.redirect(new URL(dest, request.url));
      }
      return NextResponse.next();
    }
    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  const isAgencyPublic = AGENCY_PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isUnconditional = AGENCY_UNCONDITIONAL.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (adminToken && isAgencyPublic && !isUnconditional) {
    // Agency session ended but staff cookie remains — still allow agency auth screens
    if (!agencyToken) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (agencyToken && isAgencyPublic && !isUnconditional) {
    if (onboardingCookie === "0") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!agencyToken && !isAgencyPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (agencyToken && onboardingCookie === "0" && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // /onboarding/results is the success screen shown immediately after
  // /onboarding/complete and is also the Nylas OAuth return target
  // (?email=connected). It must stay reachable even though onboarding=1.
  if (
    agencyToken &&
    onboardingCookie === "1" &&
    pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/onboarding/results")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
