"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminApplicationsPage() {
  const [status, setStatus] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, refetch } = useQuery({
    queryKey: ["admin", "applications", status, agencyId, dateFrom, dateTo],
    queryFn: async () => {
      const res = await adminApi.get("admin/applications", {
        params: { limit: 50, status: status || undefined, agencyId: agencyId || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      });
      return res.data;
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Applications</h1>
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Status"
          className="w-40 border-[#e5e7eb]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <Input
          placeholder="Agency ID"
          className="w-52 border-[#e5e7eb]"
          value={agencyId}
          onChange={(e) => setAgencyId(e.target.value)}
        />
        <Input type="date" className="border-[#e5e7eb]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" className="border-[#e5e7eb]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <Button variant="secondary" type="button" onClick={() => refetch()}>
          Filter
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] bg-white text-sm shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[#f9fafb] text-[#6b7280]">
            <tr>
              <th className="p-3">Agency</th>
              <th className="p-3">Funder</th>
              <th className="p-3">Started</th>
              <th className="p-3">Submitted</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r: Record<string, unknown>) => (
              <tr key={String(r._id)} className="border-t border-[#f0f0f0]">
                <td className="p-3 font-medium text-[#111827]">
                  {(r.organization as { name?: string })?.name}
                </td>
                <td className="p-3 text-[#6b7280]">
                  {(r.funder as { name?: string })?.name ||
                    (r.opportunity as { funder?: string })?.funder}
                </td>
                <td className="p-3 text-[#9ca3af]">
                  {r.dateStarted ? new Date(String(r.dateStarted)).toLocaleDateString() : "—"}
                </td>
                <td className="p-3 text-[#9ca3af]">
                  {r.dateSubmitted ? new Date(String(r.dateSubmitted)).toLocaleDateString() : "—"}
                </td>
                <td className="p-3">
                  <span className="rounded bg-[#f3f4f6] px-2 py-0.5 text-xs text-[#374151]">
                    {String(r.status)}
                  </span>
                </td>
                <td className="p-3">
                  <Link href={`/admin/applications/${r._id}`} className="text-sm font-medium text-[#ef3e34] hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
