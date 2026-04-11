"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminMatchesPage() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [funder, setFunder] = useState("");

  const { data, refetch } = useQuery({
    queryKey: ["admin", "matches", funder],
    queryFn: async () => {
      const res = await adminApi.get("admin/matches", { params: { limit: 100, funder: funder || undefined } });
      return res.data;
    },
  });

  const recompute = useMutation({
    mutationFn: async () => {
      setMsg(null);
      const res = await adminApi.post("admin/matches/recompute-all");
      return res.data;
    },
    onSuccess: (res) => {
      setMsg((res.data as { message?: string })?.message || "Recompute finished.");
      qc.invalidateQueries({ queryKey: ["admin", "matches"] });
      refetch();
    },
    onError: () => setMsg("Recompute failed."),
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Matches</h1>
        <Button
          className="bg-amber-600"
          disabled={recompute.isPending}
          onClick={() => recompute.mutate()}
        >
          {recompute.isPending ? "Recomputing all matches…" : "Recompute all matches"}
        </Button>
      </div>
      {msg && <p className="text-sm text-amber-300">{msg}</p>}
      <Input
        placeholder="Filter by funder name"
        className="max-w-md bg-slate-900 border-slate-700 text-white"
        value={funder}
        onChange={(e) => setFunder(e.target.value)}
      />
      <div className="overflow-x-auto rounded-lg border border-slate-800 text-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">Agency</th>
              <th className="p-3">Funder</th>
              <th className="p-3">Score</th>
              <th className="p-3">Tier</th>
              <th className="p-3">Loc</th>
              <th className="p-3">Cat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: Record<string, unknown>) => (
              <tr key={String(r._id)} className="border-t border-slate-800">
                <td className="p-3 text-white">{String(r.agencyName || "")}</td>
                <td className="p-3 text-slate-400">{String(r.funderName || "")}</td>
                <td className="p-3">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      Number(r.fitScore) >= 80
                        ? "bg-emerald-900/50 text-emerald-300"
                        : Number(r.fitScore) >= 65
                          ? "bg-amber-900/50 text-amber-200"
                          : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {String(r.fitScore)}
                  </span>
                </td>
                <td className="p-3 text-slate-400">{String(r.tier)}</td>
                <td className="p-3">{r.locationMatch ? "✓" : "—"}</td>
                <td className="p-3">{r.categoryMatch ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
