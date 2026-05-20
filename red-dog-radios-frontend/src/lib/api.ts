import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("rdg_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth endpoints render their own inline errors — never auto-logout on 401.
const AUTH_ENDPOINT_FRAGMENTS = [
  "auth/login",
  "auth/register",
  "auth/forgot-password",
  "auth/verify-email",
  "auth/verify-otp",
  "auth/resend-verification",
  "auth/reset-password",
] as const;

// Background / optional endpoints. A 401 from these should NEVER tear down the
// session — they're typically fired by useQuery on mount, fire-and-forget,
// or in parallel with primary flows. Killing the session on a transient 401
// from these (especially right after onboarding completes) silently boots the
// user to /login despite having a valid token.
const NON_CRITICAL_ENDPOINT_FRAGMENTS = [
  "/matches/compute-all",
  "/matches/compute",
  "/nylas/oauth/status",
  "/nylas/oauth/status-self",
  "/coupons/validate",
  "/coupons/redeem",
  "/ashleen/chat",
  "/replies/agency/replies",
] as const;

const matchesFragment = (url: string, fragments: readonly string[]) =>
  fragments.some((f) => url.includes(f));

// Require two consecutive 401s on a critical endpoint within this window before
// wiping the session. A single transient 401 (mongo lag, replica failover,
// briefly-missing Authorization header on a retry) should be recoverable.
const UNAUTH_THRESHOLD = 2;
const UNAUTH_WINDOW_MS = 4000;
let unauthorizedHits: number[] = [];

// Pages where we must NEVER force-redirect to /login on a 401. These are the
// auth-flow screens themselves — the user is in the middle of authenticating
// and bouncing them to /login (or back to /login) is precisely the bug we are
// trying to avoid.
const AUTH_FLOW_PATHS = [
  "/login",
  "/signup",
  "/otp-verification",
  "/forgot-password",
  "/create-password",
];

const isOnAuthFlowPath = () => {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  return AUTH_FLOW_PATHS.some((path) => p === path || p.startsWith(`${path}/`));
};

const clearAgencySession = () => {
  if (typeof window === "undefined") return;

  // If the user is already on an auth-flow page (signup, OTP, forgot, etc.)
  // we should NOT yank them to /login mid-flow because of a 401 from some
  // background request fired by stale state. Clear cookies/storage so the
  // stale-token chain stops, but stay on the current page.
  const onAuthFlow = isOnAuthFlowPath();

  localStorage.removeItem("rdg_token");
  localStorage.removeItem("rdg_user");
  document.cookie = "rdg_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "rdg_onboarding=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

  if (onAuthFlow) return;
  if (window.location.pathname.startsWith("/login")) return;
  window.location.href = "/login";
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const reqUrl = String(error.config?.url ?? "");

      // Auth screens own their errors — never auto-logout from these.
      if (matchesFragment(reqUrl, AUTH_ENDPOINT_FRAGMENTS)) {
        return Promise.reject(error);
      }

      // Background / optional endpoints: do NOT clear session. The caller can
      // handle the error locally if it wants to. This prevents a single fire-
      // and-forget 401 from kicking a freshly-onboarded user to /login.
      if (matchesFragment(reqUrl, NON_CRITICAL_ENDPOINT_FRAGMENTS)) {
        return Promise.reject(error);
      }

      // If the user is in the middle of an auth flow (signup/otp/etc.), do not
      // tally 401s — a stale cookie firing data requests on a background page
      // must not boot the user mid-flow.
      if (isOnAuthFlowPath()) {
        return Promise.reject(error);
      }

      // No real session existed to begin with — 401s here are "phantom" 401s
      // from background requests with a stale cookie but no localStorage token.
      // Wipe cookies (handled by clearAgencySession when threshold hits) but
      // never bounce a user who was never logged in to /login.
      const hadSession = !!localStorage.getItem("rdg_token");

      // Debounce: require two consecutive critical-endpoint 401s in a short
      // window before tearing down the session.
      const now = Date.now();
      unauthorizedHits = unauthorizedHits.filter((t) => now - t < UNAUTH_WINDOW_MS);
      unauthorizedHits.push(now);

      if (unauthorizedHits.length >= UNAUTH_THRESHOLD) {
        unauthorizedHits = [];
        if (hadSession) {
          clearAgencySession();
        } else {
          // Just clear the stale cookie, do not navigate.
          document.cookie = "rdg_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "rdg_onboarding=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
