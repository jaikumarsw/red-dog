"use client";

import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";

type GmailStatus = {
  isConnected: boolean;
  senderEmail?: string;
};

export function GmailStatusBadge({ organizationId }: { organizationId: string }) {
  const { data } = useQuery<GmailStatus>({
    queryKey: ["admin", "gmail", "status", organizationId],
    queryFn: async () => {
      const res = await adminApi.get(`gmail/oauth/status/${organizationId}`);
      return res.data.data as GmailStatus;
    },
    enabled: !!organizationId,
    retry: false,
  });

  const connected = !!data?.isConnected;
  const sender = data?.senderEmail;

  if (connected) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
        <span className="h-2 w-2 rounded-full bg-green-600" />
        Gmail Connected{sender ? ` · ${sender}` : ""}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
      <span className="h-2 w-2 rounded-full bg-red-600" />
      Not Connected
    </span>
  );
}

