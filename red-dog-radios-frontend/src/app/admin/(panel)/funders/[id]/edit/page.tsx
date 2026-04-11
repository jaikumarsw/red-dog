"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function EditFunderPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["admin", "funder", id],
    queryFn: async () => {
      const res = await adminApi.get("admin/funders", { params: { limit: 500 } });
      const row = (res.data.data as Record<string, unknown>[]).find((x) => String(x._id) === id);
      return row;
    },
  });

  useEffect(() => {
    if (!data) return;
    const d = data as Record<string, unknown>;
    setForm({
      name: String(d.name || ""),
      website: String(d.website || ""),
      contactName: String(d.contactName || ""),
      contactEmail: String(d.contactEmail || ""),
      missionStatement: String(d.missionStatement || ""),
      locationFocus: Array.isArray(d.locationFocus) ? (d.locationFocus as string[]).join(", ") : "",
      fundingCategories: Array.isArray(d.fundingCategories)
        ? (d.fundingCategories as string[]).join(", ")
        : "",
      agencyTypesFunded: Array.isArray(d.agencyTypesFunded)
        ? (d.agencyTypesFunded as string[]).join(", ")
        : "",
      avgGrantMin: String(d.avgGrantMin ?? ""),
      avgGrantMax: String(d.avgGrantMax ?? ""),
      deadline: d.deadline ? String(d.deadline).slice(0, 10) : "",
      cyclesPerYear: String(d.cyclesPerYear ?? "1"),
      pastGrantsAwarded: Array.isArray(d.pastGrantsAwarded)
        ? (d.pastGrantsAwarded as string[]).join("\n")
        : "",
      notes: String(d.notes || ""),
      maxApplicationsAllowed: String(d.maxApplicationsAllowed ?? "5"),
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      await adminApi.put(`admin/funders/${id}`, {
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
        maxApplicationsAllowed: form.maxApplicationsAllowed
          ? Number(form.maxApplicationsAllowed)
          : 5,
      });
    },
    onSuccess: () => router.push("/admin/funders"),
  });

  if (!data) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-2xl font-bold text-white">Edit funder</h1>
      {Object.keys(form).map((key) => (
        <div key={key}>
          <Label className="text-xs capitalize">{key}</Label>
          {["missionStatement", "notes", "pastGrantsAwarded"].includes(key) ? (
            <Textarea
              className="bg-slate-900 border-slate-700 text-white mt-1"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ) : (
            <Input
              className="bg-slate-900 border-slate-700 text-white mt-1"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          )}
        </div>
      ))}
      <Button className="bg-amber-600" onClick={() => save.mutate()} disabled={save.isPending}>
        Save
      </Button>
    </div>
  );
}
