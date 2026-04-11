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
        <h1 className="text-2xl font-bold text-white">Funders</h1>
        <Button className="bg-amber-600" onClick={() => setOpen(true)}>
          Add funder
        </Button>
      </div>
      <Input
        className="max-w-md bg-slate-900 border-slate-700 text-white"
        placeholder="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="overflow-x-auto rounded-lg border border-slate-800 text-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-slate-400">
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
              <tr key={String(r._id)} className="border-t border-slate-800">
                <td className="p-3 text-white">{String(r.name)}</td>
                <td className="p-3 text-slate-400">
                  {(r.locationFocus as string[])?.join(", ") || "—"}
                </td>
                <td className="p-3 text-slate-400">
                  {(r.fundingCategories as string[])?.slice(0, 3).join(", ") || "—"}
                </td>
                <td className="p-3 text-slate-400">
                  ${Number(r.avgGrantMin || 0).toLocaleString()} – $
                  {Number(r.avgGrantMax || 0).toLocaleString()}
                </td>
                <td className="p-3 text-slate-400">
                  {String(r.currentApplicationCount ?? 0)} / {String(r.maxApplicationsAllowed ?? 5)}
                </td>
                <td className="p-3">
                  {r.isLocked ? (
                    <span className="text-red-400 text-xs">Locked</span>
                  ) : (
                    <span className="text-emerald-400 text-xs">Open</span>
                  )}
                </td>
                <td className="p-3 flex gap-2">
                  <Link href={`/admin/funders/${r._id}/edit`} className="text-amber-400 text-sm">
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
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto max-w-lg">
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
                    className="bg-slate-800 border-slate-600 text-sm"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                ) : (
                  <Input
                    className="bg-slate-800 border-slate-600 text-sm"
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
            <Button className="bg-amber-600" onClick={() => create.mutate()} disabled={create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
