"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bell,
  Globe,
  Shield,
  Trash2,
  Mail,
  Zap,
  Clock,
  CheckCircle,
  Lock,
  AlignJustify,
  Server,
  Database,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SettingsSectionCard, SettingsToggle } from "@/components/settings/SettingsPrimitives";
import { DeleteAccountModal } from "@/components/settings/DeleteAccountModal";
import { settingsSaveSchema, type SettingsSaveFormValues } from "@/lib/validation-schemas";
import adminApi from "@/lib/adminApi";
import { useAdminAuth, type AdminUser } from "@/lib/AdminAuthContext";

type ApiSettings = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  role?: string;
  organizationId?: { name?: string } | null;
  settings?: {
    notifications?: Record<string, boolean>;
    preferences?: { language?: string; timezone?: string };
  };
};

function toAdminUser(data: ApiSettings): AdminUser {
  return {
    _id: String(data._id ?? ""),
    email: String(data.email ?? ""),
    fullName: data.fullName,
    firstName: data.firstName,
    lastName: data.lastName,
    role: "admin",
  };
}

export function AdminSettings() {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user, logout, updateUser } = useAdminAuth();
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

  const { data: settingsData } = useQuery<ApiSettings>({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const res = await adminApi.get("settings");
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
      adminApi.put("settings", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        notifications,
        preferences: { language, timezone },
      }),
    onSuccess: (res) => {
      const raw = res.data?.data as ApiSettings | undefined;
      if (raw?._id) {
        updateUser(toAdminUser(raw));
      }
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast({
        title: "Settings saved",
        description: "Your staff profile and preferences were updated.",
      });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save settings.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.delete("settings/account"),
    onSettled: () => {
      logout();
      setShowDeleteModal(false);
      router.push("/admin/login");
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
    {
      key: "highFitAlerts" as const,
      icon: <Zap size={15} />,
      label: "Platform match alerts",
      desc: "When high-fit matches are scored across agencies and funders",
    },
    {
      key: "deadlineReminders" as const,
      icon: <Clock size={15} />,
      label: "Deadline alerts",
      desc: "Reminders for upcoming opportunity deadlines",
    },
    {
      key: "weeklySummary" as const,
      icon: <Mail size={15} />,
      label: "Weekly digest",
      desc: "Summary of platform activity for staff review",
    },
    {
      key: "alertUpdates" as const,
      icon: <Globe size={15} />,
      label: "Outbox & delivery",
      desc: "Updates when system emails are queued or sent",
    },
    {
      key: "systemAlerts" as const,
      icon: <Bell size={15} />,
      label: "System announcements",
      desc: "Infrastructure and product updates for administrators",
    },
  ];

  const displayName = user?.fullName ?? [user?.firstName, user?.lastName].filter(Boolean).join(" ") ?? "Staff";
  const displayEmail = user?.email ?? "";
  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "S";

  return (
    <>
      <div className="flex w-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 pb-10 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase leading-tight tracking-[0.5px] text-black sm:text-3xl">
              Settings
            </h1>
            <p className="[font-family:'Montserrat',Helvetica] text-sm font-normal text-[#6b7280]">
              Staff profile, notifications, and platform reference
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-admin-save-settings"
            className="flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#ef3e34] px-5 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-white transition-colors hover:bg-[#d63530] disabled:opacity-60 sm:w-auto sm:justify-center"
          >
            <Zap size={14} />
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <SettingsSectionCard
          icon={<span className="[font-family:'Montserrat',Helvetica] text-xs font-bold text-[#ef3e34]">A</span>}
          title="Profile"
          subtitle="Your staff identity and sign-in email"
        >
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#f0f0f0] bg-[#fafafa] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ef3e34]">
                <span className="[font-family:'Montserrat',Helvetica] text-sm font-bold text-white">{initials}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="[font-family:'Montserrat',Helvetica] text-sm font-bold text-[#111827]">{displayName}</span>
                <span className="break-all [font-family:'Montserrat',Helvetica] text-xs font-normal text-[#9ca3af]">
                  {displayEmail}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#fff1f0] px-2.5 py-0.5 [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#ef3e34]">
                Staff portal
              </span>
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#dcfce7] px-2.5 py-0.5 [font-family:'Montserrat',Helvetica] text-xs font-semibold text-[#16a34a]">
                ✦ Active
              </span>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>First Name</label>
              <input
                data-testid="admin-input-first-name"
                className={cn(inputCls, errors.firstName && "border-red-500")}
                placeholder="First name"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.firstName.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Last Name</label>
              <input
                data-testid="admin-input-last-name"
                className={cn(inputCls, errors.lastName && "border-red-500")}
                placeholder="Last name"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div className="mb-4 flex flex-col gap-1.5">
            <label className={labelCls}>Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
              <input
                data-testid="admin-input-email"
                type="email"
                autoComplete="email"
                className={cn(inputCls, "pl-9", errors.email && "border-red-500")}
                placeholder="Email address"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.email.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Access</label>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2.5">
              <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
                Red Dog Radio — Administrator
              </span>
              <p className="mt-0.5 [font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af]">
                Full access to agencies, funders, opportunities, and user management
              </p>
            </div>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          icon={<Bell size={15} />}
          title="Notifications"
          subtitle="Email and in-app preferences for staff workflows"
        >
          <div className="flex flex-col divide-y divide-[#f9fafb]">
            {notifRows.map((row) => (
              <div
                key={row.key}
                className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#9ca3af]">
                    {row.icon}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
                      {row.label}
                    </span>
                    <span className="[font-family:'Montserrat',Helvetica] text-xs font-normal text-[#9ca3af]">
                      {row.desc}
                    </span>
                  </div>
                </div>
                <SettingsToggle id={`admin-${row.key}`} checked={notifications[row.key]} onChange={() => toggleNotif(row.key)} />
              </div>
            ))}
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          icon={<AlignJustify size={15} />}
          title="Preferences"
          subtitle="Regional settings for reports and timestamps"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Language</label>
              <div className="relative">
                <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <select
                  data-testid="admin-select-language"
                  className={`${inputCls} cursor-pointer appearance-none pl-9`}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
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
                <select
                  data-testid="admin-select-timezone"
                  className={`${inputCls} cursor-pointer appearance-none pl-9`}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="America/New_York">Eastern (ET)</option>
                  <option value="America/Chicago">Central (CT)</option>
                  <option value="America/Denver">Mountain (MT)</option>
                  <option value="America/Los_Angeles">Pacific (PT)</option>
                </select>
              </div>
            </div>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          icon={<Server size={15} />}
          title="Platform configuration"
          subtitle="Live services are controlled on the server — reference for operators"
          iconBg="bg-[#eff6ff]"
          iconCls="text-[#2563eb]"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-xl border border-[#e0e7ff] bg-[#f8fafc] px-4 py-3">
              <Database size={17} className="mt-0.5 shrink-0 text-[#6366f1]" />
              <div>
                <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">Database & API</p>
                <p className="mt-0.5 [font-family:'Montserrat',Helvetica] text-xs leading-relaxed text-[#6b7280]">
                  Set <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">MONGO_URI</code> and{" "}
                  <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">JWT_SECRET</code> in the backend{" "}
                  <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">.env</code>. Restart the API after
                  changes.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-[#fce7f3] bg-[#fffafb] px-4 py-3">
              <Mail size={17} className="mt-0.5 shrink-0 text-[#db2777]" />
              <div>
                <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">Email delivery</p>
                <p className="mt-0.5 [font-family:'Montserrat',Helvetica] text-xs leading-relaxed text-[#6b7280]">
                  Configure <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">SMTP_*</code> variables for
                  outbox and digests. Without SMTP, messages stay queued.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] px-4 py-3">
              <Sparkles size={17} className="mt-0.5 shrink-0 text-[#d97706]" />
              <div>
                <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">AI features</p>
                <p className="mt-0.5 [font-family:'Montserrat',Helvetica] text-xs leading-relaxed text-[#6b7280]">
                  Set <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">OPENAI_API_KEY</code> for Ashleen,
                  application drafts, and match explanations.
                </p>
              </div>
            </div>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          icon={<Shield size={15} />}
          title="Security"
          subtitle="Authentication and password"
          iconBg="bg-[#fef3c7]"
          iconCls="text-[#d97706]"
        >
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
              <CheckCircle size={17} className="flex-shrink-0 text-[#16a34a]" />
              <div className="flex flex-col gap-0.5">
                <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
                  Staff session active
                </span>
                <span className="[font-family:'Montserrat',Helvetica] text-xs font-normal text-[#9ca3af]">
                  JWT-secured access to admin APIs; sign out from the sidebar anytime
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
              <Lock size={17} className="flex-shrink-0 text-[#3b82f6]" />
              <div className="flex flex-col gap-0.5">
                <span className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">
                  Password changes
                </span>
                <span className="[font-family:'Montserrat',Helvetica] text-xs font-normal text-[#9ca3af]">
                  Use a strong unique password for staff accounts; rotate if shared credentials were exposed
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Current Password</label>
              <input
                data-testid="admin-input-current-password"
                type="password"
                autoComplete="current-password"
                className={cn(inputCls, errors.currentPassword && "border-red-500")}
                placeholder="Leave blank if not changing"
                {...register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>New Password</label>
              <input
                data-testid="admin-input-new-password"
                type="password"
                autoComplete="new-password"
                className={cn(inputCls, errors.newPassword && "border-red-500")}
                placeholder="Leave blank if not changing"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="text-xs text-red-600 [font-family:'Montserrat',Helvetica]">{errors.newPassword.message}</p>
              )}
            </div>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          icon={<Trash2 size={15} />}
          title="Danger Zone"
          subtitle="Account access — does not remove agency data"
          iconBg="bg-[#fff1f0]"
          iconCls="text-[#ef4444]"
        >
          <p className="mb-4 [font-family:'Montserrat',Helvetica] text-sm font-normal leading-6 text-[#6b7280]">
            Deactivates your staff login. Agencies, funders, and applications in the database are unchanged. Another
            administrator can restore access by updating your user in the database or promoting your account again from the
            Users screen.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            data-testid="button-admin-deactivate"
            className="flex h-10 items-center gap-2 rounded-lg border border-[#ef3e34] px-5 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#ef3e34] transition-colors hover:bg-[#fff1f0]"
          >
            <Trash2 size={14} />
            Deactivate staff account
          </button>
        </SettingsSectionCard>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          variant="staff"
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => deleteMutation.mutate()}
        />
      )}
    </>
  );
}
