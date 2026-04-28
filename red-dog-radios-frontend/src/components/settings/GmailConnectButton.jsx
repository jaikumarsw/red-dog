"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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

export default function GmailConnectButton({ organizationId }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const statusKey = useMemo(
    () => ["gmail", "oauth", "status", organizationId],
    [organizationId]
  );

  const {
    data: status,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: statusKey,
    queryFn: async () => {
      const res = await adminApi.get(`gmail/oauth/status/${organizationId}`);
      return res.data.data;
    },
    enabled: !!organizationId,
    retry: false,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await adminApi.get("gmail/oauth/connect", {
        params: { organizationId },
      });
      return res.data.data;
    },
    onSuccess: (d) => {
      const url = d?.url;
      if (!url) {
        toast({
          title: "Error",
          description: "No OAuth URL returned from server.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Opening Google consent screen…" });
      window.location.href = url;
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ||
        "Could not start Gmail connection. Make sure you are logged in as admin.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await adminApi.delete(`gmail/oauth/disconnect/${organizationId}`);
    },
    onSuccess: async () => {
      toast({ title: "Gmail disconnected" });
      setConfirmOpen(false);
      await qc.invalidateQueries({ queryKey: statusKey });
      await refetch();
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ||
        "Disconnect failed. Make sure you are logged in as admin.";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setConfirmOpen(false);
    },
  });

  // If the backend updated connection in another tab, allow this component to reflect it.
  useEffect(() => {
    if (!organizationId) return;
    // no-op; react-query cache handles this. Keeping effect for future hooks.
  }, [organizationId]);

  const connected = !!status?.isConnected;
  const senderEmail = status?.senderEmail || "—";
  const connectedAt = status?.connectedAt
    ? new Date(status.connectedAt).toLocaleString()
    : "—";

  const errorMessage =
    error?.response?.data?.message ||
    error?.message ||
    "Could not load Gmail status.";

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-4">
          <div className="text-sm text-[#6b7280] [font-family:'Montserrat',Helvetica]">
            Checking Gmail connection…
          </div>
          <Button variant="outline" disabled className="border-[#e5e7eb]">
            Loading…
          </Button>
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700 [font-family:'Montserrat',Helvetica]">
            Gmail status error
          </p>
          <p className="mt-1 text-sm text-red-700/90 [font-family:'Montserrat',Helvetica]">
            {errorMessage}
          </p>
          <div className="mt-3">
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-100"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : connected ? (
        <div className="flex flex-col gap-3 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#166534]">
                  Gmail Connected
                </span>
              </div>
              <div className="[font-family:'Montserrat',Helvetica] text-xs text-[#166534]">
                Sender: <span className="font-semibold">{senderEmail}</span>
              </div>
              <div className="[font-family:'Montserrat',Helvetica] text-xs text-[#166534]">
                Connected: <span className="font-semibold">{connectedAt}</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setConfirmOpen(true)}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
            <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
              Not Connected
            </span>
          </div>
          <Button
            className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
          >
            {connectMutation.isPending ? "Generating URL…" : "Connect Gmail"}
          </Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will stop Gmail sending for this agency.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => disconnectMutation.mutate()}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

