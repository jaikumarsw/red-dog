"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
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

type OpportunityRow = {
  _id: string;
  title: string;
  funder: string;
  deadline?: string;
  status: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  keywords?: string[];
  sourceUrl?: string;
  description?: string;
  agenciesMatchedCount?: number;
  applicationCount?: number;
  highestMatchScore?: number;
};

function formatAmountRange(min?: number, max?: number) {
  if (min == null && max == null) return "—";
  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function keywordsPreview(kw: string[] | undefined, max = 4) {
  if (!kw?.length) return "—";
  const slice = kw.slice(0, max);
  const extra = kw.length > max ? ` +${kw.length - max}` : "";
  return `${slice.join(", ")}${extra}`;
}

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
        keywords: form.keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        category: form.category,
        description: form.description,
      });
    },
    onSuccess: () => {
      setOpen(false);
      refetch();
    },
  });

  const rows = (data?.data ?? []) as OpportunityRow[];
  const now = Date.now();
  const in14 = 14 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Opportunities</h1>
        <Button className="bg-[#ef3e34] hover:bg-[#d63530] text-white" onClick={() => setOpen(true)}>
          Add opportunity
        </Button>
      </div>
      <div className="flex gap-2">
        <select
          className="rounded border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827]"
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
      <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] bg-white shadow-sm">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-[#f9fafb] text-left text-[#6b7280]">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Funder</th>
              <th className="p-3">Category</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Deadline</th>
              <th className="p-3">Status</th>
              <th className="p-3">Keywords</th>
              <th className="p-3">Matches</th>
              <th className="p-3">Applicants</th>
              <th className="p-3 w-[140px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const dl = r.deadline ? new Date(String(r.deadline)).getTime() : null;
              const urgent = dl && dl - now < in14 && dl > now;
              return (
                <tr key={String(r._id)} className="border-t border-[#f0f0f0]">
                  <td className="max-w-[200px] p-3 font-medium text-[#111827]">
                    <span className="line-clamp-2" title={r.title}>
                      {r.title}
                    </span>
                  </td>
                  <td className="p-3 text-[#6b7280]">{r.funder}</td>
                  <td className="max-w-[120px] p-3 text-[#6b7280]">
                    <span className="line-clamp-2" title={r.category || ""}>
                      {r.category || "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-3 text-[#374151]">
                    {formatAmountRange(r.minAmount, r.maxAmount)}
                  </td>
                  <td className={`whitespace-nowrap p-3 ${urgent ? "font-medium text-[#ef3e34]" : "text-[#6b7280]"}`}>
                    {r.deadline ? new Date(String(r.deadline)).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3 text-[#6b7280]">{r.status}</td>
                  <td className="max-w-[160px] p-3 text-xs text-[#6b7280]">
                    <span className="line-clamp-2" title={(r.keywords || []).join(", ")}>
                      {keywordsPreview(r.keywords)}
                    </span>
                  </td>
                  <td className="p-3 text-[#6b7280]">{r.agenciesMatchedCount ?? 0}</td>
                  <td className="p-3 text-[#111827]">{r.applicationCount ?? 0}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/opportunities/${r._id}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#374151] shadow-sm hover:bg-[#f9fafb]"
                        aria-label="View full details and applicants"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/opportunities/${r._id}/edit`}
                        className="text-sm font-medium text-[#ef3e34] hover:underline"
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
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New opportunity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                className="border-[#e5e7eb]"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Funder name</Label>
              <Input
                className="border-[#e5e7eb]"
                value={form.funder}
                onChange={(e) => setForm({ ...form, funder: e.target.value })}
              />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                className="border-[#e5e7eb]"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Min amount</Label>
                <Input
                  className="border-[#e5e7eb]"
                  value={form.minAmount}
                  onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                />
              </div>
              <div>
                <Label>Max amount</Label>
                <Input
                  className="border-[#e5e7eb]"
                  value={form.maxAmount}
                  onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Source URL</Label>
              <Input
                className="border-[#e5e7eb]"
                value={form.sourceUrl}
                onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
              />
            </div>
            <div>
              <Label>Keywords (comma separated)</Label>
              <Input
                className="border-[#e5e7eb]"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                className="border-[#e5e7eb]"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                className="border-[#e5e7eb]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
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
