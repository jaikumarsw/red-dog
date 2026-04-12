"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SECTIONS = [
  "problemStatement",
  "communityImpact",
  "proposedSolution",
  "measurableOutcomes",
  "urgency",
  "budgetSummary",
] as const;

export default function AdminAgencyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();
  const [tab, setTab] = useState<"matches" | "applications" | "history">("matches");
  const [modal, setModal] = useState(false);
  const [funderId, setFunderId] = useState("");
  const [statusAppId, setStatusAppId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("draft");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "agency", id],
    queryFn: async () => {
      const res = await adminApi.get(`admin/agencies/${id}`);
      return res.data.data;
    },
  });

  const { data: fundersData } = useQuery({
    queryKey: ["admin", "funders", "short"],
    queryFn: async () => {
      const res = await adminApi.get("admin/funders", { params: { limit: 200 } });
      return res.data.data as { _id: string; name: string }[];
    },
    enabled: modal,
  });

  const genMutation = useMutation({
    mutationFn: async () => {
      const res = await adminApi.post("admin/applications/create-for-agency", {
        agencyId: id,
        funderId,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agency", id] });
      setModal(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ appId, status }: { appId: string; status: string }) => {
      await adminApi.put(`admin/applications/${appId}/status`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agency", id] });
      setStatusAppId(null);
    },
  });

  const matchApproveMutation = useMutation({
    mutationFn: (matchId: string) => adminApi.put(`admin/matches/${matchId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agency", id] });
    },
  });

  const matchRejectMutation = useMutation({
    mutationFn: (matchId: string) => adminApi.put(`admin/matches/${matchId}/reject`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agency", id] });
    },
  });

  if (isLoading || !data) {
    return <p className="text-[#6b7280]">Loading agency…</p>;
  }

  const profile = data.profile;
  const matches = data.matches || [];
  const applications = data.applications || [];
  const history = data.submissionHistory || [];

  return (
    <div className="max-w-6xl space-y-6">
      <AdminBackLink href="/admin/agencies">Back to agencies</AdminBackLink>
      <div className="flex items-start justify-between gap-4">
        <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">{profile.name}</h1>
        <Button className="bg-[#ef3e34] hover:bg-[#d63530] text-white" onClick={() => setModal(true)}>
          Generate application with AI
        </Button>
      </div>

      <div className="space-y-3 rounded-lg border border-[#e5e7eb] bg-white p-6 text-sm shadow-sm">
        <p className="text-[#374151]">
          <span className="text-[#9ca3af]">Type:</span>{" "}
          {(profile.agencyTypes || []).join(", ") || "—"}
        </p>
        <p className="text-[#374151]">
          <span className="text-[#9ca3af]">Location:</span> {profile.location}
        </p>
        <p className="text-[#374151]">
          <span className="text-[#9ca3af]">Population served:</span> {profile.populationServed}
        </p>
        <p className="text-[#374151]">
          <span className="text-[#9ca3af]">Coverage:</span> {profile.coverageArea}
        </p>
        <p className="text-[#374151]">
          <span className="text-[#9ca3af]">Staff:</span> {profile.numberOfStaff}
        </p>
        <div>
          <p className="mb-1 text-xs uppercase text-[#9ca3af]">Equipment</p>
          <p className="whitespace-pre-wrap text-[#111827]">{profile.currentEquipment}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(profile.mainProblems || []).map((t: string) => (
            <span key={t} className="rounded bg-[#f3f4f6] px-2 py-0.5 text-xs text-[#374151]">
              {t}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(profile.fundingPriorities || []).map((t: string) => (
            <span key={t} className="rounded bg-[#fff1f0] px-2 py-0.5 text-xs font-medium text-[#ef3e34]">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#e5e7eb] pb-2">
        {(["matches", "applications", "history"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1 text-sm capitalize ${
              tab === t
                ? "bg-[#ef3e341a] font-semibold text-[#ef3e34]"
                : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "matches" && (
        <ul className="space-y-3">
          {matches.map((m: Record<string, unknown>) => (
            <li
              key={String(m._id)}
              className="rounded border border-[#e5e7eb] bg-white p-4 shadow-sm"
            >
              <p className="font-medium text-[#111827]">
                {(m.opportunity as { funder?: string })?.funder}
              </p>
              <p className="text-sm text-[#6b7280]">
                {(m.opportunity as { title?: string })?.title}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  {String(m.fitScore)} score
                </span>
                <span className="rounded bg-[#f3f4f6] px-2 py-0.5 text-xs text-[#4b5563]">
                  {String(m.tier)}
                </span>
                <span className="rounded bg-[#eff6ff] px-2 py-0.5 text-xs font-medium text-[#1d4ed8]">
                  Status: {String(m.status ?? "pending")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 border-green-200 text-green-800 hover:bg-green-50"
                  disabled={matchApproveMutation.isPending}
                  onClick={() => matchApproveMutation.mutate(String(m._id))}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 border-red-200 text-red-700 hover:bg-red-50"
                  disabled={matchRejectMutation.isPending}
                  onClick={() => matchRejectMutation.mutate(String(m._id))}
                >
                  Reject
                </Button>
              </div>
              <ul className="mt-2 list-disc pl-4 text-xs text-[#9ca3af]">
                {((m.reasons as string[]) || []).slice(0, 6).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {tab === "applications" && (
        <ul className="space-y-6">
          {applications.map((a: Record<string, unknown>) => (
            <li key={String(a._id)} className="rounded border border-[#e5e7eb] bg-white p-4 shadow-sm">
              <div className="flex justify-between">
                <p className="font-medium text-[#111827]">
                  {(a.funder as { name?: string })?.name ||
                    (a.opportunity as { funder?: string })?.funder}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[#e5e7eb]"
                  onClick={() => {
                    setStatusAppId(String(a._id));
                    setNewStatus(String(a.status));
                  }}
                >
                  Edit status
                </Button>
              </div>
              <p className="mt-1 text-xs text-[#9ca3af]">Status: {String(a.status)}</p>
              {SECTIONS.map((key) => (
                <details key={key} className="mt-2 text-sm">
                  <summary className="cursor-pointer capitalize font-medium text-[#ef3e34]">
                    {key.replace(/([A-Z])/g, " $1")}
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap pl-2 text-[#6b7280]">
                    {String(a[key] || "—")}
                  </p>
                </details>
              ))}
            </li>
          ))}
        </ul>
      )}

      {tab === "history" && (
        <ul className="text-sm space-y-2">
          {history.map((h: Record<string, unknown>, i: number) => (
            <li key={i} className="border-b border-[#f0f0f0] pb-2 text-[#6b7280]">
              {String(h.changedAt)} — {String(h.previousStatus)} → {String(h.status)} (app{" "}
              {String(h.applicationId)})
            </li>
          ))}
        </ul>
      )}

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate application</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6b7280]">Ashleen will draft all six sections for this agency.</p>
          <Select value={funderId} onValueChange={setFunderId}>
            <SelectTrigger className="border-[#e5e7eb]">
              <SelectValue placeholder="Choose funder" />
            </SelectTrigger>
            <SelectContent>
              {(fundersData || []).map((f) => (
                <SelectItem key={f._id} value={f._id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {genMutation.isPending && (
            <p className="text-sm text-[#d97706]">Ashleen is writing the application…</p>
          )}
          {genMutation.isSuccess && (
            <p className="text-sm text-emerald-600">Application generated. Check the Applications tab.</p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={!funderId || genMutation.isPending}
              className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
              onClick={() => genMutation.mutate()}
            >
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusAppId} onOpenChange={() => setStatusAppId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update status</DialogTitle>
          </DialogHeader>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger className="border-[#e5e7eb]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "draft",
                "drafting",
                "submitted",
                "in_review",
                "awarded",
                "rejected",
                "not_started",
                "ready_to_submit",
                "follow_up_needed",
                "denied",
              ].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              onClick={() =>
                statusAppId && statusMutation.mutate({ appId: statusAppId, status: newStatus })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
