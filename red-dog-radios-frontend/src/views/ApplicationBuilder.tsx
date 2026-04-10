"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { qk } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, RefreshCw, CheckCircle } from "lucide-react";

interface Application {
  _id: string;
  projectTitle?: string;
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
  opportunity?: { title: string; funder: string; maxAmount?: number; deadline?: string };
  organization?: { name: string };
}

const SECTIONS = [
  { key: "problemStatement", label: "Problem Statement" },
  { key: "communityImpact", label: "Community Impact" },
  { key: "proposedSolution", label: "Proposed Solution" },
  { key: "measurableOutcomes", label: "Measurable Outcomes" },
  { key: "urgency", label: "Urgency" },
  { key: "budgetSummary", label: "Budget Summary" },
] as const;

type SectionKey = typeof SECTIONS[number]["key"];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  drafting: "bg-blue-100 text-blue-700",
  ready_to_submit: "bg-purple-100 text-purple-700",
  submitted: "bg-orange-100 text-orange-700",
  in_review: "bg-yellow-100 text-yellow-700",
  awarded: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};

export const ApplicationBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showAligned, setShowAligned] = useState(false);
  const [form, setForm] = useState<Partial<Application>>({});
  const [editNotes, setEditNotes] = useState("");

  const { data: app, isLoading } = useQuery<Application>({
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
      toast({ title: "Application regenerated", description: "Fresh AI content applied." });
      queryClient.invalidateQueries({ queryKey: qk.application(id) });
    },
    onError: () => toast({ title: "Error", description: "Failed to regenerate.", variant: "destructive" }),
  });

  const alignMutation = useMutation({
    mutationFn: () => api.post(`/applications/${id}/align`),
    onSuccess: () => {
      toast({ title: "Application aligned to funder language" });
      queryClient.invalidateQueries({ queryKey: qk.application(id) });
      setShowAligned(true);
    },
    onError: () => toast({ title: "Error", description: "Failed to align.", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.put(`/applications/${id}/status`, { status }),
    onSuccess: (_, status) => {
      toast({ title: `Status updated to ${status}` });
      queryClient.invalidateQueries({ queryKey: qk.application(id) });
      queryClient.invalidateQueries({ queryKey: qk.applications() });
    },
  });

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

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6 bg-neutral-50 p-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl bg-white border border-[#e5e7eb]" />
        ))}
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

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 pb-10 sm:p-6 lg:p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[#6b7280] hover:text-[#111827] transition-colors w-fit [font-family:'Montserrat',Helvetica] text-sm"
      >
        <ArrowLeft size={16} /> Back
      </button>

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
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm [font-family:'Montserrat',Helvetica] text-[#374151] hover:bg-[#f9fafb]"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm [font-family:'Montserrat',Helvetica] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
          >
            <RefreshCw size={14} className={regenerateMutation.isPending ? "animate-spin" : ""} />
            {regenerateMutation.isPending ? "Regenerating..." : "Regenerate"}
          </button>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-semibold [font-family:'Montserrat',Helvetica] text-[#374151] hover:bg-[#f9fafb]"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving..." : "Save Draft"}
            </button>
          )}
        </div>
      </div>

      {app.alignedVersion && (
        <div className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white px-4 py-3">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151]">
            Funder-aligned version available.
          </span>
          <button
            onClick={() => setShowAligned(!showAligned)}
            className="ml-auto text-sm font-semibold text-[#ef3e34] hover:underline [font-family:'Montserrat',Helvetica]"
          >
            {showAligned ? "Show Original" : "Show Aligned Version"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {SECTIONS.map(({ key, label }) => {
          const appRecord = app as unknown as Record<string, unknown>;
          const alignedRecord = app.alignedVersion as unknown as Record<string, unknown> | undefined;
          const content = showAligned && alignedRecord
            ? (alignedRecord[key] || appRecord[key])
            : appRecord[key];

          return (
            <div key={key} className="rounded-xl border border-[#e5e7eb] bg-white p-5 flex flex-col gap-3">
              <h3 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm uppercase tracking-wide">
                {label}
                {showAligned && app.alignedVersion?.[key] && (
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 normal-case tracking-normal">
                    Aligned
                  </span>
                )}
              </h3>
              {isEditing && !showAligned ? (
                <textarea
                  className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm [font-family:'Montserrat',Helvetica] text-[#111827] focus:border-[#ef3e34] focus:outline-none min-h-[100px]"
                  value={(form as unknown as Record<string, string>)[key] || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              ) : (
                <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">
                  {(content as string) || (
                    <span className="text-[#9ca3af] italic">
                      No content yet. Click Regenerate to generate with AI.
                    </span>
                  )}
                </p>
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
      </div>

      <div className="flex flex-wrap gap-3 border-t border-[#e5e7eb] pt-4">
        <button
          onClick={() => alignMutation.mutate()}
          disabled={alignMutation.isPending}
          className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-semibold [font-family:'Montserrat',Helvetica] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
        >
          {alignMutation.isPending ? "Aligning..." : "Align to Funder Language"}
        </button>
        {app.status !== "submitted" && app.status !== "awarded" && (
          <button
            onClick={() => statusMutation.mutate("submitted")}
            disabled={statusMutation.isPending}
            className="rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-green-600 disabled:opacity-50"
          >
            Mark as Submitted
          </button>
        )}
      </div>
    </div>
  );
};
