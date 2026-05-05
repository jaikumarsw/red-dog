"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Settings,
  Trash2,
  User as UserIcon,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BUDGET_LABELS: Record<string, string> = {
  under_25k: "Under $25K",
  "25k_150k": "$25K – $150K",
  "150k_500k": "$150K – $500K",
  "500k_plus": "$500K+",
};

const formatAgencyType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const dash = (v: unknown) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" && v.trim() === "") return "—";
  return String(v);
};

const formatMemberSince = (d?: string) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return "—";
  }
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

function sectionValue(data: Record<string, unknown>, key: SectionKey): string {
  const v = data[key];
  if (typeof v === "string" && v.trim()) return v;

  // Backwards compatibility for legacy 8-key applications
  if (key === "executiveSummary") return String(data.projectSummary || "—");
  if (key === "projectDescription") return String(data.proposedSolution || "—");
  if (key === "budgetJustification") return String(data.budgetSummary || "—");
  if (key === "outcomesAndImpact") return String(data.communityImpact || data.measurableOutcomes || "—");

  return "—";
}

type Breakdown = Record<string, number> | undefined;

export default function AdminApplicationDetailPage() {
  const { id } = useParams();
  const appId = typeof id === "string" ? id : id?.[0] ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user: adminUser } = useAdminAuth();
  const [notes, setNotes] = useState("");
  const [awardOpen, setAwardOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [infoRequestOpen, setInfoRequestOpen] = useState(false);
  const [infoRequestNote, setInfoRequestNote] = useState("");
  const [agencyExpanded, setAgencyExpanded] = useState(true);
  const notesHydrated = useRef(false);
  const [commOpen, setCommOpen] = useState(false);
  const [commForm, setCommForm] = useState({
    type: "note",
    direction: "internal",
    withParty: "",
    subject: "",
    body: "",
    visibleToAgency: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "application", appId],
    queryFn: async () => {
      const res = await adminApi.get(`admin/applications/${appId}`);
      return res.data.data as Record<string, unknown> & {
        fitScore?: number | null;
        matchBreakdown?: Breakdown;
        matchReasons?: string[];
      };
    },
    enabled: Boolean(appId),
  });

  useEffect(() => {
    notesHydrated.current = false;
  }, [appId]);

  useEffect(() => {
    if (!data || notesHydrated.current) return;
    setNotes(String(data.notes ?? ""));
    notesHydrated.current = true;
  }, [data]);

  const saveNotes = useMutation({
    mutationFn: () => adminApi.put(`admin/applications/${appId}`, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "application", appId] });
      toast({ title: "Notes saved" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (body: { status: string; notes?: string; infoRequestedNote?: string }) =>
      adminApi.patch(`admin/applications/${appId}/status`, body),
    onSuccess: () => {
      notesHydrated.current = false;
      qc.invalidateQueries({ queryKey: ["admin", "application", appId] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      const isInfoReq = statusMutation.variables?.status === "waiting_on_information";
      toast({ title: isInfoReq ? "Information request sent to agency" : "Status updated" });
      setAwardOpen(false);
      setRejectOpen(false);
      setInfoRequestOpen(false);
      setRejectReason("");
      setInfoRequestNote("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Update failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const regen = useMutation({
    mutationFn: () => adminApi.post(`admin/applications/${appId}/generate-ai`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "application", appId] });
      toast({ title: "AI content regenerated" });
    },
  });

  type CommLog = {
    _id: string;
    type: "system" | "email_sent" | "email_received" | "phone_call" | "meeting" | "note";
    direction?: "inbound" | "outbound" | "internal";
    subject?: string;
    body: string;
    createdBy?: string;
    createdByName?: string;
    createdByRole?: "admin" | "agency" | "system";
    withParty?: string;
    visibleToAgency?: boolean;
    createdAt?: string;
    ashleenSuggestion?: string;
    ashleenFlags?: string[];
  };

  const commQuery = useQuery({
    queryKey: ["admin", "communication-log", appId],
    queryFn: async () => {
      const res = await adminApi.get(`communication-log/admin/application/${appId}`);
      return (res.data.data || []) as CommLog[];
    },
    enabled: Boolean(appId),
  });

  const addComm = useMutation({
    mutationFn: async () => {
      const payload = {
        application: appId,
        type: commForm.type,
        direction: commForm.direction,
        withParty: commForm.withParty.trim() || undefined,
        subject: commForm.subject.trim() || undefined,
        body: commForm.body,
        visibleToAgency: commForm.visibleToAgency,
      };
      const res = await adminApi.post("communication-log", payload);
      return res.data.data as CommLog;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "communication-log", appId] });
      setCommOpen(false);
      setCommForm({
        type: "note",
        direction: "internal",
        withParty: "",
        subject: "",
        body: "",
        visibleToAgency: true,
      });
      toast({ title: "Entry added" });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not add entry";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const deleteComm = useMutation({
    mutationFn: (logId: string) => adminApi.delete(`communication-log/${logId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "communication-log", appId] });
      toast({ title: "Entry deleted" });
    },
    onError: () => toast({ title: "Error", description: "Delete failed", variant: "destructive" }),
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
        return "Email";
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

  if (!appId) return null;
  if (isLoading || !data) return <p className="text-[#6b7280]">Loading…</p>;

  const status = String(data.status ?? "");
  const isAwarded = status === "awarded";
  const isRejected = status === "rejected" || status === "denied";
  const canMarkAwarded = status === "submitted" || status === "in_review" || status === "waiting_on_information";
  const canReject = status === "submitted" || status === "in_review" || status === "waiting_on_information";
  const canRequestInfo = !["awarded", "rejected", "denied", "waiting_on_information"].includes(status);
  const fitScore = data.fitScore;
  const breakdown = data.matchBreakdown;
  const matchReasons = data.matchReasons ?? [];
  const org = data.organization as Record<string, unknown> | undefined;
  const orgId =
    (org as { _id?: unknown })?._id != null
      ? String((org as { _id?: unknown })._id)
      : typeof data.organization === "string"
        ? String(data.organization)
        : "";
  const submittedBy = (data as { submittedBy?: unknown }).submittedBy as
    | { firstName?: string; lastName?: string; email?: string; role?: string; createdAt?: string }
    | undefined;

  const onConfirmAwarded = () => {
    setAwardOpen(false);
    statusMutation.mutate({ status: "awarded" });
  };

  const onConfirmReject = () => {
    setRejectOpen(false);
    const base = String(data.notes || "").trim();
    const reason = rejectReason.trim();
    const merged = reason ? (base ? `${base}\nRejection reason: ${reason}` : `Rejection reason: ${reason}`) : base;
    statusMutation.mutate({ status: "rejected", notes: merged || undefined });
  };

  const onConfirmRequestInfo = () => {
    setInfoRequestOpen(false);
    statusMutation.mutate({
      status: "waiting_on_information",
      infoRequestedNote: infoRequestNote.trim() || undefined,
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <AdminBackLink href="/admin/applications">Back to applications</AdminBackLink>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Application</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            {(data.organization as { name?: string })?.name ?? "Agency"} ·{" "}
            {(data.opportunity as { title?: string })?.title ?? "Opportunity"}
          </p>
          <p className="mt-2">
            <span className="text-xs uppercase text-[#9ca3af]">Status</span>{" "}
            <StatusBadge status={status} className="ml-2" />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRequestInfo && (
            <Button
              type="button"
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              disabled={statusMutation.isPending}
              onClick={() => setInfoRequestOpen(true)}
            >
              Request Information
            </Button>
          )}
          {canMarkAwarded && !isAwarded && (
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={statusMutation.isPending}
              onClick={() => setAwardOpen(true)}
            >
              Mark as Awarded
            </Button>
          )}
          {canReject && !isRejected && (
            <Button
              type="button"
              variant="destructive"
              disabled={statusMutation.isPending}
              onClick={() => setRejectOpen(true)}
            >
              Reject Application
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="details">Application Details</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">

      {org && (
        <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setAgencyExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-[#ef3e34]" />
              <h2 className="[font-family:'Montserrat',Helvetica] text-sm font-bold uppercase tracking-wide text-[#111827]">
                Agency Profile
              </h2>
            </div>
            {agencyExpanded ? (
              <ChevronUp size={18} className="text-[#9ca3af]" />
            ) : (
              <ChevronDown size={18} className="text-[#9ca3af]" />
            )}
          </button>

          {agencyExpanded && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6b7280]">Agency Name</span>
                    <span className="font-semibold text-[#111827]">{dash(org.name)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6b7280]">Location</span>
                    <span className="text-[#111827]">{dash(org.location)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#6b7280]">Website</span>
                    {String((org.websiteUrl ?? org.website ?? "") || "").trim() ? (
                      <a
                        href={String((org.websiteUrl ?? org.website) as string)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        Visit <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-[#111827]">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6b7280]">Status</span>
                    {String(org.status || "").toLowerCase() === "active" ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        Active
                      </span>
                    ) : String(org.status || "").trim() ? (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                        {String(org.status)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                        —
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">Agency Types</p>
                  {Array.isArray(org.agencyTypes) && org.agencyTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(org.agencyTypes as string[]).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-[#ef3e34]/40 bg-[#fff4f4] px-2 py-0.5 text-xs font-semibold text-[#ef3e34]"
                        >
                          {formatAgencyType(t)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6b7280]">—</p>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">Program Areas</p>
                  {Array.isArray(org.programAreas) && org.programAreas.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(org.programAreas as string[]).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-[#ef3e34]/20 bg-white px-2 py-0.5 text-xs font-semibold text-[#ef3e34]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6b7280]">—</p>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">Mission Statement</p>
                  <p className="whitespace-pre-wrap text-sm text-[#374151]">
                    {dash(org.missionStatement)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border border-[#f0f0f0] bg-[#fafafa] p-3">
                    <p className="text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">Population Served</p>
                    <p className="mt-1 font-semibold text-[#111827]">
                      {org.populationServed != null ? Number(org.populationServed).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-[#f0f0f0] bg-[#fafafa] p-3">
                    <p className="text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">Number of Staff</p>
                    <p className="mt-1 font-semibold text-[#111827]">
                      {org.numberOfStaff != null ? Number(org.numberOfStaff).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-[#f0f0f0] bg-[#fafafa] p-3 col-span-2">
                    <p className="text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">Coverage Area</p>
                    <p className="mt-1 text-[#111827]">{dash(org.coverageArea)}</p>
                  </div>
                  <div className="rounded-md border border-[#f0f0f0] bg-[#fafafa] p-3 col-span-2">
                    <p className="text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">Can Meet Local Match</p>
                    <p className="mt-1 font-semibold">
                      {org.canMeetLocalMatch === true ? (
                        <span className="text-green-700">Yes ✓</span>
                      ) : org.canMeetLocalMatch === false ? (
                        <span className="text-gray-700">No</span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">Current Equipment</p>
                  <p className="whitespace-pre-wrap text-sm text-[#374151]">{dash(org.currentEquipment)}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">Main Problems</p>
                  {Array.isArray(org.mainProblems) && org.mainProblems.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm text-[#374151] space-y-1">
                      {(org.mainProblems as string[]).slice(0, 10).map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[#6b7280]">—</p>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">Funding Priorities</p>
                  {Array.isArray(org.fundingPriorities) && org.fundingPriorities.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm text-[#374151] space-y-1">
                      {(org.fundingPriorities as string[]).slice(0, 10).map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[#6b7280]">—</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border border-[#f0f0f0] bg-[#fafafa] p-3">
                    <p className="text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">Budget Range</p>
                    <p className="mt-1 font-semibold text-[#111827]">
                      {org.budgetRange ? (BUDGET_LABELS[String(org.budgetRange)] || String(org.budgetRange)) : "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-[#f0f0f0] bg-[#fafafa] p-3">
                    <p className="text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">Timeline</p>
                    <p className="mt-1 font-semibold text-[#111827]">{dash(org.timeline)}</p>
                  </div>
                  <div className="rounded-md border border-[#f0f0f0] bg-[#fafafa] p-3 col-span-2">
                    <p className="text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">Total Matches</p>
                    <p className="mt-1 font-semibold text-[#111827]">{org.matchCount != null ? String(org.matchCount) : "—"}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 mt-2 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={orgId ? `/admin/agencies/${orgId}` : "/admin/agencies"}
                  className="inline-flex items-center justify-center rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                >
                  View Full Agency Profile
                </Link>
                <Link
                  href={orgId ? `/admin/applications?org=${encodeURIComponent(orgId)}` : "/admin/applications"}
                  className="inline-flex items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb]"
                >
                  View All Applications
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <UserIcon size={16} className="text-[#6b7280]" />
          <h2 className="[font-family:'Montserrat',Helvetica] text-sm font-bold uppercase tracking-wide text-[#111827]">
            Submitted By
          </h2>
        </div>
        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#6b7280]">Full name</span>
            <span className="font-semibold text-[#111827]">
              {submittedBy?.firstName || submittedBy?.lastName
                ? `${submittedBy?.firstName || ""} ${submittedBy?.lastName || ""}`.trim()
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#6b7280]">Email</span>
            {submittedBy?.email ? (
              <a className="text-blue-600 hover:underline" href={`mailto:${submittedBy.email}`}>
                {submittedBy.email}
              </a>
            ) : (
              <span className="text-[#111827]">—</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6b7280]">Role</span>
            {submittedBy?.role ? (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                {submittedBy.role}
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                —
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6b7280]">Member since</span>
            <span className="text-[#111827]">{formatMemberSince(submittedBy?.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#ef3e34] [font-family:'Montserrat',Helvetica]">
          Match fit (this agency × this opportunity)
        </h2>
        <p className="mt-2 text-[#111827]">
          <span className="text-[#6b7280]">Fit score:</span>{" "}
          <span className="text-lg font-bold">{fitScore != null ? fitScore : "—"}</span>
        </p>
        {breakdown && Object.keys(breakdown).length > 0 && (
          <ul className="mt-2 grid gap-1 text-xs text-[#6b7280] sm:grid-cols-2">
            {Object.entries(breakdown).map(([k, v]) => (
              <li key={k}>
                <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}:</span> {String(v)}
              </li>
            ))}
          </ul>
        )}
        {matchReasons.length > 0 && (
          <ul className="mt-2 list-disc pl-4 text-xs text-[#6b7280]">
            {matchReasons.slice(0, 8).map((r, i) => (
              <li key={`${i}-${r}`}>{r}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
          onClick={() => regen.mutate()}
          disabled={regen.isPending}
        >
          {regen.isPending ? "Regenerating…" : "Regenerate with AI"}
        </Button>
      </div>

      <div>
        <p className="mb-1 text-xs text-[#6b7280]">Staff notes</p>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="border-[#e5e7eb]" />
        <Button className="mt-2" variant="outline" onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending}>
          Save notes
        </Button>
      </div>

      {SECTIONS.map((s) => (
        <div key={s.key} className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-[#ef3e34] [font-family:'Montserrat',Helvetica]">
            {s.label}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-[#374151]">{sectionValue(data, s.key)}</p>
        </div>
      ))}

    </TabsContent>

      <TabsContent value="communications" className="space-y-6 mt-6">
        <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="[font-family:'Montserrat',Helvetica] text-sm font-bold uppercase tracking-wide text-[#111827]">
                Communications
              </h2>
              <p className="mt-1 text-xs text-[#6b7280]">Timeline of conversations and system activity</p>
            </div>
            <Button
              type="button"
              className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
              onClick={() => setCommOpen(true)}
            >
              Add Entry
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {commQuery.isLoading ? (
              <p className="text-sm text-[#6b7280]">Loading…</p>
            ) : (commQuery.data?.length || 0) === 0 ? (
              <p className="text-sm text-[#6b7280]">No communications logged yet.</p>
            ) : (
              (commQuery.data || []).map((log) => {
                const canDelete =
                  log.type !== "system" &&
                  adminUser?._id &&
                  (String(log.createdBy || "") === String(adminUser._id) || log.createdByRole === "admin");
                const createdAt = log.createdAt ? new Date(log.createdAt) : null;
                const relTime = createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : "—";
                
                const isExpanded = !!expandedLogs[log._id];
                const isInboundEmail = log.type === "email_received" && log.direction === "inbound";
                const hasAshleen = !!log.ashleenSuggestion;

                return (
                  <div key={log._id} className="rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="mt-0.5">{commIcon(log.type)}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide [font-family:'Montserrat',Helvetica]">
                              {commTypeLabel(log.type)}
                              {log.direction ? ` · ${commDirectionLabel(log.direction)}` : ""}
                            </p>
                            {hasAshleen && (
                              <div className="flex items-center gap-1 rounded-full bg-[#ef3e34] px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                                <span className="w-3 h-3 rounded-full bg-white flex items-center justify-center text-[#ef3e34] text-[7px] mr-1">A</span>
                                Ashleen Suggestion
                              </div>
                            )}
                          </div>
                          {log.subject ? (
                            <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827] mt-1">
                              {log.subject}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isInboundEmail && (
                          <button
                            type="button"
                            className="text-[#ef3e34] hover:text-[#d63530] text-xs font-semibold flex items-center gap-1"
                            onClick={() => setExpandedLogs(p => ({ ...p, [log._id]: !p[log._id] }))}
                          >
                            {isExpanded ? "Show less" : "View detail"}
                            <ChevronDown size={14} className={cn("transition-transform", isExpanded && "rotate-180")} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="text-[#9ca3af] hover:text-red-600"
                            onClick={() => deleteComm.mutate(log._id)}
                            disabled={deleteComm.isPending}
                            aria-label="Delete entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {log.withParty ? (
                      <p className="mt-2 text-xs text-[#6b7280]">
                        <span className="font-semibold">With:</span> {log.withParty}
                      </p>
                    ) : null}

                    {isInboundEmail && !isExpanded ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[#374151] line-clamp-2">
                        {log.body}
                      </p>
                    ) : (
                      <div className="mt-2">
                        <p className="whitespace-pre-wrap text-sm text-[#374151]">{log.body}</p>
                        
                        {isExpanded && hasAshleen && (
                          <div className="mt-4 rounded-lg bg-[#f9fafb] border border-[#e5e7eb] p-3 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="w-5 h-5 rounded-full bg-[#ef3e34] flex items-center justify-center flex-shrink-0">
                                <span className="font-bold text-white text-[8px]">A</span>
                              </div>
                              <span className="text-xs font-bold text-[#111827] [font-family:'Montserrat',Helvetica]">
                                Ashleen&apos;s Suggested Reply
                              </span>
                            </div>
                            <p className="text-sm text-[#4b5563] whitespace-pre-wrap">
                              {log.ashleenSuggestion}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-xs text-[#9ca3af]">
                      by {log.createdByName || "Unknown"} · {relTime}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>

      <Dialog open={commOpen} onOpenChange={setCommOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Communication Log Entry</DialogTitle>
            <DialogDescription>Log an email, call, meeting, or internal note.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={commForm.type} onValueChange={(v) => setCommForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_sent">Email Sent</SelectItem>
                  <SelectItem value="email_received">Email Received</SelectItem>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(commForm.type === "email_sent" ||
              commForm.type === "email_received" ||
              commForm.type === "phone_call") && (
                <div className="grid gap-2">
                  <Label>Direction</Label>
                  <Select
                    value={commForm.direction}
                    onValueChange={(v) => setCommForm((p) => ({ ...p, direction: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

            <div className="grid gap-2">
              <Label>With (optional)</Label>
              <Input
                placeholder="e.g., Sarah Chen @ FEMA"
                value={commForm.withParty}
                onChange={(e) => setCommForm((p) => ({ ...p, withParty: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Subject</Label>
              <Input
                value={commForm.subject}
                onChange={(e) => setCommForm((p) => ({ ...p, subject: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Body</Label>
              <Textarea
                value={commForm.body}
                onChange={(e) => setCommForm((p) => ({ ...p, body: e.target.value }))}
                className="min-h-[140px]"
              />
              <p className="text-xs text-[#9ca3af]">Required (min 10 characters).</p>
            </div>

            <label className="flex items-center gap-2 text-sm text-[#374151]">
              <Checkbox
                checked={commForm.visibleToAgency}
                onCheckedChange={(v) => setCommForm((p) => ({ ...p, visibleToAgency: Boolean(v) }))}
              />
              Visible to agency
            </label>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setCommOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
              onClick={() => addComm.mutate()}
              disabled={addComm.isPending || commForm.body.trim().length < 10}
            >
              {addComm.isPending ? "Saving…" : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={awardOpen} onOpenChange={setAwardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this application as awarded?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark this application as awarded? This will record it as a win for the agency.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 text-white hover:bg-amber-600"
              onClick={onConfirmAwarded}
              disabled={statusMutation.isPending}
            >
              Mark as Awarded
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this application?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this application? Add a reason (optional):
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="border-[#e5e7eb]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={onConfirmReject}
              disabled={statusMutation.isPending}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={infoRequestOpen} onOpenChange={setInfoRequestOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Information from Agency</AlertDialogTitle>
            <AlertDialogDescription>
              What information is needed from the agency?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="e.g., Please provide a vendor quote for the 280 P25 Phase II radios"
            value={infoRequestNote}
            onChange={(e) => setInfoRequestNote(e.target.value)}
            className="border-[#e5e7eb] min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={onConfirmRequestInfo}
              disabled={statusMutation.isPending || !infoRequestNote.trim()}
            >
              Send Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
