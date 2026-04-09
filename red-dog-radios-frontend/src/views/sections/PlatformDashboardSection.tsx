"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

type StatCards = {
  totalOrganizations: number;
  activeOpportunities: number;
  highFitMatches: number;
  pendingOutbox: number;
  applicationsSent: number;
  activeAlerts: number;
};

type AttentionItem = {
  type: string;
  priority: string;
  orgName: string;
  grantName: string;
  description: string;
  date: string | null;
};

type SystemJob = {
  name: string;
  status: string;
  lastRun: string | null;
  nextRun: string | null;
  duration: string | null;
};

type DashboardStats = StatCards & {
  systemJobs: SystemJob[];
  attentionItems: AttentionItem[];
};

const statCardConfig = [
  { key: "totalOrganizations" as keyof StatCards, icon: "/figmaAssets/overlay-3.svg", label: "Total Organizations", valueColor: "text-[#50a2ff]", path: "/organizations" },
  { key: "activeOpportunities" as keyof StatCards, icon: "/figmaAssets/overlay-1.svg", label: "Active Opportunities", valueColor: "text-[#00d491]", path: "/opportunities" },
  { key: "highFitMatches" as keyof StatCards, icon: "/figmaAssets/overlay-5.svg", label: "High-Fit Matches", valueColor: "text-[#feb900]", path: "/matches" },
  { key: "pendingOutbox" as keyof StatCards, icon: "/figmaAssets/overlay.svg", label: "Pending Outbox", valueColor: "text-[#c17aff]", path: "/outbox" },
  { key: "applicationsSent" as keyof StatCards, icon: "/figmaAssets/overlay-2.svg", label: "Applications Sent", valueColor: "text-[#ef3e34]", path: "/applications" },
  { key: "activeAlerts" as keyof StatCards, icon: "/figmaAssets/overlay-4.svg", label: "Active Alerts", valueColor: "text-[#ff6366]", path: "/alerts" },
];

const priorityStyle = (priority: string) => {
  const p = priority.toUpperCase();
  if (p === "HIGH") return { bg: "bg-[#ef3e341a]", border: "border-[#ef3e3433]", text: "text-[#ff6366]" };
  if (p === "MEDIUM") return { bg: "bg-[#fd99001a]", border: "border-[#fd990033]", text: "text-[#ffb900]" };
  return { bg: "bg-[#f3f4f6]", border: "border-[#e5e7eb]", text: "text-[#6b7280]" };
};

const jobStatusStyle = (status: string) => {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return { bg: "bg-green-50", border: "border-[#b8f7cf]", dot: "bg-[#00d491]", text: "text-[#00d491]" };
  if (s === "RUNNING") return { bg: "bg-[#eef5fe]", border: "border-[#bddaff]", dot: "bg-[#2b7fff]", text: "text-[#1347e5]" };
  return { bg: "bg-[#f0f4f9]", border: "border-[#e1e8f0]", dot: "bg-[#90a1b8]", text: "text-[#45556c]" };
};

const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-[#f3f4f6] rounded ${className ?? ""}`} />
);

export const PlatformDashboardSection = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const fetchStats = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get("/dashboard/stats");
      setStats(res.data.data as DashboardStats);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    await fetchStats();
    setTimeout(() => setRefreshing(false), 600);
  };

  const statValues: StatCards = {
    totalOrganizations: stats?.totalOrganizations ?? 0,
    activeOpportunities: stats?.activeOpportunities ?? 0,
    highFitMatches: stats?.highFitMatches ?? 0,
    pendingOutbox: stats?.pendingOutbox ?? 0,
    applicationsSent: stats?.applicationsSent ?? 0,
    activeAlerts: stats?.activeAlerts ?? 0,
  };

  const attentionItems = stats?.attentionItems ?? [];
  const systemJobs = stats?.systemJobs ?? [];

  return (
    <div className="flex w-full flex-1 flex-col items-start overflow-y-auto px-4 pb-0 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <div className="flex w-full flex-1 flex-col items-start gap-6 self-stretch sm:gap-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between self-stretch w-full gap-4">
          <div className="flex min-w-0 flex-col items-start gap-1">
            <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-xl min-[400px]:text-2xl sm:text-3xl tracking-[-0.75px] leading-tight sm:leading-9 break-words">
              PLATFORM DASHBOARD
            </h1>
            <p className="[font-family:'Montserrat',Helvetica] font-normal text-black text-sm tracking-[0] leading-5 max-w-prose break-words">
              Real-time intelligence on grants and organization matches.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center sm:gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/weekly-summary")}
              data-testid="button-view-weekly-summary"
              className="h-10 min-h-10 flex-1 gap-2 px-3 sm:flex-initial sm:px-4 py-2 bg-white border border-solid border-[#ef3e34] text-[#ef3e34] hover:bg-[#ef3e341a] [font-family:'Montserrat',Helvetica] font-medium text-sm"
            >
              <img className="w-4 h-4" alt="Weekly" src="/figmaAssets/svg-3.svg" />
              <span className="hidden sm:inline [font-family:'Montserrat',Helvetica] font-medium text-[#ef3e34] text-sm leading-5 whitespace-nowrap">
                View Weekly Summary
              </span>
              <span className="sm:hidden [font-family:'Montserrat',Helvetica] font-medium text-[#ef3e34] text-sm">
                Summary
              </span>
            </Button>

            <Button
              onClick={handleRefresh}
              data-testid="button-refresh"
              disabled={refreshing}
              className="h-10 min-h-10 flex-1 gap-2 px-3 sm:flex-initial sm:px-4 py-2 bg-[#ef3e34] hover:bg-[#d63530] rounded-md [font-family:'Montserrat',Helvetica] font-bold text-white text-sm"
            >
              <RefreshCw size={16} className={`${refreshing ? "animate-spin" : ""}`} />
              <span className="[font-family:'Montserrat',Helvetica] font-bold text-white text-sm leading-5 whitespace-nowrap">
                {refreshing ? "Refreshing..." : "Refresh"}
              </span>
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex w-full items-center gap-3 rounded-xl border border-[#fecaca] bg-[#fff1f0] px-4 py-3">
            <AlertTriangle size={16} className="shrink-0 text-[#dc2626]" />
            <span className="min-w-0 flex-1 [font-family:'Montserrat',Helvetica] text-sm font-normal text-[#dc2626]">
              Failed to load dashboard data.
            </span>
            <button
              onClick={() => void handleRefresh()}
              className="shrink-0 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#dc2626] hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6 self-stretch w-full">
          {statCardConfig.map((card, index) => (
            <Card
              key={index}
              data-testid={`card-stat-${index}`}
              onClick={() => !loading && router.push(card.path)}
              className="flex min-w-0 items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-white rounded-xl border border-solid border-[#0000001a] shadow-none cursor-pointer hover:shadow-md hover:border-[#ef3e3433] transition-all"
            >
              <CardContent className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 p-0 w-full">
                <img className="w-10 h-10 sm:w-12 sm:h-12 xl:w-14 xl:h-14 flex-shrink-0" alt={card.label} src={card.icon} />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  <span className="[font-family:'Montserrat',Helvetica] font-medium text-black text-xs sm:text-sm tracking-[0] leading-snug sm:leading-5 break-words">
                    {card.label}
                  </span>
                  {loading ? (
                    <SkeletonBox className="h-8 w-12 mt-1" />
                  ) : (
                    <span className={`[font-family:'Oswald',Helvetica] font-bold ${card.valueColor} text-2xl sm:text-3xl tracking-[-0.75px] leading-tight sm:leading-9 tabular-nums`}>
                      {statValues[card.key]}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 self-stretch w-full pb-8">
          {/* Needs Attention */}
          <Card className="lg:col-span-2 flex flex-col items-start rounded-xl overflow-hidden border border-solid border-[#0000001a] shadow-none bg-white">
            <CardHeader className="flex flex-row items-center p-4 sm:p-6 self-stretch w-full bg-white border-b border-[#0000000d] space-y-0">
              <div className="inline-flex min-w-0 items-center gap-2">
                <img className="w-5 h-5 flex-shrink-0" alt="Needs Attention" src="/figmaAssets/svg-13.svg" />
                <span className="[font-family:'Oswald',Helvetica] font-semibold text-black text-base sm:text-lg tracking-[-0.45px] leading-snug sm:leading-7 break-words">
                  NEEDS ATTENTION
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-start self-stretch w-full p-0 bg-white">
              {loading ? (
                <div className="flex flex-col gap-0 w-full">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 p-4 sm:p-5 border-b border-[#0000000d]">
                      <div className="flex flex-col gap-2 w-full">
                        <SkeletonBox className="h-4 w-24" />
                        <SkeletonBox className="h-4 w-full" />
                        <SkeletonBox className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : attentionItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 w-full">
                  <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-sm">No attention items</p>
                </div>
              ) : (
                attentionItems.map((item, index) => {
                  const ps = priorityStyle(item.priority);
                  return (
                    <div key={index} className="flex items-start justify-between gap-3 p-4 sm:p-5 self-stretch w-full border-b border-[#0000000d]">
                      <div className="flex min-w-0 flex-col items-start gap-1">
                        <div className="flex flex-col items-start gap-2 self-stretch w-full sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 ${ps.bg} rounded-full border border-solid ${ps.border} flex-shrink-0`}>
                            <span className={`[font-family:'Montserrat',Helvetica] font-semibold ${ps.text} text-xs tracking-[0] leading-4 whitespace-nowrap`}>
                              {item.priority.toUpperCase()}
                            </span>
                          </span>
                          <span className="min-w-0 [font-family:'Montserrat',Helvetica] font-semibold text-black text-sm sm:text-base tracking-[0] leading-snug sm:leading-6 break-words">
                            {item.grantName}
                          </span>
                        </div>
                        <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#666666] text-xs sm:text-sm tracking-[0] leading-5">
                          {item.description}
                        </span>
                        {item.date && (
                          <div className="flex items-center gap-1.5 pt-[3.5px]">
                            <img className="w-3 h-3" alt="Due date" src="/figmaAssets/svg.svg" />
                            <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#a5a5a5] text-xs tracking-[0] leading-4 whitespace-nowrap">
                              {item.date}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* System Jobs */}
          <Card className="lg:col-span-1 flex flex-col items-start rounded-xl overflow-hidden border border-solid border-[#0000001a] shadow-none bg-white lg:self-start">
            <CardHeader className="flex flex-row items-center p-4 sm:p-6 self-stretch w-full bg-white border-b border-[#0000000d] space-y-0">
              <div className="flex min-w-0 items-center gap-2 self-stretch w-full">
                <img className="w-5 h-5 flex-shrink-0" alt="System Jobs" src="/figmaAssets/svg-2.svg" />
                <span className="[font-family:'Oswald',Helvetica] font-semibold text-black text-base sm:text-lg tracking-[-0.45px] leading-snug sm:leading-7 break-words">
                  SYSTEM JOBS
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4 p-4 sm:p-5 self-stretch w-full bg-white">
              {loading ? (
                <div className="flex flex-col gap-4 w-full">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex flex-col gap-2 w-full">
                      <SkeletonBox className="h-4 w-32" />
                      <SkeletonBox className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              ) : systemJobs.length === 0 ? (
                <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-sm">No jobs scheduled</p>
              ) : (
                systemJobs.map((job, index) => {
                  const js = jobStatusStyle(job.status);
                  return (
                    <div key={index} className="self-stretch w-full">
                      <div className="flex items-start justify-between pb-4 self-stretch w-full gap-2">
                        <div className="flex min-w-0 flex-col items-start gap-1">
                          <span className="[font-family:'Montserrat',Helvetica] font-semibold text-black text-sm tracking-[0] leading-snug break-words">
                            {job.name}
                          </span>
                          {job.lastRun ? (
                            <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#666666] text-xs tracking-[0] leading-4 break-words">
                              Last run: {job.lastRun}
                            </span>
                          ) : job.nextRun ? (
                            <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#666666] text-xs tracking-[0] leading-4 break-words">
                              Next: {job.nextRun}
                            </span>
                          ) : (
                            <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs tracking-[0] leading-4">
                              Not yet run
                            </span>
                          )}
                          {job.duration && (
                            <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#666666] text-xs tracking-[0] leading-4">
                              Duration: {job.duration}
                            </span>
                          )}
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 ${js.bg} rounded-full border border-solid ${js.border} flex-shrink-0`}>
                          <div className={`w-1.5 h-1.5 ${js.dot} rounded-full`} />
                          <span className={`[font-family:'Montserrat',Helvetica] font-bold ${js.text} text-[10px] tracking-[0] leading-4 whitespace-nowrap`}>
                            {job.status}
                          </span>
                        </div>
                      </div>
                      {index < systemJobs.length - 1 && <Separator className="bg-[#e0e0e0]" />}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
