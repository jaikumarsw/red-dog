"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { qk } from "@/lib/queryKeys";

interface Win {
  _id: string;
  agencyType: string;
  fundingType?: string;
  projectType?: string;
  funderName?: string;
  awardAmount?: number;
  problemStatement?: string;
  communityImpact?: string;
  proposedSolution?: string;
  measurableOutcomes?: string;
  winFactors?: string[];
  lessonsLearned?: string;
  createdAt: string;
}

interface WinInsights {
  totalWins: number;
  totalAwarded: number;
  winsByAgencyType: Record<string, number>;
  winsByFundingType: Record<string, number>;
  topFunders: { name: string; winCount: number }[];
  commonWinFactors: { factor: string; count: number }[];
}

const fmt = (n?: number) => (n != null ? "$" + n.toLocaleString() : "—");

export const Wins = () => {
  const { data: insights, isLoading: insightsLoading, isError: insightsError, refetch: refetchInsights } = useQuery<WinInsights>({
    queryKey: qk.winInsights(),
    queryFn: async () => {
      const res = await api.get("/wins/insights");
      return res.data.data;
    },
  });

  const { data, isLoading: winsLoading, isError: winsError, refetch: refetchWins } = useQuery<{ data: Win[] }>({
    queryKey: qk.wins(),
    queryFn: async () => {
      const res = await api.get("/wins", { params: { limit: 50 } });
      return res.data;
    },
  });

  const wins: Win[] = data?.data ?? [];

  if (insightsError || winsError) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-20 bg-neutral-50 gap-3">
        <p className="[font-family:'Montserrat',Helvetica] text-red-600 text-base">Failed to load win database. Please try again.</p>
        <button onClick={() => { refetchInsights(); refetchWins(); }} className="rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-semibold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029]">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 pb-10 sm:p-6 lg:p-8">
      <div>
        <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl sm:text-3xl tracking-[0.5px] uppercase leading-tight">
          Win Database
        </h1>
        <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-sm mt-1">
          Successful grant applications stored for AI learning and reference
        </p>
      </div>

      {insightsLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white border border-[#e5e7eb]" />
          ))}
        </div>
      ) : insights ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 flex flex-col gap-1">
            <p className="[font-family:'Montserrat',Helvetica] text-xs text-[#6b7280] font-medium">Total Wins</p>
            <p className="[font-family:'Oswald',Helvetica] font-bold text-2xl text-[#22c55e]">{insights.totalWins}</p>
          </div>
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 flex flex-col gap-1">
            <p className="[font-family:'Montserrat',Helvetica] text-xs text-[#6b7280] font-medium">Total Awarded</p>
            <p className="[font-family:'Oswald',Helvetica] font-bold text-2xl text-[#50a2ff]">
              {insights.totalAwarded >= 1000000
                ? "$" + (insights.totalAwarded / 1000000).toFixed(1) + "M"
                : fmt(insights.totalAwarded)}
            </p>
          </div>
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 flex flex-col gap-1">
            <p className="[font-family:'Montserrat',Helvetica] text-xs text-[#6b7280] font-medium">Top Agency Type</p>
            <p className="[font-family:'Oswald',Helvetica] font-bold text-lg text-[#111827]">
              {Object.entries(insights.winsByAgencyType).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"}
            </p>
          </div>
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 flex flex-col gap-1">
            <p className="[font-family:'Montserrat',Helvetica] text-xs text-[#6b7280] font-medium">Top Funder</p>
            <p className="[font-family:'Oswald',Helvetica] font-bold text-lg text-[#111827] leading-tight">
              {insights.topFunders[0]?.name || "—"}
            </p>
          </div>
        </div>
      ) : null}

      {insights && (insights.commonWinFactors?.length > 0 || insights.topFunders?.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {insights.topFunders?.length > 0 && (
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 flex flex-col gap-3">
              <h2 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm uppercase tracking-wide">Top Funders</h2>
              {insights.topFunders.map((f) => (
                <div key={f.name} className="flex items-center justify-between">
                  <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151]">{f.name}</span>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 [font-family:'Montserrat',Helvetica]">
                    {f.winCount} win{f.winCount !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
          {insights.commonWinFactors?.length > 0 && (
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 flex flex-col gap-3">
              <h2 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm uppercase tracking-wide">Common Win Factors</h2>
              {insights.commonWinFactors.slice(0, 6).map((f) => (
                <div key={f.factor} className="flex items-center justify-between">
                  <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151]">{f.factor}</span>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 [font-family:'Montserrat',Helvetica]">
                    {f.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
        <div className="border-b border-[#e5e7eb] px-5 py-4">
          <h2 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm uppercase tracking-wide">
            Winning Applications ({wins.length})
          </h2>
        </div>

        {winsLoading ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse border-b border-[#e5e7eb] bg-gray-50" />
            ))}
          </div>
        ) : wins.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="[font-family:'Montserrat',Helvetica] text-[#9ca3af] text-sm">
              No wins recorded yet. Applications marked as "Awarded" will appear here.
            </p>
          </div>
        ) : (
          wins.map((w) => (
            <div key={w._id} className="border-b border-[#e5e7eb] px-5 py-4 flex flex-col gap-3 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm">
                    {w.funderName || "Unknown Funder"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 [font-family:'Montserrat',Helvetica]">
                      {w.agencyType}
                    </span>
                    {w.fundingType && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 [font-family:'Montserrat',Helvetica]">
                        {w.fundingType}
                      </span>
                    )}
                    {w.projectType && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 [font-family:'Montserrat',Helvetica]">
                        {w.projectType}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="[font-family:'Montserrat',Helvetica] font-bold text-[#22c55e] text-base">{fmt(w.awardAmount)}</p>
                  <p className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af]">
                    {new Date(w.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>

              {w.problemStatement && (
                <p className="[font-family:'Montserrat',Helvetica] text-xs text-[#6b7280] line-clamp-2">
                  {w.problemStatement}
                </p>
              )}

              {w.winFactors && w.winFactors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {w.winFactors.map((f) => (
                    <span key={f} className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-xs text-[#6b7280] [font-family:'Montserrat',Helvetica]">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
