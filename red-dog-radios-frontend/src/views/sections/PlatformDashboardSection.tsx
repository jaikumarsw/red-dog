"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RefreshCw } from "lucide-react";

const statCards = [
  { icon: "/figmaAssets/overlay-3.svg", label: "Total Organizations", value: "4", valueColor: "text-[#50a2ff]", path: "/organizations" },
  { icon: "/figmaAssets/overlay-1.svg", label: "Active Opportunities", value: "5", valueColor: "text-[#00d491]", path: "/opportunities" },
  { icon: "/figmaAssets/overlay-5.svg", label: "High-Fit Matches", value: "14", valueColor: "text-[#feb900]", path: "/matches" },
  { icon: "/figmaAssets/overlay.svg", label: "Pending Outbox", value: "2", valueColor: "text-[#c17aff]", path: "/outbox" },
  { icon: "/figmaAssets/overlay-2.svg", label: "Applications Sent", value: "3", valueColor: "text-[#ef3e34]", path: "/applications" },
  { icon: "/figmaAssets/overlay-4.svg", label: "Active Alerts", value: "3", valueColor: "text-[#ff6366]", path: "/alerts" },
];

const attentionItems = [
  {
    priority: "MEDIUM",
    priorityBg: "bg-[#fd99001a]",
    priorityBorder: "border-[#fd990033]",
    priorityTextColor: "text-[#ffb900]",
    title: "Deadline approaching: Healthcare Access Expansion Grant",
    description: "Robert Wood Johnson Foundation grant closes in 4 days",
    dueDate: "Due: Apr 1, 2026",
    dueDateIcon: "/figmaAssets/svg.svg",
  },
  {
    priority: "HIGH",
    priorityBg: "bg-[#ef3e341a]",
    priorityBorder: "border-[#ef3e3433]",
    priorityTextColor: "text-[#ff6366]",
    title: "Deadline approaching: Workforce Development Initiative",
    description: "JP Morgan Chase Foundation grant closes in 2 days",
    dueDate: "Due: Mar 30, 2026",
    dueDateIcon: "/figmaAssets/svg-10.svg",
  },
  {
    priority: "HIGH",
    priorityBg: "bg-[#ef3e341a]",
    priorityBorder: "border-[#ef3e3433]",
    priorityTextColor: "text-[#ff6366]",
    title: "High-fit match: Digital Equity Community Fund",
    description: "Fit score 94% — awaiting review",
    dueDate: null,
    dueDateIcon: null,
  },
  {
    priority: "HIGH",
    priorityBg: "bg-[#ef3e341a]",
    priorityBorder: "border-[#ef3e3433]",
    priorityTextColor: "text-[#ff6366]",
    title: "High-fit match: Community Media Innovation Grant",
    description: "Fit score 89% — awaiting review",
    dueDate: null,
    dueDateIcon: null,
  },
];

const systemJobs = [
  { name: "Nightly Match Refresh", started: "2026-03-26 12:00 AM", duration: "4m 32s", status: "COMPLETED", statusBg: "bg-green-50", statusBorder: "border-[#b8f7cf]", statusDotColor: "bg-[#00d491]", statusTextColor: "text-[#00d491]" },
  { name: "Weekly Digest Generation", started: "2026-03-26 8:00 AM", duration: null, status: "RUNNING", statusBg: "bg-[#eef5fe]", statusBorder: "border-[#bddaff]", statusDotColor: "bg-[#2b7fff]", statusTextColor: "text-[#1347e5]" },
  { name: "Email Outbox Send", started: "2026-03-26 8:30 AM", duration: "1m 12s", status: "COMPLETED", statusBg: "bg-green-50", statusBorder: "border-[#b8f7cf]", statusDotColor: "bg-[#00d491]", statusTextColor: "text-[#00d491]" },
  { name: "Grant Ingestion", started: "2026-03-26 9:00 AM", duration: null, status: "QUEUED", statusBg: "bg-[#f0f4f9]", statusBorder: "border-[#e1e8f0]", statusDotColor: "bg-[#90a1b8]", statusTextColor: "text-[#45556c]" },
];

export const PlatformDashboardSection = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

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

        {/* Stat Cards Grid — 1 col on narrow phones, 2 from sm, 3 from xl */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6 self-stretch w-full">
          {statCards.map((card, index) => (
            <Card
              key={index}
              data-testid={`card-stat-${index}`}
              onClick={() => router.push(card.path)}
              className="flex min-w-0 items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-white rounded-xl border border-solid border-[#0000001a] shadow-none cursor-pointer hover:shadow-md hover:border-[#ef3e3433] transition-all"
            >
              <CardContent className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 p-0 w-full">
                <img className="w-10 h-10 sm:w-12 sm:h-12 xl:w-14 xl:h-14 flex-shrink-0" alt={card.label} src={card.icon} />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  <span className="[font-family:'Montserrat',Helvetica] font-medium text-black text-xs sm:text-sm tracking-[0] leading-snug sm:leading-5 break-words">
                    {card.label}
                  </span>
                  <span className={`[font-family:'Oswald',Helvetica] font-bold ${card.valueColor} text-2xl sm:text-3xl tracking-[-0.75px] leading-tight sm:leading-9 tabular-nums`}>
                    {card.value}
                  </span>
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
              {attentionItems.map((item, index) => (
                <div key={index} className="flex items-start justify-between gap-3 p-4 sm:p-5 self-stretch w-full border-b border-[#0000000d]">
                  <div className="flex min-w-0 flex-col items-start gap-1">
                    <div className="flex flex-col items-start gap-2 self-stretch w-full sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 ${item.priorityBg} rounded-full border border-solid ${item.priorityBorder} flex-shrink-0`}>
                        <span className={`[font-family:'Montserrat',Helvetica] font-semibold ${item.priorityTextColor} text-xs tracking-[0] leading-4 whitespace-nowrap`}>
                          {item.priority}
                        </span>
                      </span>
                      <span className="min-w-0 [font-family:'Montserrat',Helvetica] font-semibold text-black text-sm sm:text-base tracking-[0] leading-snug sm:leading-6 break-words">
                        {item.title}
                      </span>
                    </div>
                    <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#666666] text-xs sm:text-sm tracking-[0] leading-5">
                      {item.description}
                    </span>
                    {item.dueDate && (
                      <div className="flex items-center gap-1.5 pt-[3.5px]">
                        <img className="w-3 h-3" alt="Due date" src={item.dueDateIcon!} />
                        <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#a5a5a5] text-xs tracking-[0] leading-4 whitespace-nowrap">
                          {item.dueDate}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
              {systemJobs.map((job, index) => (
                <div key={index} className="self-stretch w-full">
                  <div className="flex items-start justify-between pb-4 self-stretch w-full gap-2">
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      <span className="[font-family:'Montserrat',Helvetica] font-semibold text-black text-sm tracking-[0] leading-snug break-words">
                        {job.name}
                      </span>
                      <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#666666] text-xs tracking-[0] leading-4 break-words">
                        Started: {job.started}
                      </span>
                      {job.duration && (
                        <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#666666] text-xs tracking-[0] leading-4">
                          Duration: {job.duration}
                        </span>
                      )}
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 ${job.statusBg} rounded-full border border-solid ${job.statusBorder} flex-shrink-0`}>
                      <div className={`w-1.5 h-1.5 ${job.statusDotColor} rounded-full`} />
                      <span className={`[font-family:'Montserrat',Helvetica] font-bold ${job.statusTextColor} text-[10px] tracking-[0] leading-4 whitespace-nowrap`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                  {index < systemJobs.length - 1 && <Separator className="bg-[#e0e0e0]" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
