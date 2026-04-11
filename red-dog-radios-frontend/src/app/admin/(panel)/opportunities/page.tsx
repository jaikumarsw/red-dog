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

export default function AdminOpportunitiesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    title: "",
    funder: "",
    deadline: "",
    minAmount: "",
    maxAmount: "",
    sourceUrl: "",
    keywords: "",
    category: "",
    description: "",
  });

  const { data, refetch } = useQuery({
    queryKey: ["admin", "opportunities", statusFilter],
    queryFn: async () => {
      const res = await adminApi.get("admin/opportunities", {
        params: { limit: 50, status: statusFilter || undefined },
      });
      return res.data;
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => adminApi.delete(`admin/opportunities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "opportunities"] });
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await adminApi.post("admin/opportunities", {
        title: form.title,
        funder: form.funder,
        deadline: form.deadline || undefined,
        minAmount: form.minAmount ? Number(form.minAmount) : undefined,
        maxAmount: form.maxAmount ? Number(form.maxAmount) : undefined,
        sourceUrl: form.sourceUrl,
        keywords: form.keywords.split(",").map((s) => s.trim()).filter(Boolean),
        category: form.category,
        description: form.description,
      });
    },
    onSuccess: () => {
      setOpen(false);
      refetch();
    },
  });

  const rows = data?.data ?? [];
  const now = Date.now();
  const in14 = 14 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Opportunities</h1>
        <Button className="bg-amber-600" onClick={() => setOpen(true)}>
          Add opportunity
        </Button>
      </div>
      <div className="flex gap-2">
        <select
          className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closing">Closing</option>
          <option value="closed">Closed</option>
        </select>
        <Button variant="secondary" type="button" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400 text-left">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Funder</th>
              <th className="p-3">Deadline</th>
              <th className="p-3">Status</th>
              <th className="p-3">Matches</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r: Record<string, unknown>) => {
              const dl = r.deadline ? new Date(String(r.deadline)).getTime() : null;
              const urgent = dl && dl - now < in14 && dl > now;
              return (
                <tr key={String(r._id)} className="border-t border-slate-800">
                  <td className="p-3 text-white">{String(r.title)}</td>
                  <td className="p-3 text-slate-400">{String(r.funder)}</td>
                  <td className={`p-3 ${urgent ? "text-red-400 font-medium" : "text-slate-400"}`}>
                    {r.deadline ? new Date(String(r.deadline)).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3 text-slate-400">{String(r.status)}</td>
                  <td className="p-3 text-slate-400">{String(r.agenciesMatchedCount ?? 0)}</td>
                  <td className="p-3 flex gap-2">
                    <Link
                      href={`/admin/opportunities/${r._id}/edit`}
                      className="text-amber-400 text-sm hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="text-red-400 text-sm hover:underline"
                      onClick={() => {
                        if (confirm("Delete this opportunity?")) del.mutate(String(r._id));
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New opportunity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                className="bg-slate-800 border-slate-600"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Funder name</Label>
              <Input
                className="bg-slate-800 border-slate-600"
                value={form.funder}
                onChange={(e) => setForm({ ...form, funder: e.target.value })}
              />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                className="bg-slate-800 border-slate-600"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Min amount</Label>
                <Input
                  className="bg-slate-800 border-slate-600"
                  value={form.minAmount}
                  onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                />
              </div>
              <div>
                <Label>Max amount</Label>
                <Input
                  className="bg-slate-800 border-slate-600"
                  value={form.maxAmount}
                  onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Source URL</Label>
              <Input
                className="bg-slate-800 border-slate-600"
                value={form.sourceUrl}
                onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
              />
            </div>
            <div>
              <Label>Keywords (comma separated)</Label>
              <Input
                className="bg-slate-800 border-slate-600"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                className="bg-slate-800 border-slate-600"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                className="bg-slate-800 border-slate-600"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
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
