"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Plus, X, Edit2, Trash2, RefreshCw, RotateCcw, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = "/api";

interface Funder {
  _id: string;
  name: string;
  missionStatement?: string;
  locationFocus?: string[];
  fundingCategories?: string[];
  agencyTypesFunded?: string[];
  avgGrantMin?: number;
  avgGrantMax?: number;
  deadline?: string;
  cyclesPerYear?: number;
  contactName?: string;
  contactEmail?: string;
  website?: string;
  notes?: string;
  status: string;
}

const EMPTY_FUNDER: Partial<Funder> = {
  name: "",
  missionStatement: "",
  locationFocus: [],
  fundingCategories: [],
  agencyTypesFunded: [],
  avgGrantMin: undefined,
  avgGrantMax: undefined,
  deadline: "",
  cyclesPerYear: undefined,
  contactName: "",
  contactEmail: "",
  website: "",
  notes: "",
  status: "active",
};

const AGENCY_TYPE_OPTIONS = [
  "law_enforcement",
  "fire",
  "ems",
  "dispatch",
  "emergency_management",
  "public_safety",
];

const adminApi = (token: string) =>
  axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` },
  });

/* ── Login Screen ──────────────────────────────────────────── */
const AdminLoginScreen = ({ onLogin }: { onLogin: (token: string) => void }) => {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_BASE}/auth/admin-login`, { adminKey: key });
      const token = res.data.data?.token;
      if (!token) throw new Error("No token returned");
      sessionStorage.setItem("rdg_admin_token", token);
      onLogin(token);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Invalid admin key. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-lg flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ef3e341a]">
            <ShieldCheck size={28} className="text-[#ef3e34]" />
          </div>
          <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl uppercase tracking-[0.5px]">
            Admin Panel
          </h1>
          <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280] text-center">
            Enter your admin key to manage funders and platform settings
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="[font-family:'Montserrat',Helvetica] text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="[font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#374151] uppercase tracking-wide">
              Admin Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter admin key..."
                className="w-full rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 pr-10 [font-family:'Montserrat',Helvetica] text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#ef3e34] focus:outline-none focus:ring-2 focus:ring-[#ef3e34]/20"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#374151]"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="rounded-lg bg-[#ef3e34] px-6 py-2.5 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] disabled:opacity-60 transition-colors"
          >
            {loading ? "Verifying..." : "Access Admin Panel"}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ── Funder Form Modal ─────────────────────────────────────── */
const FunderFormModal = ({
  initial,
  token,
  onClose,
  onSaved,
}: {
  initial: Partial<Funder>;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const isEdit = !!initial._id;
  const [form, setForm] = useState<Partial<Funder>>({ ...EMPTY_FUNDER, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof Funder, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setList = (field: "locationFocus" | "fundingCategories" | "agencyTypesFunded", raw: string) =>
    set(field, raw.split(",").map((s) => s.trim()).filter(Boolean));

  const toggleAgency = (type: string) => {
    const current = form.agencyTypesFunded || [];
    set(
      "agencyTypesFunded",
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return setError("Name is required");
    setLoading(true);
    setError("");
    try {
      const api = adminApi(token);
      if (isEdit) {
        await api.put(`/funders/${initial._id}`, form);
      } else {
        await api.post("/funders", form);
      }
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to save funder.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-[#e5e7eb] px-4 py-2.5 [font-family:'Montserrat',Helvetica] text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#ef3e34] focus:outline-none";
  const labelCls = "[font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#374151] uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4">
          <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-lg uppercase tracking-[0.3px]">
            {isEdit ? "Edit Funder" : "Add New Funder"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="[font-family:'Montserrat',Helvetica] text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Name <span className="text-red-500">*</span></label>
            <input value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. FEMA Hazard Mitigation" className={inputCls} />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Mission Statement</label>
            <textarea
              value={form.missionStatement || ""}
              onChange={(e) => set("missionStatement", e.target.value)}
              rows={2}
              placeholder="What is this funder's mission?"
              className={cn(inputCls, "resize-none")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Min Grant ($)</label>
              <input
                type="number"
                value={form.avgGrantMin ?? ""}
                onChange={(e) => set("avgGrantMin", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 10000"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Max Grant ($)</label>
              <input
                type="number"
                value={form.avgGrantMax ?? ""}
                onChange={(e) => set("avgGrantMax", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 500000"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Deadline</label>
              <input
                type="date"
                value={form.deadline ? form.deadline.split("T")[0] : ""}
                onChange={(e) => set("deadline", e.target.value ? new Date(e.target.value).toISOString() : "")}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Cycles / Year</label>
              <input
                type="number"
                value={form.cyclesPerYear ?? ""}
                onChange={(e) => set("cyclesPerYear", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 2"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Location Focus (comma-separated)</label>
            <input
              value={(form.locationFocus || []).join(", ")}
              onChange={(e) => setList("locationFocus", e.target.value)}
              placeholder="e.g. National, Texas, California"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Funding Categories (comma-separated)</label>
            <input
              value={(form.fundingCategories || []).join(", ")}
              onChange={(e) => setList("fundingCategories", e.target.value)}
              placeholder="e.g. Communications, EMS Equipment, Fire Safety"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelCls}>Agency Types Funded</label>
            <div className="flex flex-wrap gap-2">
              {AGENCY_TYPE_OPTIONS.map((t) => {
                const selected = (form.agencyTypesFunded || []).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleAgency(t)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold [font-family:'Montserrat',Helvetica] transition-colors",
                      selected
                        ? "border-[#ef3e34] bg-[#ef3e34] text-white"
                        : "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#ef3e3466]"
                    )}
                  >
                    {t.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Contact Name</label>
              <input value={form.contactName || ""} onChange={(e) => set("contactName", e.target.value)} placeholder="Program Officer" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Contact Email</label>
              <input type="email" value={form.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} placeholder="grants@funder.org" className={inputCls} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Website</label>
            <input value={form.website || ""} onChange={(e) => set("website", e.target.value)} placeholder="https://..." className={inputCls} />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Internal Notes</label>
            <textarea
              value={form.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Internal notes about this funder..."
              className={cn(inputCls, "resize-none")}
            />
          </div>

          <div className="flex gap-3 pt-2 border-t border-[#e5e7eb]">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] [font-family:'Montserrat',Helvetica] hover:bg-[#f9fafb]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[#ef3e34] px-4 py-2.5 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029] disabled:opacity-60"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Funder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Main Admin Panel ──────────────────────────────────────── */
const AdminPanelContent = ({ token, onLogout }: { token: string; onLogout: () => void }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingFunder, setEditingFunder] = useState<Partial<Funder> | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const flashMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  };

  const api = adminApi(token);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-funders", statusFilter],
    queryFn: async () => {
      const res = await api.get("/funders", { params: { limit: 200, status: statusFilter } });
      return res.data;
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/funders/${id}`),
    onSuccess: () => {
      flashMsg("Funder deactivated.");
      queryClient.invalidateQueries({ queryKey: ["admin-funders"] });
    },
    onError: () => flashMsg("Failed to deactivate funder."),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/funders/${id}/reactivate`),
    onSuccess: () => {
      flashMsg("Funder reactivated.");
      queryClient.invalidateQueries({ queryKey: ["admin-funders"] });
    },
    onError: () => flashMsg("Failed to reactivate funder."),
  });

  const funders: Funder[] = (data?.data ?? []).filter((f: Funder) =>
    !search ||
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.missionStatement?.toLowerCase().includes(search.toLowerCase())
  );

  const fmtGrant = (min?: number, max?: number) => {
    if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
    if (max) return `Up to $${max.toLocaleString()}`;
    return "—";
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 bg-neutral-50 min-h-screen p-4 pb-10 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} className="text-[#ef3e34]" />
            <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl sm:text-3xl tracking-[0.5px] uppercase leading-tight">
              Admin Panel
            </h1>
          </div>
          <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-sm">
            Manage the public safety funder database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#374151] [font-family:'Montserrat',Helvetica] hover:bg-[#f9fafb]"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => { setEditingFunder({}); setShowForm(true); }}
            className="flex items-center gap-2 rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-bold text-white [font-family:'Montserrat',Helvetica] hover:bg-[#d63029]"
          >
            <Plus size={16} /> Add Funder
          </button>
          <button
            onClick={onLogout}
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#6b7280] [font-family:'Montserrat',Helvetica] hover:bg-[#f9fafb]"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Flash message */}
      {actionMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
          <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-green-700">{actionMsg}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 [font-family:'Montserrat',Helvetica] text-sm placeholder:text-[#9ca3af] focus:border-[#ef3e34] focus:outline-none"
          placeholder="Search funders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="w-full sm:w-44 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 [font-family:'Montserrat',Helvetica] text-sm focus:border-[#ef3e34] focus:outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="active">Active Funders</option>
          <option value="inactive">Deactivated Funders</option>
        </select>
        <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#6b7280] whitespace-nowrap">
          {funders.length} funder{funders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
          <p className="[font-family:'Montserrat',Helvetica] text-red-700 text-sm">Failed to load funders.</p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white border border-[#e5e7eb]" />
          ))}
        </div>
      ) : funders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-[#e5e7eb] bg-white">
          <p className="[font-family:'Montserrat',Helvetica] text-[#6b7280] text-sm">No funders found.</p>
          <button
            onClick={() => { setEditingFunder({}); setShowForm(true); }}
            className="flex items-center gap-2 rounded-lg bg-[#ef3e34] px-4 py-2 text-sm font-bold text-white hover:bg-[#d63029]"
          >
            <Plus size={14} /> Add First Funder
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                <th className="px-4 py-3 text-left [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden sm:table-cell">Grant Range</th>
                <th className="px-4 py-3 text-left [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden md:table-cell">Location</th>
                <th className="px-4 py-3 text-left [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden lg:table-cell">Categories</th>
                <th className="px-4 py-3 text-left [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {funders.map((f, idx) => (
                <tr key={f._id} className={cn("border-b border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors", idx === funders.length - 1 && "border-b-0")}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm">{f.name}</span>
                      {f.contactEmail && (
                        <span className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af]">{f.contactEmail}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151]">{fmtGrant(f.avgGrantMin, f.avgGrantMax)}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="[font-family:'Montserrat',Helvetica] text-sm text-[#374151]">{f.locationFocus?.join(", ") || "—"}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {f.fundingCategories?.slice(0, 2).map((c) => (
                        <span key={c} className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-xs [font-family:'Montserrat',Helvetica] text-[#6b7280]">{c}</span>
                      ))}
                      {(f.fundingCategories?.length || 0) > 2 && (
                        <span className="text-xs text-[#9ca3af]">+{(f.fundingCategories?.length || 0) - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold [font-family:'Montserrat',Helvetica]",
                      f.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditingFunder(f); setShowForm(true); }}
                        className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={15} />
                      </button>
                      {f.status === "active" ? (
                        <button
                          onClick={() => {
                            if (confirm(`Deactivate "${f.name}"?`)) deactivateMutation.mutate(f._id);
                          }}
                          className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateMutation.mutate(f._id)}
                          className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-green-50 hover:text-green-600 transition-colors"
                          title="Reactivate"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Funder Form Modal */}
      {showForm && editingFunder !== null && (
        <FunderFormModal
          initial={editingFunder}
          token={token}
          onClose={() => { setShowForm(false); setEditingFunder(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditingFunder(null);
            queryClient.invalidateQueries({ queryKey: ["admin-funders"] });
            flashMsg(editingFunder._id ? "Funder updated." : "Funder added.");
          }}
        />
      )}
    </div>
  );
};

/* ── Main Export ───────────────────────────────────────────── */
export const AdminPanel = () => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("rdg_admin_token");
    if (stored) setToken(stored);
  }, []);

  const handleLogin = (t: string) => setToken(t);

  const handleLogout = () => {
    sessionStorage.removeItem("rdg_admin_token");
    setToken(null);
    queryClient.clear();
  };

  if (!token) return <AdminLoginScreen onLogin={handleLogin} />;
  return <AdminPanelContent token={token} onLogout={handleLogout} />;
};
