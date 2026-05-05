"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { AdminTableViewLink } from "@/components/admin/AdminTableViewLink";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In review" },
  { value: "draft", label: "Draft" },
  { value: "drafting", label: "Drafting" },
  { value: "awarded", label: "Awarded" },
  { value: "waiting_on_information", label: "Waiting on Info" },
] as const;

export default function AdminApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agencyId, setAgencyId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "applications", statusFilter, agencyId, dateFrom, dateTo],
    queryFn: async () => {
      const res = await adminApi.get("admin/applications", {
        params: {
          limit: 50,
          status: statusFilter === "all" ? undefined : statusFilter,
          agencyId: agencyId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      return res.data;
    },
  });

  const rows = (data?.data ?? []) as Record<string, unknown>[];
  const submittedLikeCount = rows.filter((r) => ["submitted", "in_review"].includes(String(r.status))).length;
  const draftingCount = rows.filter((r) => ["draft", "drafting", "waiting_on_information"].includes(String(r.status))).length;

  const resetFilters = () => {
    setStatusFilter("all");
    setAgencyId("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Applications</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Track drafts, in-review applications, and final decisions in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#6b7280]">
            Total: <span className="font-semibold text-[#111827]">{rows.length}</span>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#6b7280]">
            Pending review: <span className="font-semibold text-[#111827]">{submittedLikeCount}</span>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#6b7280]">
            In progress: <span className="font-semibold text-[#111827]">{draftingCount}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <p className="mb-3 text-xs text-[#6b7280]">
          <span className="font-medium text-[#374151]">Pending Review</span> narrows results to applications still needing
          an approve/reject decision (<span className="font-medium text-[#374151]">submitted</span> and{" "}
          <span className="font-medium text-[#374151]">in review</span>).
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          <select
            className="h-10 min-w-[160px] rounded-md border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Input
            placeholder="Agency ID"
            className="border-[#e5e7eb]"
            value={agencyId}
            onChange={(e) => setAgencyId(e.target.value)}
          />
          <Input type="date" className="border-[#e5e7eb]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" className="border-[#e5e7eb]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => refetch()}>
              Apply
            </Button>
            <Button variant="ghost" type="button" className="flex-1" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white text-sm shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
        <table className="w-full min-w-[720px] text-left">
          <thead className="border-b border-[#f0f0f0] bg-[#f9fafb] text-[#6b7280] whitespace-nowrap">
            <tr>
              <th className="p-3">Agency</th>
              <th className="p-3">Opportunity</th>
              <th className="p-3">Funder</th>
              <th className="p-3">Match score</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date submitted</th>
              <th className="w-14 p-3 text-center" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-[#9ca3af]">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-[#9ca3af]">
                  No applications match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const submitted =
                  (r.dateSubmitted as string | undefined) ||
                  (r.submittedAt as string | undefined) ||
                  (r.createdAt as string | undefined);
                const opp = r.opportunity as { title?: string } | undefined;
                const fitScore = r.fitScore as number | null | undefined;
                return (
                  <tr key={String(r._id)} className="border-t border-[#f0f0f0] transition-colors hover:bg-[#fafafa]">
                    <td className="p-3 font-medium text-[#111827]">
                      {(r.organization as { name?: string })?.name}
                    </td>
                    <td className="max-w-[340px] p-3 text-[#374151]">
                      <span className="line-clamp-2">{opp?.title ?? "—"}</span>
                    </td>
                    <td className="max-w-[260px] p-3 text-[#6b7280]">
                      <span className="line-clamp-2">
                      {(r.funder as { name?: string })?.name ||
                        (r.opportunity as { funder?: string })?.funder}
                      </span>
                    </td>
                    <td className="p-3">
                      {fitScore != null ? (
                        <span className="inline-flex rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs font-semibold text-[#374151]">
                          {String(fitScore)}
                        </span>
                      ) : (
                        <span className="text-[#9ca3af]">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={String(r.status)} />
                    </td>
                    <td className="whitespace-nowrap p-3 text-[#6b7280]">
                      {submitted ? new Date(submitted).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3 text-center">
                      <AdminTableViewLink href={`/admin/applications/${r._id}`} label="View application details" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
