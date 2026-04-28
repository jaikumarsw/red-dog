"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { qk } from "@/lib/queryKeys";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OutboxMini = { _id: string; subject?: string; recipient?: string; recipientName?: string };
type ReplyRow = {
  _id: string;
  from?: string;
  subject?: string;
  body?: string;
  htmlBody?: string | null;
  receivedAt?: string;
  isRead?: boolean;
  outboxId?: (OutboxMini & { htmlBody?: string | null }) | string;
};

type PageResp = {
  data: ReplyRow[];
  pagination?: { page: number; totalPages: number; total: number; hasNextPage: boolean; hasPrevPage: boolean };
};

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString() : "—");

export function Replies() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ReplyRow | null>(null);
  const [isRead, setIsRead] = useState<"all" | "true" | "false">("all");

  const queryKey = useMemo(() => ["replies", "my", { page, isRead }], [page, isRead]);

  const { data, isLoading, isError, refetch } = useQuery<PageResp>({
    queryKey,
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (isRead !== "all") params.isRead = isRead;
      const res = await api.get("/replies/my", { params });
      return res.data as PageResp;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/replies/${id}/read`);
      return res.data.data as ReplyRow;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.repliesMy() });
      await qc.invalidateQueries({ queryKey: qk.repliesMyUnread() });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not mark reply as read.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const rows = data?.data ?? [];
  const pg = data?.pagination;

  return (
    <div className="flex h-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase tracking-[0.5px] text-black sm:text-3xl">
            Replies
          </h1>
          <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280]">
            Replies from funders to your outreach emails.
          </p>
        </div>
        <Button variant="outline" className="border-[#e5e7eb]" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center">
        <div className="w-full sm:w-56">
          <Select value={isRead} onValueChange={(v) => setIsRead(v as typeof isRead)}>
            <SelectTrigger className="border-[#e5e7eb]">
              <SelectValue placeholder="Read status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="false">Unread</SelectItem>
              <SelectItem value="true">Read</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Input className="border-[#e5e7eb]" value="" readOnly placeholder="(Search coming soon)" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#f0f0f0] bg-[#f9fafb] text-[#6b7280]">
            <tr>
              <th className="p-3">From</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Outreach</th>
              <th className="p-3">Received</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[#6b7280]">Loading…</td>
              </tr>
            )}
            {isError && !isLoading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-red-600">Failed to load replies.</td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[#6b7280]">No replies yet.</td>
              </tr>
            )}
            {!isLoading && !isError && rows.map((r) => (
              <tr key={r._id} className="border-t border-[#f0f0f0]">
                <td className="p-3 font-medium text-[#111827]">{r.from || "—"}</td>
                <td className="p-3 text-[#111827]">{r.subject || "—"}</td>
                <td className="p-3 text-[#6b7280]">
                  {typeof r.outboxId === "object" && r.outboxId ? (r.outboxId.subject || r.outboxId._id) : "—"}
                </td>
                <td className="p-3 text-[#6b7280]">{fmtDate(r.receivedAt)}</td>
                <td className="p-3">
                  {r.isRead ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Read</span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Unread</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <Button
                    size="sm"
                    className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
                    onClick={() => {
                      setView({ ...r, isRead: true }); // optimistic
                      if (!r.isRead) markReadMutation.mutate(r._id);
                    }}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pg && pg.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#6b7280]">
            Page {pg.page} of {pg.totalPages} · {pg.total} total
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!pg.hasPrevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button variant="outline" disabled={!pg.hasNextPage} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Reply</DialogTitle>
            <DialogDescription>Full reply preview.</DialogDescription>
          </DialogHeader>
          {view && (
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 text-sm">
                <div className="mb-2"><span className="text-[#6b7280]">From:</span> <span className="font-semibold">{view.from || "—"}</span></div>
                <div className="mb-2"><span className="text-[#6b7280]">Subject:</span> <span className="font-semibold">{view.subject || "—"}</span></div>
                <div className="mb-2"><span className="text-[#6b7280]">Received:</span> <span className="font-semibold">{fmtDate(view.receivedAt)}</span></div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden">
                  <div className="border-b border-[#f0f0f0] px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Original outreach</div>
                    <div className="mt-1 text-sm font-semibold text-[#111827]">
                      {typeof view.outboxId === "object" && view.outboxId ? (view.outboxId.subject || view.outboxId._id) : "—"}
                    </div>
                  </div>
                  <iframe
                    title="reply-thread-original"
                    sandbox="allow-same-origin"
                    srcDoc={
                      typeof view.outboxId === "object" && view.outboxId && view.outboxId.htmlBody
                        ? view.outboxId.htmlBody
                        : "<p>(no original HTML available)</p>"
                    }
                    className="h-[420px] w-full bg-white"
                  />
                </div>

                <div className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden">
                  <div className="border-b border-[#f0f0f0] px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Funder reply</div>
                  </div>
                  <iframe
                    title="reply-preview"
                    sandbox="allow-same-origin"
                    srcDoc={view.htmlBody || `<pre style="font-family:Arial;white-space:pre-wrap;padding:16px;">${(view.body || "").replace(/</g,"&lt;")}</pre>`}
                    className="h-[420px] w-full bg-white"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="border-[#e5e7eb]" onClick={() => setView(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

