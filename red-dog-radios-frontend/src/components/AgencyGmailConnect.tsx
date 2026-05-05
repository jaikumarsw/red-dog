"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface Props {
  variant?: "card" | "inline";
  source?: "settings" | "onboarding";
  onConnected?: () => void;
}

export default function AgencyGmailConnect({ 
  variant = "card", 
  source = "settings"
}: Omit<Props, "onConnected">) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const { toast } = useToast();

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["gmail", "self-status"],
    queryFn: async () => {
      const r = await api.get("gmail/oauth/status-self");
      return r.data.data as {
        isConnected: boolean;
        senderEmail: string | null;
        connectedAt?: string;
      };
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const r = await api.get(`gmail/oauth/connect-self?source=${source}`);
      return r.data.data.url as string;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast({
        title: "Could not start Gmail connection",
        description: e?.response?.data?.message ?? "Try again later",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const r = await api.delete("gmail/oauth/disconnect-self");
      return r.data.data;
    },
    onSuccess: () => {
      toast({ title: "Gmail disconnected" });
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#6b7280]">
        <Loader2 size={14} className="animate-spin" /> 
        Checking Gmail status…
      </div>
    );
  }

  const connected = status?.isConnected;

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3">
        {connected ? (
          <>
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-sm font-medium">
              {status.senderEmail}
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setConfirmDisconnect(true)}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Button
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
            className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
          >
            <Mail size={14} className="mr-2" />
            Connect Gmail
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {connected ? (
            <CheckCircle2 size={28} className="text-emerald-600" />
          ) : (
            <Mail size={28} className="text-[#9ca3af]" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-[#111827] mb-1">
            {connected ? "Gmail Connected" : "Connect Your Email"}
          </h3>
          {connected ? (
            <>
              <p className="text-sm text-[#6b7280] mb-3">
                Emails to funders will be sent from{" "}
                <strong>{status.senderEmail}</strong>
              </p>
              <Button
                variant="outline"
                onClick={() => setConfirmDisconnect(true)}
                disabled={disconnectMutation.isPending}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-[#6b7280] mb-3">
                Connect your Gmail so funder emails come from your 
                address. Replies land in your inbox normally. We 
                only send on your behalf — we don&apos;t read your other 
                emails.
              </p>
              <Button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
              >
                {connectMutation.isPending ? (
                  <><Loader2 size={14} className="animate-spin mr-2" /> 
                    Opening Google…</>
                ) : (
                  <><Mail size={14} className="mr-2" /> 
                    Connect Gmail Account</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <AlertDialog 
        open={confirmDisconnect} 
        onOpenChange={setConfirmDisconnect}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
            <AlertDialogDescription>
              You won&apos;t be able to send emails to funders through 
              the platform until you reconnect. Existing emails 
              already sent are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
