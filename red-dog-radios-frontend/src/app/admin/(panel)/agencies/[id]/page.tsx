"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
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

  if (isLoading || !data) {
    return <p className="text-slate-500">Loading agency…</p>;
  }

  const profile = data.profile;
  const matches = data.matches || [];
  const applications = data.applications || [];
  const history = data.submissionHistory || [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-start gap-4">
        <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
        <Button className="bg-amber-600 hover:bg-amber-500" onClick={() => setModal(true)}>
          Generate application with AI
        </Button>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 space-y-3 text-sm">
        <p className="text-slate-400">
          <span className="text-slate-500">Type:</span>{" "}
          {(profile.agencyTypes || []).join(", ") || "—"}
        </p>
        <p className="text-slate-400">
          <span className="text-slate-500">Location:</span> {profile.location}
        </p>
        <p className="text-slate-400">
          <span className="text-slate-500">Population served:</span> {profile.populationServed}
        </p>
        <p className="text-slate-400">
          <span className="text-slate-500">Coverage:</span> {profile.coverageArea}
        </p>
        <p className="text-slate-400">
          <span className="text-slate-500">Staff:</span> {profile.numberOfStaff}
        </p>
        <div>
          <p className="text-slate-500 text-xs uppercase mb-1">Equipment</p>
          <p className="text-slate-300 whitespace-pre-wrap">{profile.currentEquipment}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(profile.mainProblems || []).map((t: string) => (
            <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300">
              {t}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(profile.fundingPriorities || []).map((t: string) => (
            <span key={t} className="px-2 py-0.5 rounded bg-amber-900/30 text-xs text-amber-200">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {(["matches", "applications", "history"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded text-sm capitalize ${
              tab === t ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
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
              className="rounded border border-slate-800 p-4 bg-slate-900/30"
            >
              <p className="text-white font-medium">
                {(m.opportunity as { funder?: string })?.funder}
              </p>
              <p className="text-slate-500 text-sm">
                {(m.opportunity as { title?: string })?.title}
              </p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300">
                  {String(m.fitScore)} score
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                  {String(m.tier)}
                </span>
              </div>
              <ul className="mt-2 text-xs text-slate-500 list-disc pl-4">
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
            <li key={String(a._id)} className="rounded border border-slate-800 p-4 bg-slate-900/30">
              <div className="flex justify-between">
                <p className="text-white">
                  {(a.funder as { name?: string })?.name ||
                    (a.opportunity as { funder?: string })?.funder}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-600"
                  onClick={() => {
                    setStatusAppId(String(a._id));
                    setNewStatus(String(a.status));
                  }}
                >
                  Edit status
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Status: {String(a.status)}</p>
              {SECTIONS.map((key) => (
                <details key={key} className="mt-2 text-sm">
                  <summary className="cursor-pointer text-amber-400/90 capitalize">
                    {key.replace(/([A-Z])/g, " $1")}
                  </summary>
                  <p className="text-slate-400 mt-1 whitespace-pre-wrap pl-2">
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
            <li key={i} className="border-b border-slate-800 pb-2 text-slate-400">
              {String(h.changedAt)} — {String(h.previousStatus)} → {String(h.status)} (app{" "}
              {String(h.applicationId)})
            </li>
          ))}
        </ul>
      )}

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Generate application</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">Ashleen will draft all six sections for this agency.</p>
          <Select value={funderId} onValueChange={setFunderId}>
            <SelectTrigger className="bg-slate-800 border-slate-600">
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
            <p className="text-amber-400 text-sm">Ashleen is writing the application…</p>
          )}
          {genMutation.isSuccess && (
            <p className="text-emerald-400 text-sm">Application generated. Check the Applications tab.</p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={!funderId || genMutation.isPending}
              className="bg-amber-600"
              onClick={() => genMutation.mutate()}
            >
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusAppId} onOpenChange={() => setStatusAppId(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Update status</DialogTitle>
          </DialogHeader>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger className="bg-slate-800 border-slate-600">
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
