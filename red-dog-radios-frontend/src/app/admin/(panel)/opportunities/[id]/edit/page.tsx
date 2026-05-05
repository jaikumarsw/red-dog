"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { useState, useEffect } from "react";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { TagSelect, CategorySelect } from "@/components/admin/TagSelect";
import { EQUIPMENT_TAGS, FUNDING_CATEGORIES } from "@/lib/adminConstants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const parseMoney = (raw: string | undefined): number | undefined => {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
};

export default function EditOpportunityPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [selectedEquipmentTags, setSelectedEquipmentTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

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
      funderId: String(d.funderId || ""),
      deadline: d.deadline ? String(d.deadline).slice(0, 10) : "",
      minAmount: String(d.minAmount ?? ""),
      maxAmount: String(d.maxAmount ?? ""),
      awardAmount: String(d.awardAmount ?? ""),
      sourceUrl: String(d.sourceUrl || ""),
      applicationUrl: String(d.applicationUrl || ""),
      keywords: Array.isArray(d.keywords) ? (d.keywords as string[]).join(", ") : "",
      description: String(d.description || ""),
      contactName: String(d.contactName || ""),
      contactEmail: String(d.contactEmail || ""),
      contactPhone: String(d.contactPhone || ""),
      localMatchRequired: d.localMatchRequired === true ? "yes" : "no",
    });
    setSelectedEquipmentTags(Array.isArray(d.equipmentTags) ? (d.equipmentTags as string[]) : []);
    setSelectedCategory(String(d.category || ""));
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!String(form.contactEmail || "").trim()) {
        throw new Error("Contact email is required.");
      }
      await adminApi.put(`admin/opportunities/${id}`, {
        title: form.title,
        funder: form.funder,
        funderId: form.funderId || undefined,
        deadline: form.deadline || undefined,
        minAmount: parseMoney(form.minAmount),
        maxAmount: parseMoney(form.maxAmount),
        awardAmount: parseMoney(form.awardAmount),
        sourceUrl: form.sourceUrl,
        applicationUrl: form.applicationUrl || undefined,
        keywords: form.keywords.split(",").map((s) => s.trim()).filter(Boolean),
        equipmentTags: selectedEquipmentTags,
        category: selectedCategory,
        description: form.description,
        contactName: form.contactName || undefined,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined,
        localMatchRequired: form.localMatchRequired === "yes",
      });
    },
    onSuccess: () => router.push("/admin/opportunities"),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : "Could not save opportunity.");
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  if (!data) return <p className="text-[#6b7280]">Loading…</p>;

  return (
    <div className="max-w-xl space-y-4">
      <AdminBackLink href={`/admin/opportunities/${String(id)}`}>Back to opportunity</AdminBackLink>
      <h1 className="[font-family:'Montserrat',Helvetica] text-2xl font-bold text-[#111827]">Edit opportunity</h1>
      {(
        [
          "title",
          "funder",
          "deadline",
          "minAmount",
          "maxAmount",
          "awardAmount",
          "sourceUrl",
          "applicationUrl",
          "contactName",
          "contactEmail",
          "contactPhone",
          "keywords",
          "description",
          "localMatchRequired",
        ] as const
      ).map((key) => (
        <div key={key}>
          <Label className="capitalize">
            {key === "sourceUrl"
              ? "Official opportunity link"
              : key === "applicationUrl"
                ? "Application URL"
              : key === "localMatchRequired"
                ? "Local match required"
                : key.replace(/([A-Z])/g, " $1")}
          </Label>
          {key === "localMatchRequired" ? (
            <select
              className="mt-1 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
              value={form[key] || "no"}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          ) : key === "description" ? (
            <Textarea
              className="mt-1 border-[#e5e7eb]"
              value={form[key] || ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ) : key === "contactEmail" ? (
            <Input
              type="email"
              className="mt-1 border-[#e5e7eb]"
              value={form[key] || ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ) : (
            <Input
              type={key === "deadline" ? "date" : "text"}
              className="mt-1 border-[#e5e7eb]"
              placeholder={key === "awardAmount" ? "$50,000" : undefined}
              value={form[key] || ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          )}
        </div>
      ))}
      <CategorySelect
        label="Category"
        options={FUNDING_CATEGORIES}
        value={selectedCategory}
        onChange={setSelectedCategory}
      />
      <TagSelect
        label="Equipment tags"
        options={EQUIPMENT_TAGS}
        selected={selectedEquipmentTags}
        onChange={setSelectedEquipmentTags}
        allowCustom
      />
      <Button
        className="bg-[#ef3e34] hover:bg-[#d63530] text-white"
        onClick={() => save.mutate()}
        disabled={save.isPending || !String(form.contactEmail || "").trim()}
      >
        Save
      </Button>
    </div>
  );
}
