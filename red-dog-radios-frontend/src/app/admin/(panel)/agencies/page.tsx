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
      <h1 className="text-2xl font-bold text-white">Agencies</h1>
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, type, location"
          className="max-w-md bg-slate-900 border-slate-700 text-white"
        />
        <Button type="button" variant="secondary" onClick={() => refetch()}>
          Search
        </Button>
      </div>
      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-slate-400">
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
                <tr key={String(r._id)} className="border-t border-slate-800">
                  <td className="p-3 text-white">{String(r.name)}</td>
                  <td className="p-3 text-slate-400">
                    {Array.isArray(r.agencyTypes) ? (r.agencyTypes as string[]).join(", ") : "—"}
                  </td>
                  <td className="p-3 text-slate-400">{String(r.location || "—")}</td>
                  <td className="p-3 text-slate-400">{String(r.populationServed ?? "—")}</td>
                  <td className="p-3 text-slate-400">{String(r.matchCount ?? 0)}</td>
                  <td className="p-3 text-slate-400">{String(r.applicationCount ?? 0)}</td>
                  <td className="p-3">
                    <Link
                      href={`/admin/agencies/${r._id}`}
                      className="text-amber-400 hover:underline text-sm"
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
          <span className="text-slate-400 text-sm self-center">
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
