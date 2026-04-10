import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/otp-verification",
  "/create-password",
  "/admin",
];

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

  const token = request.cookies.get("rdg_token")?.value;
  const onboardingCookie = request.cookies.get("rdg_onboarding")?.value;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (token && isPublicPath) {
    if (onboardingCookie === "0") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && onboardingCookie === "0" && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (token && onboardingCookie === "1" && pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
