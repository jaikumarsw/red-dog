"use client";

import { useState } from "react";
import { FileText, Eye, Calendar, Zap, Mail } from "lucide-react";

/* ── Mock data ─────────────────────────────────────────── */
const digests = [
  {
    id: 1,
    org: "Red Dog Radio",
    dateRange: "Mar 17 – Mar 23, 2026",
    matches: 3,
    status: "sent",
    previewTitle: "RED DOG RADIO GRANT INTELLIGENCE",
    previewSubtitle: "Weekly Digest for Red Dog Radio",
    aiIntro:
      "AI-powered introduction: This week we identified several high-fit grant opportunities tailored to your organization's mission and focus areas.",
    opportunities: [
      {
        title: "COMMUNITY DEVELOPMENT BLOCK GRANT",
        fitScore: 85,
        amount: "$50,000 – $250,000",
      },
      {
        title: "ARTS & CULTURE INNOVATION FUND",
        fitScore: 72,
        amount: "$10,000 – $75,000",
      },
    ],
  },
  {
    id: 2,
    org: "Arts Bridge Foundation",
    dateRange: "Mar 17 – Mar 23, 2026",
    matches: 2,
    status: "sent",
    previewTitle: "ARTS BRIDGE FOUNDATION GRANT INTELLIGENCE",
    previewSubtitle: "Weekly Digest for Arts Bridge Foundation",
    aiIntro:
      "AI-powered introduction: This week we found strong arts & education grant matches aligned with your community programming goals.",
    opportunities: [
      {
        title: "NATIONAL ARTS ENDOWMENT COMMUNITY GRANT",
        fitScore: 88,
        amount: "$25,000 – $100,000",
      },
      {
        title: "YOUTH ARTS EDUCATION FUND",
        fitScore: 76,
        amount: "$15,000 – $60,000",
      },
    ],
  },
  {
    id: 3,
    org: "Community Health Alliance",
    dateRange: "Mar 17 – Mar 23, 2026",
    matches: 1,
    status: "sent",
    previewTitle: "COMMUNITY HEALTH ALLIANCE GRANT INTELLIGENCE",
    previewSubtitle: "Weekly Digest for Community Health Alliance",
    aiIntro:
      "AI-powered introduction: One high-fit opportunity identified this week matching your healthcare community outreach mission.",
    opportunities: [
      {
        title: "HEALTHCARE ACCESS EXPANSION GRANT",
        fitScore: 91,
        amount: "$50,000 – $200,000",
      },
    ],
  },
  {
    id: 4,
    org: "Tech for All Initiative",
    dateRange: "Mar 17 – Mar 23, 2026",
    matches: 2,
    status: "draft",
    previewTitle: "TECH FOR ALL INITIATIVE GRANT INTELLIGENCE",
    previewSubtitle: "Weekly Digest for Tech for All Initiative",
    aiIntro:
      "AI-powered introduction: This digest is a draft — two strong digital equity opportunities were found this week pending your review.",
    opportunities: [
      {
        title: "DIGITAL EQUITY COMMUNITY FUND",
        fitScore: 84,
        amount: "$30,000 – $120,000",
      },
      {
        title: "BROADBAND ACCESS FOR RURAL COMMUNITIES",
        fitScore: 69,
        amount: "$50,000 – $500,000",
      },
    ],
  },
];

type Digest = typeof digests[0];

const statusBadge = (s: string) =>
  s === "sent"
    ? "bg-[#dcfce7] text-[#16a34a]"
    : "bg-[#fef9c3] text-[#b45309]";

const scoreColor = (n: number) => {
  if (n >= 80) return "text-[#16a34a]";
  if (n >= 65) return "text-[#f97316]";
  return "text-[#ef4444]";
};

/* ── Live Preview Panel ────────────────────────────────── */
const LivePreview = ({ digest }: { digest: Digest | null }) => {
  if (!digest) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
        <div className="w-16 h-16 rounded-full bg-[#f3f4f6] flex items-center justify-center">
          <Mail size={28} className="text-[#d1d5db]" />
        </div>
        <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-sm text-center">
          Click Preview on a digest to see the email here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#f0f0f0]">
      {/* Email red header */}
      <div className="bg-[#ef3e34] px-4 py-4 sm:px-5">
        <p className="[font-family:'Oswald',Helvetica] text-base font-bold uppercase leading-snug tracking-[0.5px] text-white break-words">
          {digest.previewTitle}
        </p>
        <p className="[font-family:'Montserrat',Helvetica] font-normal text-white/80 text-xs mt-0.5">
          {digest.previewSubtitle}
        </p>
      </div>

      {/* AI intro box */}
      <div className="bg-[#fff4f4] border-l-4 border-[#ef3e34] px-4 py-3 mx-4 mt-4 rounded-r-lg">
        <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#374151] text-sm leading-5">
          {digest.aiIntro}
        </p>
      </div>

      {/* Top opportunities */}
      <div className="px-4 pt-4 pb-5 flex flex-col gap-3">
        <p className="[font-family:'Oswald',Helvetica] font-bold text-[#111827] text-sm tracking-[0.5px] uppercase">
          Top Opportunities This Week
        </p>
        {digest.opportunities.map((opp, i) => (
          <div key={i} className="bg-white rounded-lg border border-[#f0f0f0] px-4 py-3">
            <p className="[font-family:'Oswald',Helvetica] font-bold text-[#111827] text-sm uppercase tracking-[0.3px]">
              {opp.title}
            </p>
            <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-xs mt-1">
              Fit Score:{" "}
              <span className={`font-bold ${scoreColor(opp.fitScore)}`}>
                {opp.fitScore}/100
              </span>{" "}
              | Amount: {opp.amount}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Main Page ─────────────────────────────────────────── */
export const WeeklySummary = () => {
  const [selected, setSelected] = useState<Digest | null>(null);

  return (
    <div className="flex h-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase leading-tight tracking-[0.5px] text-black sm:text-3xl break-words">
          Weekly Summary
        </h1>
        <p className="[font-family:'Montserrat',Helvetica] text-sm font-normal text-[#6b7280] max-w-prose break-words">
          Manage and dispatch automated grant reports
        </p>
      </div>

      {/* Two-panel layout — stack on small screens */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-5">
        {/* Left: Digest list */}
        <div className="flex max-h-[min(52vh,28rem)] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-[#f0f0f0] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] lg:max-h-none lg:w-80 lg:max-w-[320px]">
          {/* Panel header */}
          <div className="flex items-center gap-2 border-b border-[#f3f4f6] px-4 py-4 sm:px-5">
            <FileText size={14} className="shrink-0 text-[#9ca3af]" />
            <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#9ca3af] text-xs tracking-[0.6px] uppercase">
              Recent Weekly Summary
            </span>
          </div>

          {/* Digest items */}
          <div className="flex flex-col divide-y divide-[#f9fafb] overflow-y-auto">
            {digests.map((d) => {
              const isSelected = selected?.id === d.id;
              return (
                <div
                  key={d.id}
                  className={`relative flex flex-col gap-2 px-4 py-4 transition-colors sm:px-5 ${
                    isSelected ? "bg-[#fff4f4]" : "hover:bg-[#fafafa]"
                  }`}
                >
                  {/* Selected left border */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#ef3e34] rounded-r-full" />
                  )}

                  {/* Org name + status badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm">
                      {d.org}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full [font-family:'Montserrat',Helvetica] font-semibold text-xs capitalize ${statusBadge(d.status)}`}>
                      {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                    </span>
                  </div>

                  {/* Date range */}
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} className="text-[#9ca3af]" />
                    <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">
                      {d.dateRange}
                    </span>
                  </div>

                  {/* Matches + Preview */}
                  <div className="flex items-center justify-between">
                    <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">
                      {d.matches} matches
                    </span>
                    <button
                      onClick={() => setSelected(isSelected ? null : d)}
                      data-testid={`button-preview-digest-${d.id}`}
                      className="flex items-center gap-1 [font-family:'Montserrat',Helvetica] font-semibold text-[#ef3e34] text-xs hover:underline transition-colors"
                    >
                      <Zap size={11} />
                      Preview
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="flex min-h-[min(50vh,24rem)] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#f0f0f0] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] lg:min-h-0">
          {/* Panel header */}
          <div className="flex items-center gap-2 border-b border-[#f3f4f6] px-4 py-4 sm:px-5">
            <Eye size={14} className="shrink-0 text-[#9ca3af]" />
            <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#9ca3af] text-xs tracking-[0.6px] uppercase">
              Live Preview
            </span>
          </div>

          {/* Preview content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            <LivePreview digest={selected} />
          </div>
        </div>
      </div>
    </div>
  );
};
