"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { qk } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Download, RefreshCw, CheckCircle, Columns2, FileText, AlertTriangle, Mail, Phone, Users, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Application {
  _id: string;
  projectTitle?: string;
  projectSummary?: string;
  status: string;
  problemStatement?: string;
  communityImpact?: string;
  proposedSolution?: string;
  measurableOutcomes?: string;
  urgency?: string;
  budgetSummary?: string;
  alignedVersion?: {
    problemStatement?: string;
    communityImpact?: string;
    proposedSolution?: string;
    measurableOutcomes?: string;
    urgency?: string;
    budgetSummary?: string;
    generatedAt?: string;
  };
  notes?: string;
  dateSubmitted?: string;
  funder?: { _id: string; name: string; avgGrantMax?: number; deadline?: string };
  opportunity?: { _id?: string; title: string; funder: string; maxAmount?: number; deadline?: string };
  organization?: { name: string };
}

type GrantOutbox = {
  _id: string;
  recipient?: string;
  recipientName?: string;
  subject?: string;
  htmlBody?: string;
  status?: "pending" | "sent" | "failed";
  sentAt?: string;
  createdAt?: string;
  replyTo?: string;
  sentViaGmail?: boolean;
  senderEmail?: string;
  replyCount?: number;
  hasUnread?: boolean;
  relatedUser?: { fullName?: string; firstName?: string; lastName?: string; email?: string };
};

type ThreadReply = {
  _id: string;
  from?: string;
  subject?: string;
  body?: string;
  htmlBody?: string | null;
  receivedAt?: string;
  isRead?: boolean;
  gmailMessageId?: string;
};

type PipelineStage =
  | "discovered"
  | "researching"
  | "outreach_sent"
  | "reply_received"
  | "applying"
  | "submitted"
  | "won"
  | "lost"
  | "archived";

type PipelineEntry = {
  stage?: PipelineStage;
  changedAt?: string;
  changedBy?: "system" | "user";
  note?: string;
};

type PipelinePayload = {
  pipelineStage: PipelineStage;
  pipelineHistory: PipelineEntry[];
  updatedAt?: string;
};

const fmtDateTime = (s?: string) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
};

const statusPill = (s?: string) => {
  if (s === "sent") return { label: "✅ Sent", cls: "bg-[#dcfce7] text-[#16a34a]" };
  if (s === "failed") return { label: "🔴 Failed", cls: "bg-[#fee2e2] text-[#dc2626]" };
  return { label: "🕐 Queued", cls: "bg-[#fef9c3] text-[#b45309]" };
};

const PIPELINE_STAGES: PipelineStage[] = [
  "discovered",
  "researching",
  "outreach_sent",
  "reply_received",
  "applying",
  "submitted",
  "won",
  "lost",
];

const STAGE_LABEL: Record<PipelineStage, string> = {
  discovered: "Discovered",
  researching: "Researching",
  outreach_sent: "Outreach Sent",
  reply_received: "Reply Received",
  applying: "Applying",
  submitted: "Submitted",
  won: "Won 🏆",
  lost: "Lost",
  archived: "Archived",
};

const stageIndex = (s?: string) => PIPELINE_STAGES.indexOf((s || "") as PipelineStage);

const stageDotClass = (state: "done" | "current" | "future") => {
  if (state === "done") return "bg-[#ef3e34] border-[#ef3e34]";
  if (state === "current") return "bg-[#ef3e34] border-[#ef3e34]";
  return "bg-white border-[#d1d5db]";
};

const stageLineClass = (state: "done" | "future") => {
  if (state === "done") return "bg-[#ef3e34]";
  return "bg-[#e5e7eb]";
};

const SECTIONS = [
  { key: "projectSummary", label: "Project Summary" },
  { key: "problemStatement", label: "Problem Statement" },
  { key: "communityImpact", label: "Community Impact" },
  { key: "proposedSolution", label: "Proposed Solution" },
  { key: "measurableOutcomes", label: "Measurable Outcomes" },
  { key: "urgency", label: "Urgency" },
  { key: "budgetSummary", label: "Budget Summary" },
] as const;

type ViewMode = "original" | "aligned" | "compare";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  drafting: "bg-blue-100 text-blue-700",
  submitted: "bg-orange-100 text-orange-700",
  in_review: "bg-yellow-100 text-yellow-700",
  under_review: "bg-yellow-100 text-yellow-700",
  "under-review": "bg-yellow-100 text-yellow-700",
  awarded: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  declined: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};

// Statuses set by Red Dog staff — agency cannot change these
const ADMIN_CONTROLLED_STATUSES = ["under_review", "under-review", "in_review", "awarded", "declined", "denied", "rejected", "approved"];

const EmptyContent = () => (
  <span className="text-[#9ca3af] italic text-sm [font-family:'Montserrat',Helvetica]">
    No content yet. Click ↺ Regenerate to generate with AI.
  </span>
);

const ThreadModal = ({
  outbox,
  onClose,
}: {
  outbox: GrantOutbox;
  onClose: () => void;
}) => {
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<ThreadReply[]>({
    queryKey: ["replies", "thread", outbox._id],
    queryFn: async () => {
      const res = await api.get(`/replies/by-outbox/${outbox._id}`);
      return (res.data.data || []) as ThreadReply[];
    },
    enabled: !!outbox?._id,
    retry: false,
  });

  const replies = data || [];

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/replies/${id}/read`);
      return res.data.data as ThreadReply;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.repliesMyUnread() });
      await qc.invalidateQueries({ queryKey: ["replies", "thread", outbox._id] });
      await qc.invalidateQueries({ queryKey: ["outbox", "grant"] });
    },
  });

  useEffect(() => {
    if (!replies.length) return;
    const unread = replies.filter((r) => r && r._id && r.isRead === false);
    if (unread.length === 0) return;
    for (const r of unread) markReadMutation.mutate(r._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replies?.length]);

  const originalHtml = outbox.htmlBody || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[980px] mx-4 flex flex-col max-h-[86vh]">
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-[#f3f4f6]">
          <div className="min-w-0">
            <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-xl tracking-[0.5px] uppercase">
              Email Thread
            </h2>
            <p className="mt-1 text-xs text-[#6b7280] [font-family:'Montserrat',Helvetica] truncate">
              {outbox.subject || "—"} · To: {outbox.recipient || "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors"
          >
            <X size={14} className="text-[#6b7280]" />
          </button>
        </div>

        <div className="p-6 overflow-auto space-y-4 bg-neutral-50">
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="[font-family:'Montserrat',Helvetica] text-xs font-bold text-[#111827] uppercase tracking-wide">
                  Original Outreach
                </p>
                <p className="mt-2 text-sm text-[#374151] [font-family:'Montserrat',Helvetica]">
                  <span className="font-semibold">To:</span> {outbox.recipient || "—"}
                </p>
                <p className="mt-1 text-sm text-[#374151] [font-family:'Montserrat',Helvetica]">
                  <span className="font-semibold">Subject:</span> {outbox.subject || "—"}
                </p>
              </div>
              <span className="text-xs text-[#6b7280] [font-family:'Montserrat',Helvetica]">
                {fmtDateTime(outbox.sentAt || outbox.createdAt)}
              </span>
            </div>

            <div className="mt-4 rounded-lg overflow-hidden border border-[#eef2f7]">
              <iframe
                title="original-outreach"
                sandbox="allow-same-origin"
                className="w-full h-[260px] bg-white"
                srcDoc={originalHtml}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="[font-family:'Montserrat',Helvetica] text-xs font-bold text-[#111827] uppercase tracking-wide">
                Replies
              </p>
              <button
                onClick={() => refetch()}
                className="text-xs font-semibold [font-family:'Montserrat',Helvetica] text-[#ef3e34] hover:underline"
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <p className="mt-3 text-sm text-[#6b7280] [font-family:'Montserrat',Helvetica]">Loading…</p>
            ) : isError ? (
              <p className="mt-3 text-sm text-red-600 [font-family:'Montserrat',Helvetica]">
                Failed to load replies.
              </p>
            ) : replies.length === 0 ? (
              <p className="mt-3 text-sm text-[#6b7280] [font-family:'Montserrat',Helvetica]">No replies yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {replies.map((r) => (
                  <div key={r._id} className="rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827] truncate">
                          Reply from {r.from || "Unknown"}
                          {r.isRead === false ? (
                            <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#3b82f6] align-middle" />
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-[#6b7280] [font-family:'Montserrat',Helvetica]">
                          {fmtDateTime(r.receivedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg overflow-hidden border border-[#eef2f7] bg-white">
                      <iframe
                        title={`reply-${r._id}`}
                        sandbox="allow-same-origin"
                        className="w-full h-[220px] bg-white"
                        srcDoc={r.htmlBody || `<pre style="white-space:pre-wrap">${String(r.body || "")}</pre>`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ApplicationBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("original");
  const [form, setForm] = useState<Partial<Application>>({});
  const [editNotes, setEditNotes] = useState("");
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [awardResponse, setAwardResponse] = useState("");
  const [awardResponseSubmitted, setAwardResponseSubmitted] = useState(false);
  const [threadOutbox, setThreadOutbox] = useState<GrantOutbox | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeContactEmail, setComposeContactEmail] = useState("");
  const [composeContactName, setComposeContactName] = useState("");
  const [composeSenderName, setComposeSenderName] = useState("");
  const [composeSenderCompany, setComposeSenderCompany] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmStage, setConfirmStage] = useState<PipelineStage | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [burst, setBurst] = useState<{ at: number; seed: number } | null>(null);

  const { data: app, isLoading, isError, refetch } = useQuery<Application>({
    queryKey: qk.application(id),
    queryFn: async () => {
      const res = await api.get(`/applications/${id}`);
      return res.data.data as Application;
    },
    enabled: !!id,
  });

  const pipelineQuery = useQuery<PipelinePayload>({
    queryKey: ["grants", "pipeline", id],
    queryFn: async () => {
      const res = await api.get(`/grants/${id}/pipeline`);
      return res.data.data as PipelinePayload;
    },
    enabled: !!id,
    retry: false,
  });

  const setStageMutation = useMutation({
    mutationFn: async ({ stage, note }: { stage: PipelineStage; note?: string }) => {
      const res = await api.patch(`/grants/${id}/pipeline`, { stage, note: note || "" });
      return res.data.data as PipelinePayload;
    },
    onSuccess: async (data, vars) => {
      const label = STAGE_LABEL[vars.stage] || vars.stage;
      if (vars.stage === "lost") {
        toast({ title: "Grant moved to Lost", description: "Sorry to hear that — keep going." });
      } else {
        toast({ title: `Grant moved to ${label}` });
      }
      if (vars.stage === "won") {
        setBurst({ at: Date.now(), seed: Math.floor(Math.random() * 1_000_000) });
      }
      setConfirmOpen(false);
      setConfirmStage(null);
      await queryClient.invalidateQueries({ queryKey: ["grants", "pipeline", id] });
      await queryClient.invalidateQueries({ queryKey: qk.application(id) });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Could not update pipeline stage.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (app) {
      setForm(app);
      setEditNotes(app.notes || "");
    }
  }, [app]);

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/applications/${id}`, { ...form, notes: editNotes }),
    onSuccess: () => {
      toast({ title: "Application saved" });
      queryClient.invalidateQueries({ queryKey: qk.application(id) });
      queryClient.invalidateQueries({ queryKey: qk.applications() });
      setIsEditing(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => api.post(`/applications/${id}/regenerate`),
    onSuccess: () => {
      toast({ title: "✓ Content regenerated", description: "All sections have been rewritten with fresh AI content." });
      queryClient.invalidateQueries({ queryKey: qk.application(id) });
      setViewMode("original");
      setShowRegenerateConfirm(false);
    },
    onError: (err: unknown) => {
      const e = err as {
        response?: { status?: number; data?: { code?: string; message?: string } };
      };
      if (e?.response?.status === 402 && e?.response?.data?.code === "SUBSCRIPTION_REQUIRED") {
        setPaywallOpen(true);
        setShowRegenerateConfirm(false);
        return;
      }
      toast({
        title: "Error",
        description: e?.response?.data?.message ?? "Failed to regenerate.",
        variant: "destructive",
      });
      setShowRegenerateConfirm(false);
    },
  });



  const statusMutation = useMutation({
    mutationFn: (status: string) => api.put(`/applications/${id}/status`, { status }),
    onSuccess: (_, status) => {
      toast({ title: `Status updated to ${status.replace(/_/g, " ")}` });
      queryClient.invalidateQueries({ queryKey: qk.application(id) });
      queryClient.invalidateQueries({ queryKey: qk.applications() });
    },
  });

  const awardResponseMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/applications/${id}/award-response`, { response: awardResponse.trim() });
      return res.data.data as Application;
    },
    onSuccess: () => {
      setAwardResponseSubmitted(true);
      toast({ title: "Thank you!", description: "Your response has been sent to the Red Dog team." });
      queryClient.invalidateQueries({ queryKey: qk.application(id) });
    },
    onError: () => toast({ title: "Error", description: "Could not submit response.", variant: "destructive" }),
  });

  type CommLog = {
    _id: string;
    type: "system" | "email_sent" | "email_received" | "phone_call" | "meeting" | "note";
    direction?: "inbound" | "outbound" | "internal";
    subject?: string;
    body: string;
    createdByName?: string;
    withParty?: string;
    createdAt?: string;
  };

  const commQuery = useQuery<CommLog[]>({
    queryKey: ["agency", "communication-log", id],
    queryFn: async () => {
      const res = await api.get(`/communication-log/agency/application/${id}`);
      return (res.data.data || []) as CommLog[];
    },
    enabled: !!id,
  });

  const commIcon = (t: CommLog["type"]) => {
    if (t === "email_sent" || t === "email_received") return <Mail size={16} className="text-[#ef3e34]" />;
    if (t === "phone_call") return <Phone size={16} className="text-[#ef3e34]" />;
    if (t === "meeting") return <Users size={16} className="text-[#ef3e34]" />;
    if (t === "system") return <Settings size={16} className="text-[#6b7280]" />;
    return <FileText size={16} className="text-[#ef3e34]" />;
  };

  const commTypeLabel = (t: CommLog["type"]) => {
    switch (t) {
      case "email_sent":
      case "email_received":
        return "Email";
      case "phone_call":
        return "Phone Call";
      case "meeting":
        return "Meeting";
      case "system":
        return "System";
      default:
        return "Note";
    }
  };

  const commDirectionLabel = (d?: CommLog["direction"]) => {
    if (!d) return "";
    if (d === "outbound") return "Outbound";
    if (d === "inbound") return "Inbound";
    return "Internal";
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/applications/${id}/export`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `application-${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const opportunityId = useMemo(() => {
    const oid = (app?.opportunity as unknown as { _id?: string } | undefined)?._id;
    return oid || "";
  }, [app?.opportunity]);

  const grantEmailHistory = useQuery<GrantOutbox[]>({
    queryKey: ["outbox", "grant", id],
    queryFn: async () => {
      const res = await api.get(`/outbox/grant/${id}`);
      return (res.data.data || []) as GrantOutbox[];
    },
    enabled: !!id,
    retry: false,
  });

  const generateEmailMutation = useMutation({
    mutationFn: async () => {
      if (!composeContactEmail.trim()) throw new Error("contactEmail is required");
      if (!opportunityId) throw new Error("This application is missing an opportunityId, so outreach can't be generated here yet.");
      const res = await api.post(`/ai/generate-email`, {
        opportunityId,
        contactEmail: composeContactEmail.trim(),
        contactName: composeContactName.trim() || undefined,
        senderName: composeSenderName.trim() || undefined,
        senderCompany: composeSenderCompany.trim() || undefined,
        grantId: id,
      });
      return res.data.data as { generated: { subject?: string; body?: string }; outbox: GrantOutbox };
    },
    onSuccess: async () => {
      toast({ title: "Outreach email queued successfully" });
      setComposeOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["outbox", "grant", id] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Failed to generate email.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const pipelineStage: PipelineStage =
    (pipelineQuery.data?.pipelineStage as PipelineStage) || "discovered";
  const pipelineHistory = pipelineQuery.data?.pipelineHistory || [];
  const lastEntry = pipelineHistory.length ? pipelineHistory[pipelineHistory.length - 1] : null;
  const lastUpdatedLabel = fmtDateTime(lastEntry?.changedAt || pipelineQuery.data?.updatedAt || app?.dateSubmitted);

  const manualMoves: Array<{ stage: PipelineStage; label: string }> = [
    { stage: "applying", label: "Mark as Applying" },
    { stage: "submitted", label: "Mark as Submitted" },
    { stage: "won", label: "Mark as Won" },
    { stage: "lost", label: "Mark as Lost" },
    { stage: "archived", label: "Archive" },
  ];

  const startConfirm = (stage: PipelineStage) => {
    setConfirmStage(stage);
    setConfirmOpen(true);
  };

  const burstDots = useMemo(() => {
    if (!burst) return [];
    const rng = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
      };
    };
    const r = rng(burst.seed);
    return Array.from({ length: 22 }).map((_, i) => ({
      id: `${burst.at}-${i}`,
      left: Math.floor(r() * 90) + 5,
      top: Math.floor(r() * 40) + 8,
      delay: Math.floor(r() * 120),
      size: Math.floor(r() * 10) + 6,
    }));
  }, [burst]);

  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(null), 1400);
    return () => window.clearTimeout(t);
  }, [burst]);

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6 bg-neutral-50 p-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl bg-white border border-[#e5e7eb]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-20 bg-neutral-50 gap-3">
        <p className="[font-family:'Montserrat',Helvetica] text-red-600 text-base">Failed to load application. Please try again.</p>
        <button onClick={() => refetch()} className="rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d63029]">
          Retry
        </button>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex w-full items-center justify-center py-20 bg-neutral-50">
        <p className="[font-family:'Montserrat',Helvetica] text-[#6b7280]">Application not found.</p>
      </div>
    );
  }

  const funderName = app.funder?.name || app.opportunity?.funder || "Unknown Funder";
  const statusColor = STATUS_COLORS[app.status] || "bg-gray-100 text-gray-700";
  const hasAligned = !!app.alignedVersion;
  const isAdminControlled = ADMIN_CONTROLLED_STATUSES.includes(app.status);
  const action = searchParams.get("action");
  const showAwardRespondBanner = action === "respond" && app.status === "awarded" && !awardResponseSubmitted;

  const appRecord = app as unknown as Record<string, unknown>;
  const alignedRecord = app.alignedVersion as unknown as Record<string, unknown> | undefined;

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 pb-10 sm:p-6 lg:p-8">
      {burst ? (
        <div className="pointer-events-none fixed inset-0 z-[60]">
          {burstDots.map((d) => (
            <div
              key={d.id}
              className="absolute rounded-full animate-ping"
              style={{
                left: `${d.left}%`,
                top: `${d.top}%`,
                width: d.size,
                height: d.size,
                background: ["#ef3e34", "#22c55e", "#3b82f6", "#f59e0b"][Number(d.id.split("-").pop() || 0) % 4],
                animationDelay: `${d.delay}ms`,
              }}
            />
          ))}
        </div>
      ) : null}

      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[#6b7280] hover:text-[#111827] transition-colors w-fit [font-family:'Montserrat',Helvetica] text-sm"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Pipeline */}
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="[font-family:'Montserrat',Helvetica] text-xs font-bold text-[#111827] uppercase tracking-wide">
              Pipeline Stage
            </p>
            <p className="mt-1 [font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">
              Last updated: {pipelineQuery.isLoading ? "Loading…" : lastUpdatedLabel}
            </p>
            {pipelineQuery.isError ? (
              <p className="mt-1 [font-family:'Montserrat',Helvetica] text-xs text-red-600">
                Failed to load pipeline.{" "}
                <button onClick={() => pipelineQuery.refetch()} className="font-semibold underline">
                  Retry
                </button>
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <select
              value=""
              onChange={(e) => {
                const stage = e.target.value as PipelineStage;
                if (stage) startConfirm(stage);
              }}
              className="h-10 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-semibold [font-family:'Montserrat',Helvetica] text-[#374151] focus:border-[#ef3e34] focus:outline-none"
              disabled={setStageMutation.isPending || pipelineQuery.isLoading || pipelineQuery.isError}
            >
              <option value="">Move to Stage…</option>
              {manualMoves.map((m) => (
                <option key={m.stage} value={m.stage}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-0">
            {PIPELINE_STAGES.filter((s) => s !== "archived").map((s, idx, arr) => {
              const curIdx = stageIndex(pipelineStage);
              const i = stageIndex(s);
              const state: "done" | "current" | "future" =
                curIdx === -1 ? "future" : i < curIdx ? "done" : i === curIdx ? "current" : "future";
              const lineState: "done" | "future" = i < curIdx ? "done" : "future";
              return (
                <div key={s} className="flex items-center min-w-0 flex-1">
                  <div className="flex flex-col items-center min-w-0">
                    <div className="relative">
                      <div className={cn("h-4 w-4 rounded-full border-2", stageDotClass(state))} />
                      {state === "current" ? (
                        <div className="absolute inset-0 rounded-full border-2 border-[#ef3e34] animate-ping opacity-50" />
                      ) : null}
                    </div>
                    <span className="mt-2 text-[11px] text-[#6b7280] [font-family:'Montserrat',Helvetica] text-center px-1">
                      {STAGE_LABEL[s]}
                    </span>
                  </div>

                  {idx < arr.length - 1 ? (
                    <div className={cn("h-1 flex-1 mx-2 rounded-full", stageLineClass(lineState))} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="text-sm font-semibold [font-family:'Montserrat',Helvetica] text-[#ef3e34] hover:underline"
          >
            {historyOpen ? "Hide history" : "Show history"}
          </button>

          {historyOpen ? (
            <div className="mt-3 space-y-2">
              {pipelineQuery.isLoading ? (
                <p className="text-sm text-[#6b7280] [font-family:'Montserrat',Helvetica]">Loading…</p>
              ) : pipelineHistory.length === 0 ? (
                <p className="text-sm text-[#6b7280] [font-family:'Montserrat',Helvetica]">No pipeline history yet.</p>
              ) : (
                [...pipelineHistory]
                  .slice()
                  .reverse()
                  .map((h, idx) => {
                    const isSystem = h.changedBy !== "user";
                    const icon = isSystem ? "🤖" : "👤";
                    const who = isSystem ? "System" : "User";
                    return (
                      <div key={`${h.stage || "stage"}-${idx}`} className="rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
                              {icon} {who} · {STAGE_LABEL[(h.stage || "discovered") as PipelineStage] || h.stage}
                            </p>
                            {h.note ? (
                              <p className="mt-1 text-sm text-[#374151] [font-family:'Montserrat',Helvetica] whitespace-pre-wrap">
                                “{h.note}”
                              </p>
                            ) : null}
                          </div>
                          <span className="text-xs text-[#6b7280] [font-family:'Montserrat',Helvetica]">
                            {fmtDateTime(h.changedAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl sm:text-3xl tracking-[0.5px] uppercase">
            {app.projectTitle || "Application"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">Funder: {funderName}</span>
            <span className={`rounded-full px-3 py-0.5 text-xs font-semibold [font-family:'Montserrat',Helvetica] ${statusColor}`}>
              {app.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
            {isAdminControlled && (
              <span className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af] italic">
                — set by Red Dog staff
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium [font-family:'Montserrat',Helvetica] text-[#374151] hover:bg-[#f9fafb] transition-colors h-10"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => setShowRegenerateConfirm(true)}
            disabled={regenerateMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium [font-family:'Montserrat',Helvetica] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 transition-colors h-10"
          >
            <RefreshCw size={14} className={regenerateMutation.isPending ? "animate-spin" : ""} />
            {regenerateMutation.isPending ? "Regenerating..." : "Regenerate"}
          </button>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold [font-family:'Montserrat',Helvetica] text-[#374151] hover:bg-[#f9fafb] transition-colors h-10"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="inline-flex items-center justify-center rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] disabled:opacity-50 transition-colors h-10"
            >
              {saveMutation.isPending ? "Saving..." : "Save Draft"}
            </button>
          )}
        </div>
      </div>

      {showAwardRespondBanner && (
        <div className="rounded-xl border border-[#ef3e3433] bg-[#fff8f8] p-5">
          <p className="[font-family:'Montserrat',Helvetica] text-sm font-bold text-[#111827]">
            🎉 Congratulations on your award! What equipment are you planning to purchase with this funding?
          </p>
          <textarea
            className="mt-3 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm [font-family:'Montserrat',Helvetica] text-[#111827] focus:border-[#ef3e34] focus:outline-none min-h-[110px]"
            placeholder="Tell us what you plan to purchase (radios, repeaters, consoles, etc.)"
            value={awardResponse}
            onChange={(e) => setAwardResponse(e.target.value)}
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => awardResponseMutation.mutate()}
              disabled={awardResponseMutation.isPending || awardResponse.trim().length < 10}
              className="rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] disabled:opacity-60"
            >
              {awardResponseMutation.isPending ? "Submitting..." : "Submit"}
            </button>
            <span className="[font-family:'Montserrat',Helvetica] text-xs text-[#6b7280]">
              Minimum 10 characters.
            </span>
          </div>
        </div>
      )}

      {action === "respond" && app.status === "awarded" && awardResponseSubmitted && (
        <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
          <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#166534]">
            Thanks — we received your response. A Red Dog specialist will follow up soon with recommendations.
          </p>
        </div>
      )}

      {/* Regenerate Confirm Banner */}
      {showRegenerateConfirm && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <AlertTriangle size={18} className="shrink-0 text-orange-500 mt-0.5" />
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-orange-800">
              Regenerate all sections with fresh AI content?
            </p>
            <p className="[font-family:'Montserrat',Helvetica] text-xs text-orange-700">
              This will replace your current content in all sections. Any manual edits will be overwritten.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
                className="rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-60 [font-family:'Montserrat',Helvetica]"
              >
                {regenerateMutation.isPending ? "Regenerating..." : "Yes, Regenerate"}
              </button>
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="rounded-lg border border-orange-200 bg-white px-4 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50 [font-family:'Montserrat',Helvetica]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Switcher (only when aligned version exists) */}
      {hasAligned && (
        <div className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
              Funder-aligned version available
            </span>
            <span className="[font-family:'Montserrat',Helvetica] text-xs text-[#6b7280]">
              Compare original AI content against a rewrite tailored to this funder&apos;s language and priorities.
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-1">
            <button
              onClick={() => setViewMode("original")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold [font-family:'Montserrat',Helvetica] transition-all",
                viewMode === "original"
                  ? "bg-white shadow text-[#111827]"
                  : "text-[#6b7280] hover:text-[#374151]"
              )}
            >
              <FileText size={12} /> Original
            </button>
            <button
              onClick={() => setViewMode("aligned")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold [font-family:'Montserrat',Helvetica] transition-all",
                viewMode === "aligned"
                  ? "bg-[#ef3e34] shadow text-white"
                  : "text-[#6b7280] hover:text-[#374151]"
              )}
            >
              <CheckCircle size={12} /> Aligned
            </button>
            <button
              onClick={() => setViewMode("compare")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold [font-family:'Montserrat',Helvetica] transition-all",
                viewMode === "compare"
                  ? "bg-white shadow text-[#111827]"
                  : "text-[#6b7280] hover:text-[#374151]"
              )}
            >
              <Columns2 size={12} /> Compare
            </button>
          </div>
        </div>
      )}

      {/* Compare Mode Banner */}
      {viewMode === "compare" && hasAligned && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2 text-center">
            <span className="[font-family:'Montserrat',Helvetica] text-xs font-bold text-[#6b7280] uppercase tracking-wide">
              Original Content
            </span>
          </div>
          <div className="rounded-lg border border-[#ef3e3433] bg-[#fff8f8] px-4 py-2 text-center">
            <span className="[font-family:'Montserrat',Helvetica] text-xs font-bold text-[#ef3e34] uppercase tracking-wide">
              ✦ Aligned — Funder Language
            </span>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="flex flex-col gap-4">
        {/* Email History */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm uppercase tracking-wide">
                Email History
              </h3>
              <p className="[font-family:'Montserrat',Helvetica] text-xs text-[#6b7280]">
                Outreach and replies tied to this application
              </p>
            </div>
            <button
              onClick={() => setComposeOpen(true)}
              className="rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] disabled:opacity-60"
              disabled={generateEmailMutation.isPending}
            >
              Generate Outreach Email
            </button>
          </div>

          {grantEmailHistory.isLoading ? (
            <div className="mt-2 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-50 border border-[#f3f4f6]" />
              ))}
            </div>
          ) : grantEmailHistory.isError ? (
            <div className="mt-2">
              <p className="[font-family:'Montserrat',Helvetica] text-sm text-red-600">
                Failed to load email history.
              </p>
              <button
                onClick={() => grantEmailHistory.refetch()}
                className="mt-2 text-sm font-semibold [font-family:'Montserrat',Helvetica] text-[#ef3e34] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (grantEmailHistory.data || []).length === 0 ? (
            <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e5e7eb] bg-neutral-50 px-6 py-10 text-center">
              <div className="text-2xl">📭</div>
              <p className="mt-2 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
                No outreach sent yet
              </p>
              <p className="mt-1 [font-family:'Montserrat',Helvetica] text-xs text-[#6b7280]">
                Generate an outreach email to start the conversation.
              </p>
              <button
                onClick={() => setComposeOpen(true)}
                className="mt-4 rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029]"
              >
                Generate Outreach Email
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {(grantEmailHistory.data || []).map((o) => {
                const pill = statusPill(o.status);
                const via = o.sentViaGmail ? "via Gmail" : "via SMTP";
                const sentLabel = o.status === "sent" ? `Sent: ${fmtDateTime(o.sentAt)}` : `Created: ${fmtDateTime(o.createdAt)}`;
                return (
                  <div key={o._id} className="rounded-xl border border-[#e5e7eb] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📧</span>
                          <p className="[font-family:'Montserrat',Helvetica] text-sm font-bold text-[#111827]">
                            Outreach
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold [font-family:'Montserrat',Helvetica] ${pill.cls}`}>
                            {pill.label}
                          </span>
                          {o.hasUnread ? <span className="inline-block w-2 h-2 rounded-full bg-[#3b82f6]" /> : null}
                        </div>
                        <p className="mt-2 [font-family:'Montserrat',Helvetica] text-sm text-[#374151] truncate">
                          <span className="font-semibold">To:</span> {o.recipient || "—"}
                        </p>
                        <p className="mt-1 [font-family:'Montserrat',Helvetica] text-sm text-[#374151] truncate">
                          <span className="font-semibold">Subject:</span> {o.subject || "—"}
                        </p>
                        <p className="mt-1 [font-family:'Montserrat',Helvetica] text-xs text-[#6b7280]">
                          {sentLabel} · {via}
                        </p>
                        {o.replyTo ? (
                          <p className="mt-1 [font-family:'Montserrat',Helvetica] text-xs text-[#6b7280] truncate">
                            <span className="font-semibold">Reply-To:</span> {o.replyTo}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="text-xs text-[#6b7280] [font-family:'Montserrat',Helvetica]">
                          💬 {o.replyCount || 0} replies
                        </div>
                        <button
                          onClick={() => setThreadOutbox(o)}
                          disabled={(o.replyCount || 0) === 0 && !o.htmlBody}
                          className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-semibold [font-family:'Montserrat',Helvetica] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
                        >
                          View Thread ›
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {SECTIONS.map(({ key, label }) => {
          const originalContent = appRecord[key] as string | undefined;
          const alignedContent = alignedRecord?.[key] as string | undefined;
          const displayContent = viewMode === "aligned" && alignedContent ? alignedContent : originalContent;

          if (viewMode === "compare" && hasAligned) {
            return (
              <div key={key} className="grid grid-cols-2 gap-4">
                {/* Original */}
                <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 flex flex-col gap-3">
                  <h3 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm uppercase tracking-wide">
                    {label}
                  </h3>
                  {isEditing ? (
                    <textarea
                      className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm [font-family:'Montserrat',Helvetica] text-[#111827] focus:border-[#ef3e34] focus:outline-none min-h-[100px]"
                      value={(form as unknown as Record<string, string>)[key] || ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  ) : originalContent ? (
                    <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">
                      {originalContent}
                    </p>
                  ) : (
                    <EmptyContent />
                  )}
                </div>
                {/* Aligned */}
                <div className="rounded-xl border border-[#ef3e3420] bg-[#fff8f8] p-5 flex flex-col gap-3">
                  <h3 className="[font-family:'Montserrat',Helvetica] font-bold text-[#ef3e34] text-sm uppercase tracking-wide flex items-center gap-2">
                    {label}
                    <span className="rounded-full bg-[#ef3e341a] border border-[#ef3e3433] px-2 py-0.5 text-[10px] text-[#ef3e34] normal-case tracking-normal font-semibold">
                      Aligned
                    </span>
                  </h3>
                  {alignedContent ? (
                    <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">
                      {alignedContent}
                    </p>
                  ) : (
                    <span className="text-[#9ca3af] italic text-sm [font-family:'Montserrat',Helvetica]">
                      No aligned version for this section.
                    </span>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={key} className={cn(
              "rounded-xl border p-5 flex flex-col gap-3",
              viewMode === "aligned" && alignedContent
                ? "border-[#ef3e3420] bg-[#fff8f8]"
                : "border-[#e5e7eb] bg-white"
            )}>
              <h3 className={cn(
                "[font-family:'Montserrat',Helvetica] font-bold text-sm uppercase tracking-wide flex items-center gap-2",
                viewMode === "aligned" && alignedContent ? "text-[#ef3e34]" : "text-[#111827]"
              )}>
                {label}
                {viewMode === "aligned" && alignedContent && (
                  <span className="rounded-full bg-[#ef3e341a] border border-[#ef3e3433] px-2 py-0.5 text-[10px] text-[#ef3e34] normal-case tracking-normal font-semibold">
                    Aligned ✦
                  </span>
                )}
              </h3>
              {isEditing && viewMode !== "aligned" ? (
                <textarea
                  className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm [font-family:'Montserrat',Helvetica] text-[#111827] focus:border-[#ef3e34] focus:outline-none min-h-[100px]"
                  value={(form as unknown as Record<string, string>)[key] || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              ) : displayContent ? (
                <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">
                  {displayContent}
                </p>
              ) : (
                <EmptyContent />
              )}
            </div>
          );
        })}

        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 flex flex-col gap-3">
          <h3 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm uppercase tracking-wide">Notes</h3>
          {isEditing ? (
            <textarea
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm [font-family:'Montserrat',Helvetica] text-[#111827] focus:border-[#ef3e34] focus:outline-none"
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Internal notes..."
            />
          ) : (
            <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151]">{app.notes || "No notes."}</p>
          )}
        </div>

        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm uppercase tracking-wide">
                Communication Log
              </h3>
              <p className="[font-family:'Montserrat',Helvetica] text-xs text-[#6b7280]">
                Activity and updates on this application
              </p>
            </div>
          </div>

          <div className="mt-2 space-y-3">
            {commQuery.isLoading ? (
              <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">Loading…</p>
            ) : (commQuery.data?.length || 0) === 0 ? (
              <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">
                No activity yet. You&apos;ll see updates here as your application progresses.
              </p>
            ) : (
              (commQuery.data || []).map((log) => {
                const createdAt = log.createdAt ? new Date(log.createdAt) : null;
                const relTime = createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : "—";
                return (
                  <div key={log._id} className="rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{commIcon(log.type)}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide [font-family:'Montserrat',Helvetica]">
                          {commTypeLabel(log.type)}
                          {log.direction ? ` · ${commDirectionLabel(log.direction)}` : ""}
                        </p>
                        {log.subject ? (
                          <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827] mt-1">
                            {log.subject}
                          </p>
                        ) : null}
                        {log.withParty ? (
                          <p className="mt-2 text-xs text-[#6b7280]">
                            <span className="font-semibold">With:</span> {log.withParty}
                          </p>
                        ) : null}
                        <p className="mt-2 whitespace-pre-wrap text-sm text-[#374151]">{log.body}</p>
                        <p className="mt-2 text-xs text-[#9ca3af]">
                          by {log.createdByName || "Unknown"} · {relTime}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-wrap gap-3 border-t border-[#e5e7eb] pt-4">

        {!isAdminControlled && app.status !== "submitted" && (
          <button
            onClick={() => statusMutation.mutate("submitted")}
            disabled={statusMutation.isPending}
            className="rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-green-600 disabled:opacity-50"
          >
            Mark as Submitted
          </button>
        )}
      </div>

      {/* Aligned version timestamp */}
      {app.alignedVersion?.generatedAt && (
        <p className="text-xs text-[#9ca3af] [font-family:'Montserrat',Helvetica]">
          Aligned version generated: {new Date(app.alignedVersion.generatedAt).toLocaleString()}
        </p>
      )}

      <AlertDialog open={paywallOpen} onOpenChange={setPaywallOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Subscription Required</AlertDialogTitle>
            <AlertDialogDescription>
              AI grant writing requires an active subscription. Plans start at $199/month and include unlimited AI applications, smart
              funder matching, and weekly digests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Maybe Later</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
              onClick={() => router.push("/pricing")}
            >
              View Plans
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Thread Modal */}
      {threadOutbox ? <ThreadModal outbox={threadOutbox} onClose={() => setThreadOutbox(null)} /> : null}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          setConfirmOpen(v);
          if (!v) setConfirmStage(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move this grant to {confirmStage ? STAGE_LABEL[confirmStage] : "this stage"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the pipeline stage and add a history entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setStageMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!confirmStage || setStageMutation.isPending}
              className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
              onClick={() => confirmStage && setStageMutation.mutate({ stage: confirmStage })}
            >
              {setStageMutation.isPending ? "Updating…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compose (Generate Outreach) Modal */}
      {composeOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setComposeOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[640px] mx-4 flex flex-col">
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-[#f3f4f6]">
              <div>
                <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-xl tracking-[0.5px] uppercase">
                  Generate Outreach Email
                </h2>
                <p className="mt-1 text-xs text-[#6b7280] [font-family:'Montserrat',Helvetica]">
                  This will queue an email in your Outbox and link it to this application.
                </p>
              </div>
              <button
                onClick={() => setComposeOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors"
              >
                <X size={14} className="text-[#6b7280]" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {!opportunityId ? (
                <div className="rounded-xl border border-[#fee2e2] bg-[#fff1f2] p-4">
                  <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#991b1b]">
                    This application record doesn&apos;t include an opportunityId yet.
                  </p>
                  <p className="mt-1 [font-family:'Montserrat',Helvetica] text-xs text-[#991b1b]">
                    We can still show email history, but generating outreach from this page needs the opportunity ID.
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#374151] [font-family:'Montserrat',Helvetica]">Contact email</label>
                  <input
                    value={composeContactEmail}
                    onChange={(e) => setComposeContactEmail(e.target.value)}
                    placeholder="funder@example.com"
                    className="h-10 rounded-lg border border-[#e5e7eb] px-3 text-sm [font-family:'Montserrat',Helvetica] focus:border-[#ef3e34] focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#374151] [font-family:'Montserrat',Helvetica]">Contact name (optional)</label>
                  <input
                    value={composeContactName}
                    onChange={(e) => setComposeContactName(e.target.value)}
                    placeholder="Jane Doe"
                    className="h-10 rounded-lg border border-[#e5e7eb] px-3 text-sm [font-family:'Montserrat',Helvetica] focus:border-[#ef3e34] focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#374151] [font-family:'Montserrat',Helvetica]">Sender name (optional)</label>
                  <input
                    value={composeSenderName}
                    onChange={(e) => setComposeSenderName(e.target.value)}
                    placeholder="Your name"
                    className="h-10 rounded-lg border border-[#e5e7eb] px-3 text-sm [font-family:'Montserrat',Helvetica] focus:border-[#ef3e34] focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#374151] [font-family:'Montserrat',Helvetica]">Sender company (optional)</label>
                  <input
                    value={composeSenderCompany}
                    onChange={(e) => setComposeSenderCompany(e.target.value)}
                    placeholder="Your organization"
                    className="h-10 rounded-lg border border-[#e5e7eb] px-3 text-sm [font-family:'Montserrat',Helvetica] focus:border-[#ef3e34] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setComposeOpen(false)}
                className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold [font-family:'Montserrat',Helvetica] text-[#374151] hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
              <button
                onClick={() => generateEmailMutation.mutate()}
                disabled={generateEmailMutation.isPending || !composeContactEmail.trim() || !opportunityId}
                className="rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] disabled:opacity-60"
              >
                {generateEmailMutation.isPending ? "Generating…" : "Generate & Queue"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
