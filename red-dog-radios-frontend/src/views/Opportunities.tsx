"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Search, X, ExternalLink, Loader2, Calendar, DollarSign, Tag,
  Sparkles, Filter, ArrowRight, FileText, ChevronLeft, ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { qk } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────

interface Opportunity {
  _id: string;
  title: string;
  funder: string;
  deadline?: string;
  minAmount?: number;
  maxAmount?: number;
  sourceUrl?: string;
  applicationUrl?: string;
  contactEmail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  keywords?: string[];
  agencyTypes?: string[];
  description?: string;
  category?: string;
  status: "open" | "closing" | "closed";
  createdAt?: string;
  fitScore?: number | null;
  matchTier?: string | null;
  matchStatus?: string | null;
  winProbability?: number | null;
  matchReasons?: string[];
}

type RubricScores = {
  needScore?: number;
  projectDesignScore?: number;
  budgetScore?: number;
  capacityScore?: number;
  impactScore?: number;
  evaluationScore?: number;
  sustainabilityScore?: number;
  alignmentScore?: number;
  totalScore?: number;
  normalizedScore?: number;
};

type ApiMatchRow = {
  _id: string;
  fitScore?: number;
  winProbability?: number;
  rubricScores?: RubricScores;
  rubricTier?: "priority" | "strong" | "borderline" | "block";
  status?: string;
  state?: string;
  updatedAt?: string;
  reasons?: string[];
  fitReasons?: string[];
  aiReasoning?: string;
  notes?: string;
  organization?: { name: string };
  opportunity?: Opportunity;
};

type ExistingApp = {
  _id: string;
  status: string;
  opportunity?: { _id?: string } | string | null;
};

type RankedOpportunity = Opportunity & {
  fitScore: number | null;
  winProbability?: number | null;
  rubricScores?: RubricScores | null;
  rubricTier?: "priority" | "strong" | "borderline" | "block";
  matchId?: string;
  matchReasons: string[];
  matchStatus?: string;
  lastActivity?: string;
  orgName?: string;
  aiReasoning?: string;
};

type OpportunitiesResponse = {
  data: Opportunity[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  open: "bg-green-100 text-green-700 border-green-200",
  closing: "bg-orange-100 text-orange-700 border-orange-200",
  closed: "bg-gray-100 text-gray-500 border-gray-200",
};

const formatAmountRange = (min?: number, max?: number): string | null => {
  const fmt = (n: number) => "$" + n.toLocaleString();
  if (min != null && max != null && min > 0 && max > 0) return `${fmt(min)} – ${fmt(max)}`;
  if (max != null && max > 0) return `Up to ${fmt(max)}`;
  if (min != null && min > 0) return `From ${fmt(min)}`;
  return null;
};

const fmtDate = (d?: string) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtActivity = (s: string | undefined) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return s; }
};

const daysLeft = (d?: string) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
};

const scoreColor = (n: number | null | undefined) => {
  if (n === null || n === undefined) return { border: "border-[#d1d5db]", text: "text-[#6b7280]", bg: "bg-[#f9fafb]" };
  if (n >= 75) return { border: "border-[#22c55e]", text: "text-[#22c55e]", bg: "bg-[#f0fdf4]" };
  if (n >= 50) return { border: "border-[#f97316]", text: "text-[#f97316]", bg: "bg-[#fff7ed]" };
  return { border: "border-[#ef4444]", text: "text-[#ef4444]", bg: "bg-[#fff1f0]" };
};

const winBadge = (n: number | null | undefined) => {
  if (n == null) return null;
  if (n >= 90) return { label: "🎯 Strong Win", cls: "bg-green-100 text-green-700 border-green-200" };
  if (n >= 70) return { label: "✓ Likely Win", cls: "bg-blue-100 text-blue-700 border-blue-200" };
  if (n >= 50) return { label: "△ Possible", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" };
  return { label: `${n}%`, cls: "bg-gray-100 text-gray-600 border-gray-200" };
};

const barPct = (value: number | undefined, max: number) => {
  const v = Math.max(0, Math.min(max, Number(value || 0)));
  return Math.round((v / max) * 100);
};

const reasoningFrom = (m: ApiMatchRow) => {
  const fromLists = [...(m.fitReasons || []), ...(m.reasons || [])].filter(
    (r) => typeof r === "string" && r.trim().length > 0
  );
  if (fromLists.length) return fromLists.join(" ");
  const fallback = m.notes || m.aiReasoning || "No detailed analysis available.";
  return fallback.trim() ? fallback : "No detailed analysis available.";
};

const inputCls =
  "w-full rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 [font-family:'Montserrat',Helvetica] text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#ef3e34] focus:outline-none focus:ring-2 focus:ring-[#ef3e34]/20 transition-all";

function mergeRankedOpportunities(matches: ApiMatchRow[], opportunities: Opportunity[]): RankedOpportunity[] {
  const pageOpportunityIds = new Set(opportunities.map((o) => String(o._id)));
  const byOpp = new Map<string, RankedOpportunity>();

  for (const m of matches) {
    const opp = m.opportunity;
    const oid = opp?._id ? String(opp._id) : null;
    if (!oid || !opp?.title) continue;
    if (!pageOpportunityIds.has(oid)) continue;
    const reasons = [...(m.fitReasons || []), ...(m.reasons || [])].filter(
      (r) => typeof r === "string" && r.trim().length > 0
    );
    byOpp.set(oid, {
      ...opp,
      _id: oid,
      fitScore: m.fitScore ?? null,
      winProbability: m.winProbability ?? null,
      rubricScores: m.rubricScores ?? null,
      rubricTier: m.rubricTier,
      matchId: String(m._id),
      matchReasons: reasons,
      matchStatus: m.state ?? m.status ?? "pending",
      lastActivity: fmtActivity(m.updatedAt),
      orgName: m.organization?.name ?? "Unknown",
      aiReasoning: reasoningFrom(m),
    });
  }

  const ranked = [...byOpp.values()].sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));

  const unmatched = opportunities
    .filter((o) => !byOpp.has(String(o._id)))
    .map((o) => ({
      ...o,
      fitScore: o.fitScore ?? null,
      winProbability: o.winProbability ?? null,
      rubricTier: o.matchTier as RankedOpportunity["rubricTier"],
      matchStatus: o.matchStatus ?? "pending",
      matchReasons: o.matchReasons ?? [],
    }))
    .sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  return [...ranked, ...unmatched];
}

// ── Main Component ─────────────────────────────────────────────────────────

export const Opportunities = () => {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [matchFilter, setMatchFilter] = useState<"all" | "high" | "medium" | "approved" | "rejected">("all");
  const [page, setPage] = useState(1);

  const [selectedOpp, setSelectedOpp] = useState<RankedOpportunity | null>(null);
  const [scoreOpp, setScoreOpp] = useState<RankedOpportunity | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const { data: matchRows = [], isLoading: matchesLoading } = useQuery<ApiMatchRow[]>({
    queryKey: [...qk.matches(), "for-opportunities"],
    queryFn: async () => {
      const res = await api.get("/matches", { params: { limit: 500 } });
      return res.data.data ?? [];
    },
  });

  const {
    data: oppPayload,
    isLoading: oppsLoading,
    isFetching: oppsFetching,
    isError,
    refetch,
  } = useQuery<OpportunitiesResponse>({
    queryKey: [...qk.opportunities(), "paged", page, search, categoryFilter, statusFilter],
    queryFn: async () => {
      const res = await api.get("/opportunities", {
        params: {
          page,
          limit: 24,
          sortBy: "fitScore",
          search: search || undefined,
          category: categoryFilter || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const { data: existingApps } = useQuery<ExistingApp[]>({
    queryKey: ["applications", "my"],
    queryFn: async () => {
      const r = await api.get("/applications", { params: { limit: 200 } });
      return (r.data.data ?? []) as ExistingApp[];
    },
  });

  const appliedOpportunityIds = useMemo(
    () =>
      new Set(
        (existingApps || [])
          .filter((app) => !["denied", "rejected"].includes(app.status))
          .map((app) => {
            const opp = app.opportunity;
            if (!opp) return null;
            return typeof opp === "string" ? opp : (opp as { _id?: string })._id ?? null;
          })
          .filter(Boolean) as string[]
      ),
    [existingApps]
  );

  const opportunities = useMemo(() => oppPayload?.data ?? [], [oppPayload?.data]);
  const ranked = useMemo(() => mergeRankedOpportunities(matchRows, opportunities), [matchRows, opportunities]);
  const isLoading = matchesLoading || oppsLoading;
  const isPageFetching = oppsFetching && !oppsLoading;
  const pagination = oppPayload?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalDocs = pagination?.total ?? ranked.length;

  const computeMutation = useMutation({
    mutationFn: (opts?: { silent?: boolean }) => api.post("/matches/compute-all", opts || {}),
    onSuccess: (res, variables) => {
      const silent = variables?.silent ?? false;
      if (!silent) {
        const msg = (res.data as { message?: string })?.message ?? "Scores updated.";
        toast({ title: "Match scores updated", description: msg });
      }
      queryClient.invalidateQueries({ queryKey: qk.matches() });
      refetch();
    },
    onError: (err: unknown, variables) => {
      const silent = variables?.silent ?? false;
      if (!silent) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast({ title: "Could not refresh scores", description: msg || "Try again.", variant: "destructive" });
      }
    },
  });

  useEffect(() => {
    if (!isLoading && opportunities.length > 0 && opportunities.some((o) => o.fitScore === null)) {
      computeMutation.mutate({ silent: true });
    }
  }, [isLoading, opportunities, computeMutation]);

  useEffect(() => { setPage(1); }, [search, categoryFilter, statusFilter]);

  const generateMutation = useMutation({
    mutationFn: (opportunityId: string) => api.post("/applications/generate", { opportunityId }),
    onSuccess: (res) => {
      const id = res.data.data?._id ?? res.data.data?.id;
      const isExisting = res.data.existing === true;
      if (isExisting) {
        toast({ title: "Application already exists", description: "Taking you to your existing application." });
      } else {
        toast({ title: "Ashleen is drafting your application", description: "Review and edit each section on the next screen." });
      }
      queryClient.invalidateQueries({ queryKey: qk.applications() });
      queryClient.invalidateQueries({ queryKey: ["applications", "my"] });
      if (id) router.push(`/applications/${id}`);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { status?: number; data?: { code?: string; message?: string } } };
      if (e?.response?.status === 402 && e?.response?.data?.code === "SUBSCRIPTION_REQUIRED") {
        setPaywallOpen(true);
        return;
      }
      const msg = e?.response?.data?.message;
      toast({ title: "Failed to draft application", description: msg ?? "Please try again.", variant: "destructive" });
    },
  });

  const filteredOpps = ranked.filter((o) => {
    let mBand = true;
    if (matchFilter === "high") mBand = (o.fitScore ?? 0) >= 80;
    else if (matchFilter === "medium") mBand = (o.fitScore ?? 0) >= 65 && (o.fitScore ?? 0) < 80;
    else if (matchFilter === "approved") mBand = o.matchStatus === "approved" || o.matchStatus === "saved";
    else if (matchFilter === "rejected") mBand = o.matchStatus === "rejected";
    return mBand;
  });

  const categories = Array.from(
    new Set(opportunities.map((o) => o.category).filter(Boolean))
  ).sort() as string[];

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 bg-neutral-50 p-3 pb-8 sm:gap-5 sm:p-5 sm:pb-10 lg:gap-6 lg:p-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-xl sm:text-2xl tracking-[0.5px] uppercase leading-tight">
          Grant Intelligence
        </h1>
        <p className="[font-family:'Montserrat',Helvetica] text-[#6b7280] text-xs sm:text-sm max-w-xl leading-relaxed">
          Browse, filter, and discover the best grant matches for your agency. Apply with Ashleen AI to start drafting.
        </p>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#e5e7eb] bg-white p-2.5 shadow-sm sm:gap-2.5 sm:p-3">
        {/* Search */}
        <div className="relative w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            className={cn(inputCls, "pl-9 h-10")}
            placeholder="Search grants or keywords…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters row — wraps nicely on narrow screens */}
        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3">
          <select
            className={cn(inputCls, "h-10 cursor-pointer")}
            value={matchFilter}
            onChange={(e) => setMatchFilter(e.target.value as typeof matchFilter)}
          >
            <option value="all">Any Fit Score</option>
            <option value="high">High Fit (80+)</option>
            <option value="medium">Medium (65–79)</option>
            <option value="approved">Saved in Pipeline</option>
            {isAdmin && <option value="rejected">Rejected Fits</option>}
          </select>

          <div className="relative">
            <input
              className={cn(inputCls, "h-10")}
              placeholder="Category…"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              list="category-options"
            />
            <datalist id="category-options">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <select
            className={cn(inputCls, "h-10 cursor-pointer min-[480px]:col-span-2 lg:col-span-1")}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Any Status</option>
            <option value="open">Open</option>
            <option value="closing">Closing Soon</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* ── Count + pagination row ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <span className="[font-family:'Montserrat',Helvetica] text-xs sm:text-sm text-[#6b7280] font-medium flex items-center gap-1.5 min-w-0">
          <Filter size={13} className="text-[#9ca3af] shrink-0" />
          <span className="truncate">
            {isLoading
              ? "Loading directory…"
              : (
                <>
                  <span className="sm:hidden">{totalDocs.toLocaleString()} results</span>
                  <span className="hidden sm:inline">{totalDocs.toLocaleString()} opportunities · page {page} of {totalPages}</span>
                </>
              )}
          </span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {isPageFetching && (
            <span className="inline-flex items-center gap-1 text-xs text-[#6b7280]">
              <Loader2 size={12} className="animate-spin" />
              <span className="hidden sm:inline">Loading…</span>
            </span>
          )}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#374151] disabled:cursor-not-allowed disabled:opacity-50 transition-colors hover:bg-[#f9fafb]"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[2.5rem] text-center text-xs sm:text-sm text-[#374151] font-medium whitespace-nowrap">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#374151] disabled:cursor-not-allowed disabled:opacity-50 transition-colors hover:bg-[#f9fafb]"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="[font-family:'Montserrat',Helvetica] text-red-600 text-sm sm:text-base">
            Failed to load grants directory.
          </p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d63029]"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid gap-3 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-52 sm:h-56 rounded-xl bg-white/50 border border-[#e5e7eb] animate-pulse"
            />
          ))}
        </div>
      ) : filteredOpps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 bg-white rounded-xl border border-[#e5e7eb] border-dashed">
          <Search size={28} className="text-[#d1d5db] mb-1 sm:mb-2 sm:size-8" />
          <p className="[font-family:'Montserrat',Helvetica] font-semibold text-[#374151] text-sm sm:text-base">
            No grants found
          </p>
          <p className="[font-family:'Montserrat',Helvetica] text-[#6b7280] text-xs sm:text-sm max-w-xs text-center px-4">
            Try adjusting your filters or search terms to find what you are looking for.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredOpps.map((opp) => {
            const days = isMounted ? daysLeft(opp.deadline) : null;
            const urgentDeadline = days !== null && days >= 0 && days <= 14;
            const deadlineStr = isMounted ? fmtDate(opp.deadline) : null;
            const sc = scoreColor(opp.fitScore);
            const wb = winBadge(opp.winProbability ?? null);
            const amountStr = formatAmountRange(opp.minAmount, opp.maxAmount);

            return (
              <div
                key={opp._id}
                className="relative flex flex-col gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:border-[#ef3e34]/30 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] active:scale-[0.99] sm:p-4"
                onClick={() => setSelectedOpp(opp)}
              >
                {/* Status + score badges */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold [font-family:'Montserrat',Helvetica] uppercase tracking-wide",
                      STATUS_STYLES[opp.status] || STATUS_STYLES.open
                    )}>
                      {opp.status === "closing" ? "Closing Soon" : opp.status}
                    </span>
                    <div
                      className={cn("flex h-6 min-w-[2rem] items-center justify-center rounded-full border-2 px-2 transition-all", sc.border, sc.bg)}
                      title={opp.fitScore === null ? "Match analysis pending" : "AI Fit Score"}
                    >
                      <span className={cn("[font-family:'Montserrat',Helvetica] text-[10px] font-bold", sc.text)}>
                        {opp.fitScore === null ? "…" : `${opp.fitScore}`}
                      </span>
                    </div>
                    {wb && (
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold [font-family:'Montserrat',Helvetica] uppercase tracking-wide", wb.cls)}>
                        {wb.label}
                      </span>
                    )}
                  </div>

                  <h3 className="[font-family:'Montserrat',Helvetica] pt-0.5 text-[13px] sm:text-[14px] font-bold leading-snug text-[#111827] line-clamp-2 transition-colors group-hover:text-[#ef3e34]">
                    {opp.title}
                  </h3>
                  <p className="[font-family:'Montserrat',Helvetica] text-[11px] sm:text-xs font-semibold text-[#6b7280] line-clamp-1 truncate">
                    {opp.funder}
                  </p>
                </div>

                {/* Body details */}
                <div className="flex flex-col gap-1.5 mt-auto pt-1">
                  {amountStr && (
                    <div className="flex items-center gap-2">
                      <DollarSign size={12} className="text-[#9ca3af] shrink-0" />
                      <span className="[font-family:'Montserrat',Helvetica] text-[11px] sm:text-xs font-bold text-[#111827] truncate">
                        {amountStr}
                      </span>
                    </div>
                  )}
                  {deadlineStr && (
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className={cn("shrink-0", urgentDeadline ? "text-red-500" : "text-[#9ca3af]")} />
                      <span className={cn(
                        "[font-family:'Montserrat',Helvetica] text-[11px] sm:text-xs",
                        urgentDeadline ? "font-bold text-red-600" : "font-semibold text-[#374151]"
                      )}>
                        {deadlineStr}
                        {urgentDeadline && (
                          <span className="ml-1 text-[9px] sm:text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                            {days}d
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {opp.category && (
                    <div className="flex items-center gap-2 truncate">
                      <Tag size={12} className="text-[#9ca3af] shrink-0" />
                      <span className="[font-family:'Montserrat',Helvetica] text-[11px] sm:text-xs font-medium text-[#6b7280] truncate">
                        {opp.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-1 flex flex-col gap-2.5 pt-2.5 border-t border-dashed border-[#e5e7eb]">
                  <div className="flex items-center justify-between text-[#9ca3af] group-hover:text-[#ef3e34] transition-colors">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider [font-family:'Montserrat',Helvetica]">
                      View Match Details
                    </span>
                    <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform" />
                  </div>

                  {opp.rubricScores?.totalScore != null && opp.winProbability != null && (
                    <button
                      type="button"
                      className="text-left text-[10px] sm:text-[11px] font-bold uppercase tracking-wider [font-family:'Montserrat',Helvetica] text-[#6b7280] hover:text-[#ef3e34] hover:underline"
                      onClick={(e) => { e.stopPropagation(); setScoreOpp(opp); }}
                    >
                      View Score Breakdown
                    </button>
                  )}

                  {appliedOpportunityIds.has(opp._id) ? (
                    <button
                      className="w-full min-h-[40px] rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 text-xs font-bold [font-family:'Montserrat',Helvetica] hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        const existingApp = (existingApps || []).find((a) => {
                          const oppId = typeof a.opportunity === "string"
                            ? a.opportunity
                            : (a.opportunity as { _id?: string } | null)?._id;
                          return oppId === opp._id && !["denied", "rejected"].includes(a.status);
                        });
                        if (existingApp) router.push(`/applications/${existingApp._id}`);
                      }}
                    >
                      <FileText size={13} className="shrink-0" />
                      View Application
                    </button>
                  ) : (
                    <button
                      className="w-full min-h-[40px] rounded-lg bg-[#ef3e34]/10 text-[#ef3e34] border border-[#ef3e34]/20 px-3 py-2 text-xs font-bold [font-family:'Montserrat',Helvetica] hover:bg-[#ef3e34] hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-[#ef3e34]/10 disabled:hover:text-[#ef3e34]"
                      disabled={opp.status === "closed" || generatingFor !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (generatingFor) return;
                        setGeneratingFor(opp._id);
                        generateMutation.mutate(opp._id, { onSettled: () => setGeneratingFor(null) });
                      }}
                    >
                      {generatingFor === opp._id ? (
                        <><Loader2 size={13} className="animate-spin" /> Working…</>
                      ) : opp.status === "closed" ? (
                        "Closed to Applications"
                      ) : (
                        <><Sparkles size={13} className="shrink-0" /> Draft Application</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom pagination ──────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm font-medium text-[#374151] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#f9fafb] transition-colors sm:min-w-[100px]"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} className="mr-1" /> Previous
          </button>
          <span className="shrink-0 text-sm text-[#374151] font-medium [font-family:'Montserrat',Helvetica] px-1 whitespace-nowrap">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm font-medium text-[#374151] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#f9fafb] transition-colors sm:min-w-[100px]"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight size={16} className="ml-1" />
          </button>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {selectedOpp && (
        <OppDetailModal
          opp={selectedOpp}
          isMounted={isMounted}
          onClose={() => setSelectedOpp(null)}
          onApply={() => {
            if (generatingFor) return;
            setGeneratingFor(selectedOpp._id);
            generateMutation.mutate(selectedOpp._id, { onSettled: () => setGeneratingFor(null) });
          }}
          applying={generatingFor === selectedOpp._id}
          applyLocked={generatingFor !== null}
          hasExistingApp={appliedOpportunityIds.has(selectedOpp._id)}
          existingAppId={
            (existingApps || []).find((a) => {
              const oppId = typeof a.opportunity === "string"
                ? a.opportunity
                : (a.opportunity as { _id?: string } | null)?._id;
              return oppId === selectedOpp._id && !["denied", "rejected"].includes(a.status);
            })?._id
          }
        />
      )}

      {/* Score breakdown dialog */}
      <Dialog open={!!scoreOpp} onOpenChange={(v) => !v && setScoreOpp(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl max-h-[92dvh] overflow-y-auto rounded-xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Score Breakdown</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Rubric total (out of 135) is normalized to 100 for tiering. Win Probability is derived per spec.
            </DialogDescription>
          </DialogHeader>
          {scoreOpp && (
            <div className="space-y-4 pb-2">
              <div className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#111827] line-clamp-1">{scoreOpp.title}</div>
                    <div className="text-xs text-[#6b7280] line-clamp-1">{scoreOpp.funder}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#e5e7eb] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#111827] uppercase tracking-wide whitespace-nowrap">
                      Total: {scoreOpp.rubricScores?.totalScore ?? "—"}/135 ({scoreOpp.rubricScores?.normalizedScore ?? "—"}%)
                    </span>
                    <span className="rounded-full border border-[#e5e7eb] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#111827] uppercase tracking-wide whitespace-nowrap">
                      Win Prob: {scoreOpp.winProbability ?? "—"}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {[
                  { label: "Need / Problem", key: "needScore", max: 25 },
                  { label: "Project Design", key: "projectDesignScore", max: 25 },
                  { label: "Budget Justification", key: "budgetScore", max: 15 },
                  { label: "Organizational Capacity", key: "capacityScore", max: 15 },
                  { label: "Impact / Outcomes", key: "impactScore", max: 20 },
                  { label: "Evaluation", key: "evaluationScore", max: 10 },
                  { label: "Sustainability", key: "sustainabilityScore", max: 10 },
                  { label: "Mission Alignment", key: "alignmentScore", max: 15 },
                ].map((row) => {
                  const v = Number((scoreOpp.rubricScores as Record<string, unknown> | null)?.[row.key] || 0);
                  const pct = barPct(v, row.max);
                  return (
                    <div key={row.key} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-bold text-[#111827] uppercase tracking-wider">{row.label}</div>
                        <div className="text-xs font-bold text-[#111827] tabular-nums shrink-0">{v}/{row.max}</div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#e5e7eb] overflow-hidden">
                        <div className="h-full bg-[#ef3e34] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Paywall dialog */}
      <AlertDialog open={paywallOpen} onOpenChange={setPaywallOpen}>
        <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Subscription Required</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              AI grant writing requires an active subscription. Plans start at $199/month and include
              unlimited AI applications, smart funder matching, and weekly digests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Maybe Later</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto bg-[#ef3e34] hover:bg-[#d63530] text-white"
              onClick={() => router.push("/pricing")}
            >
              View Plans
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ── Detail Modal ───────────────────────────────────────────────────────────

const OppDetailModal = ({
  opp,
  isMounted,
  onClose,
  onApply,
  applying,
  applyLocked,
  hasExistingApp,
  existingAppId,
}: {
  opp: RankedOpportunity;
  isMounted: boolean;
  onClose: () => void;
  onApply: () => void;
  applying: boolean;
  applyLocked: boolean;
  hasExistingApp: boolean;
  existingAppId: string | undefined;
}) => {
  const router = useRouter();
  const days = isMounted ? daysLeft(opp.deadline) : null;
  const urgentDeadline = days !== null && days >= 0 && days <= 14;
  const sc = scoreColor(opp.fitScore);

  const NEGATIVE_PATTERNS =
    /\b(not (on|in|listed|funded|eligible|covered|supported|included)|does not (fund|include|cover|support)|no match|agency type.*not|not.*agency type|outside.*scope|ineligible|disqualified|not a (match|fit)|poor fit|low (fit|match)|mismatch)\b/i;

  const cleanReasons = (opp.matchReasons || []).filter(
    (r) => typeof r === "string" && r.trim().length > 0 && !NEGATIVE_PATTERNS.test(r)
  );
  const cleanAiReasoning =
    typeof opp.aiReasoning === "string" && opp.aiReasoning.trim().length > 0 ? opp.aiReasoning : null;
  const hasAnyAnalysis = cleanReasons.length > 0 || cleanAiReasoning;

  const isPortalOnly =
    opp.funder &&
    /fema|doj|dhs|grants\.gov|department of justice|department of homeland security/i.test(opp.funder);

  const applicationUrl = (opp.applicationUrl || "").trim();
  const sourceUrl = (opp.sourceUrl || "").trim();
  const contactName = (opp.contactName ?? "").toString().trim();
  const contactEmail = (opp.contactEmail ?? "").toString().trim();
  const contactPhone = (opp.contactPhone ?? "").toString().trim();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-h-[96dvh] flex-col overflow-hidden bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200 rounded-t-2xl sm:rounded-2xl sm:max-h-[90vh] sm:max-w-[640px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[#d1d5db]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#e5e7eb] px-4 py-3 sm:px-6 sm:py-4 bg-[#fafafa] shrink-0">
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide [font-family:'Montserrat',Helvetica]",
                STATUS_STYLES[opp.status] || STATUS_STYLES.open
              )}>
                {opp.status === "closing" ? "Closing Soon" : opp.status}
              </span>
              <div className={cn("flex h-6 min-w-[2rem] items-center justify-center rounded-full border-2 px-2 bg-white", sc.border)}>
                <span className={cn("[font-family:'Montserrat',Helvetica] text-[10px] font-bold uppercase tracking-tight", sc.text)}>
                  {opp.fitScore === null ? "No score" : `${opp.fitScore}% Fit`}
                </span>
              </div>
            </div>
            <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-lg sm:text-2xl uppercase tracking-[0.3px] leading-tight">
              {opp.title}
            </h2>
            <p className="[font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#6b7280] line-clamp-1">
              {opp.funder}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-[#9ca3af] hover:bg-[#e5e7eb] hover:text-[#111827] transition-colors border border-[#e5e7eb] bg-white mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">

          {/* Key details grid */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm min-[400px]:grid-cols-2">
            {formatAmountRange(opp.minAmount, opp.maxAmount) && (
              <div className="flex flex-col gap-1">
                <span className="[font-family:'Montserrat',Helvetica] text-[10px] text-[#9ca3af] uppercase tracking-wider font-bold">
                  Award Amount
                </span>
                <span className="[font-family:'Montserrat',Helvetica] text-base sm:text-lg font-bold text-[#111827]">
                  {formatAmountRange(opp.minAmount, opp.maxAmount)}
                </span>
              </div>
            )}
            {opp.deadline && (
              <div className="flex flex-col gap-1">
                <span className="[font-family:'Montserrat',Helvetica] text-[10px] text-[#9ca3af] uppercase tracking-wider font-bold">
                  Deadline
                </span>
                <span className={cn(
                  "[font-family:'Montserrat',Helvetica] text-sm sm:text-base font-bold",
                  urgentDeadline ? "text-red-600" : "text-[#111827]"
                )}>
                  {fmtDate(opp.deadline)}
                  {urgentDeadline && <span className="ml-1 text-xs font-semibold">({days}d)</span>}
                </span>
              </div>
            )}
            {opp.category && (
              <div className="flex flex-col gap-1">
                <span className="[font-family:'Montserrat',Helvetica] text-[10px] text-[#9ca3af] uppercase tracking-wider font-bold">
                  Category
                </span>
                <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#374151]">
                  {opp.category}
                </span>
              </div>
            )}
            {opp.agencyTypes && opp.agencyTypes.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="[font-family:'Montserrat',Helvetica] text-[10px] text-[#9ca3af] uppercase tracking-wider font-bold">
                  Eligible Agencies
                </span>
                <span className="[font-family:'Montserrat',Helvetica] text-sm font-medium text-[#374151]">
                  {opp.agencyTypes.join(", ")}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1 min-[400px]:col-span-2">
              <span className="[font-family:'Montserrat',Helvetica] text-[10px] text-[#9ca3af] uppercase tracking-wider font-bold">
                Opportunity ID
              </span>
              <span className="[font-family:'Montserrat',Helvetica] text-xs sm:text-sm font-semibold text-[#374151] break-all">
                {opp._id}
              </span>
            </div>
          </div>

          {/* How to apply */}
          {(applicationUrl || contactEmail || contactName || contactPhone) && (
            <div className="flex flex-col gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
              <h4 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-xs sm:text-sm uppercase tracking-wide border-b border-[#f3f4f6] pb-2">
                How to Apply & Contact
              </h4>
              <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="[font-family:'Montserrat',Helvetica] text-[10px] text-[#9ca3af] uppercase tracking-wider font-bold">
                    Application URL
                  </span>
                  <span className="[font-family:'Montserrat',Helvetica] text-xs sm:text-sm font-medium text-[#374151] break-all">
                    {applicationUrl ? (
                      <a href={applicationUrl} target="_blank" rel="noopener noreferrer" className="text-[#ef3e34] hover:underline">
                        {applicationUrl}
                      </a>
                    ) : "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="[font-family:'Montserrat',Helvetica] text-[10px] text-[#9ca3af] uppercase tracking-wider font-bold">
                    Contact Name
                  </span>
                  <span className="[font-family:'Montserrat',Helvetica] text-xs sm:text-sm font-medium text-[#374151]">
                    {contactName || "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="[font-family:'Montserrat',Helvetica] text-[10px] text-[#9ca3af] uppercase tracking-wider font-bold">
                    Contact Email
                  </span>
                  <span className="[font-family:'Montserrat',Helvetica] text-xs sm:text-sm font-medium text-[#374151] break-all">
                    {contactEmail ? (
                      <a href={`mailto:${contactEmail}`} className="text-[#ef3e34] hover:underline">{contactEmail}</a>
                    ) : "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="[font-family:'Montserrat',Helvetica] text-[10px] text-[#9ca3af] uppercase tracking-wider font-bold">
                    Contact Phone
                  </span>
                  <span className="[font-family:'Montserrat',Helvetica] text-xs sm:text-sm font-medium text-[#374151]">
                    {contactPhone ? (
                      <a href={`tel:${contactPhone}`} className="text-[#ef3e34] hover:underline">{contactPhone}</a>
                    ) : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI analysis */}
          {hasAnyAnalysis && (
            <div className="flex flex-col gap-4 rounded-xl border border-[#ef3e34]/20 bg-[#fffafa] p-4 sm:p-5 relative overflow-hidden shadow-sm">
              <Sparkles size={100} className="absolute -top-4 -right-4 text-[#ef3e34]/5 pointer-events-none sm:size-[120px]" />
              <div className="flex items-center gap-2 relative z-10 shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#ef3e34] flex items-center justify-center text-white shrink-0 shadow-sm border-2 border-white">
                  <span className="[font-family:'Montserrat',Helvetica] font-bold text-[10px] sm:text-xs">AI</span>
                </div>
                <h4 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-xs sm:text-sm uppercase tracking-wide">
                  Ashleen Match Analysis
                </h4>
              </div>
              <div className="[font-family:'Montserrat',Helvetica] text-xs sm:text-sm text-[#374151] relative z-10">
                {cleanReasons.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2 leading-relaxed marker:text-[#ef3e34]">
                    {cleanReasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                ) : cleanAiReasoning ? (
                  <p className="leading-relaxed bg-white/50 rounded-lg p-3 sm:p-3.5 border border-[#ef3e34]/10">
                    {cleanAiReasoning}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {/* Description */}
          {opp.description && (
            <div className="flex flex-col gap-2">
              <h4 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-xs sm:text-sm uppercase tracking-wide border-b border-[#f3f4f6] pb-2">
                Description
              </h4>
              <p className="[font-family:'Montserrat',Helvetica] text-xs sm:text-sm text-[#374151] leading-relaxed">
                {opp.description}
              </p>
            </div>
          )}

          {/* Keywords */}
          {opp.keywords && opp.keywords.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-xs sm:text-sm uppercase tracking-wide border-b border-[#f3f4f6] pb-2">
                Keywords
              </h4>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {opp.keywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-md bg-[#f3f4f6] text-[#374151] border border-[#e5e7eb] px-2 py-0.5 text-[11px] sm:text-xs [font-family:'Montserrat',Helvetica] font-semibold"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky footer ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 border-t border-[#e5e7eb] bg-[#fafafa] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4 shrink-0">
          {isPortalOnly && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-2.5 sm:p-3 text-xs sm:text-sm text-yellow-800 [font-family:'Montserrat',Helvetica]">
              ⚠️ This funder requires submission through Grants.gov. Use the email feature for inquiries only.{" "}
              <a
                href="https://www.grants.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline hover:text-yellow-900"
              >
                Open Grants.gov ↗
              </a>
            </div>
          )}

          {sourceUrl && sourceUrl !== "#" && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#ef3e34] bg-white px-4 py-2.5 sm:py-3 [font-family:'Montserrat',Helvetica] text-xs sm:text-sm font-bold text-[#ef3e34] transition-all hover:bg-[#ef3e34] hover:text-white shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <ExternalLink size={15} className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              View Original Source
              <span className="ml-2 hidden xs:inline text-[10px] font-semibold opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-wider border-l border-current pl-2">
                External ↗
              </span>
            </a>
          )}

          {applicationUrl && applicationUrl !== sourceUrl && (
            <a
              href={applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#111827] bg-white px-4 py-2.5 sm:py-3 [font-family:'Montserrat',Helvetica] text-xs sm:text-sm font-bold text-[#111827] transition-all hover:bg-[#111827] hover:text-white shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <ExternalLink size={15} className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              Open Application Page
              <span className="ml-2 hidden xs:inline text-[10px] font-semibold opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-wider border-l border-current pl-2">
                Apply ↗
              </span>
            </a>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <p className="[font-family:'Montserrat',Helvetica] text-[10px] sm:text-[11px] text-[#6b7280] leading-snug sm:flex-1">
              Final match approval is completed by Red Dog staff in the admin portal. You can start drafting an application immediately.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-2 sm:shrink-0">
              <button
                onClick={onClose}
                className="rounded-lg border border-[#d1d5db] bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#374151] [font-family:'Montserrat',Helvetica] shadow-sm transition-colors hover:bg-[#f3f4f6] min-h-[40px]"
              >
                Cancel
              </button>
              {hasExistingApp ? (
                <button
                  onClick={() => {
                    if (existingAppId) { router.push(`/applications/${existingAppId}`); onClose(); }
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white [font-family:'Montserrat',Helvetica] shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] min-h-[40px]"
                >
                  <FileText size={14} />
                  View App
                </button>
              ) : (
                <button
                  onClick={() => onApply()}
                  disabled={opp.status === "closed" || applying || applyLocked}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#ef3e34] px-4 py-2.5 text-xs sm:text-sm font-bold text-white [font-family:'Montserrat',Helvetica] shadow-sm transition-all hover:bg-[#d63029] disabled:opacity-60 active:scale-[0.98] min-h-[40px]"
                >
                  {applying ? (
                    <><Loader2 size={14} className="animate-spin" /> Drafting…</>
                  ) : (
                    <><Sparkles size={14} /> Apply with Ashleen</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};