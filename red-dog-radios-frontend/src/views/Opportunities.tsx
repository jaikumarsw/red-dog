"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { qk } from "@/lib/queryKeys";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Calendar, X, ChevronRight, ExternalLink, Zap, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { CheckboxFilterDropdown } from "@/components/CheckboxFilterDropdown";
import { MobileFilterSelect } from "@/components/MobileFilterSelect";
import { cn } from "@/lib/utils";
import {
  addOpportunitySchema,
  ashleenApplicationDraftSchema,
  type AddOpportunityFormValues,
  type AshleenApplicationDraftValues,
} from "@/lib/validation-schemas";

/* ── Mock data ─────────────────────────────────────────── */
const ALL_KEYWORDS = [
  "arts","culture","community","underrepresented","inclusive",
  "journalism","media","local news","radio","public media","rural",
];

const mockOpportunities = [
  {
    id: 1,
    grant: "Community Arts & Culture Fund",
    funder: "Robert Wood Johnson Foundation",
    keywords: ["arts","culture","community"],
    keywordsFull: ["media","community","culture","journalism","arts"],
    category: "Arts & Culture",
    amount: "$50,000",
    amountNum: 50000,
    deadline: "Apr 1, 2026",
    status: "closing",
    description: "Supports arts organizations that serve underrepresented communities through inclusive programming and cultural initiatives.",
    sourceUrl: "#",
  },
  {
    id: 2,
    grant: "Local Journalism Initiative",
    funder: "Knight Foundation",
    keywords: ["journalism","media","local news"],
    keywordsFull: ["journalism","media","local news","community"],
    category: "Journalism & Media",
    amount: "$100,000",
    amountNum: 100000,
    deadline: "May 15, 2026",
    status: "open",
    description: "Supports local journalism and investigative reporting that strengthens community engagement and democratic participation.",
    sourceUrl: "#",
  },
  {
    id: 3,
    grant: "Community Radio Sustainability",
    funder: "NEA",
    keywords: ["radio","community","rural"],
    keywordsFull: ["radio","community","rural","public media"],
    category: "Community Development",
    amount: "$25,000",
    amountNum: 25000,
    deadline: "Jun 30, 2026",
    status: "open",
    description: "Supports rural and community radio stations in maintaining sustainable operations and serving underserved audiences.",
    sourceUrl: "#",
  },
  {
    id: 4,
    grant: "Public Media Innovation",
    funder: "CPB",
    keywords: ["innovation","technology","public media"],
    keywordsFull: ["innovation","technology","public media","radio"],
    category: "Technology",
    amount: "$75,000",
    amountNum: 75000,
    deadline: "Mar 30, 2026",
    status: "closing",
    description: "Supports public media organizations adopting innovative technology to expand audience reach and programming quality.",
    sourceUrl: "#",
  },
  {
    id: 5,
    grant: "Youth Media Arts Program",
    funder: "Ford Foundation",
    keywords: ["youth","education","arts"],
    keywordsFull: ["youth","education","arts","community"],
    category: "Youth Programs",
    amount: "$40,000",
    amountNum: 40000,
    deadline: "Aug 1, 2026",
    status: "open",
    description: "Supports youth-focused media arts programs that build creative skills and civic engagement in underserved communities.",
    sourceUrl: "#",
  },
];

type Opportunity = {
  id: string | number;
  grant: string;
  funder: string;
  keywords: string[];
  keywordsFull: string[];
  category: string;
  amount: string;
  amountNum: number;
  deadline: string;
  deadlineRaw: string | null;
  status: string;
  description: string;
  sourceUrl: string;
  createdBy?: string;
};

type ApiOpportunity = {
  _id: string;
  title?: string;
  funder?: string;
  keywords?: string[];
  category?: string;
  maxAmount?: number;
  deadline?: string;
  status?: string;
  description?: string;
  sourceUrl?: string;
  createdBy?: string | { _id: string; firstName?: string; lastName?: string; email?: string };
};

const fmtDeadline = (s: string | undefined) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
};

const mapOpp = (o: ApiOpportunity): Opportunity => {
  const kws = o.keywords ?? [];
  const createdBy =
    typeof o.createdBy === "string"
      ? o.createdBy
      : o.createdBy?._id;
  return {
    id: o._id,
    grant: o.title ?? "Unknown",
    funder: o.funder ?? "—",
    keywords: kws.slice(0, 3),
    keywordsFull: kws,
    category: o.category ?? "—",
    amount: o.maxAmount ? `$${o.maxAmount.toLocaleString()}` : "—",
    amountNum: o.maxAmount ?? 0,
    deadline: fmtDeadline(o.deadline),
    deadlineRaw: o.deadline ?? null,
    status: o.status ?? "open",
    description: o.description ?? "",
    sourceUrl: o.sourceUrl ?? "#",
    createdBy,
  };
};

const deadlineDaysLeft = (raw: string | null): number | null => {
  if (!raw) return null;
  const diff = new Date(raw).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const deadlineColor = (raw: string | null): string => {
  const days = deadlineDaysLeft(raw);
  if (days === null) return "text-[#374151]";
  if (days <= 7) return "text-[#dc2626] font-semibold";
  if (days <= 14) return "text-[#f97316] font-semibold";
  return "text-[#374151]";
};

/* ── Shared ────────────────────────────────────────────── */
const inputClass =
  "h-10 border-[#e5e7eb] rounded-lg [font-family:'Montserrat',Helvetica] text-sm placeholder:text-[#d1d5db] focus-visible:ring-[#ef3e34] focus-visible:ring-1 focus-visible:border-[#ef3e34]";

const statusStyle = (s: string) => {
  if (s === "open") return "bg-[#dcfce7] text-[#16a34a]";
  if (s === "closing") return "bg-[#fef9c3] text-[#b45309]";
  return "bg-[#f3f4f6] text-[#6b7280]";
};

/* ── Add Opportunity Modal ─────────────────────────────── */
const AddOpportunityModal = ({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string) => void }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddOpportunityFormValues>({
    resolver: zodResolver(addOpportunitySchema),
    defaultValues: {
      title: "",
      funder: "",
      deadline: "",
      maxAmount: "",
      sourceUrl: "",
      keywords: "",
      description: "",
    },
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const field = (name: keyof AddOpportunityFormValues) =>
    cn(inputClass, errors[name] && "border-red-500 focus-visible:ring-red-500");

  const [serverError, setServerError] = useState("");

  const parseDeadline = (v: string) => {
    if (!v) return undefined;
    const parts = v.split("/");
    if (parts.length !== 3) return undefined;
    const [m, d, y] = parts;
    const dt = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    return isNaN(dt.getTime()) ? undefined : dt.toISOString();
  };

  const createMutation = useMutation({
    mutationFn: (data: AddOpportunityFormValues) => {
      const kwds = data.keywords.split(",").map((s) => s.trim()).filter(Boolean);
      return api.post("/opportunities", {
        title: data.title.trim(),
        funder: data.funder.trim(),
        deadline: parseDeadline(data.deadline),
        maxAmount: data.maxAmount ? Number(data.maxAmount.replace(/,/g, "")) : undefined,
        sourceUrl: data.sourceUrl.trim() || undefined,
        keywords: kwds,
        description: data.description.trim(),
        status: "open",
      });
    },
    onSuccess: (_data, variables) => {
      onCreate(variables.title.trim());
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create opportunity.";
      setServerError(msg);
    },
  });

  const onValid = (data: AddOpportunityFormValues) => {
    setServerError("");
    createMutation.mutate(data);
  };

  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex max-h-[min(90dvh,920px)] w-full min-w-0 max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] sm:max-h-[min(90vh,920px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#f3f4f6] px-4 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-7">
          <h2 className="min-w-0 pr-2 [font-family:'Oswald',Helvetica] text-lg font-bold uppercase tracking-[0.5px] text-black sm:text-xl">
            Add Opportunity
          </h2>
          <button type="button" onClick={onClose} className="w-7 h-7 flex shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors">
            <X size={14} className="text-[#6b7280]" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onValid)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Opportunity Title <span className="text-[#ef3e34]">*</span></Label>
              <Input placeholder="e.g. Red Dog" className={field("title")} {...register("title")} />
              {errors.title && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.title.message}</p>}
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Funder / Foundation <span className="text-[#ef3e34]">*</span></Label>
                <Input placeholder="e.g. Seattle" className={field("funder")} {...register("funder")} />
                {errors.funder && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.funder.message}</p>}
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Deadline</Label>
                <Input placeholder="mm/dd/yyyy" className={field("deadline")} {...register("deadline")} />
                {errors.deadline && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.deadline.message}</p>}
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Max Amount ($)</Label>
                <Input placeholder="E.g. 50000" className={field("maxAmount")} {...register("maxAmount")} />
                {errors.maxAmount && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.maxAmount.message}</p>}
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Source URL</Label>
                <Input placeholder="https://" className={field("sourceUrl")} {...register("sourceUrl")} />
                {errors.sourceUrl && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.sourceUrl.message}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Keywords (comma-separated)</Label>
              <Input placeholder="radio, community, arts" className={field("keywords")} {...register("keywords")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Description <span className="text-[#ef3e34]">*</span></Label>
              <Textarea placeholder="Brief Overview..." rows={4}
                className={cn(
                  "border-[#e5e7eb] rounded-lg [font-family:'Montserrat',Helvetica] text-sm placeholder:text-[#d1d5db] focus-visible:ring-[#ef3e34] focus-visible:ring-1 focus-visible:border-[#ef3e34] resize-none",
                  errors.description && "border-red-500 focus-visible:ring-red-500"
                )}
                {...register("description")}
              />
              {errors.description && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.description.message}</p>}
            </div>
          </div>
          {serverError && (
            <div className="shrink-0 px-4 sm:px-7 pb-2">
              <p className="[font-family:'Montserrat',Helvetica] text-xs text-red-600">{serverError}</p>
            </div>
          )}
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#f3f4f6] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-7 sm:py-5 sm:pb-5">
            <button type="button" onClick={onClose} className="h-10 w-full rounded-lg px-4 py-2 [font-family:'Montserrat',Helvetica] text-sm font-medium text-[#6b7280] transition-colors hover:bg-[#f9fafb] hover:text-[#374151] sm:h-auto sm:w-auto sm:hover:bg-transparent">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending} className="h-10 w-full rounded-lg bg-[#ef3e34] px-5 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-white transition-colors hover:bg-[#d63530] sm:w-auto disabled:opacity-60">
              {createMutation.isPending ? "Creating..." : "Create Opportunity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
};

/* ── Grant Preview Modal ───────────────────────────────── */
const GrantPreviewModal = ({ opp, onClose, onApply, isOwner }: { opp: Opportunity; onClose: () => void; onApply: () => void; isOwner?: boolean }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);
  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[460px] mx-4 flex flex-col">
      <div className="flex items-center justify-between px-7 pt-7 pb-4">
        <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-xl tracking-[0.5px] uppercase">Grant Details</h2>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors">
          <X size={14} className="text-[#6b7280]" />
        </button>
      </div>
      <div className="px-7 pb-6 flex flex-col gap-4">
        <div className="bg-[#f9fafb] rounded-xl p-4 border border-[#f0f0f0]">
          <p className="[font-family:'Oswald',Helvetica] font-bold text-black text-base uppercase tracking-[0.3px]">{opp.grant}</p>
          <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-xs mt-0.5">{opp.funder}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([
            { label: "Amount", value: opp.amount, isStatus: false },
            { label: "Deadline", value: opp.deadline, isStatus: false },
            { label: "Status", value: opp.status, isStatus: true },
          ] as { label: string; value: string; isStatus: boolean }[]).map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 bg-[#f9fafb] rounded-xl p-3 border border-[#f0f0f0]">
              <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">{s.label}</span>
              {s.isStatus ? (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full [font-family:'Montserrat',Helvetica] font-semibold text-xs ${statusStyle(s.value)}`}>{s.value}</span>
              ) : (
                <span className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm">{s.value}</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <p className="[font-family:'Montserrat',Helvetica] font-semibold text-sm text-[#111827]">Keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {opp.keywordsFull.map((k) => (
              <span key={k} className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#e5e7eb] bg-white [font-family:'Montserrat',Helvetica] font-normal text-[#374151] text-xs">{k}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="[font-family:'Montserrat',Helvetica] font-semibold text-sm text-[#111827]">Description</p>
          <div className="bg-[#f9fafb] rounded-xl p-4 border border-[#f0f0f0]">
            <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#374151] text-sm leading-5">{opp.description}</p>
          </div>
        </div>
        <a href="#" className="flex items-center gap-1 [font-family:'Montserrat',Helvetica] font-medium text-[#ef3e34] text-sm hover:underline w-fit">
          <ExternalLink size={13} />
          Visit funder website
        </a>
      </div>
      <div className="flex items-center justify-between gap-3 px-7 py-5 border-t border-[#f3f4f6]">
        <button onClick={onClose} className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#6b7280] hover:text-[#374151] px-4 py-2 transition-colors">Close</button>
        {isOwner ? (
          <div className="flex items-center gap-2 h-10 px-4 rounded-lg bg-[#f9fafb] border border-[#e5e7eb]">
            <span className="text-[#16a34a] text-base leading-none">✓</span>
            <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#374151]">You posted this grant</span>
          </div>
        ) : (
          <button onClick={onApply} className="h-10 px-5 bg-[#ef3e34] hover:bg-[#d63530] text-white rounded-lg [font-family:'Montserrat',Helvetica] font-semibold text-sm flex items-center gap-1.5 transition-colors">
            <Zap size={14} />
            Apply with Ashleen
          </button>
        )}
      </div>
    </div>
  </div>
  );
};

/* ── Ashleen Chat Bubble ───────────────────────────────── */
const AshleenMsg = ({ text }: { text: string }) => (
  <div className="flex items-start gap-2.5">
    <div className="w-8 h-8 rounded-full bg-[#ef3e34] flex items-center justify-center flex-shrink-0">
      <span className="[font-family:'Montserrat',Helvetica] font-bold text-white text-xs">A</span>
    </div>
    <div className="flex-1 bg-[#f9fafb] rounded-xl px-4 py-3 border border-[#f0f0f0]">
      <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#374151] text-sm leading-5">{text}</p>
    </div>
  </div>
);

const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("rdg_user");
    return s ? (JSON.parse(s) as { fullName?: string; firstName?: string; lastName?: string; email?: string }) : null;
  } catch { return null; }
};

const ashleenDraftDefaults = (o: Opportunity): AshleenApplicationDraftValues => ({
  organizationName: "",
  contactName: "",
  projectTimeline: "12 months",
  contactEmail: "",
  amountRequested: o.amount,
  projectTitle: o.grant,
  projectSummary: "",
  communityImpact: "",
});

/* ── Ashleen Modal ─────────────────────────────────────── */
const AshleenModal = ({ opp, onClose }: { opp: Opportunity; onClose: () => void }) => {
  const [step, setStep] = useState(0);
  const [appId, setAppId] = useState<string | null>(null);
  const [tellMoreLoading, setTellMoreLoading] = useState(false);
  const [tellMoreContent, setTellMoreContent] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ashleen"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [generatingField, setGeneratingField] = useState<"projectSummary" | "communityImpact" | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<AshleenApplicationDraftValues>({
    resolver: zodResolver(ashleenApplicationDraftSchema),
    defaultValues: ashleenDraftDefaults(opp),
  });

  useEffect(() => {
    const u = getStoredUser();
    const updates: Partial<AshleenApplicationDraftValues> = {};
    if (u) {
      const contactName = u.fullName || (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : "") || "";
      const contactEmail = u.email || "";
      if (contactName) updates.contactName = contactName;
      if (contactEmail) updates.contactEmail = contactEmail;
      const stored = typeof window !== "undefined" ? localStorage.getItem("rdg_user") : null;
      const fullUser = stored ? (JSON.parse(stored) as { organizationId?: string }) : {};
      if (fullUser.organizationId) {
        api.get(`/organizations/${fullUser.organizationId}`)
          .then((res) => {
            const orgName: string = res.data.data?.name || res.data.data?.organizationName || "";
            reset((prev) => ({ ...prev, ...updates, ...(orgName ? { organizationName: orgName } : {}) }));
          })
          .catch(() => {
            if (Object.keys(updates).length > 0) reset((prev) => ({ ...prev, ...updates }));
          });
        return;
      }
    }
    if (Object.keys(updates).length > 0) reset((prev) => ({ ...prev, ...updates }));
  }, [reset]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  /* Auto-generate AI content when the form opens (step 2) */
  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    const run = async () => {
      setGeneratingField("projectSummary");
      try {
        const res = await api.post("/ashleen/chat", {
          messages: [{ role: "user", content: "Write the Project Summary section for our grant application." }],
          systemSuffix: `Write ONLY the Project Summary field content for a ${opp.amount} grant application to "${opp.grant}" from ${opp.funder}. Write 2-3 professional paragraphs for a public safety agency seeking communications/radio equipment funding. NO greeting or introduction — start directly with the content.`,
        });
        const reply: string = res.data.data?.reply || "";
        if (!cancelled && reply) setValue("projectSummary", reply);
      } catch { /* silent */ }
      if (cancelled) return;
      setGeneratingField("communityImpact");
      try {
        const res = await api.post("/ashleen/chat", {
          messages: [{ role: "user", content: "Write the Community Impact section for our grant application." }],
          systemSuffix: `Write ONLY the Community Impact field content for the "${opp.grant}" grant application. 1-2 paragraphs about measurable community benefit and who benefits from this funding. NO greeting or introduction — start directly with the content.`,
        });
        const reply: string = res.data.data?.reply || "";
        if (!cancelled && reply) setValue("communityImpact", reply);
      } catch { /* silent */ }
      if (cancelled) return;
      setGeneratingField(null);
      if (!cancelled) {
        setChatMessages([{
          role: "ashleen",
          text: "I've drafted the Project Summary and Community Impact sections! Feel free to ask me to make any changes — just describe what you'd like different.",
        }]);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Helpers ──────────────────────────────────────────── */
  const callAshleen = async (
    messages: { role: string; content: string }[],
    systemSuffix?: string,
  ): Promise<string> => {
    const res = await api.post("/ashleen/chat", { messages, systemSuffix });
    return (res.data.data?.reply as string) || "";
  };

  const generateField = async (field: "projectSummary" | "communityImpact") => {
    if (generatingField) return;
    setGeneratingField(field);
    try {
      const label = field === "projectSummary" ? "Project Summary" : "Community Impact";
      const suffix =
        field === "projectSummary"
          ? `Write ONLY the Project Summary field content for a ${opp.amount} grant application to "${opp.grant}" from ${opp.funder}. 2-3 professional paragraphs. NO greeting — start directly with the content.`
          : `Write ONLY the Community Impact field content for the "${opp.grant}" grant application. 1-2 paragraphs about measurable community benefit. NO greeting — start directly with the content.`;
      const reply = await callAshleen(
        [{ role: "user", content: `Regenerate the ${label} section.` }],
        suffix,
      );
      if (reply) setValue(field, reply);
    } catch { /* silent */ }
    setGeneratingField(null);
  };

  const handleTellMore = () => {
    setStep(1);
    setTellMoreLoading(true);
    setTellMoreContent("");
    callAshleen(
      [{ role: "user", content: `Tell me about the "${opp.grant}" grant from ${opp.funder}. Amount: ${opp.amount}. Category: ${opp.category}.` }],
      `Provide detailed, actionable information about this grant opportunity in 150 words or less. Cover: what it funds, who is eligible, key requirements, and 2 specific tips for a strong application from a public safety agency. Be specific and helpful.`,
    )
      .then((reply) => { setTellMoreContent(reply); setTellMoreLoading(false); })
      .catch(() => {
        setTellMoreContent(`The "${opp.grant}" from ${opp.funder} is a ${opp.amount} grant supporting ${opp.category.toLowerCase()} initiatives. Public safety agencies are strong candidates. Focus your application on specific equipment needs, measurable outcomes, and the number of people your agency serves.`);
        setTellMoreLoading(false);
      });
  };

  const handleChat = async () => {
    const userMsg = chatInput.trim();
    if (!userMsg || chatLoading) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const currentSummary = getValues("projectSummary") || "";
      const currentImpact = getValues("communityImpact") || "";
      const context = `Current Project Summary (first 120 chars): "${currentSummary.slice(0, 120)}". Current Community Impact (first 120 chars): "${currentImpact.slice(0, 120)}".`;
      const history = chatMessages.map((m) => ({ role: m.role === "ashleen" ? "assistant" : "user", content: m.text }));
      const suffix = `${context}\n\nYou are helping fill in a grant application form for "${opp.grant}" from ${opp.funder} (${opp.amount}). The form has 'Project Summary' and 'Community Impact' text fields. If the user asks you to write, rewrite, or edit either field, begin your response EXACTLY with 'FIELD:projectSummary:' or 'FIELD:communityImpact:' (no space after the colon) followed immediately by the new field content. If just answering a question, respond normally.`;
      const reply = await callAshleen(
        [...history, { role: "user", content: userMsg }],
        suffix,
      );
      const fieldMatch = reply.match(/^FIELD:(projectSummary|communityImpact):([\s\S]+)$/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1] as "projectSummary" | "communityImpact";
        const content = fieldMatch[2].trim();
        setValue(fieldName, content);
        const fieldLabel = fieldName === "projectSummary" ? "Project Summary" : "Community Impact";
        setChatMessages((prev) => [...prev, { role: "ashleen", text: `Done! I've updated the ${fieldLabel}. Let me know if you'd like any further changes.` }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "ashleen", text: reply }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: "ashleen", text: "Sorry, I had trouble with that. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const applyMutation = useMutation({
    mutationFn: () => {
      const stored = typeof window !== "undefined" ? localStorage.getItem("rdg_user") : null;
      const user = stored ? (JSON.parse(stored) as { organizationId?: string; organization?: string }) : {};
      const orgId = user.organizationId ?? user.organization ?? undefined;
      if (!orgId) throw new Error("No organization found. Please complete your agency profile first.");
      return api.post("/applications", {
        opportunity: String(opp.id),
        organization: orgId,
        projectTitle: opp.grant,
        status: "draft",
      });
    },
    onSuccess: (res) => {
      const id = (res.data.data?._id ?? res.data.data?.id ?? null) as string | null;
      setAppId(id);
      setStep(2);
    },
    onError: (err: Error) => {
      toast({
        title: "Could not create application",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!appId) throw new Error("No application ID found.");
      const vals = getValues();
      const amountNum = parseFloat(String(vals.amountRequested).replace(/[^0-9.]/g, ""));
      await api.put(`/applications/${appId}`, {
        projectTitle: vals.projectTitle,
        projectSummary: vals.projectSummary,
        communityImpact: vals.communityImpact,
        amountRequested: isNaN(amountNum) ? undefined : amountNum,
        timeline: vals.projectTimeline,
        contactName: vals.contactName,
        contactEmail: vals.contactEmail,
      });
      return api.put(`/applications/${appId}/submit`);
    },
    onSuccess: () => {
      toast({ title: "Application submitted!", description: `Your application for "${opp.grant}" has been submitted.` });
      queryClient.invalidateQueries({ queryKey: qk.applications() });
      onClose();
      if (appId) router.push(`/applications/${appId}`);
    },
    onError: () => {
      toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const draftField = (name: keyof AshleenApplicationDraftValues) =>
    cn(inputClass, errors[name] && "border-red-500 focus-visible:ring-red-500");

  const textareaCls = (hasError: boolean) =>
    cn("border-[#e5e7eb] rounded-lg [font-family:'Montserrat',Helvetica] text-sm focus-visible:ring-[#ef3e34] focus-visible:ring-1 focus-visible:border-[#ef3e34] resize-none", hasError && "border-red-500 focus-visible:ring-red-500");

  const aiFieldBtn = (field: "projectSummary" | "communityImpact") => (
    <button
      type="button"
      onClick={() => void generateField(field)}
      disabled={generatingField !== null}
      className="flex items-center gap-1 [font-family:'Montserrat',Helvetica] text-[10px] font-semibold text-[#ef3e34] hover:opacity-70 disabled:opacity-40 transition-opacity"
    >
      {generatingField === field ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
      {generatingField === field ? "Generating…" : "✦ Regenerate"}
    </button>
  );

  const grantBlock = (
    <div className="bg-[#f9fafb] rounded-xl p-3 border border-[#f0f0f0]">
      <p className="[font-family:'Montserrat',Helvetica] font-semibold text-[#ef3e34] text-[10px] tracking-[0.5px] uppercase mb-0.5">Reviewing Grant</p>
      <p className="[font-family:'Oswald',Helvetica] font-bold text-black text-sm uppercase tracking-[0.3px]">{opp.grant}</p>
      <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-xs mt-0.5">{opp.funder} · {opp.amount} · Due {opp.deadline}</p>
    </div>
  );

  const header = (
    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f3f4f6]">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-[#ef3e34] flex items-center justify-center flex-shrink-0">
          <span className="[font-family:'Montserrat',Helvetica] font-bold text-white text-sm">A</span>
        </div>
        <div>
          <p className="[font-family:'Oswald',Helvetica] font-bold text-black text-base tracking-[0.3px] uppercase">Ashleen</p>
          <p className="[font-family:'Montserrat',Helvetica] font-semibold text-[#ef3e34] text-xs">AI Grant Writing Expert</p>
        </div>
      </div>
      <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors">
        <X size={14} className="text-[#6b7280]" />
      </button>
    </div>
  );

  const footer = (
    <div className="px-6 py-3 border-t border-[#f3f4f6] flex items-center gap-1.5">
      <Zap size={12} className="text-[#ef3e34]" />
      <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">
        Powered by <span className="text-[#ef3e34] font-semibold">Ashleen AI</span> · Your Grant Writing Expert
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>

      {/* Step 0 — initial chat */}
      {step === 0 && (
        <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[420px] mx-4 flex flex-col">
          {header}
          <div className="px-6 py-4 flex flex-col gap-3">
            {grantBlock}
            <AshleenMsg text="Hi! I'm Ashleen, your AI grant writing expert 👋" />
            <AshleenMsg text={`I found a great opportunity: "${opp.grant}" from ${opp.funder}. This is a ${opp.amount} grant for ${opp.category.toLowerCase()} initiatives.`} />
            <AshleenMsg text="Would you like more details, or shall I start drafting your application right now?" />
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <button onClick={handleTellMore} className="h-9 flex-1 rounded-lg border border-[#e5e7eb] [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]">Tell me more</button>
              <button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
                className="h-9 flex-1 rounded-lg bg-[#ef3e34] [font-family:'Montserrat',Helvetica] text-xs font-bold text-white transition-colors hover:bg-[#d63530] disabled:opacity-60"
              >
                {applyMutation.isPending ? "Creating…" : "Apply Now"}
              </button>
              <button onClick={onClose} className="h-9 flex-1 rounded-lg border border-[#e5e7eb] [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]">Not interested</button>
            </div>
          </div>
          {footer}
        </div>
      )}

      {/* Step 1 — Tell me more (Ashleen researches the grant) */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[420px] mx-4 flex flex-col">
          {header}
          <div className="px-6 py-4 flex flex-col gap-3">
            {grantBlock}
            {tellMoreLoading ? (
              <div className="flex items-center gap-2 py-3">
                <Loader2 size={15} className="animate-spin text-[#ef3e34] flex-shrink-0" />
                <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">Ashleen is researching this grant…</span>
              </div>
            ) : (
              <>
                <AshleenMsg text={tellMoreContent} />
                <AshleenMsg text="Ready to apply? I'll auto-draft the Project Summary and Community Impact sections the moment we open the form." />
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => applyMutation.mutate()}
                    disabled={applyMutation.isPending}
                    className="h-10 flex-1 rounded-lg bg-[#ef3e34] [font-family:'Montserrat',Helvetica] text-sm font-bold text-white transition-colors hover:bg-[#d63530] disabled:opacity-60"
                  >
                    {applyMutation.isPending ? "Creating draft…" : "Start Application →"}
                  </button>
                  <button onClick={() => setStep(0)} className="h-10 flex-1 rounded-lg border border-[#e5e7eb] [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]">
                    ← Back
                  </button>
                </div>
              </>
            )}
          </div>
          {footer}
        </div>
      )}

      {/* Step 2 — Application draft form + Ashleen chat */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[520px] mx-4 flex flex-col max-h-[90vh] overflow-y-auto">
          {header}
          <div className="px-6 py-4 flex flex-col gap-3">
            {grantBlock}
            <AshleenMsg text="Perfect! Contact info is pre-filled from your profile. I'm also generating the Project Summary and Community Impact — you can ask me to edit anything once I'm done." />
            <div className="border border-[#f0f0f0] rounded-xl p-4 flex flex-col gap-4 mt-1">
              <p className="[font-family:'Oswald',Helvetica] font-bold text-black text-base uppercase tracking-[0.3px]">Application Draft</p>
              <div className="flex flex-col gap-1.5">
                <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Organization Name</Label>
                <Input className={draftField("organizationName")} {...register("organizationName")} />
                {errors.organizationName && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.organizationName.message}</p>}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Contact Name</Label>
                  <Input className={draftField("contactName")} {...register("contactName")} />
                  {errors.contactName && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.contactName.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Project Timeline</Label>
                  <Input className={draftField("projectTimeline")} {...register("projectTimeline")} />
                  {errors.projectTimeline && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.projectTimeline.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Contact Email</Label>
                  <Input type="email" className={draftField("contactEmail")} {...register("contactEmail")} />
                  {errors.contactEmail && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.contactEmail.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Amount Requested</Label>
                  <Input className={draftField("amountRequested")} {...register("amountRequested")} />
                  {errors.amountRequested && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.amountRequested.message}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Project Title</Label>
                <Input className={draftField("projectTitle")} {...register("projectTitle")} />
                {errors.projectTitle && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.projectTitle.message}</p>}
              </div>

              {/* Project Summary — AI-powered */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Project Summary</Label>
                  {aiFieldBtn("projectSummary")}
                </div>
                <div className="relative">
                  {generatingField === "projectSummary" && (
                    <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center z-10">
                      <Loader2 size={18} className="animate-spin text-[#ef3e34]" />
                    </div>
                  )}
                  <Textarea rows={4} className={textareaCls(!!errors.projectSummary)} {...register("projectSummary")} />
                </div>
                {errors.projectSummary && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.projectSummary.message}</p>}
              </div>

              {/* Community Impact — AI-powered */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Community Impact</Label>
                  {aiFieldBtn("communityImpact")}
                </div>
                <div className="relative">
                  {generatingField === "communityImpact" && (
                    <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center z-10">
                      <Loader2 size={18} className="animate-spin text-[#ef3e34]" />
                    </div>
                  )}
                  <Textarea rows={3} className={textareaCls(!!errors.communityImpact)} {...register("communityImpact")} />
                </div>
                {errors.communityImpact && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.communityImpact.message}</p>}
              </div>

              {/* Ashleen Chat */}
              <div className="border border-[#f0f0f0] rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-[#f9fafb] border-b border-[#f0f0f0] flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-[#ef3e34] flex items-center justify-center flex-shrink-0">
                    <span className="[font-family:'Montserrat',Helvetica] font-bold text-white text-[9px]">A</span>
                  </div>
                  <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-xs">Ask Ashleen to edit anything</span>
                </div>
                <div className="max-h-36 overflow-y-auto px-3 py-2 flex flex-col gap-2">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={cn("flex gap-2 items-start", msg.role === "user" ? "justify-end" : "justify-start")}>
                      {msg.role === "ashleen" && (
                        <div className="w-5 h-5 rounded-full bg-[#ef3e34] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="[font-family:'Montserrat',Helvetica] font-bold text-white text-[9px]">A</span>
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[82%] rounded-xl px-3 py-2 [font-family:'Montserrat',Helvetica] text-xs leading-relaxed",
                        msg.role === "ashleen" ? "bg-[#f9fafb] text-[#374151]" : "bg-[#ef3e34] text-white"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#ef3e34] flex items-center justify-center flex-shrink-0">
                        <span className="[font-family:'Montserrat',Helvetica] font-bold text-white text-[9px]">A</span>
                      </div>
                      <div className="bg-[#f9fafb] rounded-xl px-3 py-2 flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin text-[#ef3e34]" />
                        <span className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af]">Writing…</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatScrollRef} />
                </div>
                <div className="px-3 py-2 border-t border-[#f0f0f0] flex gap-2 items-center bg-white">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleChat(); } }}
                    placeholder='e.g. "Make the project summary shorter" or "Add radio equipment detail"'
                    className="flex-1 text-xs [font-family:'Montserrat',Helvetica] outline-none text-[#374151] placeholder:text-[#d1d5db] py-1 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => void handleChat()}
                    disabled={chatLoading || !chatInput.trim()}
                    className="w-7 h-7 rounded-lg bg-[#ef3e34] flex items-center justify-center text-white disabled:opacity-40 hover:bg-[#d63530] transition-colors flex-shrink-0"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void handleSubmit(() => setStep(3))()}
                  className="h-10 flex-1 rounded-lg bg-[#ef3e34] [font-family:'Montserrat',Helvetica] text-sm font-semibold text-white transition-colors hover:bg-[#d63530]"
                >
                  Looks good, Review & Submit
                </button>
                <button type="button" onClick={onClose} className="h-10 flex-1 rounded-lg border border-[#e5e7eb] [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]">I need more time</button>
              </div>
            </div>
          </div>
          {footer}
        </div>
      )}

      {/* Step 3 — final review */}
      {step === 3 && (
        <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[420px] mx-4 flex flex-col">
          {header}
          <div className="px-6 py-4 flex flex-col gap-3">
            {grantBlock}
            <AshleenMsg text="I've reviewed everything — it looks strong! Here's a summary of your application before we submit." />
            <div className="bg-[#f9fafb] rounded-xl p-3 border border-[#f0f0f0] flex flex-col gap-2 text-xs [font-family:'Montserrat',Helvetica]">
              <div className="flex justify-between gap-2">
                <span className="text-[#6b7280] shrink-0">Organization</span>
                <span className="font-semibold text-[#111827] text-right">{getValues("organizationName") || "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#6b7280] shrink-0">Contact</span>
                <span className="font-semibold text-[#111827] text-right">{getValues("contactName") || "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#6b7280] shrink-0">Project Title</span>
                <span className="font-semibold text-[#111827] text-right">{getValues("projectTitle") || "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#6b7280] shrink-0">Amount Requested</span>
                <span className="font-semibold text-[#111827] text-right">{getValues("amountRequested") || opp.amount}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#6b7280] shrink-0">Timeline</span>
                <span className="font-semibold text-[#111827] text-right">{getValues("projectTimeline") || "—"}</span>
              </div>
            </div>
            <AshleenMsg text="Ready to submit? Once submitted, I'll track the outcome and you can view the full application in your Applications page." />
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="h-9 flex-1 rounded-lg bg-[#ef3e34] [font-family:'Montserrat',Helvetica] text-sm font-semibold text-white transition-colors hover:bg-[#d63530] disabled:opacity-60"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Application"}
              </button>
              <button onClick={() => setStep(2)} className="h-9 flex-1 rounded-lg border border-[#e5e7eb] [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]">Edit More</button>
            </div>
          </div>
          {footer}
        </div>
      )}
    </div>
  );
};

/* ── Main Page ─────────────────────────────────────────── */
type ModalType = "add" | "preview" | "ashleen" | null;

export const Opportunities = () => {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all"|"open"|"closing"|"closed">("all");
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  const currentUserId: string = (() => {
    if (typeof window === "undefined") return "";
    try {
      const s = localStorage.getItem("rdg_user");
      if (!s) return "";
      const u = JSON.parse(s) as { _id?: string; id?: string };
      return u._id ?? u.id ?? "";
    } catch { return ""; }
  })();

  const { data: opportunities = [] } = useQuery<Opportunity[]>({
    queryKey: qk.opportunities(),
    queryFn: async () => {
      const res = await api.get("/opportunities", { params: { limit: 100 } });
      const raw: ApiOpportunity[] = res.data.data ?? [];
      return raw.map(mapOpp);
    },
  });

  const toggleKeyword = (k: string) =>
    setActiveKeywords((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);

  const filtered = opportunities.filter((o) => {
    const matchSearch = !search || o.grant.toLowerCase().includes(search.toLowerCase()) || o.funder.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchKeywords = activeKeywords.length === 0 || activeKeywords.some((k) => o.keywords.includes(k));
    return matchSearch && matchStatus && matchKeywords;
  });

  const openPreview = (opp: Opportunity) => { setSelectedOpp(opp); setModal("preview"); };
  const openAshleen = () => setModal("ashleen");
  const closeModal = () => setModal(null);

  const handleCreate = (title: string) => {
    closeModal();
    toast({ title: "Opportunity created", description: `"${title || "New Opportunity"}" has been added.` });
    queryClient.invalidateQueries({ queryKey: qk.opportunities() });
  };

  const tabs: { label: string; value: typeof statusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Open", value: "open" },
    { label: "Closing", value: "closing" },
    { label: "Closed", value: "closed" },
  ];

  return (
    <>
      <div className="flex h-full min-w-0 flex-col gap-4 bg-neutral-50 p-4 sm:gap-5 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <h1 className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase leading-tight tracking-[0.5px] text-black sm:text-3xl">
              Grant Opportunities
            </h1>
            <p className="[font-family:'Montserrat',Helvetica] text-sm font-normal text-[#6b7280]">
              Track and analyze incoming grant opportunities.
            </p>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => router.push("/applications")}
              data-testid="button-view-applications"
              className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#ef3e34] px-3 text-[#ef3e34] transition-colors hover:bg-[#fff4f4] sm:flex-initial sm:px-4"
            >
              <ChevronRight size={14} className="shrink-0 rotate-90" />
              <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold sm:hidden">Apps</span>
              <span className="[font-family:'Montserrat',Helvetica] hidden text-sm font-semibold sm:inline">View Applications</span>
            </button>
            <button
              type="button"
              onClick={() => setModal("add")}
              data-testid="button-add-opportunity"
              aria-label="Add opportunity"
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#ef3e34] px-3 text-white transition-colors hover:bg-[#d63530] sm:px-4"
            >
              <span className="text-lg leading-none">+</span>
              <span className="[font-family:'Montserrat',Helvetica] hidden text-sm font-semibold sm:inline">Add Opportunity</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or funder..."
            data-testid="input-search-opportunities"
            className="pl-9 h-10 border-[#e5e7eb] rounded-lg [font-family:'Montserrat',Helvetica] text-sm placeholder:text-[#9ca3af] focus-visible:ring-[#ef3e34] focus-visible:ring-1 focus-visible:border-[#ef3e34] bg-white" />
        </div>

        {/* Topic keywords — checkbox dropdown (multi-select) */}
        <div className="flex flex-col gap-1">
          <CheckboxFilterDropdown
            label="Topics"
            options={ALL_KEYWORDS}
            selected={activeKeywords}
            onToggle={toggleKeyword}
            onClearAll={() => setActiveKeywords([])}
            dataTestId="dropdown-opportunity-keywords"
          />
          <p className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af]">
            Leave all unchecked to show every opportunity. Select one or more to narrow the list.
          </p>
        </div>

        {/* Status tabs + count */}
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="min-w-0 flex-1 md:flex-initial">
            <MobileFilterSelect
              ariaLabel="Filter opportunities by status"
              label="Status"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as typeof statusFilter)}
              options={tabs.map((t) => ({ value: t.value, label: t.label }))}
              dataTestId="select-filter-opportunities-status"
            />
            <div className="hidden flex-wrap items-center gap-1.5 md:flex">
              {tabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setStatusFilter(t.value)}
                  data-testid={`tab-opp-status-${t.value}`}
                  className={`h-8 rounded-lg px-4 [font-family:'Montserrat',Helvetica] text-sm font-semibold transition-all ${
                    statusFilter === t.value
                      ? "bg-[#ef3e34] text-white"
                      : "border border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#ef3e34]/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <span className="[font-family:'Montserrat',Helvetica] text-xs font-normal text-[#9ca3af] md:shrink-0 md:text-right md:text-sm">
            {filtered.length} results
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-[#f0f0f0] bg-white px-6 py-12 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">No opportunities match your filters.</p>
          </div>
        ) : (
          <>
            {/* Table — md+; horizontal scroll on narrow desktop */}
            <div className="hidden overflow-hidden rounded-xl border border-[#f0f0f0] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-[#f3f4f6]">
                      {["Grant", "Category", "Amount", "Deadline", "Status", "Applied"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left lg:px-5">
                          <span className="[font-family:'Montserrat',Helvetica] text-xs font-semibold uppercase tracking-[0.6px] text-[#9ca3af]">
                            {h}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((opp, idx) => (
                      <tr
                        key={opp.id}
                        data-testid={`row-opp-${opp.id}`}
                        className={`transition-colors hover:bg-[#fafafa] ${idx < filtered.length - 1 ? "border-b border-[#f9fafb]" : ""}`}
                      >
                        <td className="px-4 py-4 align-top lg:px-5">
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827] break-words">
                                {opp.grant}
                              </span>
                              {opp.createdBy && opp.createdBy === currentUserId && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#dcfce7] px-2 py-0.5 [font-family:'Montserrat',Helvetica] text-[10px] font-semibold text-[#16a34a] shrink-0">
                                  ✓ Your post
                                </span>
                              )}
                            </div>
                            <span className="[font-family:'Montserrat',Helvetica] text-xs font-normal text-[#9ca3af] break-words">
                              {opp.funder}
                            </span>
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {opp.keywords.map((k) => (
                                <span
                                  key={k}
                                  className="inline-flex items-center rounded-full border border-[#e5e7eb] bg-white px-2 py-0.5 [font-family:'Montserrat',Helvetica] text-[10px] font-normal text-[#374151]"
                                >
                                  {k}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top lg:px-5">
                          <span className="[font-family:'Montserrat',Helvetica] text-sm font-normal break-words text-[#374151]">
                            {opp.category}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top whitespace-nowrap lg:px-5">
                          <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">{opp.amount}</span>
                        </td>
                        <td className="px-4 py-4 align-top whitespace-nowrap lg:px-5">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className={`shrink-0 ${deadlineDaysLeft(opp.deadlineRaw) !== null && deadlineDaysLeft(opp.deadlineRaw)! <= 14 ? "text-[#f97316]" : "text-[#9ca3af]"}`} />
                            <span className={`[font-family:'Montserrat',Helvetica] text-sm ${deadlineColor(opp.deadlineRaw)}`}>{opp.deadline}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top whitespace-nowrap lg:px-5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 [font-family:'Montserrat',Helvetica] text-xs font-semibold ${statusStyle(opp.status)}`}
                          >
                            {opp.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top whitespace-nowrap lg:px-5">
                          <button
                            type="button"
                            onClick={() => openPreview(opp)}
                            data-testid={`button-preview-${opp.id}`}
                            className="flex items-center gap-1 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#ef3e34] hover:underline"
                          >
                            <Zap size={12} className="shrink-0" />
                            Preview
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cards — below md */}
            <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
              {filtered.map((opp) => (
                <li
                  key={opp.id}
                  data-testid={`row-opp-${opp.id}`}
                  className="rounded-xl border border-[#f0f0f0] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex flex-col gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827] break-words">{opp.grant}</p>
                        {opp.createdBy && opp.createdBy === currentUserId && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#dcfce7] px-2 py-0.5 [font-family:'Montserrat',Helvetica] text-[10px] font-semibold text-[#16a34a] shrink-0">
                            ✓ Your post
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 [font-family:'Montserrat',Helvetica] text-xs font-normal text-[#9ca3af] break-words">{opp.funder}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {opp.keywords.map((k) => (
                          <span
                            key={k}
                            className="inline-flex items-center rounded-full border border-[#e5e7eb] bg-white px-2 py-0.5 [font-family:'Montserrat',Helvetica] text-[10px] font-normal text-[#374151]"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                    <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <div>
                        <dt className="[font-family:'Montserrat',Helvetica] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#9ca3af]">
                          Category
                        </dt>
                        <dd className="mt-0.5 [font-family:'Montserrat',Helvetica] font-normal text-[#374151]">{opp.category}</dd>
                      </div>
                      <div>
                        <dt className="[font-family:'Montserrat',Helvetica] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#9ca3af]">
                          Amount
                        </dt>
                        <dd className="mt-0.5 [font-family:'Montserrat',Helvetica] font-semibold text-[#111827]">{opp.amount}</dd>
                      </div>
                      <div>
                        <dt className="[font-family:'Montserrat',Helvetica] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#9ca3af]">
                          Deadline
                        </dt>
                        <dd className="mt-0.5 flex items-center gap-1.5 [font-family:'Montserrat',Helvetica] font-normal">
                          <Calendar size={12} className={`shrink-0 ${deadlineDaysLeft(opp.deadlineRaw) !== null && deadlineDaysLeft(opp.deadlineRaw)! <= 14 ? "text-[#f97316]" : "text-[#9ca3af]"}`} />
                          <span className={deadlineColor(opp.deadlineRaw)}>{opp.deadline}</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="[font-family:'Montserrat',Helvetica] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#9ca3af]">
                          Status
                        </dt>
                        <dd className="mt-0.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 [font-family:'Montserrat',Helvetica] text-xs font-semibold ${statusStyle(opp.status)}`}
                          >
                            {opp.status}
                          </span>
                        </dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      onClick={() => openPreview(opp)}
                      data-testid={`button-preview-${opp.id}`}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#ef3e34]/30 bg-[#fff4f4] py-2.5 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#ef3e34] transition-colors hover:bg-[#ffe8e8]"
                    >
                      <Zap size={14} className="shrink-0" />
                      Preview
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {modal === "add" && <AddOpportunityModal onClose={closeModal} onCreate={handleCreate} />}
      {modal === "preview" && selectedOpp && (
        <GrantPreviewModal
          opp={selectedOpp}
          onClose={closeModal}
          onApply={openAshleen}
          isOwner={!!selectedOpp.createdBy && selectedOpp.createdBy === currentUserId}
        />
      )}
      {modal === "ashleen" && selectedOpp && <AshleenModal opp={selectedOpp} onClose={closeModal} />}
    </>
  );
};
