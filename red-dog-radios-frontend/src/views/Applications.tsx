"use client";

import type { ElementType } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FileText, Award, Clock, Eye, Pencil, CalendarClock, RefreshCw } from "lucide-react";
import { MobileFilterSelect } from "@/components/MobileFilterSelect";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { qk } from "@/lib/queryKeys";

type AppItem = {
  id: string;
  grant: string;
  funder: string;
  amount: string;
  org: string;
  appliedDate: string;
  category: string;
  status: string;
  ashleenMsg: string;
  deadline?: string;
  fitScore?: number;
  pipelineStage?: string;
  emailsSent?: number;
};

type ApiFunderRef = string | { _id?: string; name?: string; avgGrantMax?: number; deadline?: string } | null;

type ApiApp = {
  _id: string;
  projectTitle?: string;
  title?: string;
  grant?: string;
  opportunity?: {
    title?: string;
    funder?: string;
    maxAmount?: number;
    category?: string;
    deadline?: string;
  };
  funder?: ApiFunderRef;
  amount?: number;
  amountRequested?: number;
  organization?: { name?: string };
  orgName?: string;
  submittedAt?: string;
  appliedDate?: string;
  createdAt?: string;
  category?: string;
  status?: string;
  notes?: string;
  deadline?: string;
  fitScore?: number;
  pipelineStage?: string;
  emailsSent?: number;
};

const ashleenMsgFor = (status: string): string => {
  switch (status) {
    case "under-review":
    case "in_review":
      return "We're in the running! This funder typically takes 8-12 weeks to review. I'll alert you the moment there's news.";
    case "awarded":
      return "Congratulations! This is a well-deserved win. Your narrative around community impact was exactly what the funder was looking for. Let's use this momentum for the next application!";
    case "submitted":
      return "Application submitted successfully! I'll monitor for any updates from the funder and keep you informed.";
    case "drafting":
      return "I've started drafting this application based on your organization profile. Review and let me know if you'd like any changes.";
    case "declined":
      return "This one didn't go through, but don't worry — I've analyzed the feedback and found similar grants opening next quarter that are a stronger fit.";
    case "rejected":
      return "This application was rejected. I’ve captured the staff notes so we can adjust and improve for the next submission.";
    default:
      return "I'm monitoring this application and will alert you to any developments.";
  }
};

const fmtDate = (s: string | undefined) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
};

const fmtAmount = (n: number | undefined) => {
  if (!n) return "—";
  return n >= 1000 ? `$${(n / 1000).toFixed(0)},000` : `$${n}`;
};

const resolveFunderName = (f: ApiFunderRef): string => {
  if (!f) return "—";
  if (typeof f === "string") return f || "—";
  return f.name || "—";
};

const isDeadlineSoon = (deadline: string | undefined) => {
  if (!deadline) return false;
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return daysLeft >= 0 && daysLeft <= 14;
};

const mapApp = (a: ApiApp): AppItem => ({
  id: a._id,
  grant: a.projectTitle ?? a.opportunity?.title ?? a.title ?? a.grant ?? "Unknown Grant",
  funder: a.opportunity?.funder ?? resolveFunderName(a.funder ?? null),
  amount: a.amountRequested
    ? fmtAmount(a.amountRequested)
    : a.amount
    ? fmtAmount(a.amount)
    : a.opportunity?.maxAmount
    ? fmtAmount(a.opportunity.maxAmount)
    : "—",
  org: a.orgName ?? a.organization?.name ?? "—",
  appliedDate: fmtDate(a.submittedAt ?? a.appliedDate ?? a.createdAt),
  category: a.opportunity?.category ?? a.category ?? "—",
  status: a.status ?? "submitted",
  ashleenMsg: a.notes ?? ashleenMsgFor(a.status ?? "submitted"),
  deadline: a.opportunity?.deadline ?? a.deadline,
  fitScore: a.fitScore,
  pipelineStage: a.pipelineStage,
  emailsSent: undefined, // populated below if available
});

const statusConfig: Record<string, {
  label: string;
  badgeCls: string;
  iconBg: string;
  Icon: ElementType;
  iconCls: string;
  msgBg: string;
}> = {
  "under-review": {
    label: "Under Review",
    badgeCls: "bg-[#fef9c3] text-[#b45309]",
    iconBg: "bg-[#fff7ed]",
    Icon: Clock,
    iconCls: "text-[#f59e0b]",
    msgBg: "bg-[#eff6ff] border-[#dbeafe]",
  },
  "in_review": {
    label: "Under Review",
    badgeCls: "bg-[#fef9c3] text-[#b45309]",
    iconBg: "bg-[#fff7ed]",
    Icon: Clock,
    iconCls: "text-[#f59e0b]",
    msgBg: "bg-[#eff6ff] border-[#dbeafe]",
  },
  "awarded": {
    label: "Awarded",
    badgeCls: "bg-[#dcfce7] text-[#16a34a]",
    iconBg: "bg-[#f0fdf4]",
    Icon: Award,
    iconCls: "text-[#16a34a]",
    msgBg: "bg-[#f0fdf4] border-[#bbf7d0]",
  },
  "submitted": {
    label: "Submitted",
    badgeCls: "bg-[#dbeafe] text-[#1d4ed8]",
    iconBg: "bg-[#eff6ff]",
    Icon: FileText,
    iconCls: "text-[#3b82f6]",
    msgBg: "bg-[#f8fafc] border-[#e2e8f0]",
  },
  "drafting": {
    label: "Drafting",
    badgeCls: "bg-[#f3f4f6] text-[#6b7280]",
    iconBg: "bg-[#f3f4f6]",
    Icon: Pencil,
    iconCls: "text-[#9ca3af]",
    msgBg: "bg-[#f8fafc] border-[#e2e8f0]",
  },
  "declined": {
    label: "Declined",
    badgeCls: "bg-[#fee2e2] text-[#dc2626]",
    iconBg: "bg-[#fff1f0]",
    Icon: CalendarClock,
    iconCls: "text-[#ef4444]",
    msgBg: "bg-[#fff1f0] border-[#fecaca]",
  },
  "rejected": {
    label: "Rejected",
    badgeCls: "bg-[#fee2e2] text-[#dc2626]",
    iconBg: "bg-[#fff1f0]",
    Icon: CalendarClock,
    iconCls: "text-[#ef4444]",
    msgBg: "bg-[#fff1f0] border-[#fecaca]",
  },
  "waiting_on_information": {
    label: "Waiting on Info",
    badgeCls: "bg-[#fef9c3] text-[#b45309]",
    iconBg: "bg-[#fff7ed]",
    Icon: Clock,
    iconCls: "text-[#f59e0b]",
    msgBg: "bg-[#eff6ff] border-[#dbeafe]",
  },
};

const defaultCfg = {
  label: "Submitted",
  badgeCls: "bg-[#dbeafe] text-[#1d4ed8]",
  iconBg: "bg-[#eff6ff]",
  Icon: FileText,
  iconCls: "text-[#3b82f6]",
  msgBg: "bg-[#f8fafc] border-[#e2e8f0]",
};

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "In Progress", values: ["drafting", "draft", "not_started", "ready_to_submit"] },
  { label: "Submitted", values: ["submitted"] },
  { label: "Under Review", values: ["in_review", "under_review"] },
  { label: "Waiting on Info", values: ["waiting_on_information"] },
  { label: "Awarded", values: ["awarded"] },
  { label: "Declined", values: ["declined", "denied", "rejected"] },
  { label: "Withdrawn", values: ["withdrawn"] },
];



const AppCard = ({ app }: { app: AppItem }) => {
  const cfg = statusConfig[app.status] ?? defaultCfg;
  const router = useRouter();
  const { toast } = useToast();
  // useQueryClient removed as it's no longer needed in AppCard


  return (
    <div className="bg-white rounded-xl border border-[#f0f0f0] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
            <cfg.Icon size={20} className={cfg.iconCls} />
          </div>
          <div className="min-w-0 flex flex-col gap-1">
            <p className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm sm:text-base leading-snug break-words">{app.grant}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">{app.funder}</span>
              <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-xs">{app.amount}</span>
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 [font-family:'Montserrat',Helvetica] text-xs font-semibold flex-shrink-0 ${cfg.badgeCls}`}>
          {cfg.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs [font-family:'Montserrat',Helvetica]">
        <span className="text-[#9ca3af]">Org: <span className="text-[#374151] font-medium">{app.org}</span></span>
        <span className="text-[#9ca3af]">Category: <span className="text-[#374151] font-medium">{app.category}</span></span>
        <span className="text-[#9ca3af]">Applied: <span className="text-[#374151] font-medium">{app.appliedDate}</span></span>

        {/* Deadline */}
        {(app.deadline) && (
          <span className="text-[#9ca3af]">
            Deadline:{" "}
            <span className={isDeadlineSoon(app.deadline) ? "text-red-600 font-medium" : "text-[#374151] font-medium"}>
              {fmtDate(app.deadline)}
            </span>
          </span>
        )}

        {/* Fit Score */}
        {app.fitScore && (
          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
            {app.fitScore}% match
          </span>
        )}

        {/* Outreach Sent */}
        {app.pipelineStage === "outreach_sent" && (
          <div className="flex items-center gap-2">
            <span className="text-green-600 flex items-center gap-1 font-medium">
              <span className="text-sm">✉</span> Outreach sent
            </span>
            <button
              onClick={() => router.push("/outbox")}
              className="text-xs text-blue-600 hover:underline"
            >
              View outbox →
            </button>
          </div>
        )}
      </div>

      <div className={`flex items-start gap-2.5 rounded-xl border ${cfg.msgBg} px-3 py-2.5 sm:px-4 sm:py-3`}>
        <div className="w-6 h-6 rounded-full bg-[#ef3e34] flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="[font-family:'Montserrat',Helvetica] font-bold text-white text-[10px]">A</span>
        </div>
        <p className="min-w-0 flex-1 [font-family:'Montserrat',Helvetica] font-normal text-[#374151] text-xs leading-5 pt-0.5 break-words">
          {app.ashleenMsg}
        </p>
      </div>

      <div className="flex flex-wrap items-center pt-1 border-t border-[#f3f4f6]">
        <button
          onClick={() => router.push(`/applications/${app.id}`)}
          className="flex items-center gap-1.5 [font-family:'Montserrat',Helvetica] font-medium text-xs text-[#6b7280] hover:text-[#374151] transition-colors"
        >
          <Eye size={14} />
          View
        </button>
      </div>
    </div>
  );
};

export const Applications = () => {
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: rawApps = [], isLoading: loading, refetch, isFetching } = useQuery<AppItem[]>({
    queryKey: qk.applications(),
    queryFn: async () => {
      const res = await api.get("/applications", { params: { limit: 100 } });
      const raw: ApiApp[] = res.data.data ?? [];
      return raw.map(mapApp);
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  const apps = rawApps;

  const filtered = apps.filter((a) => {
    if (activeFilter === "all") return true;
    const tab = STATUS_TABS.find((t) => t.value === activeFilter);
    if (tab && tab.values) return tab.values.includes(a.status);
    return a.status === activeFilter;
  });

  // Total Drafting — applications being worked on
  const totalDrafting = apps.filter((a) => ["drafting", "draft", "not_started", "ready_to_submit"].includes(a.status)).length;

  // Total Submitted — applications sent to funders
  const totalSubmitted = apps.filter((a) =>
    ["submitted", "in_review", "under_review", "waiting_on_information", "approved", "awarded", "rejected", "denied", "declined"].includes(a.status)
  ).length;

  // Awarded — won grants
  const totalAwarded = apps.filter((a) => a.status === "awarded").length;

  const stats = [
    { label: "In Progress", value: totalDrafting, Icon: FileText, iconBg: "bg-[#eff6ff]", iconCls: "text-[#3b82f6]", valueCls: "text-[#3b82f6]" },
    { label: "Submitted", value: totalSubmitted, Icon: Clock, iconBg: "bg-[#fff7ed]", iconCls: "text-[#f59e0b]", valueCls: "text-[#f59e0b]" },
    { label: "Awarded", value: totalAwarded, Icon: Award, iconBg: "bg-[#f0fdf4]", iconCls: "text-[#16a34a]", valueCls: "text-[#16a34a]" },
  ];

  return (
    <div className="flex h-full min-w-0 flex-col gap-5 bg-neutral-50 p-4 sm:p-6">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl min-[400px]:text-3xl tracking-[0.5px] uppercase leading-tight break-words">
            Applications
          </h1>
          <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-sm max-w-prose break-words">
            Track all grant applications and outcomes
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#6b7280] hover:border-[#ef3e34]/40 hover:text-[#ef3e34] transition-colors disabled:opacity-50"
          title="Refresh applications"
        >
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#f0f0f0] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-4 sm:p-5 flex min-w-0 items-center gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
              <s.Icon size={20} className={s.iconCls} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={`[font-family:'Oswald',Helvetica] font-bold text-xl tabular-nums sm:text-2xl leading-tight ${s.valueCls}`}>
                {loading ? "—" : s.value}
              </span>
              <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs leading-snug break-words">
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="min-w-0 flex-1 md:flex-initial">
          <MobileFilterSelect
            ariaLabel="Filter applications by status"
            label="Status"
            value={activeFilter}
            onChange={setActiveFilter}
            options={STATUS_TABS.map((t) => ({ value: t.value || (t as any).value, label: t.label }))}
            dataTestId="select-filter-applications"
          />
          <div className="hidden flex-wrap items-center gap-1.5 md:flex">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value || (t as any).value}
                type="button"
                onClick={() => setActiveFilter(t.value || (t as any).value)}
                data-testid={`tab-${t.value || (t as any).value}`}
                className={`h-8 rounded-lg px-4 [font-family:'Montserrat',Helvetica] text-sm font-semibold transition-all ${
                  activeFilter === (t.value || (t as any).value)
                    ? "bg-[#ef3e34] text-white"
                    : "border border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#ef3e34]/40"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <span className="[font-family:'Montserrat',Helvetica] text-sm font-normal text-[#9ca3af] md:flex-shrink-0 md:text-right">
          {loading ? "..." : `${filtered.length} results`}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#9ca3af]">Loading applications...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#9ca3af]">No applications found</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
