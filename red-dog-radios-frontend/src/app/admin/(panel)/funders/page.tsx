"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AdminFundersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    website: "",
    contactName: "",
    contactEmail: "",
    missionStatement: "",
    locationFocus: "",
    fundingCategories: "",
    agencyTypesFunded: "",
    avgGrantMin: "",
    avgGrantMax: "",
    deadline: "",
    cyclesPerYear: "1",
    pastGrantsAwarded: "",
    notes: "",
    maxApplicationsAllowed: "5",
  });

  const { data, refetch } = useQuery({
    queryKey: ["admin", "funders", search],
    queryFn: async () => {
      const res = await adminApi.get("admin/funders", { params: { search, limit: 100 } });
      return res.data;
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => adminApi.delete(`admin/funders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "funders"] }),
  });

  const create = useMutation({
    mutationFn: async () => {
      await adminApi.post("admin/funders", {
        name: form.name,
        website: form.website,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        missionStatement: form.missionStatement,
        locationFocus: form.locationFocus.split(",").map((s) => s.trim()).filter(Boolean),
        fundingCategories: form.fundingCategories.split(",").map((s) => s.trim()).filter(Boolean),
        agencyTypesFunded: form.agencyTypesFunded.split(",").map((s) => s.trim()).filter(Boolean),
        avgGrantMin: form.avgGrantMin ? Number(form.avgGrantMin) : undefined,
        avgGrantMax: form.avgGrantMax ? Number(form.avgGrantMax) : undefined,
        deadline: form.deadline || undefined,
        cyclesPerYear: form.cyclesPerYear ? Number(form.cyclesPerYear) : 1,
        pastGrantsAwarded: form.pastGrantsAwarded,
        notes: form.notes,
        maxApplicationsAllowed: form.maxApplicationsAllowed ? Number(form.maxApplicationsAllowed) : 5,
      });
    },
    onSuccess: () => {
      setOpen(false);
      refetch();
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Funders</h1>
        <Button className="bg-[#ef3e34] hover:bg-[#d63530] text-white" onClick={() => setOpen(true)}>
          Add funder
        </Button>
      </div>
      <Input
        className="max-w-md border-[#e5e7eb]"
        placeholder="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] bg-white text-sm shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[#f9fafb] text-[#6b7280]">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Location</th>
              <th className="p-3">Categories</th>
              <th className="p-3">Grant range</th>
              <th className="p-3">Apps</th>
              <th className="p-3">Locked</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r: Record<string, unknown>) => (
              <tr key={String(r._id)} className="border-t border-[#f0f0f0]">
                <td className="p-3 font-medium text-[#111827]">{String(r.name)}</td>
                <td className="p-3 text-[#6b7280]">
                  {(r.locationFocus as string[])?.join(", ") || "—"}
                </td>
                <td className="p-3 text-[#6b7280]">
                  {(r.fundingCategories as string[])?.slice(0, 3).join(", ") || "—"}
                </td>
                <td className="p-3 text-[#6b7280]">
                  ${Number(r.avgGrantMin || 0).toLocaleString()} – $
                  {Number(r.avgGrantMax || 0).toLocaleString()}
                </td>
                <td className="p-3 text-[#6b7280]">
                  {String(r.currentApplicationCount ?? 0)} / {String(r.maxApplicationsAllowed ?? 5)}
                </td>
                <td className="p-3">
                  {r.isLocked ? (
                    <span className="text-xs font-medium text-red-600">Locked</span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600">Open</span>
                  )}
                </td>
                <td className="flex gap-2 p-3">
                  <Link href={`/admin/funders/${r._id}/edit`} className="text-sm font-medium text-[#ef3e34] hover:underline">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="text-red-400 text-sm"
                    onClick={() => {
                      if (confirm("Delete?")) del.mutate(String(r._id));
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New funder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {(
              [
                "name",
                "website",
                "contactName",
                "contactEmail",
                "missionStatement",
                "locationFocus",
                "fundingCategories",
                "agencyTypesFunded",
                "avgGrantMin",
                "avgGrantMax",
                "deadline",
                "cyclesPerYear",
                "pastGrantsAwarded",
                "notes",
                "maxApplicationsAllowed",
              ] as const
            ).map((key) => (
              <div key={key}>
                <Label className="capitalize text-xs">{key.replace(/([A-Z])/g, " $1")}</Label>
                {key === "missionStatement" || key === "notes" || key === "pastGrantsAwarded" ? (
                  <Textarea
                    className="border-[#e5e7eb] text-sm"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                ) : (
                  <Input
                    className="border-[#e5e7eb] text-sm"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#ef3e34] hover:bg-[#d63530]" onClick={() => create.mutate()} disabled={create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
