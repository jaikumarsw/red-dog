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

type EmailStatus = {
  isConnected: boolean;
  email: string | null;
  provider: string | null;
  connectedAt?: string;
};

const providerLabel = (provider: string | null) => {
  if (!provider) return "Email";
  const map: Record<string, string> = {
    google: "Gmail",
    microsoft: "Outlook",
    yahoo: "Yahoo Mail",
    imap: "Email (IMAP)",
  };
  return map[provider.toLowerCase()] ?? provider;
};

export default function AgencyGmailConnect({
  variant = "card",
  source = "settings",
}: Omit<Props, "onConnected">) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const { toast } = useToast();

  const { data: status, isLoading, refetch } = useQuery<EmailStatus>({
    queryKey: ["nylas", "self-status"],
    queryFn: async () => {
      const r = await api.get("nylas/oauth/status-self");
      return r.data.data as EmailStatus;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const r = await api.get(`nylas/oauth/connect-self?source=${source}`);
      return r.data.data.url as string;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast({
        title: "Could not start email connection",
        description: e?.response?.data?.message ?? "Try again later",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const r = await api.delete("nylas/oauth/disconnect-self");
      return r.data.data;
    },
    onSuccess: () => {
      toast({ title: "Email disconnected" });
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#6b7280]">
        <Loader2 size={14} className="animate-spin" />
        Checking email status…
      </div>
    );
  }

  const connected = status?.isConnected;
  const label = providerLabel(status?.provider ?? null);

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3">
        {connected ? (
          <>
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-sm font-medium">{status.email}</span>
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
            Connect Email
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
            {connected ? `${label} Connected` : "Connect Your Email"}
          </h3>
          {connected ? (
            <>
              <p className="text-sm text-[#6b7280] mb-3">
                Emails to funders will be sent from{" "}
                <strong>{status.email}</strong>
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
                Connect your email so funder emails come from your address.
                Works with Gmail, Outlook, Yahoo, or any email provider.
                Replies land in your inbox normally — we only send on your
                behalf.
              </p>
              <Button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
              >
                {connectMutation.isPending ? (
                  <><Loader2 size={14} className="animate-spin mr-2" />Connecting…</>
                ) : (
                  <><Mail size={14} className="mr-2" />Connect Email Account</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Email?</AlertDialogTitle>
            <AlertDialogDescription>
              You won&apos;t be able to send emails to funders through the
              platform until you reconnect. Existing emails already sent are
              not affected.
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
