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

  if (isLoading || !data) return <p className="text-[#6b7280]">Loading…</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Application</h1>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="mb-1 text-xs text-[#6b7280]">Status</p>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-52 border-[#e5e7eb]">
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
        <Button className="bg-[#ef3e34] hover:bg-[#d63530] text-white" onClick={() => regen.mutate()} disabled={regen.isPending}>
          {regen.isPending ? "Regenerating…" : "Regenerate with AI"}
        </Button>
      </div>
      <div>
        <p className="mb-1 text-xs text-[#6b7280]">Notes</p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="border-[#e5e7eb]"
        />
        <Button className="mt-2" variant="outline" onClick={() => saveNotes.mutate()}>
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
    </div>
  );
}
