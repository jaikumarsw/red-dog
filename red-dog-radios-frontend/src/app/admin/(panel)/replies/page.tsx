"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type Org = { _id: string; name?: string };
type OutboxMini = { _id: string; subject?: string; recipient?: string; recipientName?: string };

type ReplyRow = {
  _id: string;
  from?: string;
  subject?: string;
  body?: string;
  htmlBody?: string | null;
  receivedAt?: string;
  isRead?: boolean;
  organizationId?: Org | string;
  outboxId?: OutboxMini | string;
};

type PageResp = {
  data: ReplyRow[];
  pagination?: { page: number; totalPages: number; total: number; hasNextPage: boolean; hasPrevPage: boolean };
};

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString() : "—");

export default function AdminRepliesPage() {
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [isRead, setIsRead] = useState<"all" | "true" | "false">("all");
  const [search, setSearch] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);

  const queryKey = useMemo(
    () => ["admin", "replies", { page, isRead, search }],
    [page, isRead, search]
  );

  const { data, isLoading, isError, refetch } = useQuery<PageResp>({
    queryKey,
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (isRead !== "all") params.isRead = isRead;
      // lightweight search: handled via backend not required; skip for now (still lets user filter by org/read)
      const res = await adminApi.get("replies", { params });
      return res.data as PageResp;
    },
  });

  const rows = data?.data ?? [];
  const pg = data?.pagination;

  const { data: detail, isLoading: detailLoading } = useQuery<ReplyRow>({
    queryKey: ["admin", "replies", "detail", viewId],
    queryFn: async () => {
      const res = await adminApi.get(`replies/${viewId}`);
      return res.data.data as ReplyRow;
    },
    enabled: !!viewId,
    retry: false,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminApi.patch(`replies/${id}/read`);
      return res.data.data as ReplyRow;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "replies"] });
    },
  });

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Replies</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Inbound funder replies detected via Gmail push notifications.
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
          <Input
            className="border-[#e5e7eb]"
            placeholder="(Optional) Search not enabled yet"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#f0f0f0] bg-[#f9fafb] text-[#6b7280]">
            <tr>
              <th className="p-3">From</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Organization</th>
              <th className="p-3">Original Outreach</th>
              <th className="p-3">Received At</th>
              <th className="p-3">Read</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-[#6b7280]">Loading…</td>
              </tr>
            )}
            {isError && !isLoading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-red-600">Failed to load replies.</td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-[#6b7280]">No replies yet.</td>
              </tr>
            )}
            {!isLoading && !isError && rows.map((r) => (
              <tr key={r._id} className="border-t border-[#f0f0f0]">
                <td className="p-3 font-medium text-[#111827]">{r.from || "—"}</td>
                <td className="p-3 text-[#111827]">{r.subject || "—"}</td>
                <td className="p-3 text-[#6b7280]">
                  {typeof r.organizationId === "object" && r.organizationId ? (r.organizationId.name || "—") : "—"}
                </td>
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
                      setViewId(r._id);
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

      <Dialog open={!!viewId} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Reply detail</DialogTitle>
            <DialogDescription>Full body (HTML rendered safely).</DialogDescription>
          </DialogHeader>
          {detailLoading || !detail ? (
            <div className="text-sm text-[#6b7280]">Loading…</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 text-sm space-y-2">
                <div><span className="text-[#6b7280]">From:</span> <span className="font-semibold">{detail.from || "—"}</span></div>
                <div><span className="text-[#6b7280]">Subject:</span> <span className="font-semibold">{detail.subject || "—"}</span></div>
                <div><span className="text-[#6b7280]">Received:</span> <span className="font-semibold">{fmtDate(detail.receivedAt)}</span></div>
                <div>
                  <span className="text-[#6b7280]">Organization:</span>{" "}
                  <span className="font-semibold">
                    {typeof detail.organizationId === "object" && detail.organizationId ? (detail.organizationId.name || "—") : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[#6b7280]">Original outreach:</span>{" "}
                  <span className="font-semibold">
                    {typeof detail.outboxId === "object" && detail.outboxId ? (detail.outboxId.subject || detail.outboxId._id) : "—"}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden">
                <div className="border-b border-[#f0f0f0] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Reply</div>
                </div>
                <iframe
                  title="admin-reply-preview"
                  sandbox=""
                  srcDoc={detail.htmlBody || `<pre style="font-family:Arial;white-space:pre-wrap;padding:16px;">${(detail.body || "").replace(/</g,"&lt;")}</pre>`}
                  className="h-[420px] w-full bg-white"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="border-[#e5e7eb]" onClick={() => setViewId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

