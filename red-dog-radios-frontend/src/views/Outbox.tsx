"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, X, Zap, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Email = {
  id: string;
  to: string;
  subject: string;
  status: string;
  created: string;
  sentAt: string;
  body: string;
  replyTo?: string;
  senderEmail?: string;
  sentViaGmail?: boolean;
};

type ApiEmail = {
  _id: string;
  recipient?: string;
  to?: string;
  recipientEmail?: string;
  subject?: string;
  status?: string;
  createdAt?: string;
  sentAt?: string;
  body?: string;
  htmlBody?: string;
  htmlContent?: string;
  retryCount?: number;
  replyTo?: string;
  senderEmail?: string;
  sentViaGmail?: boolean;
};

const fmtDate = (s: string | undefined) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return s;
  }
};

const mapEmail = (e: ApiEmail): Email => ({
  id: e._id,
  to: e.recipient ?? e.to ?? e.recipientEmail ?? "—",
  subject: e.subject ?? "—",
  status: e.status ?? "pending",
  created: fmtDate(e.createdAt),
  sentAt: fmtDate(e.sentAt),
  body: e.htmlBody ?? e.body ?? e.htmlContent ?? "",
  replyTo: e.replyTo,
  senderEmail: e.senderEmail,
  sentViaGmail: e.sentViaGmail,
});

const statusBadge = (s: string) => {
  if (s === "sent") return "bg-[#dcfce7] text-[#16a34a]";
  if (s === "failed") return "bg-[#fee2e2] text-[#dc2626]";
  return "bg-[#fef9c3] text-[#b45309]";
};

type ReplyRow = {
  _id: string;
  from?: string;
  subject?: string;
  body?: string;
  htmlBody?: string | null;
  receivedAt?: string;
  isRead?: boolean;
  outboxId?: { _id: string; subject?: string; recipient?: string; recipientName?: string; htmlBody?: string } | string;
};

const EmailDetailsModal = ({
  email,
  onClose,
  initialTab = "detail",
}: {
  email: Email;
  onClose: () => void;
  initialTab?: "detail" | "replies";
}) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"detail" | "replies">(initialTab);
  const [selectedReply, setSelectedReply] = useState<ReplyRow | null>(null);

  const { data: repliesData, isLoading: repliesLoading, isError: repliesError, refetch: refetchReplies } =
    useQuery<{ data: ReplyRow[] }>({
      queryKey: ["replies", "my", "outbox", email.id],
      queryFn: async () => {
        const res = await api.get("/replies/my", { params: { outboxId: email.id, limit: 50, page: 1 } });
        return res.data as { data: ReplyRow[] };
      },
      enabled: tab === "replies",
      retry: false,
    });

  const replies = repliesData?.data ?? [];

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/replies/${id}/read`);
      return res.data.data as ReplyRow;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.repliesMyUnread() });
      await qc.invalidateQueries({ queryKey: ["replies", "my"] });
      await qc.invalidateQueries({ queryKey: ["replies", "my", "outbox", email.id] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not mark reply as read.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const openReply = (r: ReplyRow) => {
    setSelectedReply({ ...r, isRead: true }); // optimistic
    if (!r.isRead) markReadMutation.mutate(r._id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[920px] mx-4 flex flex-col">
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-[#f3f4f6]">
          <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-xl tracking-[0.5px] uppercase">Email Details</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors">
            <X size={14} className="text-[#6b7280]" />
          </button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "detail" | "replies")} className="w-full">
            <TabsList className="bg-[#f3f4f6]">
              <TabsTrigger value="detail">Email</TabsTrigger>
              <TabsTrigger value="replies">
                Replies{replies.length > 0 ? ` (${replies.length})` : ""}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="mt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">To</span>
                  <span className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm">{email.to}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Status</span>
                  <span className={`inline-flex w-fit items-center px-2.5 py-0.5 rounded-full [font-family:'Montserrat',Helvetica] font-semibold text-xs capitalize ${statusBadge(email.status)}`}>
                    {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                <div className="flex flex-col gap-1">
                  <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Sent Via</span>
                  <span className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm">
                    {email.sentViaGmail ? "Gmail (OAuth2)" : "SMTP"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Sender Email</span>
                  <span className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm break-all">
                    {email.senderEmail || "—"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 mt-4">
                <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Reply-To</span>
                <span className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm break-all">
                  {email.replyTo || "—"}
                </span>
              </div>

              <div className="flex flex-col gap-1 mt-4">
                <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Sent At</span>
                <span className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm">{email.sentAt}</span>
              </div>

              <div className="flex flex-col gap-1 mt-4">
                <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Subject</span>
                <span className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm">{email.subject}</span>
              </div>

              <div className="flex flex-col gap-1.5 mt-4">
                <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Email Body</span>
                <iframe
                  title="outreach-preview"
                  sandbox="allow-same-origin"
                  srcDoc={email.body || "<p>(empty)</p>"}
                  className="border border-[#e5e7eb] rounded-xl bg-white h-[320px] w-full"
                />
              </div>
            </TabsContent>

            <TabsContent value="replies" className="mt-4">
              {repliesLoading ? (
                <p className="text-sm text-[#6b7280]">Loading replies…</p>
              ) : repliesError ? (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">Failed to load replies.</p>
                  <button
                    className="text-sm font-semibold text-red-700 underline"
                    onClick={() => refetchReplies()}
                  >
                    Retry
                  </button>
                </div>
              ) : replies.length === 0 ? (
                <p className="text-sm text-[#6b7280]">No replies yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden">
                    <div className="border-b border-[#f0f0f0] px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Replies</div>
                    </div>
                    <div className="divide-y divide-[#f9fafb]">
                      {replies.map((r) => (
                        <button
                          key={r._id}
                          type="button"
                          onClick={() => openReply(r)}
                          className="w-full text-left px-4 py-3 hover:bg-[#fafafa]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {!r.isRead && <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />}
                              <span className="text-sm font-semibold text-[#111827] truncate">{r.from || "—"}</span>
                            </div>
                            <span className="text-xs text-[#9ca3af]">{r.receivedAt ? fmtDate(r.receivedAt) : "—"}</span>
                          </div>
                          <div className="mt-1 text-xs text-[#6b7280] truncate">
                            {r.subject || "(no subject)"}
                          </div>
                          <div className="mt-1 text-xs text-[#9ca3af] truncate">
                            {String(r.body || "").slice(0, 120)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#e5e7eb] bg-white overflow-hidden">
                    <div className="border-b border-[#f0f0f0] px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                        Thread view
                      </div>
                    </div>
                    {selectedReply ? (
                      <div className="p-4 space-y-4">
                        <div className="rounded-lg border border-[#e5e7eb] overflow-hidden">
                          <div className="bg-[#f9fafb] px-3 py-2 text-xs font-semibold text-[#6b7280] uppercase">
                            Original outreach
                          </div>
                          <iframe
                            title="thread-original"
                            sandbox="allow-same-origin"
                            srcDoc={email.body || "<p>(empty)</p>"}
                            className="h-[200px] w-full bg-white"
                          />
                        </div>

                        <div className="rounded-lg border border-[#e5e7eb] overflow-hidden">
                          <div className="bg-[#f9fafb] px-3 py-2 text-xs font-semibold text-[#6b7280] uppercase">
                            Funder reply
                          </div>
                          <div className="px-3 py-2 text-xs text-[#6b7280]">
                            From: <span className="font-semibold text-[#111827]">{selectedReply.from || "—"}</span>{" "}
                            · Received:{" "}
                            <span className="font-semibold text-[#111827]">{selectedReply.receivedAt ? fmtDate(selectedReply.receivedAt) : "—"}</span>
                          </div>
                          <iframe
                            title="thread-reply"
                            sandbox="allow-same-origin"
                            srcDoc={
                              selectedReply.htmlBody ||
                              `<pre style="font-family:Arial;white-space:pre-wrap;padding:16px;">${String(selectedReply.body || "").replace(/</g, "&lt;")}</pre>`
                            }
                            className="h-[200px] w-full bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-sm text-[#6b7280]">Select a reply to view the thread.</div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-end px-7 py-5 border-t border-[#f3f4f6]">
          <button onClick={onClose} className="h-10 px-6 bg-[#ef3e34] hover:bg-[#d63530] text-white rounded-lg [font-family:'Montserrat',Helvetica] font-semibold text-sm transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const Outbox = () => {
  const [previewEmail, setPreviewEmail] = useState<Email | null>(null);
  const [previewTab, setPreviewTab] = useState<"detail" | "replies">("detail");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: emails = [], isLoading: loading } = useQuery<Email[]>({
    queryKey: qk.outbox(),
    queryFn: async () => {
      const res = await api.get("/outbox", { params: { limit: 100 } });
      const raw: ApiEmail[] = res.data.data ?? [];
      return raw.map(mapEmail);
    },
  });

  const outboxIds = useMemo(() => emails.map((e) => e.id), [emails]);
  const { data: replyCounts } = useQuery<Record<string, number>>({
    queryKey: ["replies", "count-by-outbox", outboxIds.join(",")],
    queryFn: async () => {
      if (outboxIds.length === 0) return {};
      const res = await api.get("/replies/count-by-outbox", {
        params: { outboxIds: outboxIds.join(",") },
      });
      return res.data.data as Record<string, number>;
    },
    enabled: outboxIds.length > 0,
    retry: false,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/outbox/${id}/retry`),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Email[]>(qk.outbox(), (prev = []) =>
        prev.map((e) => e.id === id ? { ...e, status: "pending" } : e)
      );
      toast({ title: "Email queued for retry" });
    },
    onError: () => {
      toast({ title: "Retry failed", variant: "destructive" });
    },
  });

  const pending = emails.filter((e) => e.status === "pending").length;
  const sent = emails.filter((e) => e.status === "sent").length;
  const failed = emails.filter((e) => e.status === "failed").length;

  return (
    <>
      <div className="flex h-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 sm:p-6 lg:p-8">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase leading-tight tracking-[0.5px] text-black sm:text-3xl break-words">
            Communications Outbox
          </h1>
          <p className="[font-family:'Montserrat',Helvetica] text-sm font-normal text-[#6b7280] max-w-prose break-words">
            Monitor and process outbound system emails
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            { label: "Pending", value: pending, Icon: Clock, iconBg: "bg-[#fff7ed]", iconCls: "text-[#f59e0b]", valueCls: "text-[#f59e0b]" },
            { label: "Sent", value: sent, Icon: Zap, iconBg: "bg-[#f0fdf4]", iconCls: "text-[#16a34a]", valueCls: "text-[#16a34a]" },
            { label: "Failed", value: failed, Icon: X, iconBg: "bg-[#fff1f0]", iconCls: "text-[#ef4444]", valueCls: "text-[#ef4444]" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-[#f0f0f0] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
                <s.Icon size={20} className={s.iconCls} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={`[font-family:'Oswald',Helvetica] font-bold text-xl sm:text-2xl tabular-nums leading-tight ${s.valueCls}`}>
                  {loading ? "—" : s.value}
                </span>
                <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs leading-snug">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#f0f0f0] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 border-b border-[#f3f4f6] px-4 py-4 sm:px-5">
            <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#9ca3af] text-xs tracking-[0.6px] uppercase">All Emails</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#9ca3af]">Loading emails...</span>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#9ca3af]">No emails in outbox</span>
              </div>
            ) : (
              <div className="divide-y divide-[#f9fafb]">
                {emails.map((email) => (
                  <div key={email.id} className="flex min-w-0 items-start justify-between gap-3 px-4 py-4 sm:px-5 hover:bg-[#fafafa] transition-colors">
                    <div className="min-w-0 flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm truncate max-w-[200px] sm:max-w-none">
                          {email.subject}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full [font-family:'Montserrat',Helvetica] font-semibold text-xs flex-shrink-0 ${statusBadge(email.status)}`}>
                          {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                        </span>
                        {email.sentViaGmail && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            Gmail
                          </span>
                        )}
                      </div>
                      <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">To: {email.to}</span>
                      {email.replyTo && (
                        <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs truncate max-w-[340px]">
                          Reply-To: {email.replyTo}
                        </span>
                      )}
                      <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Created: {email.created}</span>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-2">
                      {replyCounts && (replyCounts[email.id] || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewEmail(email);
                            setPreviewTab("replies");
                          }}
                          className="flex items-center gap-1 h-8 px-3 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f3f4f6] [font-family:'Montserrat',Helvetica] font-semibold text-xs text-[#111827] transition-colors"
                          title="View replies"
                        >
                          💬 {replyCounts[email.id]}
                        </button>
                      )}
                      {email.status === "failed" && (
                        <button
                          onClick={() => retryMutation.mutate(email.id)}
                          disabled={retryMutation.isPending && retryMutation.variables === email.id}
                          className="flex items-center gap-1 h-8 px-3 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f3f4f6] [font-family:'Montserrat',Helvetica] font-medium text-xs text-[#374151] transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={retryMutation.isPending && retryMutation.variables === email.id ? "animate-spin" : ""} />
                          Retry
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setPreviewEmail(email);
                          setPreviewTab("detail");
                        }}
                        className="h-8 px-3 rounded-lg bg-[#ef3e34] hover:bg-[#d63530] text-white [font-family:'Montserrat',Helvetica] font-semibold text-xs transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {previewEmail && (
        <EmailDetailsModal
          email={previewEmail}
          initialTab={previewTab}
          onClose={() => {
            setPreviewEmail(null);
            setPreviewTab("detail");
          }}
        />
      )}
    </>
  );
};
