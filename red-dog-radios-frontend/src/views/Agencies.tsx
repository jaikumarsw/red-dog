"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, MapPin, Plus, X, Shield, Flame, CrossIcon, AlertTriangle, Phone, Building2, Wifi, Users, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MobileFilterSelect } from "@/components/MobileFilterSelect";
import { cn } from "@/lib/utils";
import { agencyFormSchema, type AgencyFormValues } from "@/lib/validation-schemas";

const agencyTypes = [
  { id: "all", label: "All" },
  { id: "law-enforcement", label: "Law Enforcement", Icon: Shield, iconCls: "text-[#3b82f6]", iconBg: "bg-[#eff6ff]" },
  { id: "fire-services", label: "Fire Services", Icon: Flame, iconCls: "text-[#f97316]", iconBg: "bg-[#fff7ed]" },
  { id: "ems", label: "Emergency Medical Services", Icon: CrossIcon, iconCls: "text-[#ef4444]", iconBg: "bg-[#fff1f0]" },
  { id: "emergency-management", label: "Emergency Management", Icon: AlertTriangle, iconCls: "text-[#eab308]", iconBg: "bg-[#fefce8]" },
  { id: "911-centers", label: "911 Centers / PSAPs", Icon: Phone, iconCls: "text-[#8b5cf6]", iconBg: "bg-[#f5f3ff]" },
  { id: "hospitals", label: "Hospitals / Healthcare", Icon: Building2, iconCls: "text-[#06b6d4]", iconBg: "bg-[#ecfeff]" },
  { id: "public-safety-comms", label: "Public Safety Comms", Icon: Wifi, iconCls: "text-[#10b981]", iconBg: "bg-[#f0fdf4]" },
  { id: "multi-agency", label: "Multi-Agency / Regional", Icon: Users, iconCls: "text-[#6b7280]", iconBg: "bg-[#f3f4f6]" },
];

const typeMap = Object.fromEntries(agencyTypes.slice(1).map((t) => [t.id, t]));

type Agency = {
  id: number;
  name: string;
  email: string;
  type: string;
  location: string;
  matches: number;
  status: string;
};

const initialAgencies: Agency[] = [
  { id: 1, name: "Austin Police Department", email: "grants@austinpd.gov", type: "law-enforcement", location: "Austin, TX", matches: 12, status: "active" },
  { id: 2, name: "Travis County Fire & Rescue", email: "fire@traviscounty.gov", type: "fire-services", location: "Travis County, TX", matches: 9, status: "active" },
  { id: 3, name: "Austin-Travis County EMS", email: "ems@atcems.org", type: "ems", location: "Austin, TX", matches: 7, status: "active" },
  { id: 4, name: "Travis County Sheriff's Office", email: "admin@tcsheriff.org", type: "law-enforcement", location: "Travis County, TX", matches: 8, status: "active" },
  { id: 5, name: "Pflugerville Fire Department", email: "admin@pflugervillef.gov", type: "fire-services", location: "Pflugerville, TX", matches: 5, status: "active" },
];

interface AddAgencyModalProps {
  onClose: () => void;
  onAdd: (agency: Agency) => void;
}

const AddAgencyModal = ({ onClose, onAdd }: AddAgencyModalProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AgencyFormValues>({
    resolver: zodResolver(agencyFormSchema),
    defaultValues: { name: "", type: "", location: "", email: "" },
  });

  const typeValue = watch("type");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const onValid = (data: AgencyFormValues) => {
    const newAgency: Agency = {
      id: Date.now(),
      name: data.name.trim(),
      email: data.email.trim(),
      type: data.type,
      location: data.location.trim(),
      matches: 0,
      status: "active",
    };
    onAdd(newAgency);
  };

  const inputClass = (name: keyof AgencyFormValues) =>
    cn(
      "h-10 border-[#e5e7eb] rounded-lg [font-family:'Montserrat',Helvetica] text-sm placeholder:text-[#d1d5db] focus-visible:ring-[#ef3e34] focus-visible:ring-1 focus-visible:border-[#ef3e34]",
      errors[name] && "border-red-500 focus-visible:ring-red-500"
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[480px] mx-4 flex flex-col">
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-[#f3f4f6]">
          <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-xl tracking-[0.5px] uppercase">Add Agencies</h2>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors">
            <X size={14} className="text-[#6b7280]" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onValid)} className="flex flex-col" noValidate>
          <div className="px-7 py-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Agency Name <span className="text-[#ef3e34]">*</span></Label>
              <Input placeholder="e.g. Red Dog" className={inputClass("name")} data-testid="input-agency-name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Agency Type <span className="text-[#ef3e34]">*</span></Label>
              <div className="relative">
                <select
                  value={typeValue}
                  onChange={(e) => setValue("type", e.target.value, { shouldValidate: true })}
                  data-testid="select-agency-type"
                  className={cn(
                    "w-full h-10 border border-[#e5e7eb] rounded-lg px-3 pr-9 [font-family:'Montserrat',Helvetica] text-sm text-[#374151] appearance-none focus:outline-none focus:ring-1 focus:ring-[#ef3e34] focus:border-[#ef3e34] bg-white",
                    errors.type && "border-red-500"
                  )}
                >
                  <option value="" disabled>Select Type</option>
                  {agencyTypes.slice(1).map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
              </div>
              {errors.type && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.type.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Location <span className="text-[#ef3e34]">*</span></Label>
              <Input placeholder="City, St" className={inputClass("location")} data-testid="input-agency-location" {...register("location")} />
              {errors.location && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.location.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-[#111827]">Grant Contact Email <span className="text-[#ef3e34]">*</span></Label>
              <Input placeholder="e.g example@xyz.com" type="email" className={inputClass("email")} data-testid="input-agency-email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.email.message}</p>}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#f3f4f6] px-7 py-5 sm:flex-row sm:justify-end sm:gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 [font-family:'Montserrat',Helvetica] text-sm font-medium text-[#6b7280] transition-colors hover:text-[#374151]">Cancel</button>
            <button type="submit" data-testid="button-create-agency"
              className="h-10 rounded-lg bg-[#ef3e34] px-5 text-white [font-family:'Montserrat',Helvetica] text-sm font-semibold transition-colors hover:bg-[#d63530]">
              Create Agency
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

type ApiAgency = {
  _id: string;
  name: string;
  email?: string;
  contactEmail?: string;
  type?: string;
  agencyType?: string;
  location?: string;
  matchCount?: number;
  status?: string;
};

const mapApiAgency = (a: ApiAgency): Agency => ({
  id: a._id as unknown as number,
  name: a.name,
  email: a.email ?? a.contactEmail ?? "—",
  type: a.type ?? a.agencyType ?? "multi-agency",
  location: a.location ?? "—",
  matches: a.matchCount ?? 0,
  status: a.status ?? "active",
});

export const Agencies = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  const fetchAgencies = useCallback(async () => {
    try {
      const res = await api.get("/agencies", { params: { limit: 100 } });
      const raw: ApiAgency[] = res.data.data ?? [];
      if (raw.length > 0) {
        setAgencies(raw.map(mapApiAgency));
      } else {
        setAgencies(initialAgencies);
      }
    } catch {
      setAgencies(initialAgencies);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAgencies(); }, [fetchAgencies]);

  const filtered = agencies.filter((a) => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()) || a.location.toLowerCase().includes(search.toLowerCase());
    const matchType = activeType === "all" || a.type === activeType;
    return matchSearch && matchType;
  });

  const handleAdd = async (agency: Agency) => {
    try {
      await api.post("/agencies", {
        name: agency.name,
        email: agency.email,
        type: agency.type,
        location: agency.location,
        status: "active",
      });
      await fetchAgencies();
    } catch {
      setAgencies((prev) => [...prev, agency]);
    }
    setShowModal(false);
    toast({ title: "Agency created successfully", description: `${agency.name} has been added.` });
  };

  return (
    <>
      <div className="flex min-h-full min-w-0 flex-col gap-5 bg-neutral-50 p-4 sm:p-6 lg:p-8">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex flex-col gap-1">
            <h1 className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase leading-tight tracking-[0.5px] text-black sm:text-3xl break-words">
              Agencies
            </h1>
            <p className="[font-family:'Montserrat',Helvetica] text-sm font-normal text-[#6b7280] max-w-prose break-words">
              All registered public safety agencies on the platform
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            data-testid="button-add-agency"
            aria-label="Add agency"
            className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#ef3e34] px-3 text-white transition-colors hover:bg-[#d63530] sm:px-4"
          >
            <Plus size={16} className="shrink-0" />
            <span className="[font-family:'Montserrat',Helvetica] hidden text-sm font-semibold sm:inline">Add Agency</span>
          </button>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or location..."
            data-testid="input-search-agencies"
            className="pl-9 h-10 border-[#e5e7eb] rounded-lg [font-family:'Montserrat',Helvetica] text-sm placeholder:text-[#9ca3af] focus-visible:ring-[#ef3e34] focus-visible:ring-1 focus-visible:border-[#ef3e34] bg-white" />
        </div>

        <div className="flex flex-col gap-2">
          <MobileFilterSelect
            ariaLabel="Filter agencies by type"
            label="Agency type"
            value={activeType}
            onChange={setActiveType}
            options={agencyTypes.map((t) => ({ value: t.id, label: t.label }))}
            dataTestId="select-filter-agencies-type"
          />
          <div className="hidden flex-wrap gap-1.5 md:flex">
            {agencyTypes.map((t) => {
              const isActive = activeType === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setActiveType(t.id)} data-testid={`filter-${t.id}`}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs [font-family:'Montserrat',Helvetica] font-semibold transition-all border ${
                    isActive ? "bg-[#ef3e34] border-[#ef3e34] text-white" : "bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#ef3e34]/40"}`}>
                  {t.Icon && <t.Icon size={11} className={isActive ? "text-white" : t.iconCls} />}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#9ca3af]">Loading agencies...</span>
            </div>
          )}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-[#f3f4f6]">
                  {["Agency", "Type", "Location", "Matches", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left lg:px-5">
                      <span className="[font-family:'Montserrat',Helvetica] text-xs font-semibold uppercase tracking-[0.6px] text-[#9ca3af]">
                        {h}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((agency, idx) => {
                  const typeCfg = typeMap[agency.type];
                  const Icon = typeCfg?.Icon;
                  return (
                    <tr
                      key={agency.id}
                      data-testid={`row-agency-${agency.id}`}
                      className={`cursor-pointer transition-colors hover:bg-[#fafafa] ${idx < filtered.length - 1 ? "border-b border-[#f9fafb]" : ""}`}
                    >
                      <td className="px-4 py-4 lg:px-5">
                        <div className="flex items-center gap-3">
                          {Icon && (
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${typeCfg.iconBg}`}>
                              <Icon size={16} className={typeCfg.iconCls} />
                            </div>
                          )}
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold break-words text-[#111827]">{agency.name}</span>
                            <span className="[font-family:'Montserrat',Helvetica] text-xs font-normal break-all text-[#9ca3af]">{agency.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 lg:px-5">
                        <span className="[font-family:'Montserrat',Helvetica] text-sm font-normal break-words text-[#374151]">
                          {typeCfg?.label ?? agency.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 lg:px-5">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="shrink-0 text-[#9ca3af]" />
                          <span className="[font-family:'Montserrat',Helvetica] text-sm font-normal break-words text-[#374151]">{agency.location}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 lg:px-5">
                        <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">{agency.matches} matches</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 lg:px-5">
                        <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-3 py-1 [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#16a34a]">
                          {agency.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col divide-y divide-[#f9fafb] p-0 md:hidden">
            {filtered.map((agency) => {
              const typeCfg = typeMap[agency.type];
              const Icon = typeCfg?.Icon;
              return (
                <li key={agency.id} data-testid={`row-agency-${agency.id}`} className="cursor-pointer p-4 transition-colors hover:bg-[#fafafa]">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      {Icon && (
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${typeCfg.iconBg}`}>
                          <Icon size={16} className={typeCfg.iconCls} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold break-words text-[#111827]">{agency.name}</p>
                        <p className="mt-0.5 [font-family:'Montserrat',Helvetica] text-xs font-normal break-all text-[#9ca3af]">{agency.email}</p>
                      </div>
                    </div>
                    <p className="[font-family:'Montserrat',Helvetica] text-sm font-normal text-[#374151]">
                      <span className="text-[#9ca3af]">Type: </span>
                      {typeCfg?.label ?? agency.type}
                    </p>
                    <div className="flex items-start gap-1.5">
                      <MapPin size={12} className="mt-0.5 shrink-0 text-[#9ca3af]" />
                      <span className="[font-family:'Montserrat',Helvetica] text-sm font-normal break-words text-[#374151]">{agency.location}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">{agency.matches} matches</span>
                      <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-3 py-1 [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#16a34a]">
                        {agency.status}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {showModal && <AddAgencyModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
    </>
  );
};
