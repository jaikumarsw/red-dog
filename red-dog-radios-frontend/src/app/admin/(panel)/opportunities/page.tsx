"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Calendar, DollarSign, Tag, Search, ArrowRight,
  ChevronLeft, ChevronRight, Users, FileText, Loader2,
} from "lucide-react";
import adminApi from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TagSelect, CategorySelect } from "@/components/admin/TagSelect";
import { EQUIPMENT_TAGS, FUNDING_CATEGORIES } from "@/lib/adminConstants";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type OpportunityRow = {
  _id: string;
  title: string;
  funder: string;
  deadline?: string;
  status: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  awardAmount?: number;
  keywords?: string[];
  description?: string;
  agenciesMatchedCount?: number;
  applicationCount?: number;
  highestMatchScore?: number;
};

type FunderOption = { _id: string; name: string };

type ScrapeHealth = {
  healthy: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  lastRunStats?: { fetched: number; parsed: number; inserted: number; filtered_out: number };
  ageHours?: number;
  reason?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
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

const daysLeft = (d?: string) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
};

const emptyCreateForm = {
  title: "",
  funderId: "",
  deadline: "",
  minAmount: "",
  maxAmount: "",
  awardAmount: "",
  sourceUrl: "",
  applicationUrl: "",
  keywords: "",
  description: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  localMatchRequired: false,
};

const parseMoney = (raw: string | undefined): number | undefined => {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
};

const PAGE_SIZE = 100;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOpportunitiesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyCreateForm);
  const [selectedEquipmentTags, setSelectedEquipmentTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [statusFilter]);

  const { data, refetch, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "opportunities", statusFilter, search, page],
    queryFn: async () => {
      const res = await adminApi.get("admin/opportunities", {
        params: {
          limit: PAGE_SIZE,
          page,
          status: statusFilter || undefined,
          search: search || undefined,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const { data: healthRes, refetch: refetchHealth } = useQuery({
    queryKey: ["admin", "scraping", "health"],
    queryFn: async () => {
      const res = await adminApi.get("admin/scraping/health");
      return res.data.data as ScrapeHealth;
    },
    staleTime: 30_000,
  });

  const { data: fundersRes, isLoading: fundersLoading } = useQuery({
    queryKey: ["admin", "funders", "opportunity-create"],
    queryFn: async () => {
      const res = await adminApi.get("admin/funders", { params: { limit: 500 } });
      return res.data.data as FunderOption[];
    },
    enabled: open,
    staleTime: 60_000,
  });
  const funders = fundersRes ?? [];

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await adminApi.post("admin/scraping/grants-gov/run");
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Sync started",
        description: "Grants.gov ingestion is running in the background. Refresh in a few minutes.",
      });
      setTimeout(() => refetchHealth(), 5000);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not start ingestion.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const selected = funders.find((f) => String(f._id) === form.funderId);
      if (!selected?.name) throw new Error("Please select a funder from the list.");
      if (!String(form.contactEmail || "").trim()) throw new Error("Contact email is required.");
      await adminApi.post("admin/opportunities", {
        title: form.title,
        funder: selected.name,
        funderId: form.funderId,
        deadline: form.deadline || undefined,
        minAmount: parseMoney(form.minAmount),
        maxAmount: parseMoney(form.maxAmount),
        awardAmount: parseMoney(form.awardAmount),
        sourceUrl: form.sourceUrl,
        applicationUrl: form.applicationUrl || undefined,
        keywords: form.keywords.split(",").map((s) => s.trim()).filter(Boolean),
        equipmentTags: selectedEquipmentTags,
        category: selectedCategory,
        description: form.description,
        contactName: form.contactName || undefined,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined,
        localMatchRequired: form.localMatchRequired,
      });
    },
    onSuccess: () => {
      setForm(emptyCreateForm);
      setSelectedEquipmentTags([]);
      setSelectedCategory("");
      setOpen(false);
      refetch();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : "Could not create opportunity.");
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const rows = (data?.data ?? []) as OpportunityRow[];
  const totalDocs: number = data?.pagination?.total ?? rows.length;
  const totalPages: number = data?.pagination?.totalPages ?? 1;
  const health = healthRes;

  return (
    <div className="w-full min-w-0 max-w-7xl space-y-4 px-2 sm:px-0 sm:space-y-6 overflow-x-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="[font-family:'Montserrat',Helvetica] text-xl sm:text-2xl font-bold text-[#111827]">
          Opportunities
        </h1>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="min-h-[40px] text-xs sm:text-sm"
          >
            {syncMutation.isPending ? "Starting…" : "Sync from Grants.gov"}
          </Button>
          <Button
            className="min-h-[40px] bg-[#ef3e34] text-white hover:bg-[#d63530] text-xs sm:text-sm"
            onClick={() => {
              setForm(emptyCreateForm);
              setSelectedEquipmentTags([]);
              setSelectedCategory("");
              setOpen(true);
            }}
          >
            Add opportunity
          </Button>
        </div>
      </div>

      {/* ── Sync health bar ─────────────────────────────────────────────────── */}
      {health && (
        <div className={cn(
          "rounded-lg border px-3 py-2.5 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3",
          health.healthy
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        )}>
          <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
            <span className={cn(
              "mt-1 h-2 w-2 flex-shrink-0 rounded-full sm:mt-0",
              health.healthy ? "bg-green-500" : "bg-amber-500"
            )} />
            <div className="min-w-0 break-words text-xs sm:text-sm">
              <span className="font-medium">Last sync:</span>{" "}
              {health.lastRunAt ? new Date(health.lastRunAt).toLocaleString() : "Never"}
              {health.lastRunStatus && (
                <span className="font-medium"> · {health.lastRunStatus}</span>
              )}
              {health.lastRunStats && (
                <span className="block sm:inline sm:ml-2 mt-0.5 sm:mt-0 text-[11px] opacity-70">
                  fetched {health.lastRunStats.fetched?.toLocaleString()},
                  saved {health.lastRunStats.inserted?.toLocaleString()},
                  filtered {health.lastRunStats.filtered_out?.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          {!health.healthy && health.reason && (
            <span className="text-xs opacity-80 break-words pl-4 sm:pl-0">{health.reason}</span>
          )}
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#e5e7eb] bg-white p-2.5 shadow-sm sm:flex-row sm:p-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            className="w-full rounded-lg border border-[#e5e7eb] bg-white pl-9 pr-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#ef3e34] focus:outline-none focus:ring-2 focus:ring-[#ef3e34]/20 transition-all"
            placeholder="Search by title or funder…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="flex-1 sm:flex-none rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#111827] focus:border-[#ef3e34] focus:outline-none focus:ring-2 focus:ring-[#ef3e34]/20"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="closing">Closing Soon</option>
            <option value="closed">Closed</option>
          </select>
          <Button variant="secondary" className="shrink-0" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Count + pagination top ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm text-[#6b7280] font-medium [font-family:'Montserrat',Helvetica]">
          {isLoading ? "Loading…" : (
            <>
              <span className="sm:hidden">{totalDocs.toLocaleString()} results</span>
              <span className="hidden sm:inline">
                {totalDocs.toLocaleString()} opportunities · page {page} of {totalPages}
              </span>
            </>
          )}
        </span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isFetching && (
            <span className="inline-flex items-center gap-1 text-xs text-[#6b7280]">
              <Loader2 size={12} className="animate-spin" />
              <span className="hidden sm:inline">Loading…</span>
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="min-w-[3rem] text-center text-xs sm:text-sm font-medium text-[#374151] whitespace-nowrap">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* ── Cards grid ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-48 sm:h-52 rounded-xl bg-white border border-[#e5e7eb] animate-pulse"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 bg-white rounded-xl border border-[#e5e7eb] border-dashed">
          <Search size={28} className="text-[#d1d5db] mb-1 sm:mb-2 sm:size-8" />
          <p className="[font-family:'Montserrat',Helvetica] font-semibold text-[#374151] text-sm sm:text-base">
            No opportunities found
          </p>
          <p className="[font-family:'Montserrat',Helvetica] text-[#6b7280] text-xs sm:text-sm text-center max-w-xs px-4">
            Try adjusting filters or run a Grants.gov sync.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r) => {
            const days = daysLeft(r.deadline);
            const urgentDeadline = days !== null && days >= 0 && days <= 14;
            const amountStr = formatAmountRange(r.minAmount, r.maxAmount);
            const deadlineStr = fmtDate(r.deadline);

            return (
              <div
                key={r._id}
                className="flex flex-col gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3.5 sm:p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-[#ef3e34]/30 transition-all duration-300 cursor-pointer group relative active:scale-[0.99]"
                onClick={() => router.push(`/admin/opportunities/${r._id}`)}
              >
                {/* Top: status + title + funder */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold [font-family:'Montserrat',Helvetica] uppercase tracking-wide",
                      STATUS_STYLES[r.status] ?? STATUS_STYLES.open
                    )}>
                      {r.status === "closing" ? "Closing Soon" : r.status}
                    </span>
                    {r.highestMatchScore != null && r.highestMatchScore > 0 && (
                      <span className="rounded-full border border-[#d1d5db] bg-[#f9fafb] px-2 py-0.5 text-[10px] font-bold [font-family:'Montserrat',Helvetica] text-[#6b7280] uppercase tracking-wide">
                        Top fit {r.highestMatchScore}%
                      </span>
                    )}
                  </div>
                  <h3 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-[13px] sm:text-[14px] leading-snug group-hover:text-[#ef3e34] transition-colors line-clamp-2">
                    {r.title}
                  </h3>
                  <p className="[font-family:'Montserrat',Helvetica] text-[11px] sm:text-xs font-semibold text-[#6b7280] line-clamp-1">
                    {r.funder}
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
                      <Calendar
                        size={12}
                        className={cn("shrink-0", urgentDeadline ? "text-red-500" : "text-[#9ca3af]")}
                      />
                      <span className={cn(
                        "[font-family:'Montserrat',Helvetica] text-[11px] sm:text-xs",
                        urgentDeadline ? "font-bold text-red-600" : "font-semibold text-[#374151]"
                      )}>
                        {deadlineStr}
                        {urgentDeadline && (
                          <span className="ml-1 bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold">
                            {days}d
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {r.category && (
                    <div className="flex items-center gap-2 truncate">
                      <Tag size={12} className="text-[#9ca3af] shrink-0" />
                      <span className="[font-family:'Montserrat',Helvetica] text-[11px] sm:text-xs font-medium text-[#6b7280] truncate">
                        {r.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer: match stats + view */}
                <div className="flex items-center justify-between pt-2.5 border-t border-dashed border-[#e5e7eb]">
                  <div className="flex items-center gap-2.5 sm:gap-3 text-[#9ca3af]">
                    {r.agenciesMatchedCount != null && (
                      <div
                        className="flex items-center gap-1"
                        title={`${r.agenciesMatchedCount} agencies matched`}
                      >
                        <Users size={11} />
                        <span className="text-[11px] font-semibold [font-family:'Montserrat',Helvetica]">
                          {r.agenciesMatchedCount}
                        </span>
                      </div>
                    )}
                    {r.applicationCount != null && (
                      <div
                        className="flex items-center gap-1"
                        title={`${r.applicationCount} applications`}
                      >
                        <FileText size={11} />
                        <span className="text-[11px] font-semibold [font-family:'Montserrat',Helvetica]">
                          {r.applicationCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[#9ca3af] group-hover:text-[#ef3e34] transition-colors">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider [font-family:'Montserrat',Helvetica]">
                      View
                    </span>
                    <ArrowRight size={12} className="transform group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination bottom ───────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex-1 sm:flex-none sm:min-w-[100px]"
          >
            <ChevronLeft size={16} className="mr-1" /> Previous
          </Button>
          <span className="shrink-0 text-sm text-[#374151] font-medium [font-family:'Montserrat',Helvetica] px-1">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex-1 sm:flex-none sm:min-w-[100px]"
          >
            Next <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
      )}

      {/* ── Add opportunity dialog ──────────────────────────────────────────── */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setForm(emptyCreateForm);
            setSelectedEquipmentTags([]);
            setSelectedCategory("");
          }
        }}
      >
        {/* Full-width on mobile, capped on larger screens */}
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl max-h-[92dvh] overflow-y-auto rounded-xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg [font-family:'Montserrat',Helvetica]">
              New opportunity
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 mt-1">
            {/* Title */}
            <div>
              <Label className="text-xs sm:text-sm">Title</Label>
              <Input
                className="mt-1 border-[#e5e7eb] text-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Funder */}
            <div>
              <Label className="text-xs sm:text-sm">Funder</Label>
              {fundersLoading ? (
                <p className="mt-1 text-sm text-[#6b7280]">Loading funders…</p>
              ) : funders.length === 0 ? (
                <p className="mt-1 text-sm text-amber-700">
                  No funders found. Add funders under{" "}
                  <span className="font-medium">Funders</span> first.
                </p>
              ) : (
                <select
                  className="mt-1 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] focus:border-[#ef3e34] focus:outline-none focus:ring-2 focus:ring-[#ef3e34]/20"
                  value={form.funderId}
                  onChange={(e) => setForm({ ...form, funderId: e.target.value })}
                  required
                >
                  <option value="">Select a funder…</option>
                  {funders.map((f) => (
                    <option key={String(f._id)} value={String(f._id)}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Deadline */}
            <div>
              <Label className="text-xs sm:text-sm">Deadline</Label>
              <Input
                type="date"
                className="mt-1 border-[#e5e7eb] text-sm"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>

            {/* Amounts — stacks on mobile, 3-col on sm+ */}
            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
              <div>
                <Label className="text-xs sm:text-sm">Min amount</Label>
                <Input
                  className="mt-1 border-[#e5e7eb] text-sm"
                  placeholder="$25,000"
                  value={form.minAmount}
                  onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Max amount</Label>
                <Input
                  className="mt-1 border-[#e5e7eb] text-sm"
                  placeholder="$150,000"
                  value={form.maxAmount}
                  onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Award amount</Label>
                <Input
                  className="mt-1 border-[#e5e7eb] text-sm"
                  placeholder="$50,000"
                  value={form.awardAmount}
                  onChange={(e) => setForm({ ...form, awardAmount: e.target.value })}
                />
              </div>
            </div>

            {/* URLs */}
            <div>
              <Label className="text-xs sm:text-sm">Official opportunity link</Label>
              <Input
                className="mt-1 border-[#e5e7eb] text-sm"
                placeholder="https://…"
                value={form.sourceUrl}
                onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs sm:text-sm">Application URL</Label>
              <Input
                className="mt-1 border-[#e5e7eb] text-sm"
                placeholder="https://…"
                value={form.applicationUrl}
                onChange={(e) => setForm({ ...form, applicationUrl: e.target.value })}
              />
            </div>

            {/* Contact fields — stacks on mobile, 3-col on sm+ */}
            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
              <div>
                <Label className="text-xs sm:text-sm">Contact name</Label>
                <Input
                  className="mt-1 border-[#e5e7eb] text-sm"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Contact email</Label>
                <Input
                  className="mt-1 border-[#e5e7eb] text-sm"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Contact phone</Label>
                <Input
                  className="mt-1 border-[#e5e7eb] text-sm"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                />
              </div>
            </div>

            {/* Tags, keywords, category, description */}
            <TagSelect
              label="Equipment tags"
              options={EQUIPMENT_TAGS}
              selected={selectedEquipmentTags}
              onChange={setSelectedEquipmentTags}
              allowCustom
            />
            <div>
              <Label className="text-xs sm:text-sm">Keywords (comma separated)</Label>
              <Input
                className="mt-1 border-[#e5e7eb] text-sm"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              />
            </div>
            <CategorySelect
              label="Category"
              options={FUNDING_CATEGORIES}
              value={selectedCategory}
              onChange={setSelectedCategory}
            />
            <div>
              <Label className="text-xs sm:text-sm">Description</Label>
              <Textarea
                className="mt-1 border-[#e5e7eb] text-sm min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Local match checkbox */}
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#374151]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[#e5e7eb] shrink-0"
                checked={form.localMatchRequired}
                onChange={(e) => setForm({ ...form, localMatchRequired: e.target.checked })}
              />
              <span className="text-xs sm:text-sm leading-snug">
                Local match typically required for this grant
              </span>
            </label>
          </div>

          {/* Footer */}
          <DialogFooter className="mt-2 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => { setForm(emptyCreateForm); setOpen(false); }}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto bg-[#ef3e34] hover:bg-[#d63530]"
              onClick={() => create.mutate()}
              disabled={
                create.isPending ||
                !form.title.trim() ||
                !form.funderId ||
                !String(form.contactEmail || "").trim() ||
                fundersLoading ||
                funders.length === 0
              }
            >
              {create.isPending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> Creating…
                </span>
              ) : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}