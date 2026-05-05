"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";

function formatList(val: unknown) {
  if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
  return "—";
}

const parseMoney = (raw: string | undefined): number | undefined => {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
};

type ApplicantRow = {
  organization?: { name?: string; location?: string };
  status?: string;
  createdAt?: string;
  projectTitle?: string;
};

export default function AdminFunderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { toast, dismiss } = useToast();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const [limitInput, setLimitInput] = useState("0");
  const [awardAmountInput, setAwardAmountInput] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const savingToastIdRef = useRef<string | null>(null);
  const unlockingToastIdRef = useRef<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "funder", id],
    queryFn: async () => {
      const res = await adminApi.get(`admin/funders/${id}`);
      return res.data.data as Record<string, unknown>;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!data) return;
    const current = (data.maxApplicationsAllowed as number | undefined) ?? 0;
    setLimitInput(String(current));
    setAwardAmountInput(String(data.awardAmount ?? ""));
    setDeadlineInput(data.deadline ? String(data.deadline).slice(0, 10) : "");
  }, [data]);

  const del = useMutation({
    mutationFn: () => adminApi.delete(`admin/funders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "funders"] });
      router.push("/admin/funders");
    },
  });

  const setLimit = useMutation({
    mutationFn: (maxApplicationsAllowed: number) =>
      adminApi.put(`admin/funders/${id}/set-limit`, { maxApplicationsAllowed }),
    onSuccess: async () => {
      if (savingToastIdRef.current) dismiss(savingToastIdRef.current);
      savingToastIdRef.current = null;
      await qc.invalidateQueries({ queryKey: ["admin", "funder", id] });
      toast({ title: "Limit saved" });
    },
    onError: (err: unknown) => {
      if (savingToastIdRef.current) dismiss(savingToastIdRef.current);
      savingToastIdRef.current = null;
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const saveQuickFields = useMutation({
    mutationFn: () =>
      adminApi.put(`admin/funders/${id}`, {
        awardAmount: parseMoney(awardAmountInput),
        deadline: deadlineInput || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "funder", id] });
      toast({ title: "Fields updated" });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Update failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const unlock = useMutation({
    mutationFn: () => adminApi.put(`admin/funders/${id}/unlock`),
    onSuccess: async () => {
      if (unlockingToastIdRef.current) dismiss(unlockingToastIdRef.current);
      unlockingToastIdRef.current = null;
      await qc.invalidateQueries({ queryKey: ["admin", "funder", id] });
      toast({ title: "Funder unlocked" });
    },
    onError: (err: unknown) => {
      if (unlockingToastIdRef.current) dismiss(unlockingToastIdRef.current);
      unlockingToastIdRef.current = null;
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Unlock failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  if (!id) return null;

  if (isLoading) return <p className="text-[#6b7280]">Loading…</p>;
  if (isError || !data) return <p className="text-red-600">Funder not found.</p>;

  const applicantOrgs = (data.applicantOrgs as ApplicantRow[] | undefined) ?? [];
  const isLocked = Boolean(data.isLocked);

  const rows: [string, React.ReactNode][] = [
    ["Name", String(data.name ?? "")],
    ["Website", data.website ? String(data.website) : "—"],
    ["Contact Name", data.contactName ? String(data.contactName) : <span className="text-[#9ca3af] italic">Not provided</span>],
    ["Contact Email", data.contactEmail ? String(data.contactEmail) : <span className="text-[#9ca3af] italic">Not provided</span>],
    ["Contact Phone", data.contactPhone ? String(data.contactPhone) : <span className="text-[#9ca3af] italic">Not provided</span>],
    ["Mission", data.missionStatement ? String(data.missionStatement) : "—"],
    ["Location focus", formatList(data.locationFocus)],
    ["Funding categories", formatList(data.fundingCategories)],
    ["Agency types funded", formatList(data.agencyTypesFunded)],
    ["Equipment tags", formatList(data.equipmentTags)],
    ["Local match required", data.localMatchRequired ? "Yes" : "No"],
    [
      "Grant range",
      `$${Number(data.avgGrantMin || 0).toLocaleString()} – $${Number(data.avgGrantMax || 0).toLocaleString()}`,
    ],
    ["Award amount", data.awardAmount !== undefined && data.awardAmount !== null ? `$${Number(data.awardAmount).toLocaleString()}` : "—"],
    ["Deadline", data.deadline ? new Date(String(data.deadline)).toLocaleDateString() : "—"],
    ["Cycles per year", String(data.cyclesPerYear ?? "—")],
    ["Past grants", formatList(data.pastGrantsAwarded)],
    ["Notes", data.notes ? String(data.notes) : "—"],
    ["Status", String(data.status ?? "—")],
    ["Created", data.createdAt ? new Date(String(data.createdAt)).toLocaleString() : "—"],
    ["Updated", data.updatedAt ? new Date(String(data.updatedAt)).toLocaleString() : "—"],
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <AdminBackLink href="/admin/funders">Back to funders</AdminBackLink>
          <h1 className="mt-2 [font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">
            {String(data.name)}
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          <Button asChild className="bg-[#ef3e34] hover:bg-[#d63530] w-full sm:w-auto">
            <Link href={`/admin/funders/${id}/edit`}>Edit</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto"
            onClick={() => {
              if (confirm("Delete this funder?")) del.mutate();
            }}
            disabled={del.isPending}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="[font-family:'Montserrat',Helvetica] text-sm font-bold uppercase tracking-wide text-[#111827]">
            Quick Settings
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Max Applications */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#374151]">Max Applications Allowed</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                className="w-full border-[#e5e7eb]"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                className="border-[#e5e7eb]"
                disabled={setLimit.isPending}
                onClick={() => {
                  const n = parseInt(limitInput, 10);
                  if (Number.isNaN(n) || n < 1) {
                    toast({ title: "Enter a valid number (min 1)", variant: "destructive" });
                    return;
                  }
                  if (savingToastIdRef.current) dismiss(savingToastIdRef.current);
                  const t = toast({ title: "Saving limit..." });
                  savingToastIdRef.current = t.id;
                  setLimit.mutate(n);
                }}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Award Amount */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#374151]">Award Amount</label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="$50,000"
                className="w-full border-[#e5e7eb]"
                value={awardAmountInput}
                onChange={(e) => setAwardAmountInput(e.target.value)}
              />
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#374151]">Deadline</label>
            <div className="flex gap-2">
              <Input
                type="date"
                className="w-full border-[#e5e7eb]"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0f0] pt-4">
          <div className="flex items-center gap-2">
            {isLocked ? (
              <>
                <span className="inline-flex rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-semibold text-[#dc2626]">
                  LOCKED
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#e5e7eb]"
                  disabled={unlock.isPending}
                  onClick={() => {
                    if (unlockingToastIdRef.current) dismiss(unlockingToastIdRef.current);
                    const t = toast({ title: "Unlocking funder..." });
                    unlockingToastIdRef.current = t.id;
                    unlock.mutate();
                  }}
                >
                  {unlock.isPending ? "Unlocking..." : "Unlock Funder"}
                </Button>
              </>
            ) : (
              <span className="inline-flex rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#16a34a]">
                Accepting Applications
              </span>
            )}
          </div>

          <Button
            className="bg-[#ef3e34] hover:bg-[#d63530] text-white w-full sm:w-auto"
            disabled={saveQuickFields.isPending}
            onClick={() => saveQuickFields.mutate()}
          >
            {saveQuickFields.isPending ? "Saving..." : "Save details"}
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-sm text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs uppercase tracking-wide text-[#9ca3af]">{label}</p>
            <p className="mt-0.5 whitespace-pre-wrap text-[#111827]">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <h2 className="[font-family:'Montserrat',Helvetica] text-sm font-bold uppercase tracking-wide text-[#111827]">
          Agencies with applications
        </h2>
        {applicantOrgs.length === 0 ? (
          <p className="mt-3 text-sm text-[#9ca3af]">No applications yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#f0f0f0] text-[#6b7280]">
                <tr>
                  <th className="pb-2 pr-3 font-semibold">Agency</th>
                  <th className="pb-2 pr-3 font-semibold">Project</th>
                  <th className="pb-2 pr-3 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {applicantOrgs.map((row, i) => (
                  <tr key={i} className="border-t border-[#f9fafb]">
                    <td className="py-2 pr-3 text-[#111827]">
                      {row.organization?.name ?? "—"}
                      {row.organization?.location ? (
                        <span className="block text-xs text-[#9ca3af]">{row.organization.location}</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-[#6b7280]">{row.projectTitle ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-xs capitalize text-[#374151]">
                        {String(row.status ?? "—")}
                      </span>
                    </td>
                    <td className="py-2 text-[#6b7280]">
                      {row.createdAt ? new Date(String(row.createdAt)).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
