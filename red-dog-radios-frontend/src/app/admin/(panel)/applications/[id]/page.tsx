"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

const KEYS = [
  "problemStatement",
  "communityImpact",
  "proposedSolution",
  "measurableOutcomes",
  "urgency",
  "budgetSummary",
] as const;

export default function AdminApplicationDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "application", id],
    queryFn: async () => {
      const res = await adminApi.get(`admin/applications/${id}`);
      return res.data.data as Record<string, unknown>;
    },
  });

  useEffect(() => {
    if (!data) return;
    setNotes(String(data.notes || ""));
    setStatus(String(data.status || "draft"));
  }, [data]);

  const saveNotes = useMutation({
    mutationFn: () => adminApi.put(`admin/applications/${id}`, { notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "application", id] }),
  });

  const saveStatus = useMutation({
    mutationFn: () => adminApi.put(`admin/applications/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "application", id] }),
  });

  const regen = useMutation({
    mutationFn: () => adminApi.post(`admin/applications/${id}/generate-ai`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "application", id] }),
  });

  if (isLoading || !data) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Application</h1>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <p className="text-xs text-slate-500 mb-1">Status</p>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-52 bg-slate-800 border-slate-600">
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
        </div>
        <Button variant="secondary" onClick={() => saveStatus.mutate()} disabled={saveStatus.isPending}>
          Update status
        </Button>
        <Button className="bg-amber-600" onClick={() => regen.mutate()} disabled={regen.isPending}>
          {regen.isPending ? "Regenerating…" : "Regenerate with AI"}
        </Button>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Notes</p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="bg-slate-900 border-slate-700 text-white"
        />
        <Button className="mt-2" variant="outline" onClick={() => saveNotes.mutate()}>
          Save notes
        </Button>
      </div>
      {KEYS.map((k) => (
        <div key={k} className="rounded-lg border border-slate-800 p-4 bg-slate-900/40">
          <h2 className="text-amber-400 text-sm font-semibold capitalize mb-2">
            {k.replace(/([A-Z])/g, " $1")}
          </h2>
          <p className="text-slate-300 whitespace-pre-wrap text-sm">{String(data[k] || "—")}</p>
        </div>
      ))}
    </div>
  );
}
