"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronDown, 
  ChevronRight, 
  Mail, 
  RefreshCw, 
  Search, 
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const fmtDate = (s: string | undefined) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return s; }
};

type LatestReply = {
  count: number;
  replyId: string;
  from: string;
  subject: string;
  receivedAt: string;
  ashleenAnalysis: string | null;
  ashleenSuggestion: string | null;
  ashleenError: string | null;
};

type CommRecord = {
  _id: string;
  subject: string;
  recipient: string;
  sentAt: string;
  sentViaGmail: boolean;
  replyCount: number;
  latestReply: LatestReply | null;
  relatedOrganization: { _id: string; name: string } | null;
};

type AgencyGroup = {
  orgId: string;
  orgName: string;
  emails: CommRecord[];
  totalReplies: number;
  ashleenReady: number;
};

type FilterType = "all" | "replies" | "ashleen" | "none";

// Single email row inside an agency card
const EmailRow = ({ email }: { email: CommRecord }) => {
  const [open, setOpen] = useState(false);
  const hasReply = email.replyCount > 0;

  return (
    <div className={cn(
      "relative border-b border-[#f3f4f6] last:border-0 transition-all",
      hasReply && "bg-[#fffbfb]"
    )}>
      {/* Left accent for replies */}
      {hasReply && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ef3e34]" />
      )}

      {/* Email summary row */}
      <div
        className={cn(
          "flex items-center justify-between gap-4 py-2.5 px-4",
          hasReply && "cursor-pointer hover:bg-[#fff5f4]"
        )}
        onClick={() => hasReply && setOpen(!open)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Mail size={14} className={cn(
            "flex-shrink-0",
            hasReply ? "text-[#ef3e34]" : "text-[#9ca3af]"
          )} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#111827] truncate [font-family:'Montserrat',Helvetica]">
                {email.subject}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {email.sentViaGmail ? (
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 border border-blue-100">Gmail</span>
                ) : (
                  <span className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 border border-gray-100">SMTP</span>
                )}
              </div>
            </div>
            <p className="text-xs text-[#6b7280] truncate mt-0.5 [font-family:'Montserrat',Helvetica]">
              To: {email.recipient} · {fmtDate(email.sentAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {hasReply && (
            <div className="flex items-center gap-2">
              {email.latestReply?.ashleenSuggestion && (
                <div className="flex items-center gap-1 rounded-full bg-[#ef3e34] px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                  <span className="w-3 h-3 rounded-full bg-white flex items-center justify-center text-[#ef3e34] text-[7px] mr-1">A</span>
                  Ashleen Ready
                </div>
              )}
              <span className="text-[#ef3e34] text-xs font-semibold [font-family:'Montserrat',Helvetica] hover:underline flex items-center gap-1">
                {open ? "Hide Reply" : "View Reply"}
                <ChevronRight size={14} className={cn("transition-transform", open && "rotate-90")} />
              </span>
            </div>
          )}
          {!hasReply && (
            <span className="text-[10px] text-[#9ca3af] font-medium uppercase tracking-tighter">No reply</span>
          )}
        </div>
      </div>

      {/* Expanded reply + Ashleen */}
      {open && email.latestReply && (
        <div className="bg-white border-t border-[#f3f4f6] p-4 flex flex-col gap-4 mx-4 mb-4 mt-2 rounded-lg border border-[#e5e7eb] shadow-sm">
          {/* Funder reply */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] [font-family:'Montserrat',Helvetica]">
                Latest Funder Reply
              </p>
              <span className="text-[10px] text-[#6b7280]">{fmtDate(email.latestReply.receivedAt)}</span>
            </div>
            <p className="text-sm font-semibold text-[#111827] [font-family:'Montserrat',Helvetica]">
              {email.latestReply.subject || '(No subject)'}
            </p>
            <p className="text-xs text-[#374151] leading-relaxed [font-family:'Montserrat',Helvetica]">
              From: {email.latestReply.from}
            </p>
          </div>

          {/* Ashleen Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#f3f4f6]">
            {/* Analysis */}
            <div className="rounded-lg bg-[#fefce8] border border-[#fde68a] p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-full bg-[#ef3e34] flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-white text-[8px]">A</span>
                </div>
                <span className="text-xs font-bold text-[#111827] [font-family:'Montserrat',Helvetica]">
                  Ashleen's Analysis
                </span>
              </div>
              <p className="text-xs text-[#4b5563] leading-relaxed [font-family:'Montserrat',Helvetica]">
                {email.latestReply.ashleenAnalysis || "No analysis available."}
              </p>
            </div>

            {/* Suggestion */}
            <div className="rounded-lg bg-[#f9fafb] border border-[#e5e7eb] p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] [font-family:'Montserrat',Helvetica]">
                  Suggested Reply
                </p>
                {email.latestReply.ashleenSuggestion && (
                  <span className="text-[10px] text-[#16a34a] font-bold uppercase tracking-widest">✦ Ready</span>
                )}
              </div>
              {email.latestReply.ashleenSuggestion ? (
                <p className="text-xs text-[#4b5563] leading-relaxed [font-family:'Montserrat',Helvetica]">
                  {email.latestReply.ashleenSuggestion}
                </p>
              ) : email.latestReply.ashleenError ? (
                <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">
                  Error: {email.latestReply.ashleenError}
                </p>
              ) : (
                <p className="text-xs text-[#9ca3af] italic [font-family:'Montserrat',Helvetica]">
                  Ashleen is still analyzing this response...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Agency group card
const AgencyCard = ({ group }: { group: AgencyGroup }) => {
  const [collapsed, setCollapsed] = useState(group.totalReplies === 0);

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm overflow-hidden mb-4">
      {/* Agency header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#fafafa] transition-colors border-b border-[#f0f0f0]"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#f9fafb] border border-[#e5e7eb] flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-[#111827] [font-family:'Montserrat',Helvetica]">
              {group.orgName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-left">
            <h2 className="font-bold text-[#111827] text-lg [font-family:'Montserrat',Helvetica] leading-tight">
              {group.orgName}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-[#6b7280] font-medium [font-family:'Montserrat',Helvetica]">
                {group.emails.length} email{group.emails.length !== 1 ? 's' : ''}
              </span>
              {group.totalReplies > 0 && (
                <span className="flex items-center gap-1 text-[#ef3e34] text-xs font-bold [font-family:'Montserrat',Helvetica]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ef3e34]" />
                  {group.totalReplies} repl{group.totalReplies !== 1 ? 'ies' : 'y'}
                </span>
              )}
              {group.ashleenReady > 0 && (
                <span className="flex items-center gap-1 text-[#16a34a] text-xs font-bold [font-family:'Montserrat',Helvetica]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                  {group.ashleenReady} Ashleen ready
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!collapsed && <span className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-widest">Collapse</span>}
          {collapsed 
            ? <ChevronRight size={18} className="text-[#9ca3af]" />
            : <ChevronDown size={18} className="text-[#9ca3af]" />
          }
        </div>
      </button>

      {/* Email list */}
      {!collapsed && (
        <div className="flex flex-col">
          {group.emails.map(email => (
            <EmailRow key={email._id} email={email} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function AdminCommunicationsPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "communications", page],
    queryFn: async () => {
      const res = await adminApi.get("replies/communications", {
        params: { page, limit: 100 }, // Get more to allow client-side filtering
      });
      return res.data.data;
    },
  });

  const allRecords: CommRecord[] = data?.communications ?? [];
  const totalPages = data?.totalPages ?? 1;

  // Filter records
  const filteredRecords = allRecords.filter(r => {
    const matchesSearch = 
      r.relatedOrganization?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.recipient?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === "replies") return r.replyCount > 0;
    if (filter === "ashleen") return !!r.latestReply?.ashleenSuggestion;
    if (filter === "none") return r.replyCount === 0;
    return true;
  });

  // Grouping
  const groups: AgencyGroup[] = [];
  const orgMap = new Map<string, AgencyGroup>();

  for (const r of filteredRecords) {
    const orgId = r.relatedOrganization?._id || "unknown";
    const orgName = r.relatedOrganization?.name || "Unknown Agency";
    if (!orgMap.has(orgId)) {
      orgMap.set(orgId, { orgId, orgName, emails: [], totalReplies: 0, ashleenReady: 0 });
      groups.push(orgMap.get(orgId)!);
    }
    const group = orgMap.get(orgId)!;
    group.emails.push(r);
    group.totalReplies += r.replyCount;
    if (r.latestReply?.ashleenSuggestion) group.ashleenReady++;
  }

  // Sort groups: replies first, then by name
  groups.sort((a, b) => {
    if (b.totalReplies !== a.totalReplies) return b.totalReplies - a.totalReplies;
    return a.orgName.localeCompare(b.orgName);
  });

  const totalEmailsCount = allRecords.length;
  const withRepliesCount = allRecords.filter(r => r.replyCount > 0).length;
  const ashleenReadyCount = allRecords.filter(r => r.latestReply?.ashleenSuggestion).length;

  return (
    <div className="w-full space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">
            Communications
          </h1>
          <p className="text-sm text-[#6b7280] mt-0.5 [font-family:'Montserrat',Helvetica]">
            Manage outreach across all agencies
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 pr-4 border-r border-[#f0f0f0]">
            <span className="text-xs font-bold text-[#3b82f6] [font-family:'Montserrat',Helvetica]">{isLoading ? "—" : totalEmailsCount}</span>
            <span className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider">Sent</span>
          </div>
          <div className="flex items-center gap-1.5 pr-4 border-r border-[#f0f0f0]">
            <span className="text-xs font-bold text-[#f59e0b] [font-family:'Montserrat',Helvetica]">{isLoading ? "—" : withRepliesCount}</span>
            <span className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider">Replies</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#ef3e34] [font-family:'Montserrat',Helvetica]">{isLoading ? "—" : ashleenReadyCount}</span>
            <span className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-wider">Ashleen</span>
          </div>
          <button 
            onClick={() => refetch()} 
            disabled={isFetching}
            className="ml-2 text-[#9ca3af] hover:text-[#ef3e34] transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white border border-[#e5e7eb] rounded-xl p-2 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search agency, subject, or recipient..."
            className="pl-10 h-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 [font-family:'Montserrat',Helvetica] text-sm"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-lg border border-gray-100 flex-shrink-0">
          {(["all", "replies", "ashleen", "none"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all",
                filter === t 
                  ? "bg-white text-[#ef3e34] shadow-sm" 
                  : "text-[#9ca3af] hover:text-[#6b7280]"
              )}
            >
              {t === "all" ? "All" : t === "replies" ? "Has Replies" : t === "ashleen" ? "Ashleen Ready" : "No Reply"}
            </button>
          ))}
        </div>
      </div>

      {/* Agency list */}
      <div className="space-y-4 min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center pt-20 gap-3">
            <RefreshCw size={24} className="animate-spin text-[#ef3e34]" />
            <p className="text-[#6b7280] text-sm font-medium [font-family:'Montserrat',Helvetica]">Loading communications...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-[#e5e7eb] bg-white p-20 text-center flex flex-col items-center gap-3">
            <AlertCircle size={32} className="text-[#d1d5db]" />
            <div>
              <p className="text-lg font-bold text-[#111827] [font-family:'Montserrat',Helvetica]">No matching communications</p>
              <p className="text-sm text-[#6b7280] [font-family:'Montserrat',Helvetica] mt-1">Try adjusting your filters or search term.</p>
            </div>
            <Button variant="outline" onClick={() => { setSearchTerm(""); setFilter("all"); }} className="mt-2">
              Clear all filters
            </Button>
          </div>
        ) : (
          groups.map(group => (
            <AgencyCard key={group.orgId} group={group} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <div className="flex items-center gap-2 bg-white border border-[#e5e7eb] p-1 rounded-xl shadow-sm">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              disabled={page <= 1} 
              onClick={() => setPage(p => p - 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight size={16} className="rotate-180" />
            </Button>
            <span className="px-3 text-xs font-bold text-[#111827] [font-family:'Montserrat',Helvetica]">
              {page} / {totalPages}
            </span>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              disabled={page >= totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
