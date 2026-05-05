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
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  User,
  Building
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

type CommLogRecord = {
  _id: string;
  application: { _id: string; projectTitle: string } | null;
  organization: { _id: string; name: string } | null;
  funder: { _id: string; name: string } | null;
  type: string;
  direction: "inbound" | "outbound" | "internal";
  subject: string;
  body: string;
  fromAddress: string;
  toAddress: string;
  createdByName: string;
  ashlynSuggestion: string | null;
  ashlynFlags: string[];
  createdAt: string;
};

const LogDetailModal = ({ 
  log, 
  onClose 
}: { 
  log: CommLogRecord; 
  onClose: () => void 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-[#f3f4f6]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                log.direction === 'inbound' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
              )}>
                {log.direction}
              </span>
              <h2 className="text-xl font-bold text-[#111827] [font-family:'Montserrat',Helvetica]">
                Message Detail
              </h2>
            </div>
            <p className="text-sm text-[#6b7280] [font-family:'Montserrat',Helvetica]">
              {fmtDate(log.createdAt)}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors"
          >
            <X size={18} className="text-[#6b7280]" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-[#f9fafb]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Content */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-sm">
                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Mail size={12} /> Message Content
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-[#111827] [font-family:'Montserrat',Helvetica]">Subject</p>
                    <p className="text-sm text-[#374151] mt-1">{log.subject || '(No Subject)'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#111827] [font-family:'Montserrat',Helvetica]">Body</p>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-[#f0f0f0] text-sm text-[#374151] whitespace-pre-wrap font-sans leading-relaxed">
                      {log.body}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-sm">
                <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText size={12} /> Related Records
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                      <Building size={14} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Agency</p>
                      <p className="text-sm font-semibold text-[#111827]">{log.organization?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileText size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Application</p>
                      <p className="text-sm font-semibold text-[#111827]">{log.application?.projectTitle || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <User size={14} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Funder</p>
                      <p className="text-sm font-semibold text-[#111827]">{log.funder?.name || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Suggestion Panel */}
            <div className="space-y-6">
              <div className="bg-[#fff8f8] rounded-xl border border-[#ef3e3433] p-5 shadow-sm h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-[#ef3e34] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#ef3e34] flex items-center justify-center text-white text-[10px]">A</span>
                    Ashlyn&apos;s Suggestion
                  </h3>
                  {log.ashlynSuggestion && (
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Ready</span>
                  )}
                </div>

                {log.ashlynSuggestion ? (
                  <div className="flex-1 flex flex-col">
                    <div className="bg-white rounded-lg border border-[#ef3e3420] p-4 text-sm text-[#374151] leading-relaxed whitespace-pre-wrap flex-1 shadow-inner">
                      {log.ashlynSuggestion}
                    </div>
                    {log.ashlynFlags?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {log.ashlynFlags.map(f => (
                          <span key={f} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 bg-amber-100 text-amber-700 rounded border border-amber-200">
                            {f.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-60">
                    <RefreshCw size={24} className="text-[#ef3e34] mb-3 animate-pulse" />
                    <p className="text-sm text-[#6b7280] [font-family:'Montserrat',Helvetica]">
                      No AI suggestion available for this message.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LogRow = ({ log, onClick }: { log: CommLogRecord; onClick: () => void }) => {
  const isInbound = log.direction === 'inbound';
  const hasSuggestion = !!log.ashlynSuggestion;

  return (
    <div 
      onClick={onClick}
      className="group relative flex items-center justify-between p-4 bg-white border border-[#e5e7eb] rounded-xl hover:border-[#ef3e34] hover:shadow-md transition-all cursor-pointer overflow-hidden"
    >
      {/* Accent bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 transition-all",
        isInbound ? "bg-emerald-500" : "bg-blue-500",
        "group-hover:w-1.5"
      )} />

      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          isInbound ? "bg-emerald-50" : "bg-blue-50"
        )}>
          {isInbound ? <ArrowLeft size={18} className="text-emerald-600" /> : <ArrowRight size={18} className="text-blue-600" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
              isInbound ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
            )}>
              {log.direction}
            </span>
            <span className="text-xs font-bold text-[#111827] truncate [font-family:'Montserrat',Helvetica]">
              {log.subject || '(No Subject)'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-[#6b7280] [font-family:'Montserrat',Helvetica]">
            <span className="truncate max-w-[200px]">
              {isInbound ? `From: ${log.fromAddress}` : `To: ${log.toAddress}`}
            </span>
            <span>·</span>
            <span>{fmtDate(log.createdAt)}</span>
          </div>
          <p className="mt-1 text-xs text-[#9ca3af] truncate max-w-lg italic">
            &quot;{log.body.substring(0, 100)}...&quot;
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 pl-4">
        {hasSuggestion && (
          <div className="flex items-center gap-1.5 bg-[#fff8f8] border border-[#ef3e3420] px-2.5 py-1 rounded-lg">
            <div className="w-4 h-4 rounded-full bg-[#ef3e34] flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">A</span>
            </div>
            <span className="text-[10px] font-bold text-[#ef3e34] uppercase tracking-tight">Suggestion</span>
          </div>
        )}
        <div className="flex flex-col items-end gap-1">
          <p className="text-[10px] font-bold text-[#111827] uppercase tracking-wider">{log.organization?.name || 'Unknown'}</p>
          <p className="text-[9px] text-[#9ca3af] uppercase tracking-widest">{log.application?.projectTitle || 'N/A'}</p>
        </div>
        <ChevronRight size={16} className="text-[#d1d5db] group-hover:text-[#ef3e34] group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
};

export default function AdminCommunicationsPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "inbound" | "outbound">("all");
  const [selectedLog, setSelectedLog] = useState<CommLogRecord | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "communication-log", page, filter],
    queryFn: async () => {
      const res = await adminApi.get("communication-log/admin/all", {
        params: { 
          page, 
          limit: 20, 
          direction: filter === "all" ? undefined : filter 
        },
      });
      return res.data.data;
    },
  });

  const logs: CommLogRecord[] = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;

  const filteredLogs = logs.filter(log => {
    const s = searchTerm.toLowerCase();
    return (
      log.subject?.toLowerCase().includes(s) ||
      log.body?.toLowerCase().includes(s) ||
      log.organization?.name?.toLowerCase().includes(s) ||
      log.fromAddress?.toLowerCase().includes(s) ||
      log.toAddress?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="[font-family:'Oswald',Helvetica] text-3xl font-bold text-[#111827] uppercase tracking-wide">
            Communication Log
          </h1>
          <p className="text-sm text-[#6b7280] mt-1 [font-family:'Montserrat',Helvetica]">
            Global audit of all inbound and outbound system communications
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-white border border-[#e5e7eb] rounded-xl shadow-sm">
            {(["all", "inbound", "outbound"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                  filter === f 
                    ? "bg-[#ef3e34] text-white shadow-md shadow-red-100" 
                    : "text-[#9ca3af] hover:text-[#6b7280] hover:bg-gray-50"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <button 
            onClick={() => refetch()} 
            disabled={isFetching}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-[#9ca3af] hover:text-[#ef3e34] hover:border-[#ef3e34] transition-all shadow-sm"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
        <Input 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by subject, content, agency, or email address..."
          className="pl-12 h-14 bg-white border-[#e5e7eb] rounded-2xl shadow-sm focus-visible:ring-[#ef3e34] focus-visible:ring-offset-0 text-base [font-family:'Montserrat',Helvetica]"
        />
      </div>

      {/* Logs List */}
      <div className="space-y-3 min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-60">
            <RefreshCw size={32} className="animate-spin text-[#ef3e34]" />
            <p className="text-[#6b7280] text-sm font-bold uppercase tracking-widest">Loading Logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#e5e7eb] bg-white py-32 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
              <AlertCircle size={32} className="text-[#d1d5db]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#111827] [font-family:'Montserrat',Helvetica]">No communications found</p>
              <p className="text-sm text-[#6b7280] [font-family:'Montserrat',Helvetica] mt-2">Try adjusting your filters or search criteria.</p>
            </div>
          </div>
        ) : (
          filteredLogs.map(log => (
            <LogRow key={log._id} log={log} onClick={() => setSelectedLog(log)} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-6">
          <div className="flex items-center gap-3 bg-white border border-[#e5e7eb] p-1.5 rounded-2xl shadow-sm">
            <Button 
              variant="ghost" 
              size="sm"
              disabled={page <= 1} 
              onClick={() => setPage(p => p - 1)}
              className="h-9 w-9 p-0 hover:bg-gray-50 text-[#6b7280]"
            >
              <ChevronRight size={20} className="rotate-180" />
            </Button>
            <div className="px-4 flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Page</span>
              <span className="text-sm font-bold text-[#111827] [font-family:'Montserrat',Helvetica]">
                {page} of {totalPages}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              disabled={page >= totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="h-9 w-9 p-0 hover:bg-gray-50 text-[#6b7280]"
            >
              <ChevronRight size={20} />
            </Button>
          </div>
        </div>
      )}

      {selectedLog && (
        <LogDetailModal 
          log={selectedLog} 
          onClose={() => setSelectedLog(null)} 
        />
      )}
    </div>
  );
}
