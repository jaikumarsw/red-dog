"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ArrowRight,
  Sparkles,
  FileText,
  Radio,
  MessageCircle,
  Lock,
  Star,
  Check,
  Mail,
  Repeat,
  Infinity as InfinityIcon,
  Zap,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Tier = { key: string; name: string; price: number; features: string[] };

// Each usage metric returned by /api/billing/status. `limit: null` and
// `unlimited: true` are equivalent — both mean "no cap" (Premium / beta).
type UsageMetric = {
  used: number;
  limit: number | null;
  remaining: number | null;
  unlimited: boolean;
};

type UsageLimits = {
  tier: string;
  periodStart?: string | Date;
  periodEnd?: string | Date;
  privateFoundationAccess?: boolean;
  usage: {
    ashleenDrafts: UsageMetric;
    outreachEmails: UsageMetric;
    chatMessages: UsageMetric;
    outboxSends: UsageMetric;
  };
};

type BillingStatus = {
  betaAccess?: boolean;
  hasAccess?: boolean;
  status?: string;
  tier?: string;
  currentPeriodEnd?: string | number | Date;
  cancelAtPeriodEnd?: boolean;
  usageLimits?: UsageLimits | null;
};

const USAGE_ROWS: Array<{
  key: keyof UsageLimits["usage"];
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Sparkles;
  accent: string;
  ring: string;
}> = [
  {
    key: "ashleenDrafts",
    label: "Apply with Ashleen drafts",
    shortLabel: "Grant drafts",
    description: "New AI grant applications generated this period.",
    icon: Sparkles,
    accent: "from-[#ef3e34] to-[#ff6b5c]",
    ring: "#ef3e34",
  },
  {
    key: "outreachEmails",
    label: "Outreach emails generated",
    shortLabel: "Outreach emails",
    description: "AI-drafted funder outreach emails created or regenerated this period.",
    icon: Repeat,
    accent: "from-[#f97316] to-[#fb923c]",
    ring: "#f97316",
  },
  {
    key: "chatMessages",
    label: "Ashleen chat messages",
    shortLabel: "Ashleen chat",
    description: "Conversations with the AI grant expert.",
    icon: MessageCircle,
    accent: "from-[#8b5cf6] to-[#a78bfa]",
    ring: "#8b5cf6",
  },
  {
    key: "outboxSends",
    label: "Outbound emails sent",
    shortLabel: "Emails sent",
    description: "Emails delivered to funders through your connected inbox.",
    icon: Mail,
    accent: "from-[#0ea5e9] to-[#38bdf8]",
    ring: "#0ea5e9",
  },
];

const usageStatusLabel = (used: number, limit: number | null, unlimited: boolean) => {
  if (unlimited || limit === null) {
    if (used === 0) return "Ready when you are";
    if (used === 1) return "1 action this period";
    return `${used} actions this period`;
  }
  const pct = limit === 0 ? 100 : (used / limit) * 100;
  if (pct >= 100) return "Limit reached";
  if (pct >= 75) return "Running low";
  if (used === 0) return "Not used yet";
  return "Healthy usage";
};

const usageStatusTone = (used: number, limit: number | null, unlimited: boolean) => {
  if (unlimited || limit === null) return "text-emerald-700 bg-emerald-50 ring-emerald-100";
  const pct = limit === 0 ? 100 : (used / limit) * 100;
  if (pct >= 100) return "text-red-700 bg-red-50 ring-red-100";
  if (pct >= 75) return "text-amber-700 bg-amber-50 ring-amber-100";
  return "text-emerald-700 bg-emerald-50 ring-emerald-100";
};

const UsageRing = ({
  pct,
  color,
  unlimited,
  size = 88,
}: {
  pct: number;
  color: string;
  unlimited: boolean;
  size?: number;
}) => {
  const stroke = Math.max(5, Math.round(size * 0.08));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const displayPct = unlimited ? 100 : Math.min(100, Math.max(0, pct));
  const offset = circumference - (displayPct / 100) * circumference;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {unlimited ? (
          <InfinityIcon className={cn(size <= 72 ? "h-5 w-5" : "h-6 w-6", "text-emerald-600")} />
        ) : (
          <span
            className={cn(
              "[font-family:'Oswald',Helvetica] font-bold tabular-nums text-gray-900",
              size <= 72 ? "text-base" : "text-lg"
            )}
          >
            {Math.round(displayPct)}%
          </span>
        )}
      </div>
    </div>
  );
};

const usageBarColor = (used: number, limit: number | null) => {
  if (limit === null) return "bg-emerald-500";
  const pct = limit === 0 ? 0 : (used / limit) * 100;
  if (pct >= 100) return "bg-red-500";
  if (pct >= 75) return "bg-amber-500";
  return "bg-[#ef3e34]";
};

const BASIC_LIMITS = {
  ashleenDrafts: 20,
  outreachEmails: 15,
  chatMessages: 75,
  outboxSends: 50,
} as const;

const buildFallbackUsageLimits = (status: BillingStatus): UsageLimits => {
  const tier =
    status.betaAccess || status.tier === "premium"
      ? "premium"
      : status.tier === "basic"
        ? "basic"
        : "premium";
  const unlimited = tier === "premium" || status.betaAccess === true;

  const mk = (used: number, key: keyof typeof BASIC_LIMITS): UsageMetric => {
    const limit = unlimited ? null : BASIC_LIMITS[key];
    return {
      used,
      limit,
      remaining: limit === null ? null : Math.max(0, limit - used),
      unlimited: limit === null,
    };
  };

  const end = new Date();
  end.setMonth(end.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return {
    tier,
    periodEnd: end,
    usage: {
      ashleenDrafts: mk(0, "ashleenDrafts"),
      outreachEmails: mk(0, "outreachEmails"),
      chatMessages: mk(0, "chatMessages"),
      outboxSends: mk(0, "outboxSends"),
    },
  };
};

const UNLOCK_ITEMS = [
  {
    icon: Sparkles,
    title: "AI grant writing",
    desc: "Full application drafts, outreach email generation, and funder-aligned tone across the platform.",
  },
  {
    icon: MessageCircle,
    title: "Ashleen assistant",
    desc: "Chat with your grant expert for strategy, sections, and funder questions.",
  },
  {
    icon: FileText,
    title: "Weekly digest & outreach",
    desc: "AI-powered weekly summaries and funder outreach drafts.",
  },
  {
    icon: Radio,
    title: "Smart matching",
    desc: "Prioritized fit scores and tools to act on the best opportunities.",
  },
];

export default function BillingPage() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    data: status,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<BillingStatus>({
    queryKey: ["billing", "status", "detail"],
    queryFn: async () => {
      const res = await api.get("/billing/status");
      return res.data?.data as BillingStatus;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: tiers = [] } = useQuery<Tier[]>({
    queryKey: ["billing", "tiers"],
    queryFn: async () => {
      const res = await api.get("/billing/tiers");
      return (res.data?.data || []) as Tier[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  // Refetch when returning via back/forward cache or when route is re-entered.
  useEffect(() => {
    void refetch();
  }, [pathname, refetch]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void refetch();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [refetch]);

  const handleManage = async () => {
    try {
      const res = await api.post("/billing/portal");
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err) {
      console.error("Failed to open portal:", err);
      alert("Failed to open billing portal. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[480px] w-full items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-[#ef3e34]" />
          <p className="[font-family:'Montserrat',Helvetica] text-sm text-gray-500">Loading subscription…</p>
        </div>
      </div>
    );
  }

  const isBeta = status?.betaAccess;
  const isPastDue = status?.status === "past_due";
  const hasPlan = !!status && status.tier !== "none";
  const hasAccess = Boolean(status?.hasAccess || isBeta || hasPlan);
  const usageFromApi = status?.usageLimits ?? null;
  const usageLimits =
    usageFromApi ?? (status && hasAccess && !isError ? buildFallbackUsageLimits(status) : null);
  const usingFallbackUsage = Boolean(status && hasAccess && !usageFromApi && !isError);
  const showUsage = Boolean(hasAccess && usageLimits && !isError);
  const isUnlimitedPlan = usageLimits?.tier === "premium" || isBeta;

  const totalUsed = usageLimits
    ? USAGE_ROWS.reduce((sum, { key }) => sum + (usageLimits.usage[key]?.used ?? 0), 0)
    : 0;

  const totalRemaining = usageLimits
    ? USAGE_ROWS.reduce((sum, { key }) => {
        const m = usageLimits.usage[key];
        if (!m || m.unlimited || m.limit === null || m.remaining === null) return sum;
        return sum + m.remaining;
      }, 0)
    : 0;

  const cappedMetrics = usageLimits
    ? USAGE_ROWS.map(({ key }) => usageLimits.usage[key]).filter(
        (m) => m && !m.unlimited && m.limit !== null
      )
    : [];

  const anyAtLimit = cappedMetrics.some(
    (m) => m && m.limit !== null && m.used >= m.limit
  );

  return (
    <div className="flex w-full min-w-0 flex-col px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <div className="relative mx-auto w-full max-w-[1100px]">
        {/* subtle top accent — scoped to content column so it aligns with card */}
        <div
          className="pointer-events-none absolute -top-4 left-0 right-0 h-32 rounded-b-[2rem] bg-gradient-to-b from-[#fff0f0] to-transparent opacity-90 sm:h-40"
          aria-hidden
        />

        <div className="relative flex w-full flex-col gap-8">
        <header className="pt-1">
          <p className="[font-family:'Montserrat',Helvetica] text-xs font-semibold uppercase tracking-[0.2em] text-[#ef3e34]">
            Account
          </p>
          <h1 className="mt-1 [font-family:'Oswald',Helvetica] text-3xl font-bold uppercase tracking-tight text-black sm:text-4xl">
            Billing & Subscription
          </h1>
          <p className="mt-2 max-w-2xl [font-family:'Montserrat',Helvetica] text-base text-gray-600">
            Manage your plan, payment methods, and invoices. Your subscription unlocks AI grant tools across the platform.
          </p>
        </header>

        {isPastDue && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/50 p-4 shadow-sm sm:flex-row sm:items-center">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-700" />
            <div className="flex-1">
              <p className="[font-family:'Montserrat',Helvetica] text-sm font-bold text-amber-900">
                Payment overdue
              </p>
              <p className="mt-0.5 text-xs text-amber-800 [font-family:'Montserrat',Helvetica]">
                Update your payment method to keep AI grant writing and premium features active.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleManage}
              className="shrink-0 bg-amber-600 font-bold text-white hover:bg-amber-700"
            >
              Update payment
            </Button>
          </div>
        )}

        {isError && (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1 min-w-0">
              <p className="[font-family:'Montserrat',Helvetica] text-sm font-bold text-red-900">
                Could not load billing data
              </p>
              <p className="mt-0.5 text-xs text-red-800 [font-family:'Montserrat',Helvetica]">
                {(error as Error)?.message || "Check your connection and try again."}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-red-200 bg-white font-bold text-red-700 hover:bg-red-100"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Retry
            </Button>
          </div>
        )}

        {isBeta && (
          <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-white p-5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="[font-family:'Oswald',Helvetica] text-lg font-bold uppercase tracking-wide text-green-900">
                Beta access active
              </p>
              <p className="mt-1 text-sm text-green-800 [font-family:'Montserrat',Helvetica]">
                Full platform access through your beta code — including Premium-tier AI features.
              </p>
            </div>
          </div>
        )}

        {showUsage && (
          <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
            {/* Hero header */}
            <div className="relative overflow-hidden border-b border-[#f0f0f0] bg-gradient-to-br from-[#1a1a1a] via-[#2d1515] to-[#1a1a1a] px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#ef3e34]/20 blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-[#ef3e34]/10 blur-2xl"
                aria-hidden
              />

              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90 ring-1 ring-white/15 [font-family:'Montserrat',Helvetica]">
                      <Zap className="h-3 w-3 text-[#ff8a80]" />
                      AI activity
                    </span>
                    {isUnlimitedPlan && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30 [font-family:'Montserrat',Helvetica]">
                        <InfinityIcon className="h-3 w-3" />
                        Unlimited plan
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 [font-family:'Oswald',Helvetica] text-2xl font-bold uppercase tracking-wide text-white sm:text-3xl lg:text-4xl">
                    Usage this period
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70 [font-family:'Montserrat',Helvetica]">
                    {isUnlimitedPlan
                      ? "Your activity is tracked for visibility — nothing is blocked on your plan."
                      : "Live view of what you've used this billing period. Plenty of room left? Keep building."}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
                  <div className="flex-1 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm sm:min-w-[140px] sm:flex-none">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 [font-family:'Montserrat',Helvetica]">
                      Total actions
                    </p>
                    <p className="mt-1 flex items-baseline gap-1 [font-family:'Oswald',Helvetica] text-3xl font-bold text-white">
                      {totalUsed}
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </p>
                  </div>
                  {!isUnlimitedPlan && cappedMetrics.length > 0 && (
                    <div className="flex-1 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm sm:min-w-[140px] sm:flex-none">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 [font-family:'Montserrat',Helvetica]">
                        Remaining
                      </p>
                      <p className="mt-1 [font-family:'Oswald',Helvetica] text-3xl font-bold text-white">
                        {totalRemaining}
                      </p>
                    </div>
                  )}
                  {usageLimits!.periodEnd && (
                    <div className="flex items-center gap-2 rounded-xl bg-black/20 px-4 py-3 text-xs font-semibold text-white/80 ring-1 ring-white/10 [font-family:'Montserrat',Helvetica] sm:flex-none">
                      <Calendar className="h-4 w-4 text-white/60" />
                      Resets {format(new Date(usageLimits!.periodEnd), "MMM d")}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    disabled={isFetching}
                    className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-xs font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-60 [font-family:'Montserrat',Helvetica] sm:flex-none"
                  >
                    <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                    {isFetching ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
              </div>
            </div>

            {usingFallbackUsage && (
              <div className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-800 [font-family:'Montserrat',Helvetica] sm:px-6">
                Live usage counters unavailable — showing plan defaults. Deploy the latest backend or click Refresh.
              </div>
            )}

            {/* Metric cards — 1 col mobile, 2 col tablet/sidebar, 4 col wide screens */}
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-6 xl:grid-cols-4 xl:p-8">
              {USAGE_ROWS.map(({ key, shortLabel, description, icon: Icon, accent, ring }) => {
                const metric = usageLimits!.usage?.[key];
                if (!metric) return null;
                const isUnlimited = metric.unlimited || metric.limit === null;
                const pct =
                  isUnlimited || metric.limit === 0
                    ? 0
                    : Math.min(100, (metric.used / (metric.limit ?? 1)) * 100);
                const statusLabel = usageStatusLabel(metric.used, metric.limit, isUnlimited);
                const statusTone = usageStatusTone(metric.used, metric.limit, isUnlimited);

                return (
                  <div
                    key={key}
                    className="group relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border border-[#f0f0f0] bg-gradient-to-b from-white to-[#fafafa] p-4 shadow-sm transition-all duration-300 hover:border-[#ef3e34]/20 hover:shadow-[0_12px_32px_-12px_rgba(239,62,52,0.25)] sm:p-5 sm:hover:-translate-y-0.5"
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80",
                        accent
                      )}
                      aria-hidden
                    />

                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm sm:h-10 sm:w-10",
                          accent
                        )}
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <span
                        className={cn(
                          "max-w-[55%] truncate rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ring-1 sm:max-w-none sm:px-2.5 sm:text-[10px] [font-family:'Montserrat',Helvetica]",
                          statusTone
                        )}
                        title={statusLabel}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <UsageRing pct={pct} color={ring} unlimited={isUnlimited} size={72} />
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="[font-family:'Oswald',Helvetica] text-3xl font-bold tabular-nums leading-none text-gray-900 sm:text-4xl">
                          {metric.used}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500 [font-family:'Montserrat',Helvetica]">
                          {shortLabel}
                        </p>
                        {!isUnlimited && metric.limit !== null && (
                          <p className="mt-2 text-xs text-gray-500 [font-family:'Montserrat',Helvetica]">
                            of <span className="font-bold text-gray-800">{metric.limit}</span> included
                          </p>
                        )}
                        {isUnlimited && (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 [font-family:'Montserrat',Helvetica]">
                            <InfinityIcon className="h-3.5 w-3.5" />
                            No monthly cap
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700 ease-out",
                            isUnlimited
                              ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                              : usageBarColor(metric.used, metric.limit)
                          )}
                          style={{
                            width: isUnlimited
                              ? metric.used > 0
                                ? "100%"
                                : "8%"
                              : `${Math.max(pct, metric.used > 0 ? 4 : 0)}%`,
                          }}
                        />
                      </div>
                      <p className="line-clamp-2 text-[11px] leading-snug text-gray-500 [font-family:'Montserrat',Helvetica] sm:line-clamp-none">
                        <span className="font-semibold text-gray-600">{shortLabel}.</span>{" "}
                        <span className="hidden sm:inline">{description}</span>
                      </p>
                      {!isUnlimited && metric.remaining !== null && metric.remaining > 0 && (
                        <p className="text-xs font-semibold text-gray-700 [font-family:'Montserrat',Helvetica]">
                          {metric.remaining} remaining
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer CTA — only nudge upgrade when relevant, never hide usage */}
            {usageLimits!.tier === "basic" && (
              <div className="border-t border-[#f0f0f0] bg-gradient-to-r from-[#fff8f8] to-white px-6 py-5 sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900 [font-family:'Montserrat',Helvetica]">
                      {anyAtLimit
                        ? "You've hit a monthly cap on at least one feature."
                        : "Want unlimited AI across every feature?"}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600 [font-family:'Montserrat',Helvetica]">
                      Premium removes all monthly caps and unlocks private foundation access.
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/pricing")}
                    className="shrink-0 bg-[#ef3e34] font-bold text-white shadow-lg shadow-[#ef3e34]/20 hover:bg-[#d9382e] [font-family:'Montserrat',Helvetica]"
                  >
                    {anyAtLimit ? "Upgrade to continue" : "Explore Premium"}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        <Card className="overflow-hidden border-[#e8e8e8] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]">
          <div className="h-1 bg-gradient-to-r from-[#ef3e34] via-[#ff6b5c] to-[#ef3e34]" aria-hidden />
          <CardHeader className="border-b border-[#f0f0f0] bg-gradient-to-b from-[#fafafa] to-white pb-6 pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="[font-family:'Oswald',Helvetica] text-xl uppercase tracking-wide text-black">
                  Current plan
                </CardTitle>
                <CardDescription className="mt-1.5 text-sm text-gray-600 [font-family:'Montserrat',Helvetica]">
                  {hasPlan
                    ? isBeta
                      ? "Beta access includes Premium-tier AI features at no charge during the beta period."
                      : "Your agency is subscribed and billing runs through Stripe."
                    : "No active paid plan — upgrade to unlock AI grant writing and related tools."}
                </CardDescription>
              </div>
              {hasPlan && (
                <span
                  className={cn(
                    "inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider",
                    status.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-100 text-gray-700"
                  )}
                >
                  {String(status.status).replace("_", " ")}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {hasPlan ? (
              <div className="flex flex-col gap-6 p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ef3e34]/10 ring-1 ring-[#ef3e34]/20">
                      <CreditCard className="h-7 w-7 text-[#ef3e34]" />
                    </div>
                    <div>
                      <p className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase text-black">
                        {status.tier} plan
                      </p>
                      <p className="text-sm text-gray-500 [font-family:'Montserrat',Helvetica]">
                        {status.tier === "basic" ? "$225" : "$449"} per month
                      </p>
                    </div>
                  </div>

                  {!isBeta && (
                    <Button
                      onClick={handleManage}
                      variant="outline"
                      className="border-gray-200 font-bold shadow-sm [font-family:'Montserrat',Helvetica] hover:bg-gray-50"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Manage in Stripe
                    </Button>
                  )}
                </div>

                {status.currentPeriodEnd && !isBeta && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="[font-family:'Montserrat',Helvetica]">
                      Next billing date:{" "}
                      <strong>{format(new Date(status.currentPeriodEnd), "MMMM d, yyyy")}</strong>
                    </span>
                    {status.cancelAtPeriodEnd && (
                      <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                        Cancelling at period end
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-0 lg:grid-cols-[1fr_340px] lg:gap-0">
                <div className="border-b border-[#f0f0f0] p-6 sm:p-8 lg:border-b-0 lg:border-r">
                  <div className="mb-6 flex items-center gap-2 text-gray-500">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                      <Lock className="h-5 w-5 text-gray-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider [font-family:'Montserrat',Helvetica]">
                      Subscription required for AI features
                    </span>
                  </div>
                  <h3 className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase tracking-tight text-black sm:text-3xl">
                    Unlock the full grant intelligence stack
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-600 [font-family:'Montserrat',Helvetica]">
                    Subscribe to turn on AI application generation, Ashleen chat, weekly digest AI, outreach drafts, and
                    other premium tools — all tied to your agency profile and match scores.
                  </p>

                  <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                    {UNLOCK_ITEMS.map(({ icon: Icon, title, desc }) => (
                      <li
                        key={title}
                        className="flex gap-3 rounded-xl border border-[#f0f0f0] bg-[#fafafa]/50 p-4 transition-colors hover:border-[#ef3e34]/25 hover:bg-white"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ef3e34]/10">
                          <Icon className="h-4 w-4 text-[#ef3e34]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 [font-family:'Montserrat',Helvetica]">{title}</p>
                          <p className="mt-1 text-xs leading-snug text-gray-500 [font-family:'Montserrat',Helvetica]">
                            {desc}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      onClick={() => router.push("/pricing")}
                      size="lg"
                      className="bg-[#ef3e34] px-8 font-bold text-white shadow-lg shadow-[#ef3e34]/25 hover:bg-[#d9382e] [font-family:'Montserrat',Helvetica]"
                    >
                      Choose a plan
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-center text-xs text-gray-400 sm:text-left [font-family:'Montserrat',Helvetica]">
                      No free trial · Secure checkout via Stripe
                    </p>
                  </div>
                </div>

                <div className="bg-[#fafafa]/80 p-6 sm:p-8 lg:bg-gradient-to-b lg:from-[#fafafa] lg:to-white">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 [font-family:'Montserrat',Helvetica]">
                    Plans at a glance
                  </p>
                  <div className="mt-4 flex flex-col gap-3">
                    {tiers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                        Could not load plans.{" "}
                        <button type="button" className="font-bold text-[#ef3e34] underline" onClick={() => router.push("/pricing")}>
                          View pricing
                        </button>
                      </div>
                    ) : (
                      tiers.map((tier) => (
                        <button
                          key={tier.key}
                          type="button"
                          onClick={() => router.push("/pricing")}
                          className={cn(
                            "group w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:border-[#ef3e34]/40 hover:shadow-md",
                            tier.key === "premium" && "border-[#ef3e34]/30 ring-1 ring-[#ef3e34]/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="[font-family:'Oswald',Helvetica] text-lg font-bold uppercase text-black">
                                  {tier.name}
                                </span>
                                {tier.key === "premium" && (
                                  <Star className="h-3.5 w-3.5 fill-[#ef3e34] text-[#ef3e34]" />
                                )}
                              </div>
                              <p className="mt-1 [font-family:'Montserrat',Helvetica] text-2xl font-bold text-black">
                                ${tier.price}
                                <span className="text-sm font-medium text-gray-500">/mo</span>
                              </p>
                            </div>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#ef3e34]" />
                          </div>
                          <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                            {(tier.features || []).slice(0, 3).map((f) => (
                              <li key={f} className="flex items-start gap-2 text-xs text-gray-600 [font-family:'Montserrat',Helvetica]">
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </button>
                      ))
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    className="mt-4 w-full font-bold text-[#ef3e34] hover:bg-[#ef3e34]/5 [font-family:'Montserrat',Helvetica]"
                    onClick={() => router.push("/pricing")}
                  >
                    Compare all features
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <footer className="w-full rounded-2xl border border-dashed border-gray-200 bg-[#fafafa]/80 px-6 py-5">
          <p className="text-center text-sm text-gray-600 [font-family:'Montserrat',Helvetica] sm:text-left">
            Need help with your billing or plan? Contact our support team at{" "}
            <a
              href="mailto:support@reddogradios.com"
              className="font-bold text-[#ef3e34] hover:underline"
            >
              support@reddogradios.com
            </a>
            .
          </p>
        </footer>
        </div>
      </div>
    </div>
  );
}
