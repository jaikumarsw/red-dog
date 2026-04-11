"use client";

import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardData = {
  totalAgencies: number;
  totalOpportunities: number;
  totalApplications: number;
  totalFunders: number;
  awardsWon: number;
  applicationsSubmitted: number;
  recentSignups: {
    id: string;
    name: string;
    agencyTypes?: string[];
    location?: string;
    signupDate?: string;
  }[];
  recentApplications: {
    id: string;
    agencyName?: string;
    funderName?: string;
    status: string;
    updatedAt?: string;
  }[];
  topMatchesGlobal: {
    agencyName?: string;
    funderName?: string;
    score: number;
    tier: string;
  }[];
};

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const res = await adminApi.get("admin/dashboard");
      return res.data.data as DashboardData;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-slate-800" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 bg-slate-800 rounded-lg" />
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-80 bg-slate-800 rounded-lg" />
          <Skeleton className="h-80 bg-slate-800 rounded-lg" />
          <Skeleton className="h-80 bg-slate-800 rounded-lg" />
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Agencies", value: data.totalAgencies },
    { label: "Opportunities", value: data.totalOpportunities },
    { label: "Applications", value: data.totalApplications },
    { label: "Funders", value: data.totalFunders },
    { label: "Awards won", value: data.awardsWon },
    { label: "Submitted", value: data.applicationsSubmitted },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{c.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold text-amber-400 mb-3">Recent signups</h2>
          <ul className="space-y-3 text-sm">
            {data.recentSignups?.map((r) => (
              <li key={r.id} className="border-b border-slate-800 pb-2">
                <p className="text-white font-medium">{r.name}</p>
                <p className="text-slate-500 text-xs">
                  {(r.agencyTypes || []).join(", ")} · {r.location}
                </p>
                <p className="text-slate-600 text-xs">
                  {r.signupDate ? new Date(r.signupDate).toLocaleString() : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold text-amber-400 mb-3">Recent applications</h2>
          <ul className="space-y-3 text-sm">
            {data.recentApplications?.map((r) => (
              <li key={r.id} className="border-b border-slate-800 pb-2">
                <p className="text-white">{r.agencyName}</p>
                <p className="text-slate-400">{r.funderName}</p>
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-200">
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold text-amber-400 mb-3">Top matches</h2>
          <ul className="space-y-3 text-sm">
            {data.topMatchesGlobal?.map((m, i) => (
              <li key={i} className="border-b border-slate-800 pb-2">
                <p className="text-white">{m.agencyName}</p>
                <p className="text-slate-400">{m.funderName}</p>
                <span
                  className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-semibold ${
                    m.score >= 80
                      ? "bg-emerald-900/50 text-emerald-300"
                      : m.score >= 65
                        ? "bg-amber-900/50 text-amber-200"
                        : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {m.score}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
