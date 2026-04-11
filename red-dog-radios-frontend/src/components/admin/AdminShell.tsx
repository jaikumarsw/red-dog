"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { useEffect } from "react";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/agencies", label: "Agencies" },
  { href: "/admin/opportunities", label: "Opportunities" },
  { href: "/admin/funders", label: "Funders" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout } = useAdminAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0c0f14] flex items-center justify-center text-slate-400">
        Checking session…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0c0f14] text-slate-100">
      <aside className="w-64 flex-shrink-0 border-r border-slate-800 flex flex-col bg-[#111827]">
        <div className="p-4 border-b border-slate-800">
          <span className="inline-block rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold tracking-widest px-2 py-1">
            RED DOG ADMIN
          </span>
          <p className="mt-2 text-xs text-slate-500">Staff portal</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${
                  active
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/admin/login");
            }}
            className="w-full rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
