"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, X, ExternalLink, Loader2, Calendar, DollarSign, Tag, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { qk } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { addOpportunitySchema, type AddOpportunityFormValues } from "@/lib/validation-schemas";
import { cn } from "@/lib/utils";

interface Opportunity {
  _id: string;
  title: string;
  funder: string;
  deadline?: string;
  maxAmount?: number;
  sourceUrl?: string;
  keywords?: string[];
  agencyTypes?: string[];
  description?: string;
  category?: string;
  status: "open" | "closing" | "closed";
  createdAt?: string;
}

const STATUS_STYLES = {
  open: "bg-green-100 text-green-700 border-green-200",
  closing: "bg-orange-100 text-orange-700 border-orange-200",
  closed: "bg-gray-100 text-gray-500 border-gray-200",
};

const fmtAmount = (n?: number) => (n ? "$" + n.toLocaleString() : null);
const fmtDate = (d?: string) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const daysLeft = (d?: string) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
};

const inputCls =
  "w-full rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 [font-family:'Montserrat',Helvetica] text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#ef3e34] focus:outline-none focus:ring-2 focus:ring-[#ef3e34]/20";

export const Opportunities = () => {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<{ data: Opportunity[] }>({
    queryKey: qk.opportunities(),
    queryFn: async () => {
      const res = await api.get("/opportunities", { params: { limit: 200 } });
      return res.data;
    },
  });

  const opportunities: Opportunity[] = (data?.data ?? []).filter((o) => {
    const matchSearch =
      !search ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.funder.toLowerCase().includes(search.toLowerCase()) ||
      o.keywords?.some((k) => k.toLowerCase().includes(search.toLowerCase()));
    const matchCat =
      !categoryFilter ||
      (o.category || "").toLowerCase().includes(categoryFilter.toLowerCase()) ||
      o.keywords?.some((k) => k.toLowerCase().includes(categoryFilter.toLowerCase()));
    const matchStatus = !statusFilter || statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const categories = Array.from(
    new Set((data?.data ?? []).map((o) => o.category).filter(Boolean))
  ).sort() as string[];

  const generateMutation = useMutation({
    mutationFn: (opportunityId: string) =>
      api.post("/applications/generate", { opportunityId }),
    onSuccess: (res) => {
      const id = res.data.data?._id ?? res.data.data?.id;
      toast({ title: "Application created", description: "AI is drafting your application." });
      queryClient.invalidateQueries({ queryKey: qk.applications() });
      if (id) router.push(`/applications/${id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        title: "Could not generate application",
        description: msg || "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 pb-10 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl sm:text-3xl tracking-[0.5px] uppercase leading-tight">
            Grant Opportunities
          </h1>
          <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-sm">
            Browse public safety grant opportunities and generate AI-powered applications
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#ef3e34] px-4 py-2.5 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] transition-colors self-start"
        >
          <Plus size={16} />
          Add Opportunity
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            className={cn(inputCls, "pl-9")}
            placeholder="Search by name, funder, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input
          className="w-full sm:w-48 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 [font-family:'Montserrat',Helvetica] text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#ef3e34] focus:outline-none"
          placeholder="Filter by category..."
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          list="category-options"
        />
        <datalist id="category-options">
          {categories.map((c) => <option key={c} value={c} />)}
        </datalist>
        <select
          className="w-full sm:w-40 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 [font-family:'Montserrat',Helvetica] text-sm text-[#111827] focus:border-[#ef3e34] focus:outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="closing">Closing Soon</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between">
        <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">
          {isLoading ? "Loading..." : `${opportunities.length} opportunit${opportunities.length !== 1 ? "ies" : "y"} found`}
        </span>
      </div>

      {/* Content */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="[font-family:'Montserrat',Helvetica] text-red-600 text-base">Failed to load opportunities.</p>
          <button onClick={() => refetch()} className="rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d63029]">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 rounded-xl bg-white animate-pulse border border-[#e5e7eb]" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="[font-family:'Montserrat',Helvetica] text-[#6b7280] text-base">No opportunities found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-bold text-white hover:bg-[#d63029]"
          >
            <Plus size={14} /> Add your first opportunity
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {opportunities.map((opp) => {
            const days = daysLeft(opp.deadline);
            const urgentDeadline = days !== null && days >= 0 && days <= 14;
            const deadlineStr = fmtDate(opp.deadline);
            const isGenerating = generateMutation.isPending && generateMutation.variables === opp._id;

            return (
              <div
                key={opp._id}
                className="flex flex-col gap-4 rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setSelectedOpp(opp)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span
                      className={cn(
                        "self-start rounded-full border px-2 py-0.5 text-xs font-semibold [font-family:'Montserrat',Helvetica] uppercase tracking-wide",
                        STATUS_STYLES[opp.status] || STATUS_STYLES.open
                      )}
                    >
                      {opp.status === "closing" ? "Closing Soon" : opp.status}
                    </span>
                    <h3 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-base leading-snug group-hover:text-[#ef3e34] transition-colors">
                      {opp.title}
                    </h3>
                    <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">{opp.funder}</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-[#d1d5db] group-hover:text-[#ef3e34] transition-colors mt-1" />
                </div>

                <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280] leading-relaxed line-clamp-2">
                  {opp.description || "No description available."}
                </p>

                <div className="flex flex-col gap-1.5">
                  {opp.maxAmount && (
                    <div className="flex items-center gap-2">
                      <DollarSign size={13} className="text-[#9ca3af] shrink-0" />
                      <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
                        Up to {fmtAmount(opp.maxAmount)}
                      </span>
                    </div>
                  )}
                  {deadlineStr && (
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className={cn("shrink-0", urgentDeadline ? "text-red-500" : "text-[#9ca3af]")} />
                      <span className={cn("[font-family:'Montserrat',Helvetica] text-sm", urgentDeadline ? "font-semibold text-red-600" : "text-[#374151]")}>
                        {deadlineStr}
                        {urgentDeadline && ` · ${days}d left`}
                      </span>
                    </div>
                  )}
                  {opp.category && (
                    <div className="flex items-center gap-2">
                      <Tag size={13} className="text-[#9ca3af] shrink-0" />
                      <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">{opp.category}</span>
                    </div>
                  )}
                </div>

                {opp.keywords && opp.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {opp.keywords.slice(0, 3).map((k) => (
                      <span key={k} className="rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs [font-family:'Montserrat',Helvetica] text-[#6b7280]">
                        {k}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  className="mt-auto w-full rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  disabled={opp.status === "closed" || generateMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    generateMutation.mutate(opp._id);
                  }}
                >
                  {isGenerating ? (
                    <><Loader2 size={14} className="animate-spin" /> Generating…</>
                  ) : opp.status === "closed" ? (
                    "Closed"
                  ) : (
                    "✦ Generate Application"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Opportunity Detail Modal */}
      {selectedOpp && (
        <OppDetailModal
          opp={selectedOpp}
          onClose={() => setSelectedOpp(null)}
          onGenerate={() => generateMutation.mutate(selectedOpp._id)}
          generating={generateMutation.isPending}
        />
      )}

      {/* Add Opportunity Modal */}
      {showAddModal && (
        <AddOpportunityModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: qk.opportunities() });
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

/* ── Opportunity Detail Modal ─────────────────────────────── */
const OppDetailModal = ({
  opp,
  onClose,
  onGenerate,
  generating,
}: {
  opp: Opportunity;
  onClose: () => void;
  onGenerate: () => void;
  generating: boolean;
}) => {
  const days = daysLeft(opp.deadline);
  const urgentDeadline = days !== null && days >= 0 && days <= 14;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] p-6">
          <div className="flex flex-col gap-1 min-w-0">
            <span
              className={cn(
                "self-start rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide [font-family:'Montserrat',Helvetica]",
                STATUS_STYLES[opp.status] || STATUS_STYLES.open
              )}
            >
              {opp.status === "closing" ? "Closing Soon" : opp.status}
            </span>
            <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-xl uppercase tracking-[0.3px] leading-tight">
              {opp.title}
            </h2>
            <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">{opp.funder}</p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Key info */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
            {opp.maxAmount && (
              <div className="flex flex-col gap-0.5">
                <span className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">Award Amount</span>
                <span className="[font-family:'Montserrat',Helvetica] text-base font-bold text-[#111827]">Up to {fmtAmount(opp.maxAmount)}</span>
              </div>
            )}
            {opp.deadline && (
              <div className="flex flex-col gap-0.5">
                <span className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">Deadline</span>
                <span className={cn("[font-family:'Montserrat',Helvetica] text-base font-bold", urgentDeadline ? "text-red-600" : "text-[#111827]")}>
                  {fmtDate(opp.deadline)}
                  {urgentDeadline && <span className="ml-1 text-sm font-normal">({days}d left)</span>}
                </span>
              </div>
            )}
            {opp.category && (
              <div className="flex flex-col gap-0.5">
                <span className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">Category</span>
                <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#374151]">{opp.category}</span>
              </div>
            )}
            {opp.agencyTypes && opp.agencyTypes.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">Eligible Agencies</span>
                <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151]">{opp.agencyTypes.join(", ")}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {opp.description && (
            <div className="flex flex-col gap-2">
              <h4 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm uppercase tracking-wide">Description</h4>
              <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151] leading-relaxed">{opp.description}</p>
            </div>
          )}

          {/* Keywords */}
          {opp.keywords && opp.keywords.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm uppercase tracking-wide">Keywords</h4>
              <div className="flex flex-wrap gap-1.5">
                {opp.keywords.map((k) => (
                  <span key={k} className="rounded-full bg-[#fef2f2] border border-[#fecaca] px-2.5 py-0.5 text-xs [font-family:'Montserrat',Helvetica] text-[#ef3e34] font-medium">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {opp.sourceUrl && opp.sourceUrl !== "#" && (
            <a
              href={opp.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#ef3e34] [font-family:'Montserrat',Helvetica] hover:underline"
            >
              <ExternalLink size={14} /> View Original Source
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-[#e5e7eb] p-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] [font-family:'Montserrat',Helvetica] hover:bg-[#f9fafb]"
          >
            Close
          </button>
          <button
            onClick={() => {
              onGenerate();
              onClose();
            }}
            disabled={opp.status === "closed" || generating}
            className="flex-1 rounded-lg bg-[#ef3e34] px-4 py-2.5 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {generating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : "✦ Generate Application"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Add Opportunity Modal ────────────────────────────────── */
const AddOpportunityModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) => {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddOpportunityFormValues>({
    resolver: zodResolver(addOpportunitySchema),
    defaultValues: { title: "", funder: "", deadline: "", maxAmount: "", sourceUrl: "", keywords: "", description: "" },
  });

  const onSubmit = async (values: AddOpportunityFormValues) => {
    const payload = {
      title: values.title,
      funder: values.funder,
      description: values.description,
      sourceUrl: values.sourceUrl || undefined,
      keywords: values.keywords ? values.keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
      deadline: values.deadline
        ? new Date(values.deadline).toISOString()
        : undefined,
      maxAmount: values.maxAmount
        ? parseFloat(String(values.maxAmount).replace(/,/g, ""))
        : undefined,
    };
    try {
      await api.post("/opportunities", payload);
      toast({ title: "Opportunity added successfully" });
      onCreated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: "Failed to add opportunity", description: msg || "Please try again.", variant: "destructive" });
    }
  };

  const fieldCls = (hasErr: boolean) =>
    cn(
      "w-full rounded-lg border px-4 py-2.5 [font-family:'Montserrat',Helvetica] text-sm text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2",
      hasErr
        ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
        : "border-[#e5e7eb] focus:border-[#ef3e34] focus:ring-[#ef3e34]/20"
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4">
          <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-lg uppercase tracking-[0.3px]">
            Add Grant Opportunity
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="[font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#374151] uppercase tracking-wide">
              Grant Title <span className="text-red-500">*</span>
            </label>
            <input {...register("title")} placeholder="e.g. FEMA BRIC Grant FY2026" className={fieldCls(!!errors.title)} />
            {errors.title && <span className="text-xs text-red-500">{errors.title.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="[font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#374151] uppercase tracking-wide">
              Funder <span className="text-red-500">*</span>
            </label>
            <input {...register("funder")} placeholder="e.g. FEMA" className={fieldCls(!!errors.funder)} />
            {errors.funder && <span className="text-xs text-red-500">{errors.funder.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="[font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#374151] uppercase tracking-wide">
                Deadline
              </label>
              <input {...register("deadline")} placeholder="mm/dd/yyyy" className={fieldCls(!!errors.deadline)} />
              {errors.deadline && <span className="text-xs text-red-500">{errors.deadline.message}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="[font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#374151] uppercase tracking-wide">
                Max Amount
              </label>
              <input {...register("maxAmount")} placeholder="e.g. 100000" className={fieldCls(!!errors.maxAmount)} />
              {errors.maxAmount && <span className="text-xs text-red-500">{errors.maxAmount.message}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="[font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#374151] uppercase tracking-wide">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="What does this grant fund? Who is eligible?"
              className={cn(fieldCls(!!errors.description), "resize-none")}
            />
            {errors.description && <span className="text-xs text-red-500">{errors.description.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="[font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#374151] uppercase tracking-wide">
              Keywords (comma-separated)
            </label>
            <input {...register("keywords")} placeholder="e.g. fire, EMS, radio, communications" className={fieldCls(false)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="[font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#374151] uppercase tracking-wide">
              Source URL
            </label>
            <input {...register("sourceUrl")} placeholder="https://..." className={fieldCls(!!errors.sourceUrl)} />
            {errors.sourceUrl && <span className="text-xs text-red-500">{errors.sourceUrl.message}</span>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] [font-family:'Montserrat',Helvetica] hover:bg-[#f9fafb]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-[#ef3e34] px-4 py-2.5 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? "Adding..." : "Add Opportunity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
