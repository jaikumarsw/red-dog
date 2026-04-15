"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/adminApi";
import { AdminTableViewLink } from "@/components/admin/AdminTableViewLink";
import { TagSelect } from "@/components/admin/TagSelect";
import { EQUIPMENT_TAGS, FUNDER_FUNDING_CATEGORIES, FUNDER_AGENCY_TYPES } from "@/lib/adminConstants";
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
import { useToast } from "@/hooks/use-toast";

const EMPTY_FUNDER_FORM = {
  name: "",
  website: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  missionStatement: "",
  locationFocus: "",
  localMatchRequired: false,
  avgGrantMin: "",
  avgGrantMax: "",
  deadline: "",
  cyclesPerYear: "1",
  pastGrantsAwarded: "",
  notes: "",
  maxApplicationsAllowed: "5",
};

const parseMoney = (raw: string | undefined): number | undefined => {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
};

export default function AdminFundersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FUNDER_FORM);
  const [selectedFundingCategories, setSelectedFundingCategories] = useState<string[]>([]);
  const [selectedAgencyTypesFunded, setSelectedAgencyTypesFunded] = useState<string[]>([]);
  const [selectedEquipmentTags, setSelectedEquipmentTags] = useState<string[]>([]);

  const { data, refetch } = useQuery({
    queryKey: ["admin", "funders", search],
    queryFn: async () => {
      const res = await adminApi.get("admin/funders", { params: { search, limit: 100 } });
      return res.data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await adminApi.post("admin/funders", {
        name: form.name,
        website: form.website,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined,
        missionStatement: form.missionStatement,
        locationFocus: form.locationFocus.split(",").map((s) => s.trim()).filter(Boolean),
        fundingCategories: selectedFundingCategories,
        agencyTypesFunded: selectedAgencyTypesFunded,
        equipmentTags: selectedEquipmentTags,
        localMatchRequired: form.localMatchRequired,
        avgGrantMin: parseMoney(form.avgGrantMin),
        avgGrantMax: parseMoney(form.avgGrantMax),
        deadline: form.deadline || undefined,
        cyclesPerYear: form.cyclesPerYear ? Number(form.cyclesPerYear) : 1,
        pastGrantsAwarded: form.pastGrantsAwarded,
        notes: form.notes,
        maxApplicationsAllowed: form.maxApplicationsAllowed ? Number(form.maxApplicationsAllowed) : 5,
      });
    },
    onSuccess: () => {
      setForm(EMPTY_FUNDER_FORM);
      setSelectedFundingCategories([]);
      setSelectedAgencyTypesFunded([]);
      setSelectedEquipmentTags([]);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "funders"] });
      toast({ title: "Funder created successfully" });
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
              <th className="p-3">Grant range</th>
              <th className="p-3">Applications</th>
              <th className="p-3">Status</th>
              <th className="w-14 p-3 text-center" aria-label="View details" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r: Record<string, unknown>) => (
              <tr key={String(r._id)} className="border-t border-[#f0f0f0]">
                <td className="p-3 font-medium text-[#111827]">{String(r.name)}</td>
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
                <td className="p-3 text-center">
                  <AdminTableViewLink href={`/admin/funders/${r._id}`} label="View funder details" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setForm(EMPTY_FUNDER_FORM);
            setSelectedFundingCategories([]);
            setSelectedAgencyTypesFunded([]);
            setSelectedEquipmentTags([]);
          }
          setOpen(v);
        }}
      >
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
                "contactPhone",
                "missionStatement",
                "locationFocus",
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
                <Label className="capitalize text-xs">
                  {key === "website"
                    ? "Website (official funder page)"
                    : key.replace(/([A-Z])/g, " $1")}
                </Label>
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
            <TagSelect
              label="Funding categories"
              options={FUNDER_FUNDING_CATEGORIES}
              selected={selectedFundingCategories}
              onChange={setSelectedFundingCategories}
              allowCustom
            />
            <TagSelect
              label="Agency types funded"
              options={FUNDER_AGENCY_TYPES}
              selected={selectedAgencyTypesFunded}
              onChange={setSelectedAgencyTypesFunded}
              allowCustom
            />
            <TagSelect
              label="Equipment tags"
              options={EQUIPMENT_TAGS}
              selected={selectedEquipmentTags}
              onChange={setSelectedEquipmentTags}
              allowCustom
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#e5e7eb]"
                checked={form.localMatchRequired}
                onChange={(e) => setForm({ ...form, localMatchRequired: e.target.checked })}
              />
              Local match typically required for this funder’s grants
            </label>
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
