"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { qk } from "@/lib/queryKeys";

interface Funder {
  _id: string;
  name: string;
  missionStatement?: string;
  locationFocus?: string[];
  fundingCategories?: string[];
  agencyTypesFunded?: string[];
  avgGrantMin?: number;
  avgGrantMax?: number;
  deadline?: string;
  cyclesPerYear?: number;
  contactName?: string;
  contactEmail?: string;
  website?: string;
  notes?: string;
  isLocked?: boolean;
  currentApplicationCount?: number;
  maxApplicationsAllowed?: number;
  status: string;
}

const fmt = (n?: number) =>
  n != null ? "$" + n.toLocaleString() : "—";

const daysUntil = (d?: string) => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff;
};

export const Funders = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data, isLoading } = useQuery<{ data: Funder[] }>({
    queryKey: qk.funders(),
    queryFn: async () => {
      const res = await api.get("/funders", { params: { limit: 100 } });
      return res.data;
    },
  });

  const funders: Funder[] = (data?.data ?? []).filter((f) => {
    const matchSearch =
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.missionStatement?.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      !categoryFilter ||
      f.fundingCategories?.some((c) =>
        c.toLowerCase().includes(categoryFilter.toLowerCase())
      );
    return matchSearch && matchCat;
  });

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 pb-10 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl sm:text-3xl tracking-[0.5px] uppercase leading-tight">
            Funder Database
          </h1>
          <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-sm">
            Private library of grant funders curated for public safety agencies
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">
            {funders.length} funders
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 [font-family:'Montserrat',Helvetica] text-sm text-[#111827] placeholder:text-[#d1d5db] focus:border-[#ef3e34] focus:outline-none focus:ring-2 focus:ring-[#ef3e34]/20"
          placeholder="Search funders by name or mission..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className="w-full sm:w-56 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 [font-family:'Montserrat',Helvetica] text-sm text-[#111827] placeholder:text-[#d1d5db] focus:border-[#ef3e34] focus:outline-none focus:ring-2 focus:ring-[#ef3e34]/20"
          placeholder="Filter by category..."
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 rounded-xl bg-white animate-pulse border border-[#e5e7eb]" />
          ))}
        </div>
      ) : funders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="[font-family:'Montserrat',Helvetica] text-[#6b7280] text-base">No funders found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {funders.map((f) => {
            const days = daysUntil(f.deadline);
            const urgent = days != null && days <= 14 && days >= 0;
            return (
              <div
                key={f._id}
                className="flex flex-col gap-4 rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/funders/${f._id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-base leading-snug">
                    {f.name}
                  </h3>
                  {f.isLocked && (
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 [font-family:'Montserrat',Helvetica]">
                      LOCKED
                    </span>
                  )}
                </div>

                <p className="[font-family:'Montserrat',Helvetica] text-[#6b7280] text-sm leading-relaxed line-clamp-2">
                  {f.missionStatement || "No mission statement available."}
                </p>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">
                      Grant Range
                    </span>
                    <span className="[font-family:'Montserrat',Helvetica] text-sm font-bold text-[#111827]">
                      {fmt(f.avgGrantMin)} – {fmt(f.avgGrantMax)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">
                      Location
                    </span>
                    <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151]">
                      {f.locationFocus?.join(", ") || "—"}
                    </span>
                  </div>
                  {f.deadline && (
                    <div className="flex items-center justify-between">
                      <span className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af] uppercase tracking-wide font-semibold">
                        Deadline
                      </span>
                      <span
                        className={`[font-family:'Montserrat',Helvetica] text-sm font-semibold ${urgent ? "text-red-600" : "text-[#374151]"}`}
                      >
                        {new Date(f.deadline).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {urgent && ` (${days}d left)`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {f.fundingCategories?.slice(0, 3).map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs [font-family:'Montserrat',Helvetica] text-[#6b7280]"
                    >
                      {c}
                    </span>
                  ))}
                </div>

                <button
                  className="mt-auto w-full rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-semibold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/funders/${f._id}`);
                  }}
                >
                  View Details
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
