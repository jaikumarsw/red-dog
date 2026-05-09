"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, X, Zap, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { qk } from "@/lib/queryKeys";

type Email = {
  id: string;
  to: string;
  subject: string;
  status: string;
  created: string;
  sentAt: string;
  body: string;
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
  senderEmail: e.senderEmail,
  sentViaGmail: e.sentViaGmail,
});

const statusBadge = (s: string) => {
  if (s === "sent") return "bg-[#dcfce7] text-[#16a34a]";
  if (s === "failed") return "bg-[#fee2e2] text-[#dc2626]";
  return "bg-[#fef9c3] text-[#b45309]";
};

const EmailDetailsModal = ({
  email,
  onClose,
}: {
  email: Email;
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-0 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full h-full sm:h-auto sm:max-w-[720px] sm:rounded-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 border-b border-[#f3f4f6] shrink-0">
          <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-lg tracking-[0.5px] uppercase">Email Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors">
            <X size={16} className="text-[#6b7280]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <span className="[font-family:'Montserrat',Helvetica] text-[#9ca3af] text-[10px] uppercase tracking-wider font-bold">To</span>
              <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm break-all leading-tight">{email.to}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="[font-family:'Montserrat',Helvetica] text-[#9ca3af] text-[10px] uppercase tracking-wider font-bold">Status</span>
              <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full [font-family:'Montserrat',Helvetica] font-bold text-[9px] uppercase tracking-wider ${statusBadge(email.status)}`}>
                {email.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <span className="[font-family:'Montserrat',Helvetica] text-[#9ca3af] text-[10px] uppercase tracking-wider font-bold">Sent Via</span>
              <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm">
                {email.sentViaNylas
                  ? `${email.provider ?? "Email"} (Nylas)`
                  : email.sentViaGmail
                  ? "Gmail (OAuth2)"
                  : "SMTP"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="[font-family:'Montserrat',Helvetica] text-[#9ca3af] text-[10px] uppercase tracking-wider font-bold">Sender Email</span>
              <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm break-all leading-tight">
                {email.senderEmail || "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="[font-family:'Montserrat',Helvetica] text-[#9ca3af] text-[10px] uppercase tracking-wider font-bold">Sent At</span>
            <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm leading-tight">{email.sentAt}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="[font-family:'Montserrat',Helvetica] text-[#9ca3af] text-[10px] uppercase tracking-wider font-bold">Subject</span>
            <span className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-[15px] leading-snug">{email.subject}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="[font-family:'Montserrat',Helvetica] text-[#9ca3af] text-[10px] uppercase tracking-wider font-bold">Email Body</span>
            <iframe
              title="outreach-preview"
              sandbox="allow-same-origin"
              srcDoc={email.body || "<p>(empty)</p>"}
              className="border border-[#e5e7eb] rounded-xl bg-white h-[280px] w-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-end px-5 py-4 sm:px-6 sm:py-4 border-t border-[#f3f4f6] shrink-0">
          <button onClick={onClose} className="h-9 w-full sm:w-auto px-6 bg-[#ef3e34] hover:bg-[#d63530] text-white rounded-lg [font-family:'Montserrat',Helvetica] font-bold text-xs uppercase tracking-wider transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const Outbox = () => {
  const [previewEmail, setPreviewEmail] = useState<Email | null>(null);
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

  const sendNowMutation = useMutation({
    mutationFn: (id: string) => api.post(`/outbox/${id}/send`),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Email[]>(qk.outbox(), (prev = []) =>
        prev.map((e) => e.id === id ? { ...e, status: "sent", sentAt: fmtDate(new Date().toISOString()) } : e)
      );
      toast({ title: "Email sent" });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to send email.";
      toast({ title: "Send failed", description: msg, variant: "destructive" });
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
            Outbox
          </h1>
          <p className="[font-family:'Montserrat',Helvetica] text-sm font-normal text-[#6b7280] max-w-prose break-words">
            Track emails sent from your account
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
                  <div key={email.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 sm:px-5 hover:bg-[#fafafa] transition-colors">
                    <div className="min-w-0 flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm truncate max-w-full">
                          {email.subject}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full [font-family:'Montserrat',Helvetica] font-semibold text-[10px] uppercase tracking-wide shrink-0 ${statusBadge(email.status)}`}>
                            {email.status}
                          </span>
                          {email.status === "sent" && (
                            email.sentViaGmail ? (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800 shrink-0">
                                via Gmail
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600 shrink-0">
                                via SMTP
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs truncate">To: {email.to}</span>
                      <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-[10px] font-bold uppercase tracking-wider">Created: {email.created}</span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {email.status === "failed" && (
                        <button
                          onClick={() => retryMutation.mutate(email.id)}
                          disabled={retryMutation.isPending && retryMutation.variables === email.id}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f3f4f6] [font-family:'Montserrat',Helvetica] font-bold text-[10px] uppercase tracking-wide text-[#374151] transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={retryMutation.isPending && retryMutation.variables === email.id ? "animate-spin" : ""} />
                          Retry
                        </button>
                      )}
                      {(email.status === "pending" || email.status === "queued") && (
                        <button
                          onClick={() => sendNowMutation.mutate(email.id)}
                          disabled={sendNowMutation.isPending && sendNowMutation.variables === email.id}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f3f4f6] [font-family:'Montserrat',Helvetica] font-bold text-[10px] uppercase tracking-wide text-[#374151] transition-colors disabled:opacity-50"
                        >
                          {sendNowMutation.isPending && sendNowMutation.variables === email.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Zap size={12} className="text-[#f59e0b]" />
                          )}
                          Send Now
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setPreviewEmail(email);
                        }}
                        className="h-8 px-4 rounded-lg bg-[#ef3e34] hover:bg-[#d63530] text-white [font-family:'Montserrat',Helvetica] font-bold text-[10px] uppercase tracking-wide transition-colors"
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
          onClose={() => {
            setPreviewEmail(null);
          }}
        />
      )}
    </>
  );
};
