"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminAgenciesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "agencies", search, page],
    queryFn: async () => {
      const res = await adminApi.get("admin/agencies", { params: { search, page, limit: 20 } });
      return res.data;
    },
  });

  const rows = data?.data ?? [];
  const pg = data?.pagination;

  return (
    <div className="space-y-6">
      <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Agencies</h1>
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, type, location"
          className="max-w-md border-[#e5e7eb]"
        />
        <Button type="button" variant="secondary" onClick={() => refetch()}>
          Search
        </Button>
      </div>
      {isLoading ? (
        <p className="text-[#6b7280]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f9fafb] text-[#6b7280]">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Location</th>
                <th className="p-3">Population</th>
                <th className="p-3">Matches</th>
                <th className="p-3">Applications</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r: Record<string, unknown>) => (
                <tr key={String(r._id)} className="border-t border-[#f0f0f0]">
                  <td className="p-3 font-medium text-[#111827]">{String(r.name)}</td>
                  <td className="p-3 text-[#6b7280]">
                    {Array.isArray(r.agencyTypes) ? (r.agencyTypes as string[]).join(", ") : "—"}
                  </td>
                  <td className="p-3 text-[#6b7280]">{String(r.location || "—")}</td>
                  <td className="p-3 text-[#6b7280]">{String(r.populationServed ?? "—")}</td>
                  <td className="p-3 text-[#6b7280]">{String(r.matchCount ?? 0)}</td>
                  <td className="p-3 text-[#6b7280]">{String(r.applicationCount ?? 0)}</td>
                  <td className="p-3">
                    <Link
                      href={`/admin/agencies/${r._id}`}
                      className="text-sm font-medium text-[#ef3e34] hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pg && pg.totalPages > 1 && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <span className="self-center text-sm text-[#6b7280]">
            Page {pg.page} / {pg.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={!pg.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
