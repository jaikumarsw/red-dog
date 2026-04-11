"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function EditOpportunityPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["admin", "opportunity", id],
    queryFn: async () => {
      const res = await adminApi.get(`admin/opportunities/${id}`);
      return res.data.data as Record<string, unknown>;
    },
  });

  useEffect(() => {
    if (!data) return;
    const d = data as Record<string, unknown>;
    setForm({
      title: String(d.title || ""),
      funder: String(d.funder || ""),
      deadline: d.deadline ? String(d.deadline).slice(0, 10) : "",
      minAmount: String(d.minAmount ?? ""),
      maxAmount: String(d.maxAmount ?? ""),
      sourceUrl: String(d.sourceUrl || ""),
      keywords: Array.isArray(d.keywords) ? (d.keywords as string[]).join(", ") : "",
      category: String(d.category || ""),
      description: String(d.description || ""),
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      await adminApi.put(`admin/opportunities/${id}`, {
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
    onSuccess: () => router.push("/admin/opportunities"),
  });

  if (!data) return <p className="text-[#6b7280]">Loading…</p>;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Edit opportunity</h1>
      {Object.keys(form).map((key) => (
        <div key={key}>
          <Label className="capitalize">{key}</Label>
          {key === "description" ? (
            <Textarea
              className="mt-1 border-[#e5e7eb]"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ) : (
            <Input
              className="mt-1 border-[#e5e7eb]"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          )}
        </div>
      ))}
      <Button className="bg-[#ef3e34] hover:bg-[#d63530] text-white" onClick={() => save.mutate()} disabled={save.isPending}>
        Save
      </Button>
    </div>
  );
}
