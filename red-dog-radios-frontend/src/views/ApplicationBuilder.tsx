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
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Application {
  _id: string;
  projectTitle?: string;
  projectSummary?: string;
  executiveSummary?: string;
  status: string;
  problemStatement?: string;
  communityImpact?: string;
  proposedSolution?: string;
  measurableOutcomes?: string;
  urgency?: string;
  budgetSummary?: string;
  projectDescription?: string;
  missionAlignment?: string;
  budgetJustification?: string;
  organizationalCapacity?: string;
  outcomesAndImpact?: string;
  evaluationPlan?: string;
  sustainabilityPlan?: string;
  alignedVersion?: {
    executiveSummary?: string;
    problemStatement?: string;
    projectDescription?: string;
    missionAlignment?: string;
    budgetJustification?: string;
    organizationalCapacity?: string;
    outcomesAndImpact?: string;
    evaluationPlan?: string;
    sustainabilityPlan?: string;
    generatedAt?: string;
  };
  notes?: string;
  dateSubmitted?: string;
  funder?: { _id: string; name: string; avgGrantMax?: number; deadline?: string; contactEmail?: string; contactName?: string };
  funder_id?: string;
  opportunity?: {
    _id?: string;
    title: string;
    funder: string;
    maxAmount?: number;
    deadline?: string;
    contactEmail?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    applicationUrl?: string | null;
    funderId?: {
      _id: string;
      contactEmail?: string;
      contactName?: string;
      contactPhone?: string;
    } | null;
  };
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
  relatedUser?: { fullName?: string; firstName?: string; lastName?: string; email?: string };
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

const SECTIONS = [
  { key: "executiveSummary", label: "Executive Summary" },
  { key: "problemStatement", label: "Problem Statement" },
  { key: "projectDescription", label: "Project Description" },
  { key: "missionAlignment", label: "Mission Alignment" },
  { key: "budgetJustification", label: "Budget Justification" },
  { key: "organizationalCapacity", label: "Organizational Capacity" },
  { key: "outcomesAndImpact", label: "Outcomes and Impact" },
  { key: "evaluationPlan", label: "Evaluation Plan" },
  { key: "sustainabilityPlan", label: "Sustainability Plan" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const legacyFallback = (app: Application, key: SectionKey): string | undefined => {
  switch (key) {
    case "executiveSummary":
      return app.executiveSummary ?? app.projectSummary;
    case "problemStatement":
      return app.problemStatement;
    case "projectDescription":
      return app.projectDescription ?? app.proposedSolution;
    case "missionAlignment":
      return app.missionAlignment;
    case "budgetJustification":
      return app.budgetJustification ?? app.budgetSummary;
    case "organizationalCapacity":
      return app.organizationalCapacity;
    case "outcomesAndImpact":
      return app.outcomesAndImpact ?? app.communityImpact ?? app.measurableOutcomes;
    case "evaluationPlan":
      return app.evaluationPlan;
    case "sustainabilityPlan":
      return app.sustainabilityPlan;
    default:
      return undefined;
  }
};

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
              Outreach Email
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
  useAuth();
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
  const [emailPhase, setEmailPhase] = useState<"idle" | "generating" | "preview" | "sending" | "success">("idle");
  const [emailContent, setEmailContent] = useState({
    subject: "",
    htmlBody: "",
    recipient: "",
    recipientName: "",
    senderEmail: "",
    senderName: "",
  });
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [sendResult, setSendResult] = useState<{ mode: string; scheduledFor?: string } | null>(null);

  const { data: app, isLoading, isError, refetch } = useQuery<Application>({
    queryKey: qk.application(id),
    queryFn: async () => {
      const res = await api.get(`/applications/${id}`);
      return res.data.data as Application;
    },
    enabled: !!id,
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

  const isFederalFunder = useMemo(() => {
    const FEDERAL_FUNDERS = ['FEMA', 'DHS', 'DOJ', 'COPS Office'];
    const fn = app?.funder?.name || app?.opportunity?.funder || "";
    return FEDERAL_FUNDERS.some(name => fn.toUpperCase().includes(name.toUpperCase()));
  }, [app?.funder?.name, app?.opportunity?.funder]);

  const grantEmailHistory = useQuery<GrantOutbox[]>({
    queryKey: ["outbox", "grant", id],
    queryFn: async () => {
      const res = await api.get(`/outbox/grant/${id}`);
      return (res.data.data || []) as GrantOutbox[];
    },
    enabled: !!id,
    retry: false,
  });

  const { data: gmailStatus } = useQuery({
    queryKey: ["gmail", "self-status"],
    queryFn: async () => {
      const r = await api.get("gmail/oauth/status-self");
      return r.data.data as { isConnected: boolean; senderEmail: string | null };
    },
  });

  const gmailConnected = gmailStatus?.isConnected;

  const generateEmailMutation = useMutation({
    mutationFn: async () => {
      const funderEmail =
        app?.funder?.contactEmail || app?.opportunity?.contactEmail || app?.opportunity?.funderId?.contactEmail;
      const funderName =
        app?.funder?.contactName || app?.opportunity?.contactName || app?.opportunity?.funderId?.contactName;

      if (!funderEmail)
        throw new Error(
          "No contact email on file for this funder — please ask your admin to update the funder record."
        );
      if (!opportunityId)
        throw new Error(
          "This application is missing an opportunityId, so outreach can't be generated here yet."
        );

      setEmailPhase("generating");
      const res = await api.post(`/ai/generate-email?previewOnly=true`, {
        opportunityId,
        contactEmail: funderEmail.trim(),
        contactName: funderName?.trim() || undefined,
        grantId: id,
      });
      return res.data.data as {
        subject: string;
        htmlBody: string;
        recipient: string;
        recipientName: string;
        senderEmail: string;
        senderName: string;
      };
    },
    onSuccess: (data) => {
      setEmailContent(data);
      setEmailPhase("preview");
    },
    onError: (err: unknown) => {
      setEmailPhase("idle");
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Failed to generate email.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const handleSendEmail = async (sendMode: "now" | "scheduled" | "draft") => {
    setEmailPhase("sending");
    try {
      await api.post("/outbox/send-or-schedule", {
        ...emailContent,
        sendMode,
        scheduledFor: sendMode === "scheduled" ? scheduleTime : undefined,
        relatedGrant: id,
        emailType: "outreach",
      });
      setSendResult({
        mode: sendMode,
        scheduledFor: sendMode === "scheduled" ? scheduleTime : undefined,
      });
      setEmailPhase("success");

      // Automatically mark application as submitted if sent or scheduled
      if (sendMode !== "draft") {
        statusMutation.mutate("submitted");
      }

      setTimeout(() => {
        setEmailPhase("idle");
        setEmailContent({
          subject: "",
          htmlBody: "",
          recipient: "",
          recipientName: "",
          senderEmail: "",
          senderName: "",
        });
        setSendResult(null);
        setComposeOpen(false);
        queryClient.invalidateQueries({ queryKey: ["outbox", "grant", id] });
      }, 2000);
    } catch (err: unknown) {
      setEmailPhase("preview");
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Failed to send email.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

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

  const alignedRecord = app.alignedVersion as unknown as Record<string, unknown> | undefined;

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 pb-10 sm:p-6 lg:p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[#6b7280] hover:text-[#111827] transition-colors w-fit [font-family:'Montserrat',Helvetica] text-sm"
      >
        <ArrowLeft size={16} /> Back
      </button>

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
        {/* Outreach Emails */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm uppercase tracking-wide">
                Outreach Emails
              </h3>
              <p className="[font-family:'Montserrat',Helvetica] text-xs text-[#6b7280]">
                Outreach emails queued and sent for this application
              </p>
            </div>
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
                onClick={() => {
                  setComposeOpen(true);
                }}
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
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <button
                          onClick={() => setThreadOutbox(o)}
                          disabled={!o.htmlBody}
                          className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-semibold [font-family:'Montserrat',Helvetica] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
                        >
                          View Email ›
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
          const originalContent = legacyFallback(app, key);
          const alignedContent = (alignedRecord?.[key] as string | undefined) || undefined;
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

      {/* Compose (Generate Outreach) Modal */}
      {composeOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setComposeOpen(false)}
        >
          <div
            className={cn(
              "bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full mx-4 flex flex-col transition-all duration-300",
              emailPhase === "preview" ? "max-w-[800px]" : "max-w-[640px]"
            )}
          >
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-[#f3f4f6]">
              <div>
                <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-xl tracking-[0.5px] uppercase">
                  {emailPhase === "preview" ? "Review Outreach" : "Generate Outreach Email"}
                </h2>
              </div>
              <button
                onClick={() => setComposeOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors"
              >
                <X size={14} className="text-[#6b7280]" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {emailPhase === "generating" && (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                  <RefreshCw className="animate-spin text-[#ef3e34]" size={32} />
                  <p className="[font-family:'Montserrat',Helvetica] text-sm font-medium text-[#374151]">
                    Ashleen is drafting your outreach email...
                  </p>
                </div>
              )}

              {emailPhase === "idle" && (
                <>
                  <p className="text-sm text-[#6b7280] mb-3">
                    This will draft an outreach email based on your application content and funder priorities.
                  </p>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-600 text-base">⚠️</span>
                      <div className="text-sm">
                        <p className="font-bold text-amber-900 mb-1">For inquiries and follow-ups only</p>
                        <p className="text-amber-800">
                          Federal grants like FEMA, DHS, DOJ, and COPS Office require submission through{" "}
                          <a
                            href="https://www.grants.gov"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                          >
                            Grants.gov
                          </a>
                          . This email feature is for asking funder questions, following up after submission, or
                          contacting small foundations that accept email applications.
                        </p>
                      </div>
                    </div>
                  </div>

                  {isFederalFunder && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 mb-4">
                      <p className="font-bold text-red-900">🚨 This is a federal grant</p>
                      <p className="text-sm text-red-800 mt-1">
                        Sending an email here does NOT submit your application. You must submit through the
                        funder&apos;s official portal. Use this only for asking the funder questions.
                      </p>
                    </div>
                  )}

                  {!gmailConnected && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <Mail size={16} className="text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900 mb-1">Gmail not connected</p>
                          <p className="text-blue-800 mb-2">
                            This email will be sent from a Red Dog Grant Intelligence system address with your
                            contact info in the body. Connect your Gmail to send from your own address instead.
                          </p>
                          <button
                            className="text-blue-700 font-semibold underline"
                            onClick={() => router.push("/settings/agency")}
                          >
                            Connect Gmail in Settings
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {gmailConnected && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-emerald-900">
                        ✓ This will send from <strong>{gmailStatus?.senderEmail}</strong>
                      </p>
                    </div>
                  )}

                  {!opportunityId ? (
                    <div className="rounded-xl border border-[#fee2e2] bg-[#fff1f2] p-4">
                      <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#991b1b]">
                        This application record doesn&apos;t include an opportunityId yet.
                      </p>
                      <p className="mt-1 [font-family:'Montserrat',Helvetica] text-xs text-[#991b1b]">
                        We can still show email history, but generating outreach from this page needs the
                        opportunity ID.
                      </p>
                    </div>
                  ) : null}

                  <div className="pt-2">
                    {!app?.funder?.contactEmail &&
                    !app?.opportunity?.contactEmail &&
                    !app?.opportunity?.funderId?.contactEmail ? (
                      <div className="rounded-xl border border-[#fee2e2] bg-[#fff1f2] p-4 mb-4">
                        <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#991b1b]">
                          No contact email on file for this funder — please ask your admin to update the funder
                          record.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-[#6b7280] [font-family:'Montserrat',Helvetica] uppercase tracking-wider">
                            Contact email
                          </label>
                          <p className="text-sm font-medium text-[#111827] [font-family:'Montserrat',Helvetica]">
                            {app?.funder?.contactEmail ||
                              app?.opportunity?.contactEmail ||
                              app?.opportunity?.funderId?.contactEmail}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-[#6b7280] [font-family:'Montserrat',Helvetica] uppercase tracking-wider">
                            Contact name
                          </label>
                          <p className="text-sm font-medium text-[#111827] [font-family:'Montserrat',Helvetica]">
                            {app?.funder?.contactName ||
                              app?.opportunity?.contactName ||
                              app?.opportunity?.funderId?.contactName ||
                              "—"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {emailPhase === "preview" && (
                <div className="space-y-4">
                  <div className="space-y-2 border-b border-[#f3f4f6] pb-4">
                    <div className="flex text-sm">
                      <span className="w-16 shrink-0 text-[#6b7280] [font-family:'Montserrat',Helvetica]">To:</span>
                      <span className="font-semibold text-[#111827] [font-family:'Montserrat',Helvetica]">
                        {emailContent.recipientName} &lt;{emailContent.recipient}&gt;
                      </span>
                    </div>
                    <div className="flex text-sm">
                      <span className="w-16 shrink-0 text-[#6b7280] [font-family:'Montserrat',Helvetica]">From:</span>
                      <span className="text-[#374151] [font-family:'Montserrat',Helvetica]">
                        {emailContent.senderName} ({emailContent.senderEmail})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280] [font-family:'Montserrat',Helvetica]">
                      Subject Line
                    </label>
                    <input
                      value={emailContent.subject}
                      onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })}
                      className="w-full border-b border-[#e5e7eb] pb-2 text-sm font-bold text-[#111827] focus:border-[#ef3e34] focus:outline-none [font-family:'Montserrat',Helvetica]"
                      placeholder="Enter subject..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280] [font-family:'Montserrat',Helvetica]">
                      Message Body
                    </label>
                    <textarea
                      value={emailContent.htmlBody}
                      onChange={(e) => setEmailContent({ ...emailContent, htmlBody: e.target.value })}
                      className="w-full min-h-[320px] rounded-xl border border-[#e5e7eb] p-4 text-sm leading-relaxed text-[#374151] focus:border-[#ef3e34] focus:outline-none [font-family:'Montserrat',Helvetica]"
                      placeholder="Write your message here..."
                    />
                  </div>
                </div>
              )}

              {emailPhase === "sending" && (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                  <RefreshCw className="animate-spin text-[#ef3e34]" size={32} />
                  <p className="[font-family:'Montserrat',Helvetica] text-sm font-medium text-[#374151]">
                    Sending your message...
                  </p>
                </div>
              )}

              {emailPhase === "success" && (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                  <CheckCircle className="text-green-500" size={64} />
                  <div>
                    <h3 className="[font-family:'Oswald',Helvetica] text-2xl font-bold text-[#111827] uppercase">
                      {sendResult?.mode === "now"
                        ? "Email Sent!"
                        : sendResult?.mode === "scheduled"
                        ? "Email Scheduled"
                        : "Draft Saved"}
                    </h3>
                    <p className="mt-2 [font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">
                      {sendResult?.mode === "now"
                        ? "Your outreach has been dispatched successfully."
                        : sendResult?.mode === "scheduled"
                        ? `Your outreach is set to send on ${new Date(
                            sendResult.scheduledFor || ""
                          ).toLocaleString()}.`
                        : "Your outreach has been saved to the outbox as a draft."}
                    </p>
                    <p className="mt-6 text-xs text-[#9ca3af] animate-pulse [font-family:'Montserrat',Helvetica]">
                      Closing in 2 seconds...
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-7 pb-7 flex flex-col gap-4 border-t border-[#f3f4f6] pt-5">
              {emailPhase === "idle" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-xl p-4 flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-blue-100 p-1">
                      <Mail size={14} className="text-blue-600" />
                    </div>
                    <p className="text-xs text-blue-800 [font-family:'Montserrat',Helvetica] leading-relaxed">
                      Replies from the funder will appear in your Application Inbox and are visible to your Red Dog
                      advisor.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setComposeOpen(false)}
                      className="rounded-lg border border-[#e5e7eb] bg-white px-5 py-2.5 text-sm font-semibold [font-family:'Montserrat',Helvetica] text-[#374151] hover:bg-[#f9fafb] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => generateEmailMutation.mutate()}
                      disabled={
                        generateEmailMutation.isPending ||
                        (!app?.funder?.contactEmail &&
                          !app?.opportunity?.contactEmail &&
                          !app?.opportunity?.funderId?.contactEmail) ||
                        !opportunityId
                      }
                      className="rounded-lg bg-[#ef3e34] px-6 py-2.5 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] disabled:opacity-60 transition-colors"
                    >
                      {generateEmailMutation.isPending ? "Generating…" : "Generate Preview"}
                    </button>
                  </div>
                </div>
              )}

              {emailPhase === "preview" && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wider [font-family:'Montserrat',Helvetica]">
                        Schedule:
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-medium focus:border-[#ef3e34] focus:outline-none [font-family:'Montserrat',Helvetica]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSendEmail("draft")}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] [font-family:'Montserrat',Helvetica] transition-colors"
                      >
                        Save Draft
                      </button>
                      {scheduleTime ? (
                        <button
                          onClick={() => handleSendEmail("scheduled")}
                          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 [font-family:'Montserrat',Helvetica] shadow-sm transition-colors"
                        >
                          Schedule Outreach
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendEmail("now")}
                          className="rounded-lg bg-[#ef3e34] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#d63029] [font-family:'Montserrat',Helvetica] shadow-sm transition-colors"
                        >
                          Send Now →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
