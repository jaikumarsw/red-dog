"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { AdminTableViewLink } from "@/components/admin/AdminTableViewLink";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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
};

type OutboxRow = {
  _id: string;
  recipient?: string;
  recipientName?: string;
  subject?: string;
  status?: "pending" | "sent" | "failed" | string;
  createdAt?: string;
  sentAt?: string;
  relatedAgency?: { _id: string; name?: string } | string | null;
  relatedGrant?: { _id: string; projectTitle?: string } | string | null;
};

type PriorityAgency = {
  _id: string;
  name: string;
  email?: string;
  priorityFlags?: {
    isLongTermNoWin?: boolean;
    daysSinceSignup?: number;
    applicationsSubmittedCount?: number;
    awardsWonCount?: number;
  };
};

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const res = await adminApi.get("admin/dashboard");
      return res.data.data as DashboardData;
    },
  });

  const { data: priorityAgencies } = useQuery({
    queryKey: ["admin", "agencies", "priority"],
    queryFn: async () => {
      const res = await adminApi.get("admin/agencies/priority");
      return (res.data.data || []) as PriorityAgency[];
    },
  });

  const { data: recentOutbox, isLoading: outboxLoading } = useQuery({
    queryKey: ["admin", "outbox", "recent"],
    queryFn: async () => {
      const res = await adminApi.get("outbox/admin/all", { params: { limit: 10 } });
      return (res.data.data || []) as OutboxRow[];
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-[#e5e7eb]" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg bg-[#e5e7eb]" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 rounded-lg bg-[#e5e7eb]" />
          <Skeleton className="h-80 rounded-lg bg-[#e5e7eb]" />
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
    <div className="max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Dashboard</h1>
      </div>
      <p className="text-sm text-[#6b7280]">
        Staff-only audit trail:{" "}
        <Link href="/admin/activity" className="font-medium text-[#ef3e34] hover:underline">
          Activity log
        </Link>
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280] [font-family:'Montserrat',Helvetica]">{c.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[#111827]">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#ef3e34] [font-family:'Montserrat',Helvetica]">
            Recent signups
          </h2>
          <ul className="space-y-3 text-sm">
            {data.recentSignups?.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-2 border-b border-[#f0f0f0] pb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#111827]">{r.name}</p>
                  <p className="text-xs text-[#6b7280]">
                    {(r.agencyTypes || []).join(", ")} · {r.location}
                  </p>
                  <p className="text-xs text-[#9ca3af]">
                    {r.signupDate ? new Date(r.signupDate).toLocaleString() : ""}
                  </p>
                </div>
                <AdminTableViewLink href={`/admin/agencies/${r.id}`} label="View agency" />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#ef3e34] [font-family:'Montserrat',Helvetica]">
            Recent Outbox
          </h2>
          <ul className="space-y-4 text-sm">
            {outboxLoading ? (
              <p className="text-[#6b7280]">Loading outbox…</p>
            ) : (recentOutbox || []).length === 0 ? (
              <p className="text-[#6b7280]">No outbound emails yet.</p>
            ) : (
              recentOutbox?.map((r) => {
                const agencyName = typeof r.relatedAgency === "object" ? r.relatedAgency?.name : "—";
                const appTitle = typeof r.relatedGrant === "object" ? r.relatedGrant?.projectTitle : null;
                const appId = typeof r.relatedGrant === "object" ? r.relatedGrant?._id : null;
                const status = (r.status || "pending").toLowerCase();
                const statusCls = status === "sent" ? "bg-green-100 text-green-700" : status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800";
                
                return (
                  <li key={r._id} className="flex items-start justify-between gap-3 border-b border-[#f0f0f0] pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#111827] truncate">{agencyName}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusCls}`}>
                          {status}
                        </span>
                      </div>
                      <p className="text-xs text-[#6b7280] truncate">
                        <span className="font-medium text-[#374151]">To:</span> {r.recipient}
                      </p>
                      {appTitle && (
                        <p className="text-xs text-[#6b7280] truncate">
                          <span className="font-medium text-[#374151]">App:</span>{" "}
                          <Link href={`/admin/applications/${appId}`} className="text-[#ef3e34] hover:underline">
                            {appTitle}
                          </Link>
                        </p>
                      )}
                      <p className="text-[10px] text-[#9ca3af]">
                        {r.status === "sent" && r.sentAt ? new Date(r.sentAt).toLocaleString() : new Date(r.createdAt || "").toLocaleString()}
                      </p>
                    </div>
                    <AdminTableViewLink href="/admin/outbox" label="View Outbox" />
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#ef3e34] [font-family:'Montserrat',Helvetica]">
          ⚠️ Priority Agencies
        </h2>
        <p className="mb-4 text-xs text-[#6b7280]">
          Agencies flagged as 60+ days on platform with no wins (and at least 3 submitted/reviewed applications).
        </p>

        {(priorityAgencies?.length || 0) === 0 ? (
          <p className="text-sm text-[#6b7280]">
            No priority agencies right now. All agencies are within their first 60 days or have won grants.
          </p>
        ) : (
          <ul className="divide-y divide-[#f0f0f0]">
            {(priorityAgencies || []).map((a) => (
              <li key={a._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/admin/agencies/${a._id}`} className="font-medium text-[#111827] hover:underline">
                    {a.name}
                  </Link>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    {a.priorityFlags?.daysSinceSignup ?? "—"} days since signup ·{" "}
                    {a.priorityFlags?.applicationsSubmittedCount ?? "—"} submitted ·{" "}
                    {a.priorityFlags?.awardsWonCount ?? 0} won
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb] w-full sm:w-auto"
                    asChild
                  >
                    <a
                      href={
                        a.email
                          ? `mailto:${a.email}?subject=${encodeURIComponent(`Re: ${a.name} — Grant award support`)}`
                          : `mailto:admin@reddogradios.com?subject=${encodeURIComponent(`Reach out: ${a.name}`)}`
                      }
                    >
                      Reach Out
                    </a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
