"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type PopAgency = { _id: string; name?: string };
type PopUser = { _id: string; fullName?: string; firstName?: string; lastName?: string; email?: string };

type OutboxRow = {
  _id: string;
  recipient?: string;
  recipientName?: string;
  subject?: string;
  htmlBody?: string;
  emailType?: string;
  status?: "pending" | "sent" | "failed" | string;
  sentAt?: string;
  createdAt?: string;
  retryCount?: number;
  replyTo?: string;
  senderEmail?: string;
  sentViaGmail?: boolean;
  relatedAgency?: PopAgency | string | null;
  relatedUser?: PopUser | string | null;
  errorMessage?: string;
};

type PaginatedResp = {
  data: OutboxRow[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

const fmtDate = (s?: string) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
};

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const StatusBadge = ({ status }: { status?: string }) => {
  const s = (status || "pending").toLowerCase();
  const cls =
    s === "sent"
      ? "bg-green-100 text-green-700"
      : s === "failed"
        ? "bg-red-100 text-red-700"
        : "bg-yellow-100 text-yellow-800";
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
};

const MethodBadge = ({ sentViaGmail }: { sentViaGmail?: boolean }) => {
  if (sentViaGmail) {
    return (
      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
        Gmail
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
      SMTP
    </span>
  );
};

const TypeBadge = ({ t }: { t?: string }) => {
  const v = (t || "manual").toLowerCase();
  return (
    <span className="rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs font-semibold text-[#374151]">
      {v}
    </span>
  );
};

function displayName(u?: PopUser | string | null) {
  if (!u || typeof u === "string") return "—";
  const name =
    u.fullName ||
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
    "";
  return name || "—";
}

function agencyName(a?: PopAgency | string | null) {
  if (!a || typeof a === "string") return "—";
  return a.name || "—";
}

export default function AdminOutboxPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [status, setStatus] = useState<"all" | "pending" | "sent" | "failed">("all");
  const [method, setMethod] = useState<"all" | "gmail" | "smtp">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [viewId, setViewId] = useState<string | null>(null);
  const [retryId, setRetryId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [status, method, search]);

  const queryKey = useMemo(
    () => ["admin", "outbox", { status, method, search, page, limit }],
    [status, method, search, page, limit]
  );

  const { data, isLoading, isError, refetch } = useQuery<PaginatedResp>({
    queryKey,
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit };
      if (status !== "all") params.status = status;
      if (method === "gmail") params.sentViaGmail = true;
      if (method === "smtp") params.sentViaGmail = false;
      if (search) params.search = search;
      const res = await adminApi.get("outbox/admin/all", { params });
      return res.data as PaginatedResp;
    },
  });

  const rows = data?.data ?? [];
  const pg = data?.pagination;

  const { data: detail, isLoading: detailLoading } = useQuery<OutboxRow>({
    queryKey: ["admin", "outbox", "detail", viewId],
    queryFn: async () => {
      const res = await adminApi.get(`outbox/admin/${viewId}`);
      return res.data.data as OutboxRow;
    },
    enabled: !!viewId,
    retry: false,
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminApi.post(`outbox/admin/${id}/retry`);
      return res.data.data as OutboxRow;
    },
    onSuccess: async () => {
      toast({ title: "Retry started", description: "Sending this email now." });
      setRetryId(null);
      await qc.invalidateQueries({ queryKey: ["admin", "outbox"] });
      if (viewId) await qc.invalidateQueries({ queryKey: ["admin", "outbox", "detail", viewId] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Retry failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setRetryId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminApi.delete(`outbox/admin/${id}`);
      return id;
    },
    onSuccess: async (id) => {
      toast({ title: "Deleted", description: "Outbox record removed." });
      setDeleteId(null);
      setRemovingIds((prev) => ({ ...prev, [id]: true }));
      setTimeout(async () => {
        await qc.invalidateQueries({ queryKey: ["admin", "outbox"] });
        setRemovingIds((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 250);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Delete failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setDeleteId(null);
    },
  });

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Outbox</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Monitor queued, sent, and failed emails (Gmail OAuth2 vs SMTP).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-[#e5e7eb]" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center">
        <div className="w-full sm:w-56">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="border-[#e5e7eb]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-56">
          <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
            <SelectTrigger className="border-[#e5e7eb]">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="gmail">Gmail</SelectItem>
              <SelectItem value="smtp">SMTP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Input
            className="border-[#e5e7eb]"
            placeholder="Search recipient email or subject…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-[#f0f0f0] bg-[#f9fafb] text-[#6b7280] whitespace-nowrap">
            <tr>
              <th className="p-3">Recipient</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Agency</th>
              <th className="p-3">Type</th>
              <th className="p-3">Send Method</th>
              <th className="p-3">Status</th>
              <th className="p-3">Sent At</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-[#6b7280]">
                  Loading…
                </td>
              </tr>
            )}
            {isError && !isLoading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-red-600">
                  Failed to load outbox.
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-[#6b7280]">
                  No outbox records found.
                </td>
              </tr>
            )}
            {!isLoading &&
              !isError &&
              rows.map((r) => {
                const recipientLabel = r.recipientName
                  ? `${r.recipientName} · ${r.recipient || "—"}`
                  : (r.recipient || "—");
                const rowRemoving = !!removingIds[r._id];
                return (
                  <tr
                    key={r._id}
                    className={`border-t border-[#f0f0f0] transition-opacity duration-200 ${rowRemoving ? "opacity-0" : "opacity-100"}`}
                  >
                    <td className="p-3 text-[#111827]">
                      <div className="font-medium">{truncate(recipientLabel, 40)}</div>
                      <div className="text-xs text-[#9ca3af]">
                        {r.relatedUser && typeof r.relatedUser !== "string"
                          ? `User: ${displayName(r.relatedUser)} (${r.relatedUser.email || "—"})`
                          : "—"}
                      </div>
                    </td>
                    <td className="p-3 text-[#111827]" title={r.subject || ""}>
                      {r.subject ? truncate(r.subject, 60) : "—"}
                    </td>
                    <td className="p-3 text-[#6b7280]">{agencyName(r.relatedAgency)}</td>
                    <td className="p-3">
                      <TypeBadge t={r.emailType} />
                    </td>
                    <td className="p-3">
                      <MethodBadge sentViaGmail={r.sentViaGmail} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="p-3 text-[#6b7280]">{r.status === "sent" ? fmtDate(r.sentAt) : "—"}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#e5e7eb]"
                          onClick={() => setViewId(r._id)}
                        >
                          View
                        </Button>
                        {String(r.status || "").toLowerCase() === "failed" && (
                          <Button
                            size="sm"
                            className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
                            onClick={() => setRetryId(r._id)}
                          >
                            Retry
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteId(r._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pg && pg.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#6b7280]">
            Page {pg.page} of {pg.totalPages} · {pg.total} total
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!pg.hasPrevPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!pg.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!viewId} onOpenChange={(open) => !open && setViewId(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Outbox record</DialogTitle>
            <DialogDescription>Full details and HTML preview.</DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="text-sm text-[#6b7280]">Loading…</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={detail.status} />
                    <MethodBadge sentViaGmail={detail.sentViaGmail} />
                    <TypeBadge t={detail.emailType} />
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <div><span className="text-[#6b7280]">Recipient:</span> <span className="font-semibold text-[#111827]">{detail.recipientName || "—"} {detail.recipient ? `(${detail.recipient})` : ""}</span></div>
                    <div><span className="text-[#6b7280]">Agency:</span> <span className="font-semibold text-[#111827]">{agencyName(detail.relatedAgency)}</span></div>
                    <div><span className="text-[#6b7280]">User:</span> <span className="font-semibold text-[#111827]">{displayName(detail.relatedUser)} {detail.relatedUser && typeof detail.relatedUser !== "string" && detail.relatedUser.email ? `(${detail.relatedUser.email})` : ""}</span></div>
                    <div><span className="text-[#6b7280]">Reply-To:</span> <span className="font-semibold text-[#111827] break-all">{detail.replyTo || "—"}</span></div>
                    <div><span className="text-[#6b7280]">Sender:</span> <span className="font-semibold text-[#111827] break-all">{detail.senderEmail || "—"}</span></div>
                    <div><span className="text-[#6b7280]">Retry count:</span> <span className="font-semibold text-[#111827]">{detail.retryCount ?? 0}</span></div>
                    <div><span className="text-[#6b7280]">Created:</span> <span className="font-semibold text-[#111827]">{fmtDate(detail.createdAt)}</span></div>
                    <div><span className="text-[#6b7280]">Sent at:</span> <span className="font-semibold text-[#111827]">{detail.sentAt ? fmtDate(detail.sentAt) : "—"}</span></div>
                    {detail.status === "failed" && (
                      <div className="pt-2 text-sm text-red-700">
                        <span className="font-semibold">Error:</span> {detail.errorMessage || "—"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    Status timeline
                  </div>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li className="flex items-center justify-between">
                      <span className="text-[#111827]">Queued</span>
                      <span className="text-[#6b7280]">{fmtDate(detail.createdAt)}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-[#111827]">{String(detail.status || "pending").toLowerCase() === "sent" ? "Sent" : String(detail.status || "pending").toLowerCase() === "failed" ? "Failed" : "Pending"}</span>
                      <span className="text-[#6b7280]">{detail.sentAt ? fmtDate(detail.sentAt) : "—"}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-[#111827]">Retries</span>
                      <span className="text-[#6b7280]">{detail.retryCount ?? 0}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden">
                <div className="border-b border-[#f0f0f0] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Email preview</div>
                  <div className="mt-1 text-sm font-semibold text-[#111827]">{detail.subject || "—"}</div>
                </div>
                <iframe
                  title="email-preview"
                  sandbox=""
                  srcDoc={detail.htmlBody || "<p>(empty)</p>"}
                  className="h-[420px] w-full bg-white"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {detail && String(detail.status || "").toLowerCase() === "failed" && (
              <Button
                className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
                onClick={() => setRetryId(detail._id)}
              >
                Retry
              </Button>
            )}
            <Button variant="outline" className="border-[#e5e7eb]" onClick={() => setViewId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retry confirmation */}
      <AlertDialog open={!!retryId} onOpenChange={() => setRetryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retry sending this email now?</AlertDialogTitle>
            <AlertDialogDescription>
              This will attempt delivery immediately using Gmail (if connected) or SMTP (fallback).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#ef3e34] hover:bg-[#d63530]"
              onClick={() => retryId && retryMutation.mutate(retryId)}
            >
              Retry now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this outbox record permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

