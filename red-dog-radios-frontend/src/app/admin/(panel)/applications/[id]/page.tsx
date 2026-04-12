"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
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

const KEYS = [
  "problemStatement",
  "communityImpact",
  "proposedSolution",
  "measurableOutcomes",
  "urgency",
  "budgetSummary",
] as const;

type Breakdown = Record<string, number> | undefined;

export default function AdminApplicationDetailPage() {
  const { id } = useParams();
  const appId = typeof id === "string" ? id : id?.[0] ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const notesHydrated = useRef(false);

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
    mutationFn: (body: { status: string; notes?: string }) =>
      adminApi.put(`admin/applications/${appId}/status`, body),
    onSuccess: () => {
      notesHydrated.current = false;
      qc.invalidateQueries({ queryKey: ["admin", "application", appId] });
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      toast({ title: "Status updated" });
      setApproveOpen(false);
      setRejectOpen(false);
      setRejectReason("");
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

  if (!appId) return null;
  if (isLoading || !data) return <p className="text-[#6b7280]">Loading…</p>;

  const status = String(data.status ?? "");
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const fitScore = data.fitScore;
  const breakdown = data.matchBreakdown;
  const matchReasons = data.matchReasons ?? [];

  const onConfirmApprove = () => {
    statusMutation.mutate({ status: "approved" });
  };

  const onConfirmReject = () => {
    const base = String(data.notes || "").trim();
    const reason = rejectReason.trim();
    const merged = reason ? (base ? `${base}\nRejection reason: ${reason}` : `Rejection reason: ${reason}`) : base;
    statusMutation.mutate({ status: "rejected", notes: merged || undefined });
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
            <span className="ml-2 rounded bg-[#f3f4f6] px-2 py-0.5 text-sm capitalize text-[#374151]">
              {status.replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isApproved && (
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={statusMutation.isPending}
              onClick={() => setApproveOpen(true)}
            >
              Approve Application
            </Button>
          )}
          {!isRejected && (
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
            {matchReasons.slice(0, 8).map((r) => (
              <li key={r}>{r}</li>
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

      {KEYS.map((k) => (
        <div key={k} className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold capitalize text-[#ef3e34] [font-family:'Montserrat',Helvetica]">
            {k.replace(/([A-Z])/g, " $1")}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-[#374151]">{String(data[k] || "—")}</p>
        </div>
      ))}

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this application?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this application? The agency will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={onConfirmApprove}
            >
              Approve
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
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onConfirmReject}>
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
