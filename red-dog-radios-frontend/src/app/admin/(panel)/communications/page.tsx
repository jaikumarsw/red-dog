"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Mail,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const fmtDate = (s: string | undefined) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return s;
  }
};

type LogRecord = {
  _id: string;
  type: string;
  direction: string;
  subject: string;
  body: string;
  fromAddress?: string;
  toAddress?: string;
  ashleenAnalysis?: string;
  ashleenSuggestion?: string;
  ashlynSuggestion?: string;
  organization?: { _id: string; name: string };
  application?: { _id: string; projectTitle: string };
  funder?: { _id: string; name: string };
  createdAt: string;
};

const FILTERS = [
  { label: "All Emails", value: "all" },
  { label: "Inbound Replies", value: "inbound" },
  { label: "Outbound", value: "outbound" },
  { label: "Ashleen Ready", value: "ashleen" },
];

const LogRow = ({ record }: { record: LogRecord }) => {
  const [expanded, setExpanded] = useState(false);
  const isInbound = record.direction === "inbound";
  const hasAshleen = !!record.ashleenAnalysis;

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden ${
        isInbound
          ? "border-l-4 border-l-[#ef3e34] border-y border-r border-[#f0f0f0] bg-[#fffbf9]"
          : "border border-[#f0f0f0] bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => isInbound && setExpanded(!expanded)}
        className={`w-full text-left p-4 flex items-start gap-3 ${
          isInbound ? "cursor-pointer hover:bg-[#fff5f4]" : "cursor-default"
        }`}
      >
        <div
          className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
            isInbound ? "bg-[#ef3e34]/10" : "bg-blue-50"
          }`}
        >
          {isInbound ? (
            <ArrowDownLeft size={16} className="text-[#ef3e34]" />
          ) : (
            <ArrowUpRight size={16} className="text-blue-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isInbound ? "bg-[#ef3e34] text-white" : "bg-blue-100 text-blue-700"
              }`}
            >
              {isInbound ? "↙ Inbound" : "↗ Outbound"}
            </span>

            {hasAshleen && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#16a34a]">
                ✦ Ashleen Ready
              </span>
            )}

            <span className="text-xs text-[#9ca3af] [font-family:'Montserrat',Helvetica]">
              {record.organization?.name || "Unknown Agency"}
            </span>

            <span className="text-xs text-[#9ca3af] ml-auto whitespace-nowrap">
              {fmtDate(record.createdAt)}
            </span>
          </div>

          <p className="font-semibold text-[#111827] text-sm leading-snug mb-1 [font-family:'Montserrat',Helvetica]">
            {record.subject || "(No subject)"}
          </p>

          <p className="text-xs text-[#6b7280] [font-family:'Montserrat',Helvetica] truncate">
            {isInbound ? (
              <>
                From: <span className="font-medium">{record.fromAddress || "—"}</span>
              </>
            ) : (
              <>
                To: <span className="font-medium">{record.toAddress || "—"}</span>
              </>
            )}
          </p>

          {record.application?.projectTitle && (
            <p className="text-xs text-[#9ca3af] mt-0.5 truncate [font-family:'Montserrat',Helvetica]">
              Re: {record.application.projectTitle}
            </p>
          )}

          {isInbound && (
            <div className="mt-2 flex items-center gap-1 text-xs text-[#ef3e34] font-medium [font-family:'Montserrat',Helvetica]">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {expanded ? "Hide details" : "View reply & Ashleen analysis"}
            </div>
          )}
        </div>
      </button>

      {expanded && isInbound && (
        <div className="border-t border-[#f0f0f0] bg-white p-4 flex flex-col gap-3">
          {record.body && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1.5 [font-family:'Montserrat',Helvetica]">
                Funder&apos;s Reply
              </p>
              <div className="rounded-lg bg-[#f9fafb] border border-[#e5e7eb] p-3 max-h-48 overflow-y-auto">
                <p className="text-sm text-[#374151] whitespace-pre-wrap leading-relaxed [font-family:'Montserrat',Helvetica]">
                  {record.body}
                </p>
              </div>
            </div>
          )}

          {/* Ashleen's analysis only — admin doesn't draft replies */}
          {record.ashleenAnalysis && (
            <div className="rounded-lg bg-[#fefce8] border border-[#fde68a] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-5 h-5 rounded-full bg-[#ef3e34] flex items-center justify-center">
                  <span className="font-bold text-white text-[8px] [font-family:'Montserrat',Helvetica]">
                    A
                  </span>
                </div>
                <span className="text-xs font-bold text-[#111827] [font-family:'Montserrat',Helvetica]">
                  Ashleen&apos;s Analysis
                </span>
              </div>
              <p className="text-sm text-[#374151] leading-relaxed [font-family:'Montserrat',Helvetica]">
                {record.ashleenAnalysis}
              </p>
              <p className="text-[10px] text-[#9ca3af] mt-2 italic [font-family:'Montserrat',Helvetica]">
                Suggested reply is shown to the agency in their Inbox for editing and sending.
              </p>
            </div>
          )}

          {/* Pending state */}
          {!record.ashleenAnalysis && (
            <div className="rounded-lg bg-[#fef9c3] border border-[#fde68a] p-3">
              <p className="text-xs text-[#b45309] italic [font-family:'Montserrat',Helvetica]">
                Ashleen is analyzing this reply...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function AdminCommunicationsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "communications", filter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 50 };
      if (filter === "inbound") params.direction = "inbound";
      if (filter === "outbound") params.direction = "outbound";

      const res = await adminApi.get("communication-log/admin/all", { params });
      return res.data.data;
    },
  });

  const allRecords = useMemo<LogRecord[]>(
    () => data?.records || data?.logs || [],
    [data]
  );

  const filteredRecords = useMemo(() => {
    let records = allRecords;

    if (filter === "ashleen") {
      records = records.filter((r) => r.ashleenAnalysis);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      records = records.filter(
        (r) =>
          r.subject?.toLowerCase().includes(q) ||
          r.body?.toLowerCase().includes(q) ||
          r.fromAddress?.toLowerCase().includes(q) ||
          r.toAddress?.toLowerCase().includes(q) ||
          r.organization?.name?.toLowerCase().includes(q)
      );
    }

    return records;
  }, [allRecords, filter, search]);

  const totalEmails = allRecords.length;
  const inboundCount = allRecords.filter((r) => r.direction === "inbound").length;
  const ashleenCount = allRecords.filter((r) => r.ashleenAnalysis).length;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl tracking-[0.5px] uppercase">
            Communication Log
          </h1>
          <p className="text-sm text-[#6b7280] mt-1 [font-family:'Montserrat',Helvetica]">
            All email communications between agencies and funders
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Emails", value: totalEmails, color: "text-[#3b82f6]" },
          { label: "Inbound Replies", value: inboundCount, color: "text-[#ef3e34]" },
          { label: "Ashleen Ready", value: ashleenCount, color: "text-[#16a34a]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#e5e7eb] bg-white p-4">
            <p className={`text-2xl font-bold tabular-nums [font-family:'Montserrat',Helvetica] ${s.color}`}>
              {isLoading ? "—" : s.value}
            </p>
            <p className="text-xs text-[#9ca3af] mt-0.5 [font-family:'Montserrat',Helvetica]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, content, agency, or email address..."
            className="pl-10 border-[#e5e7eb]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setFilter(f.value);
                setPage(1);
              }}
              className={`h-8 rounded-lg px-4 text-xs font-semibold transition-colors [font-family:'Montserrat',Helvetica] ${
                filter === f.value
                  ? "bg-[#ef3e34] text-white"
                  : "border border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#ef3e34]/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-[#9ca3af] py-12 [font-family:'Montserrat',Helvetica]">
          Loading communications...
        </p>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-12 text-center">
          <Mail size={32} className="text-[#e5e7eb] mx-auto mb-3" />
          <p className="text-sm text-[#9ca3af] [font-family:'Montserrat',Helvetica]">
            {search ? `No communications match "${search}"` : "No communications yet"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredRecords.map((record) => (
            <LogRow key={record._id} record={record} />
          ))}
        </div>
      )}

      {filter !== "ashleen" && !search && data?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-[#6b7280] mx-3 [font-family:'Montserrat',Helvetica]">
            Page {page} of {data.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
