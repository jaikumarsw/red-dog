"use client";

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, MailOpen, ArrowLeft, Send, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type ReplyItem = {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  agencyViewed: boolean;
  ashleenAnalysis: string | null;
  ashleenSuggestedSubject: string | null;
  ashleenSuggestion: string | null;
  ashleenError: string | null;
  ashleenGeneratedAt: string | null;
  ashleenReady?: boolean;
  body: string | null;
  htmlBody: string | null;
  grantTitle: string;
  funder: string;
  originalSubject: string;
};

type ApiReply = {
  _id: string;
  from: string;
  subject: string;
  receivedAt: string;
  agencyViewed: boolean;
  ashleenAnalysis?: string | null;
  ashleenSuggestedSubject?: string | null;
  ashleenSuggestion?: string | null;
  ashleenError?: string | null;
  ashleenGeneratedAt?: string | null;
  ashleenReady?: boolean;
  body?: string | null;
  htmlBody?: string | null;
  outboxId?: {
    relatedGrant?: {
      projectTitle?: string;
      opportunity?: {
        title?: string;
        funder?: string;
      };
    };
    subject?: string;
  };
};

// ─── List item card ───────────────────────────────────────────────────────────

const ReplyCard = ({
  reply,
  onClick,
}: {
  reply: ReplyItem;
  onClick: () => void;
}) => {
  const fmtDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch { return s; }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 sm:p-5 transition-all hover:shadow-md ${
        reply.agencyViewed
          ? 'bg-white border-[#f0f0f0]'
          : 'bg-[#fffbf9] border-[#ef3e34]/20 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            reply.agencyViewed ? 'bg-gray-100' : 'bg-[#ef3e34]/10'
          }`}>
            {reply.agencyViewed
              ? <MailOpen size={16} className="text-gray-400" />
              : <Mail size={16} className="text-[#ef3e34]" />}
          </div>
          <div className="min-w-0 flex flex-col gap-1">
            <p className={`text-sm leading-snug break-words [font-family:'Montserrat',Helvetica] ${
              reply.agencyViewed ? 'font-medium text-[#374151]' : 'font-bold text-[#111827]'
            }`}>
              {reply.subject || '(No subject)'}
            </p>
            <p className="text-xs text-[#9ca3af] [font-family:'Montserrat',Helvetica]">
              From: <span className="text-[#6b7280]">{reply.from}</span>
            </p>
            <p className="text-xs text-[#9ca3af] [font-family:'Montserrat',Helvetica]">
              Re: <span className="text-[#6b7280]">{reply.grantTitle || reply.funder}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-[10px] text-[#9ca3af] [font-family:'Montserrat',Helvetica] whitespace-nowrap">
            {fmtDate(reply.receivedAt)}
          </span>
          {reply.ashleenReady && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#16a34a]">
              ✦ Ashleen ready
            </span>
          )}
          {!reply.ashleenReady && !reply.ashleenError && (
            <span className="inline-flex items-center rounded-full bg-[#fef9c3] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#b45309]">
              Analyzing...
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

// ─── Detail panel ─────────────────────────────────────────────────────────────

const ReplyDetail = ({
  reply,
  onBack,
}: {
  reply: ReplyItem;
  onBack: () => void;
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [editedSubject, setEditedSubject] = useState(reply.ashleenSuggestedSubject || `Re: ${reply.subject}`);
  const [editedBody, setEditedBody] = useState(reply.ashleenSuggestion || '');

  useEffect(() => {
    setEditedSubject(reply.ashleenSuggestedSubject || `Re: ${reply.subject}`);
    setEditedBody(reply.ashleenSuggestion || '');
  }, [reply.id]);

  const handleCopySuggestion = () => {
    if (!editedBody) return;
    const text = `Subject: ${editedSubject}\n\n${editedBody}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Copied to clipboard', description: 'Paste into your email client to send.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendViaOutbox = async () => {
    if (!editedBody.trim()) {
      toast({ title: 'Cannot send empty reply', variant: 'destructive' });
      return;
    }
    try {
      await api.post('/outbox/send-or-schedule', {
        subject: editedSubject,
        htmlBody: `<p>${editedBody.replace(/\n/g, '<br>')}</p>`,
        recipient: reply.from.match(/<(.+)>/)?.[1] || reply.from,
        emailType: 'outreach',
        sendMode: 'now',
      });
      toast({ title: 'Reply sent', description: 'Your response has been sent.' });
      onBack();
    } catch {
      toast({ title: 'Send failed', description: 'Could not send. Try copying and sending manually.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#6b7280] hover:text-[#111827] transition-colors w-fit [font-family:'Montserrat',Helvetica] text-sm"
      >
        <ArrowLeft size={16} /> Back to Inbox
      </button>

      {/* Reply header */}
      <div className="bg-white rounded-xl border border-[#f0f0f0] p-5 flex flex-col gap-3">
        <h2 className="[font-family:'Oswald',Helvetica] font-bold text-[#111827] text-lg uppercase tracking-wide">
          {reply.subject || '(No subject)'}
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs [font-family:'Montserrat',Helvetica] text-[#9ca3af]">
          <span>From: <span className="text-[#374151] font-medium">{reply.from}</span></span>
          <span>Grant: <span className="text-[#374151] font-medium">{reply.grantTitle || reply.funder}</span></span>
          <span>Received: <span className="text-[#374151] font-medium">
            {new Date(reply.receivedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span></span>
        </div>

        {/* Full reply body */}
        {reply.htmlBody ? (
          <iframe
            title="funder-reply"
            sandbox="allow-same-origin"
            srcDoc={reply.htmlBody}
            className="w-full border border-[#e5e7eb] rounded-xl bg-white h-[200px] mt-1"
          />
        ) : reply.body ? (
          <div className="bg-[#f9fafb] rounded-xl border border-[#e5e7eb] p-4 text-sm text-[#374151] [font-family:'Montserrat',Helvetica] whitespace-pre-wrap leading-relaxed">
            {reply.body}
          </div>
        ) : (
          <p className="text-sm text-[#9ca3af] italic [font-family:'Montserrat',Helvetica]">No message body available.</p>
        )}
      </div>

      {/* Ashleen's analysis */}
      {reply.ashleenAnalysis && (
        <div className="bg-[#fffbf9] border border-[#ef3e34]/20 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#ef3e34] flex items-center justify-center flex-shrink-0">
              <span className="[font-family:'Montserrat',Helvetica] font-bold text-white text-[10px]">A</span>
            </div>
            <span className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm">
              Ashleen&apos;s Analysis
            </span>
          </div>
          <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151] leading-relaxed">
            {reply.ashleenAnalysis}
          </p>
        </div>
      )}

      {/* Ashleen's suggested reply */}
      {reply.ashleenSuggestion && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#ef3e34] flex items-center justify-center flex-shrink-0">
                <span className="[font-family:'Montserrat',Helvetica] font-bold text-white text-[10px]">A</span>
              </div>
              <span className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-sm">
                Ashleen&apos;s Suggested Reply
              </span>
              <span className="text-[10px] text-[#9ca3af] italic [font-family:'Montserrat',Helvetica]">
                (Edit before sending)
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopySuggestion}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] [font-family:'Montserrat',Helvetica] font-bold text-[10px] uppercase tracking-wide text-[#374151] transition-colors"
              >
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleSendViaOutbox}
                className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-[#ef3e34] hover:bg-[#d63530] text-white [font-family:'Montserrat',Helvetica] font-bold text-[10px] uppercase tracking-wide transition-colors"
              >
                <Send size={12} />
                Send Now
              </button>
            </div>
          </div>

          {/* Editable subject */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] [font-family:'Montserrat',Helvetica]">
              Subject
            </label>
            <input
              type="text"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 [font-family:'Montserrat',Helvetica] text-sm text-[#111827] focus:border-[#ef3e34] focus:outline-none focus:ring-2 focus:ring-[#ef3e34]/20"
            />
          </div>

          {/* Editable body */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] [font-family:'Montserrat',Helvetica]">
              Reply Body
            </label>
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-[#e5e7eb] px-4 py-3 [font-family:'Montserrat',Helvetica] text-sm text-[#374151] focus:border-[#ef3e34] focus:outline-none focus:ring-2 focus:ring-[#ef3e34]/20 leading-relaxed resize-y min-h-[300px]"
            />
          </div>

          <p className="text-[10px] text-[#9ca3af] [font-family:'Montserrat',Helvetica] italic">
            Edit the subject and body above before sending. Your changes will be sent, not Ashleen&apos;s original draft.
          </p>
        </div>
      )}

      {/* Ashleen still analyzing */}
      {!reply.ashleenSuggestion && !reply.ashleenError && (
        <div className="bg-[#fef9c3] border border-[#fde68a] rounded-xl p-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#ef3e34] flex items-center justify-center flex-shrink-0">
            <span className="[font-family:'Montserrat',Helvetica] font-bold text-white text-[10px]">A</span>
          </div>
          <p className="text-sm text-[#b45309] [font-family:'Montserrat',Helvetica]">
            Ashleen is analyzing this reply and will have a suggestion shortly. Refresh to check.
          </p>
        </div>
      )}

      {/* Ashleen error */}
      {reply.ashleenError && (
        <div className="bg-[#fff1f0] border border-[#fecaca] rounded-xl p-4">
          <p className="text-sm text-[#dc2626] [font-family:'Montserrat',Helvetica]">
            Ashleen could not generate a suggestion for this reply. You can reply manually from your email client.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Main Inbox component ─────────────────────────────────────────────────────

export const Inbox = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['agency-replies'],
    queryFn: async () => {
      const res = await api.get('/replies/agency/replies', { params: { limit: 50 } });
      return res.data.data as {
        replies: ApiReply[];
        total: number;
        unread: number;
      };
    },
    refetchInterval: 60000, // refresh every 60s
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['agency-reply-detail', selectedId],
    queryFn: async () => {
      const res = await api.get(`/replies/agency/replies/${selectedId}`);
      return res.data.data.reply;
    },
    enabled: !!selectedId,
  });

  const mapReply = (r: ApiReply): ReplyItem => ({
    id: r._id,
    from: r.from,
    subject: r.subject,
    receivedAt: r.receivedAt,
    agencyViewed: r.agencyViewed,
    ashleenAnalysis: r.ashleenAnalysis ?? null,
    ashleenSuggestedSubject: r.ashleenSuggestedSubject ?? null,
    ashleenSuggestion: r.ashleenSuggestion ?? null,
    ashleenError: r.ashleenError ?? null,
    ashleenGeneratedAt: r.ashleenGeneratedAt ?? null,
    ashleenReady: r.ashleenReady ?? false,
    body: r.body ?? null,
    htmlBody: r.htmlBody ?? null,
    grantTitle: r.outboxId?.relatedGrant?.projectTitle
      || r.outboxId?.relatedGrant?.opportunity?.title
      || '',
    funder: r.outboxId?.relatedGrant?.opportunity?.funder || '',
    originalSubject: r.outboxId?.subject || '',
  });

  const replies = (data?.replies || []).map(mapReply);
  const unread = data?.unread || 0;

  const handleSelectReply = (id: string) => {
    setSelectedId(id);
    // Optimistically mark as viewed in list
    queryClient.setQueryData(['agency-replies'], (old: { replies: ApiReply[]; unread: number } | undefined) => {
      if (!old) return old;
      return {
        ...old,
        replies: (old.replies || []).map((r: ApiReply) =>
          r._id === id ? { ...r, agencyViewed: true } : r
        ),
        unread: Math.max(0, (old.unread || 0) - 1),
      };
    });
  };

  // Show detail view
  if (selectedId) {
    const detail = detailData ? mapReply(detailData) : null;
    return (
      <div className="flex h-full min-w-0 flex-col gap-5 bg-neutral-50 p-4 sm:p-6">
        {detailLoading || !detail ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm text-[#9ca3af] [font-family:'Montserrat',Helvetica]">Loading...</span>
          </div>
        ) : (
          <ReplyDetail reply={detail} onBack={() => setSelectedId(null)} />
        )}
      </div>
    );
  }

  // Show list view
  return (
    <div className="flex h-full min-w-0 flex-col gap-5 bg-neutral-50 p-4 sm:p-6">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl sm:text-3xl tracking-[0.5px] uppercase leading-tight">
            Inbox
          </h1>
          <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-sm">
            Funder replies to your outreach emails
          </p>
        </div>
        {unread > 0 && (
          <span className="flex-shrink-0 rounded-full bg-[#ef3e34] px-3 py-1 text-xs font-bold text-white [font-family:'Montserrat',Helvetica]">
            {unread} unread
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-sm text-[#9ca3af] [font-family:'Montserrat',Helvetica]">Loading inbox...</span>
        </div>
      ) : replies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Mail size={40} className="text-[#e5e7eb]" />
          <p className="text-sm text-[#9ca3af] [font-family:'Montserrat',Helvetica]">
            No replies yet. When funders respond to your outreach, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {replies.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              onClick={() => handleSelectReply(reply.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
