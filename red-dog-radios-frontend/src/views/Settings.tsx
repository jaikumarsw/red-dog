"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Globe, Shield, Trash2, Mail, Zap, Clock, CheckCircle, Lock, AlignJustify } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SettingsSectionCard, SettingsToggle } from "@/components/settings/SettingsPrimitives";
import { DeleteAccountModal } from "@/components/settings/DeleteAccountModal";
import { settingsSaveSchema, type SettingsSaveFormValues } from "@/lib/validation-schemas";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { qk } from "@/lib/queryKeys";

type ApiSettings = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  organizationId?: { name?: string } | null;
  settings?: {
    notifications?: Record<string, boolean>;
    preferences?: { language?: string; timezone?: string };
  };
};

export const Settings = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsSaveFormValues>({
    resolver: zodResolver(settingsSaveSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      currentPassword: "",
      newPassword: "",
    },
  });
  const [notifications, setNotifications] = useState({
    highFitAlerts: true,
    deadlineReminders: true,
    weeklySummary: true,
    alertUpdates: false,
    systemAlerts: true,
  });
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("America/New_York");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orgName, setOrgName] = useState<string>("");

  const { data: settingsData } = useQuery<ApiSettings>({
    queryKey: qk.settings(),
    queryFn: async () => {
      const res = await api.get("/settings");
      return res.data.data as ApiSettings;
    },
  });

  useEffect(() => {
    if (settingsData) {
      const u = settingsData;
      reset({
        firstName: u.firstName ?? (u.fullName ? u.fullName.split(" ")[0] : "") ?? "",
        lastName: u.lastName ?? (u.fullName ? u.fullName.split(" ").slice(1).join(" ") : "") ?? "",
        email: u.email ?? "",
        currentPassword: "",
        newPassword: "",
      });
      setOrgName(u.organizationId?.name ?? "—");
      if (u.settings?.notifications) {
        setNotifications((prev) => ({ ...prev, ...u.settings!.notifications }));
      }
      if (u.settings?.preferences?.language) setLanguage(u.settings.preferences.language);
      if (u.settings?.preferences?.timezone) setTimezone(u.settings.preferences.timezone);
    } else if (user) {
      reset({
        firstName: user.firstName ?? (user.fullName ? user.fullName.split(" ")[0] : "") ?? "",
        lastName: user.lastName ?? (user.fullName ? user.fullName.split(" ").slice(1).join(" ") : "") ?? "",
        email: user.email ?? "",
        currentPassword: "",
        newPassword: "",
      });
    }
  }, [settingsData, user, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: SettingsSaveFormValues) =>
      api.put("/settings", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        notifications,
        preferences: { language, timezone },
      }),
    onSuccess: () => {
      toast({ title: "Settings saved successfully", description: "Your preferences have been updated." });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save settings.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete("/settings/account"),
    onSettled: () => {
      logout();
      setShowDeleteModal(false);
      router.push("/login");
    },
  });

  const toggleNotif = (key: keyof typeof notifications) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = () => {
    void handleSubmit((data) => saveMutation.mutate(data))();
  };

  const inputCls =
    "w-full rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 [font-family:'Montserrat',Helvetica] text-sm font-normal text-[#111827] placeholder:text-[#d1d5db] transition-colors focus:border-[#ef3e34] focus:outline-none focus:ring-2 focus:ring-[#ef3e34]/20";
  const labelCls = "[font-family:'Montserrat',Helvetica] font-semibold text-[#9ca3af] text-xs tracking-[0.6px] uppercase";

  const notifRows = [
    { key: "highFitAlerts" as const, icon: <Zap size={15} />, label: "New Grant Matches", desc: "When a high-fit grant is detected for any organization" },
    { key: "deadlineReminders" as const, icon: <Clock size={15} />, label: "Deadline Alerts", desc: "Reminders 3 days before grant deadlines expire" },
    { key: "weeklySummary" as const, icon: <Mail size={15} />, label: "Weekly Digest", desc: "A summary of top opportunities every Monday morning" },
    { key: "alertUpdates" as const, icon: <Globe size={15} />, label: "Outbox Updates", desc: "Confirmations when outreach emails are sent" },
    { key: "systemAlerts" as const, icon: <Bell size={15} />, label: "System Alerts", desc: "Platform updates and important announcements" },
  ];

  const displayName = user?.fullName ?? [user?.firstName, user?.lastName].filter(Boolean).join(" ") ?? "User";
  const displayEmail = user?.email ?? "";
  const initials = displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U";

  return (
    <>
      <div className="flex w-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 pb-10 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl sm:text-3xl tracking-[0.5px] uppercase leading-tight">Settings</h1>
            <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-sm">Manage your profile, notifications, and preferences</p>
          </div>
          <button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-changes"
            className="flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#ef3e34] px-5 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-white transition-colors hover:bg-[#d63530] sm:w-auto sm:justify-center disabled:opacity-60">
            <Zap size={14} />{saveMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <SettingsSectionCard icon={<span className="[font-family:'Montserrat',Helvetica] font-bold text-[#ef3e34] text-xs">A</span>} title="Profile" subtitle="Your personal and account information">
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#f0f0f0] bg-[#fafafa] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ef3e34]">
                <span className="[font-family:'Montserrat',Helvetica] text-sm font-bold text-white">{initials}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="[font-family:'Montserrat',Helvetica] text-sm font-bold text-[#111827]">{displayName}</span>
                <span className="[font-family:'Montserrat',Helvetica] text-xs font-normal text-[#9ca3af] break-all">{displayEmail}</span>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#dcfce7] px-2.5 py-0.5 [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#16a34a]">✦ Active</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>First Name</label>
              <input data-testid="input-first-name" className={cn(inputCls, errors.firstName && "border-red-500")} placeholder="First name" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.firstName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Last Name</label>
              <input data-testid="input-last-name" className={cn(inputCls, errors.lastName && "border-red-500")} placeholder="Last name" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.lastName.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mb-4">
            <label className={labelCls}>Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
              <input data-testid="input-email" type="email" autoComplete="email" className={cn(inputCls, "pl-9", errors.email && "border-red-500")} placeholder="Email address" {...register("email")} />
            </div>
            {errors.email && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Organization</label>
            <div className="border border-[#e5e7eb] rounded-lg px-4 py-2.5 bg-[#f9fafb]">
              <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm">{orgName || "—"}</span>
            </div>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard icon={<Bell size={15} />} title="Notifications" subtitle="Choose which emails and alerts you receive">
          <div className="flex flex-col divide-y divide-[#f9fafb]">
            {notifRows.map((row) => (
              <div key={row.key} className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#9ca3af]">{row.icon}</div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">{row.label}</span>
                    <span className="[font-family:'Montserrat',Helvetica] text-xs font-normal text-[#9ca3af]">{row.desc}</span>
                  </div>
                </div>
                <SettingsToggle id={row.key} checked={notifications[row.key]} onChange={() => toggleNotif(row.key)} />
              </div>
            ))}
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard icon={<AlignJustify size={15} />} title="Preferences" subtitle="Regional settings and display options">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Language</label>
              <div className="relative">
                <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <select data-testid="select-language" className={`${inputCls} pl-9 appearance-none cursor-pointer`} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Timezone</label>
              <div className="relative">
                <Clock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <select data-testid="select-timezone" className={`${inputCls} pl-9 appearance-none cursor-pointer`} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  <option value="America/New_York">Eastern (ET)</option>
                  <option value="America/Chicago">Central (CT)</option>
                  <option value="America/Denver">Mountain (MT)</option>
                  <option value="America/Los_Angeles">Pacific (PT)</option>
                </select>
              </div>
            </div>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard icon={<Shield size={15} />} title="Security" subtitle="Authentication and account protection" iconBg="bg-[#fef3c7]" iconCls="text-[#d97706]">
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4]">
              <CheckCircle size={17} className="text-[#16a34a] flex-shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm">Account Secured</span>
                <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Protected with enterprise-grade OIDC authentication</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff]">
              <Lock size={17} className="text-[#3b82f6] flex-shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm">Two-Factor Authentication</span>
                <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">Managed via your account settings</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Current Password</label>
              <input data-testid="input-current-password" type="password" autoComplete="current-password" className={cn(inputCls, errors.currentPassword && "border-red-500")} placeholder="Leave blank if not changing" {...register("currentPassword")} />
              {errors.currentPassword && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.currentPassword.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>New Password</label>
              <input data-testid="input-new-password" type="password" autoComplete="new-password" className={cn(inputCls, errors.newPassword && "border-red-500")} placeholder="Leave blank if not changing" {...register("newPassword")} />
              {errors.newPassword && <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.newPassword.message}</p>}
            </div>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard icon={<Trash2 size={15} />} title="Danger Zone" subtitle="Irreversible actions – proceed with caution" iconBg="bg-[#fff1f0]" iconCls="text-[#ef4444]">
          <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-sm leading-6 mb-4">
            Permanently delete all your account data from Grant Intelligence. This removes all organizations, matches, Weekly Summary, and alerts. This action cannot be undone.
          </p>
          <button onClick={() => setShowDeleteModal(true)} data-testid="button-delete-account-data"
            className="flex items-center gap-2 h-10 px-5 rounded-lg border border-[#ef3e34] text-[#ef3e34] hover:bg-[#fff1f0] [font-family:'Montserrat',Helvetica] font-semibold text-sm transition-colors">
            <Trash2 size={14} />Delete All Account Data
          </button>
        </SettingsSectionCard>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} onConfirm={() => deleteMutation.mutate()} variant="agency" />
      )}
    </>
  );
};
