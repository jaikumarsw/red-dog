"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { cn } from "@/lib/utils";

type PipelineStage =
  | "discovered"
  | "researching"
  | "outreach_sent"
  | "reply_received"
  | "applying"
  | "submitted"
  | "won"
  | "lost"
  | "archived";

type PipelineHistoryEntry = {
  stage?: PipelineStage;
  changedAt?: string;
  changedBy?: "system" | "user";
  note?: string;
};

type BoardGrant = {
  _id: string;
  title?: string;
  organization?: { _id?: string; name?: string } | null;
  pipelineStage: PipelineStage;
  updatedAt?: string;
  pipelineHistory?: PipelineHistoryEntry[];
};

type BoardResponse = Record<PipelineStage, BoardGrant[]>;

const STAGES: PipelineStage[] = [
  "discovered",
  "researching",
  "outreach_sent",
  "reply_received",
  "applying",
  "submitted",
  "won",
  "lost",
  "archived",
];

const STAGE_LABEL: Record<PipelineStage, string> = {
  discovered: "Discovered",
  researching: "Researching",
  outreach_sent: "Outreach Sent",
  reply_received: "Reply Received",
  applying: "Applying",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

const daysInStage = (g: BoardGrant) => {
  const entries = g.pipelineHistory || [];
  const last = entries[entries.length - 1];
  const at = last?.changedAt ? new Date(last.changedAt).getTime() : (g.updatedAt ? new Date(g.updatedAt).getTime() : Date.now());
  const d = Math.max(0, Math.floor((Date.now() - at) / (1000 * 60 * 60 * 24)));
  return d;
};

export default function AdminPipelinePage() {
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

  const boardQuery = useQuery<BoardResponse>({
    queryKey: ["admin", "pipeline", "board"],
    queryFn: async () => {
      const res = await adminApi.get("grants/pipeline/board");
      return res.data.data as BoardResponse;
    },
    retry: false,
  });

  const allGrants = useMemo(() => {
    const b = boardQuery.data;
    if (!b) return [];
    return STAGES.flatMap((s) => b[s] || []);
  }, [boardQuery.data]);

  const orgOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const g of allGrants) {
      const id = g.organization?._id ? String(g.organization._id) : "";
      const name = g.organization?.name ? String(g.organization.name) : "Unknown agency";
      if (id) seen.set(id, name);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allGrants]);

  const stagesToShow = useMemo(() => {
    return showArchived ? STAGES : STAGES.filter((s) => s !== "archived");
  }, [showArchived]);

  const filteredBoard = useMemo(() => {
    const b = boardQuery.data;
    const out: Partial<BoardResponse> = {};
    for (const s of STAGES) out[s] = [];
    if (!b) return out as BoardResponse;

    for (const s of STAGES) {
      const list = b[s] || [];
      out[s] = list.filter((g) => {
        if (orgFilter === "all") return true;
        return String(g.organization?._id || "") === orgFilter;
      });
    }
    return out as BoardResponse;
  }, [boardQuery.data, orgFilter]);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl tracking-[0.5px] uppercase">
            Pipeline
          </h1>
          <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">
            Read-only board grouped by grant stage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#374151] [font-family:'Montserrat',Helvetica]">Agency</span>
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="h-10 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm [font-family:'Montserrat',Helvetica] focus:border-[#ef3e34] focus:outline-none"
            >
              <option value="all">All agencies</option>
              {orgOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <label className="ml-1 flex items-center gap-2 text-sm text-[#374151] [font-family:'Montserrat',Helvetica]">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 accent-[#ef3e34]"
            />
            Show archived
          </label>
        </div>
      </div>

      {boardQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[420px] rounded-xl border border-[#e5e7eb] bg-white animate-pulse" />
          ))}
        </div>
      ) : boardQuery.isError ? (
        <div className="rounded-xl border border-[#fee2e2] bg-[#fff1f2] p-4">
          <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#991b1b]">
            Failed to load pipeline board.
          </p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${stagesToShow.length}, minmax(220px, 1fr))` }}>
          {stagesToShow.map((stage) => {
            const list = filteredBoard[stage] || [];
            return (
              <div key={stage} className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden flex flex-col min-h-[520px]">
                <div className="px-4 py-3 border-b border-[#f3f4f6] bg-neutral-50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="[font-family:'Montserrat',Helvetica] text-xs font-bold text-[#111827] uppercase tracking-wide">
                      {STAGE_LABEL[stage]}
                    </p>
                    <span className="text-xs text-[#6b7280] [font-family:'Montserrat',Helvetica]">{list.length}</span>
                  </div>
                </div>

                <div className="p-3 space-y-2 overflow-auto">
                  {list.length === 0 ? (
                    <p className="text-xs text-[#9ca3af] [font-family:'Montserrat',Helvetica] px-1 py-2">
                      No grants.
                    </p>
                  ) : (
                    list.map((g) => {
                      const days = daysInStage(g);
                      const showReply = stage === "reply_received";
                      return (
                        <div key={g._id} className="rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-3">
                          <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827] line-clamp-2">
                            {g.title || "Application"}
                          </p>
                          <p className="mt-1 text-xs text-[#6b7280] [font-family:'Montserrat',Helvetica] truncate">
                            {g.organization?.name || "Unknown agency"}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold [font-family:'Montserrat',Helvetica]",
                                stage === "won"
                                  ? "bg-[#dcfce7] text-[#16a34a]"
                                  : stage === "lost"
                                  ? "bg-[#fee2e2] text-[#dc2626]"
                                  : "bg-[#eef2ff] text-[#4338ca]"
                              )}
                            >
                              {STAGE_LABEL[stage]}
                            </span>
                            <span className="text-[11px] text-[#6b7280] [font-family:'Montserrat',Helvetica]">
                              {days}d
                            </span>
                          </div>
                          {showReply ? (
                            <p className="mt-2 text-xs text-[#374151] [font-family:'Montserrat',Helvetica]">
                              💬 Reply received
                            </p>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

