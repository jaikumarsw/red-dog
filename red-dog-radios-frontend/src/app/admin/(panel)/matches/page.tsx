"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

type MatchRow = {
  _id: string;
  agencyName?: string;
  organization?: { name?: string };
  opportunity?: { title?: string; funder?: string };
  fitScore?: number;
  status?: string;
  lastUpdated?: string;
  updatedAt?: string;
};

type SortKey = "agency" | "opportunity" | "fitScore" | "status" | "lastUpdated";

function statusBadgeCls(s: string) {
  if (s === "approved") return "bg-[#dcfce7] text-[#16a34a]";
  if (s === "rejected") return "bg-[#fee2e2] text-[#b91c1c]";
  return "bg-[#fef9c3] text-[#b45309]";
}

export default function AdminMatchesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [tier, setTier] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("fitScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pendingAction, setPendingAction] = useState<null | { type: "approve" | "reject"; id: string }>(null);
  const [recomputeOpen, setRecomputeOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "matches", page, tier, agencyFilter],
    queryFn: async () => {
      const res = await adminApi.get("admin/matches", {
        params: {
          page,
          limit: 30,
          tier: tier || undefined,
          agencyId: agencyFilter || undefined,
        },
      });
      return res.data as {
        data: MatchRow[];
        pagination?: {
          total?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
          hasNextPage?: boolean;
          hasPrevPage?: boolean;
        };
      };
    },
  });

  const rowsRaw = data?.data ?? [];
  const pagination = data?.pagination;

  const sortedRows = useMemo(() => {
    const copy = [...rowsRaw];
    const mult = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      const agencyA = a.agencyName ?? a.organization?.name ?? "";
      const agencyB = b.agencyName ?? b.organization?.name ?? "";
      const oppA = a.opportunity?.title ?? a.opportunity?.funder ?? "";
      const oppB = b.opportunity?.title ?? b.opportunity?.funder ?? "";
      const dateA = new Date(a.lastUpdated ?? a.updatedAt ?? 0).getTime();
      const dateB = new Date(b.lastUpdated ?? b.updatedAt ?? 0).getTime();
      if (sortKey === "agency") return agencyA.localeCompare(agencyB) * mult;
      if (sortKey === "opportunity") return oppA.localeCompare(oppB) * mult;
      if (sortKey === "fitScore") return ((a.fitScore ?? 0) - (b.fitScore ?? 0)) * mult;
      if (sortKey === "status") return (a.status ?? "").localeCompare(b.status ?? "") * mult;
      return (dateA - dateB) * mult;
    });
    return copy;
  }, [rowsRaw, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "agency" || key === "opportunity" || key === "status" ? "asc" : "desc");
    }
  };

  const actMutation = useMutation({
    mutationFn: async ({ type, id }: { type: "approve" | "reject"; id: string }) => {
      if (type === "approve") return adminApi.put(`admin/matches/${id}/approve`);
      return adminApi.put(`admin/matches/${id}/reject`);
    },
    onSuccess: (_, v) => {
      void qc.invalidateQueries({ queryKey: ["admin", "matches"] });
      toast({
        title: v.type === "approve" ? "Match approved" : "Match rejected",
      });
      setPendingAction(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Action failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setPendingAction(null);
    },
  });

  const recomputeMutation = useMutation({
    mutationFn: () => adminApi.post("admin/matches/recompute-all"),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["admin", "matches"] });
      const processed = (res.data?.data as { processed?: number })?.processed;
      toast({
        title: "Recompute complete",
        description:
          typeof processed === "number" ? `${processed} organization–opportunity pairs updated.` : undefined,
      });
      setRecomputeOpen(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Recompute failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setRecomputeOpen(false);
    },
  });

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="p-3">
      <button
        type="button"
        className="font-semibold text-[#374151] hover:text-[#111827]"
        onClick={() => toggleSort(k)}
      >
        {label}
        {sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Matches</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="border-[#e5e7eb]"
            disabled={recomputeMutation.isPending}
            onClick={() => setRecomputeOpen(true)}
          >
            {recomputeMutation.isPending ? "Recomputing…" : "Recompute all"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-md border border-[#e5e7eb] bg-white px-2 text-sm"
          value={tier}
          onChange={(e) => {
            setTier(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All tiers</option>
          <option value="high">High fit</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <Input
          placeholder="Agency ID filter"
          className="w-52 border-[#e5e7eb]"
          value={agencyFilter}
          onChange={(e) => {
            setAgencyFilter(e.target.value);
            setPage(1);
          }}
        />
        <Button variant="secondary" type="button" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] bg-white text-sm shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[#f9fafb] text-[#6b7280]">
            <tr>
              <Th k="agency" label="Agency" />
              <Th k="opportunity" label="Opportunity" />
              <Th k="fitScore" label="Fit score" />
              <Th k="status" label="Status" />
              <Th k="lastUpdated" label="Last updated" />
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#9ca3af]">
                  Loading…
                </td>
              </tr>
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#9ca3af]">
                  No matches found
                </td>
              </tr>
            ) : (
              sortedRows.map((m) => {
                const agency = m.agencyName ?? m.organization?.name ?? "—";
                const opp = m.opportunity?.title ?? m.opportunity?.funder ?? "—";
                const st = m.status ?? "pending";
                const updated = m.lastUpdated ?? m.updatedAt;
                return (
                  <tr key={m._id} className="border-t border-[#f0f0f0]">
                    <td className="p-3 font-medium text-[#111827]">{agency}</td>
                    <td className="max-w-[220px] p-3 text-[#6b7280] break-words">{opp}</td>
                    <td className="p-3 font-semibold text-[#111827]">{m.fitScore ?? "—"}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadgeCls(st)}`}
                      >
                        {st}
                      </span>
                    </td>
                    <td className="p-3 text-[#6b7280]">
                      {updated ? new Date(updated).toLocaleString() : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 border-green-200 text-green-700 hover:bg-green-50"
                          disabled={st === "approved" || actMutation.isPending}
                          onClick={() => setPendingAction({ type: "approve", id: m._id })}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                          disabled={st === "rejected" || actMutation.isPending}
                          onClick={() => setPendingAction({ type: "reject", id: m._id })}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (pagination.totalPages ?? 1) > 1 && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-[#6b7280]">
          <span>
            Page {pagination.page ?? page} of {pagination.totalPages ?? 1}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrevPage}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!pagination.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(o) => !o && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "approve" ? "Approve match?" : "Reject match?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "approve"
                ? "Agency users in the saved/high-fit flows may see this match as approved."
                : "This match will be marked rejected for staff review."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingAction && actMutation.mutate(pendingAction)}
              className={
                pendingAction?.type === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={recomputeOpen} onOpenChange={setRecomputeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recompute all matches?</AlertDialogTitle>
            <AlertDialogDescription>
              This recomputes scores for every active organization and opportunity pair. It may take a minute on large
              datasets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => recomputeMutation.mutate()}>Start recompute</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
