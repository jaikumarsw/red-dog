"use client";

import { useState, useEffect } from "react";
import { Clock, X, Zap } from "lucide-react";

/* ── Mock data ─────────────────────────────────────────── */
const mockEmails = [
  {
    id: 1,
    to: "grants@cha.org",
    subject: "Weekly Digest – March 24, 2026",
    status: "sent",
    created: "Mar 28, 14:57",
    sentAt: "Mar 28, 19:57",
    body: `Dear Grants Team,

I am writing on behalf of Red Dog Radio to express our interest in the Community Radio Sustainability grant. Our station has been serving the Austin community for over 15 years, providing independent programming that gives voice to underrepresented communities.

We believe our mission strongly aligns with the goals of this grant program and would welcome the opportunity to discuss a potential partnership.

Best regards,
Red Dog Radio Team`,
  },
  {
    id: 2,
    to: "info@techforall.org",
    subject: "Application Reminder: MacArthur D.",
    status: "failed",
    created: "Mar 28, 14:57",
    sentAt: "Mar 28, 14:57",
    body: `Dear Tech for All Team,

This is a reminder that the MacArthur Digital Equity Fund application deadline is approaching. Please review the pre-filled application and submit before the deadline.

Best regards,
Red Dog Radios Platform`,
  },
  {
    id: 3,
    to: "grants@reddogradios.com",
    subject: "Weekly Digest – March 24, 2026",
    status: "sent",
    created: "Mar 28, 14:57",
    sentAt: "Mar 28, 14:57",
    body: `Dear Red Dog Radio Team,

Your weekly grant intelligence digest is ready. This week we identified 3 high-fit opportunities tailored to your organization's mission and focus areas.

Best regards,
Ashleen AI`,
  },
  {
    id: 4,
    to: "info@artsbridge.org",
    subject: "High-Fit Alert: Youth Arts Education.",
    status: "sent",
    created: "Mar 28, 14:57",
    sentAt: "Mar 28, 14:57",
    body: `Dear Arts Bridge Foundation,

We've identified a high-fit grant opportunity: the Youth Arts Education Fund from Ford Foundation. With a 95% fit score, this is an exceptional match for your mission.

Apply now — deadline is May 30, 2026.

Best regards,
Ashleen AI`,
  },
];

type Email = typeof mockEmails[0];

/* ── Status config ─────────────────────────────────────── */
const statusBadge = (s: string) => {
  if (s === "sent") return "bg-[#dcfce7] text-[#16a34a]";
  if (s === "failed") return "bg-[#fee2e2] text-[#dc2626]";
  return "bg-[#fef9c3] text-[#b45309]";
};

/* ── Email Details Modal ───────────────────────────────── */
const EmailDetailsModal = ({ email, onClose }: { email: Email; onClose: () => void }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);
  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[500px] mx-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-[#f3f4f6]">
        <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-xl tracking-[0.5px] uppercase">Email Details</h2>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors">
          <X size={14} className="text-[#6b7280]" />
        </button>
      </div>

      <div className="px-7 py-6 flex flex-col gap-5">
        {/* To + Status */}
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

        {/* Sent At */}
        <div className="flex flex-col gap-1">
          <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Sent At</span>
          <span className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm">{email.sentAt}</span>
        </div>

        {/* Subject */}
        <div className="flex flex-col gap-1">
          <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Subject</span>
          <span className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm">{email.subject}</span>
        </div>

        {/* Email Body */}
        <div className="flex flex-col gap-1.5">
          <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Email Body</span>
          <div className="border border-[#e5e7eb] rounded-xl p-4 bg-[#fafafa] max-h-48 overflow-y-auto">
            <pre className="[font-family:'Montserrat',Helvetica] font-normal text-[#374151] text-xs leading-5 whitespace-pre-wrap">
              {email.body}
            </pre>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end px-7 py-5 border-t border-[#f3f4f6]">
        <button onClick={onClose} className="h-10 px-6 bg-[#ef3e34] hover:bg-[#d63530] text-white rounded-lg [font-family:'Montserrat',Helvetica] font-semibold text-sm transition-colors">
          Close
        </button>
      </div>
    </div>
  </div>
  );
};

/* ── Main Page ─────────────────────────────────────────── */
export const Outbox = () => {
  const [previewEmail, setPreviewEmail] = useState<Email | null>(null);

  const pending = mockEmails.filter((e) => e.status === "pending").length;
  const sent = mockEmails.filter((e) => e.status === "sent").length;
  const failed = mockEmails.filter((e) => e.status === "failed").length;

  return (
    <>
      <div className="flex h-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase leading-tight tracking-[0.5px] text-black sm:text-3xl break-words">
            Communications Outbox
          </h1>
          <p className="[font-family:'Montserrat',Helvetica] text-sm font-normal text-[#6b7280] max-w-prose break-words">
            Monitor and process outbound system emails
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="flex flex-col gap-0.5 rounded-xl border border-[#fef08a] bg-[#fefce8] px-4 py-4 sm:px-5">
            <span className="[font-family:'Oswald',Helvetica] text-2xl font-bold leading-tight text-[#b45309] sm:text-3xl">{pending}</span>
            <span className="[font-family:'Montserrat',Helvetica] text-xs font-semibold uppercase tracking-[0.6px] text-[#b45309]">Pending</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-4 sm:px-5">
            <span className="[font-family:'Oswald',Helvetica] text-2xl font-bold leading-tight text-[#16a34a] sm:text-3xl">{sent}</span>
            <span className="[font-family:'Montserrat',Helvetica] text-xs font-semibold uppercase tracking-[0.6px] text-[#16a34a]">Sent</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-xl border border-[#fecaca] bg-[#fff1f0] px-4 py-4 sm:px-5">
            <span className="[font-family:'Oswald',Helvetica] text-2xl font-bold leading-tight text-[#dc2626] sm:text-3xl">{failed}</span>
            <span className="[font-family:'Montserrat',Helvetica] text-xs font-semibold uppercase tracking-[0.6px] text-[#dc2626]">Failed</span>
          </div>
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="border-b border-[#f3f4f6] px-4 py-3 sm:px-5">
            <span className="[font-family:'Montserrat',Helvetica] text-xs font-semibold uppercase tracking-[0.6px] text-[#9ca3af]">
              {mockEmails.length} Emails
            </span>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[#f3f4f6]">
                  {["Recipient", "Subject", "Status", "Created", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left lg:px-5">
                      <span className="[font-family:'Montserrat',Helvetica] text-xs font-semibold uppercase tracking-[0.6px] text-[#9ca3af]">
                        {h}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockEmails.map((email, idx) => (
                  <tr
                    key={email.id}
                    data-testid={`row-email-${email.id}`}
                    className={`transition-colors hover:bg-[#fafafa] ${idx < mockEmails.length - 1 ? "border-b border-[#f9fafb]" : ""}`}
                  >
                    <td className="px-4 py-4 lg:px-5">
                      <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold break-all text-[#111827]">{email.to}</span>
                    </td>
                    <td className="px-4 py-4 lg:px-5">
                      <span className="[font-family:'Montserrat',Helvetica] text-sm font-normal break-words text-[#374151]">{email.subject}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 lg:px-5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 [font-family:'Montserrat',Helvetica] text-xs font-semibold capitalize ${statusBadge(email.status)}`}
                      >
                        {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 lg:px-5">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="shrink-0 text-[#9ca3af]" />
                        <span className="[font-family:'Montserrat',Helvetica] text-sm font-normal text-[#9ca3af]">{email.created}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 lg:px-5">
                      <button
                        type="button"
                        onClick={() => setPreviewEmail(email)}
                        data-testid={`button-preview-email-${email.id}`}
                        className="flex items-center gap-1 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#ef3e34] hover:underline"
                      >
                        <Zap size={12} className="shrink-0" />
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col divide-y divide-[#f9fafb] p-0 md:hidden">
            {mockEmails.map((email) => (
              <li key={email.id} data-testid={`row-email-${email.id}`} className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="min-w-0">
                    <p className="[font-family:'Montserrat',Helvetica] text-xs font-semibold uppercase tracking-[0.5px] text-[#9ca3af]">Recipient</p>
                    <p className="mt-0.5 [font-family:'Montserrat',Helvetica] text-sm font-semibold break-all text-[#111827]">{email.to}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="[font-family:'Montserrat',Helvetica] text-xs font-semibold uppercase tracking-[0.5px] text-[#9ca3af]">Subject</p>
                    <p className="mt-0.5 [font-family:'Montserrat',Helvetica] text-sm font-normal break-words text-[#374151]">{email.subject}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 [font-family:'Montserrat',Helvetica] text-xs font-semibold capitalize ${statusBadge(email.status)}`}
                    >
                      {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="shrink-0 text-[#9ca3af]" />
                      <span className="[font-family:'Montserrat',Helvetica] text-xs font-normal text-[#9ca3af]">{email.created}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewEmail(email)}
                    data-testid={`button-preview-email-${email.id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#ef3e34]/30 bg-[#fff4f4] py-2.5 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#ef3e34] transition-colors hover:bg-[#ffe8e8]"
                  >
                    <Zap size={14} className="shrink-0" />
                    Preview
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {previewEmail && <EmailDetailsModal email={previewEmail} onClose={() => setPreviewEmail(null)} />}
    </>
  );
};
