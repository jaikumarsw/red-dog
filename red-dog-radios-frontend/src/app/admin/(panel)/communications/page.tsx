"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Mail, MailOpen, RefreshCw, Loader2 } from "lucide-react";

export default function CommunicationsPage() {
  const [tab, setTab] = useState("all");
  const [orgFilter, setOrgFilter] = useState("");
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  // Sent emails
  const { data: sent, isLoading: sentLoading, refetch: refetchSent } = 
    useQuery({
      queryKey: ["admin", "communications", "sent", orgFilter, page],
      queryFn: async () => {
        const params = new URLSearchParams({ 
          page: String(page), 
          limit: "20" 
        });
        if (orgFilter) params.set("organizationId", orgFilter);
        const r = await adminApi.get(
          `replies/communications?${params.toString()}`
        );
        return r.data.data;
      }
    });

  // Replies
  const { data: replies, isLoading: repliesLoading, refetch: refetchReplies } = 
    useQuery({
      queryKey: ["admin", "communications", "replies", orgFilter, page],
      queryFn: async () => {
        const params = new URLSearchParams({ 
          page: String(page), 
          limit: "20" 
        });
        if (orgFilter) params.set("organizationId", orgFilter);
        const r = await adminApi.get(`replies?${params.toString()}`);
        return r.data.data;
      }
    });

  // Manual poll trigger
  const pollMutation = useMutation({
    mutationFn: async () => {
      const r = await adminApi.post("replies/poll-now");
      return r.data.data;
    },
    onSuccess: (result) => {
      toast({ 
        title: "Poll complete", 
        description: `${result.processed} agencies polled, ${result.repliesFound} new replies found` 
      });
      refetchSent();
      refetchReplies();
    },
    onError: (err: any) => {
      toast({ 
        title: "Poll failed", 
        description: err?.response?.data?.message ?? "Try again",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold [font-family:'Montserrat',Helvetica]">
            Communications
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Track outbound emails and replies across all agencies. 
            Polled every 15 minutes.
          </p>
        </div>
        <Button
          onClick={() => pollMutation.mutate()}
          disabled={pollMutation.isPending}
          className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
        >
          {pollMutation.isPending ? (
            <><Loader2 className="animate-spin mr-2" size={16} /> Polling…</>
          ) : (
            <><RefreshCw size={16} className="mr-2" /> Poll Now</>
          )}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sent">
            Sent Emails ({sent?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="replies">
            Replies Received ({replies?.total ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="mt-4">
          {sentLoading ? (
            <p>Loading…</p>
          ) : sent?.communications?.length === 0 ? (
            <Card className="p-12 text-center">
              <Mail size={48} className="mx-auto text-[#9ca3af] mb-3" />
              <p className="font-semibold">No emails sent yet</p>
              <p className="text-sm text-[#6b7280]">
                When agencies send emails through the platform, 
                they'll appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {sent?.communications?.map((c: any) => (
                <Card key={c._id} className="p-4 hover:bg-[#fafafa] cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail size={14} className="text-emerald-600" />
                        <span className="text-xs font-semibold text-[#6b7280]">
                          {c.relatedOrganization?.name ?? "Unknown agency"}
                        </span>
                        <span className="text-xs text-[#9ca3af]">→</span>
                        <span className="text-xs text-[#6b7280]">
                          {c.recipient}
                        </span>
                      </div>
                      <p className="font-semibold text-[#111827]">
                        {c.subject}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-[#6b7280]">
                        <span>{new Date(c.sentAt).toLocaleString()}</span>
                        {c.replyCount > 0 && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            💬 {c.replyCount} {c.replyCount === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="replies" className="mt-4">
          {repliesLoading ? (
            <p>Loading…</p>
          ) : replies?.replies?.length === 0 ? (
            <Card className="p-12 text-center">
              <MailOpen size={48} className="mx-auto text-[#9ca3af] mb-3" />
              <p className="font-semibold">No replies detected yet</p>
              <p className="text-sm text-[#6b7280]">
                Replies are polled from agency inboxes every 15 minutes. 
                Click "Poll Now" to check immediately.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {replies?.replies?.map((r: any) => (
                <Card key={r._id} className="p-4 hover:bg-[#fafafa] cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <MailOpen size={14} className="text-blue-600" />
                    <span className="text-xs font-semibold text-[#6b7280]">
                      {r.from}
                    </span>
                    <span className="text-xs text-[#9ca3af]">→</span>
                    <span className="text-xs text-[#6b7280]">
                      {r.organizationId?.name}
                    </span>
                    {!r.adminViewed && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <p className="font-semibold">{r.subject}</p>
                  <p className="text-sm text-[#6b7280] mt-1 line-clamp-2">
                    {r.body?.substring(0, 200)}
                  </p>
                  <p className="text-xs text-[#9ca3af] mt-2">
                    {new Date(r.receivedAt).toLocaleString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
