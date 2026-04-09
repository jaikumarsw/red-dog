"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RedDogLogo } from "./RedDogLogo";
import { Menu } from "lucide-react";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: "/figmaAssets/svg-8.svg", path: "/dashboard" },
  { id: "organizations", label: "Organizations", icon: "/figmaAssets/svg-14.svg", path: "/organizations" },
  { id: "opportunities", label: "Opportunities", icon: "/figmaAssets/svg-4.svg", path: "/opportunities" },
  { id: "applications", label: "Applications", icon: "/figmaAssets/svg-11.svg", path: "/applications" },
  { id: "matches", label: "Matches", icon: "/figmaAssets/svg-6.svg", path: "/matches" },
  { id: "agencies", label: "Agencies", icon: "/figmaAssets/svg-14.svg", path: "/agencies" },
  { id: "weekly-summary", label: "Weekly Summary", icon: "/figmaAssets/svg-12.svg", path: "/weekly-summary" },
  { id: "outbox", label: "Outbox", icon: "/figmaAssets/svg-5.svg", path: "/outbox" },
  {
    id: "alerts",
    label: "Alerts",
    icon: "/figmaAssets/svg-1.svg",
    path: "/alerts",
    badge: "3",
  },
];

const SidebarContent = ({
  collapsed,
  onNavClick,
}: {
  collapsed: boolean;
  onNavClick?: () => void;
}) => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      {/* Logo */}
      <div className="h-20 flex items-center border-b border-[#1f1f1f] flex-shrink-0 px-4">
        {collapsed ? (
          <div className="w-9 h-9 bg-[#ef3e34] rounded-lg flex items-center justify-center mx-auto">
            <span className="[font-family:'Oswald',Helvetica] font-bold text-white text-sm tracking-[1px]">RD</span>
          </div>
        ) : (
          <RedDogLogo dark />
        )}
      </div>

      {/* Menu scrolls when it does not fit (fixed-height mobile drawer / short viewports) */}
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-y-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#333]">
        <div className={`flex flex-col items-start gap-2.5 py-6 w-full ${collapsed ? "px-2" : "px-4"}`}>
          {!collapsed && (
            <div className="flex flex-col items-start px-2 self-stretch w-full">
              <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#a6a6a6] text-xs tracking-[0.60px] leading-4">
                MENU
              </span>
            </div>
          )}

          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={onNavClick}
                title={collapsed ? item.label : undefined}
                className={`relative flex items-center cursor-pointer text-left transition-colors no-underline w-full
                ${collapsed ? "justify-center p-3 rounded-lg" : "gap-3 flex-[0_0_auto]"}
                ${isActive
                  ? collapsed
                    ? "bg-[#ef3e341a] rounded-lg"
                    : "p-3 bg-[#ef3e341a] rounded-lg"
                  : collapsed
                    ? "hover:bg-[#ffffff0d]"
                    : "px-4 py-3 rounded-2xl hover:bg-[#ffffff0d]"}`}
              >
                {isActive && !collapsed && (
                  <div className="absolute h-full top-0 left-0 w-1 bg-[#ef3e34] rounded-[0px_33554400px_33554400px_0px]" />
                )}
                <div className="relative flex-shrink-0">
                  <img className="w-5 h-5" alt={item.label} src={item.icon} />
                  {item.badge && collapsed && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                      <span className="[font-family:'Inter',Helvetica] font-bold text-[#ef3e34] text-[9px]">{item.badge}</span>
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <span className={`flex-1 [font-family:'Montserrat',Helvetica] text-base tracking-[0] leading-6 whitespace-nowrap ${isActive ? "font-bold text-[#ef3e34]" : "font-medium text-[#a6a6a6]"}`}>
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge && (
                  <div className="relative inline-flex flex-shrink-0 flex-col items-start px-2 py-0.5 bg-white rounded-[33554400px]">
                    <div className="pointer-events-none absolute inset-0 rounded-[33554400px] bg-[#ffffff01] shadow-[0px_1px_2px_-1px_#0000001a,0px_1px_3px_#0000001a]" />
                    <span className="relative [font-family:'Inter',Helvetica] font-bold text-[#ef3e34] text-[10px] tracking-[0] leading-[15px] whitespace-nowrap">
                      {item.badge}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Settings */}
      <div className={`flex flex-col items-start p-4 self-stretch w-full flex-shrink-0 border-t border-solid border-[#1f1f1f] ${collapsed ? "p-2" : ""}`}>
        <Link
          href="/settings"
          onClick={onNavClick}
          title={collapsed ? "Settings" : undefined}
          className={`flex items-center cursor-pointer text-left no-underline w-full
            ${collapsed ? "justify-center p-3 rounded-lg" : "gap-3 px-4 py-3 rounded-2xl"}
            ${pathname === "/settings" ? "bg-[#ef3e341a]" : "hover:bg-[#ffffff0d]"}`}
        >
          <img className="w-5 h-5 flex-shrink-0" alt="Settings" src="/figmaAssets/svg-9.svg" />
          {!collapsed && (
            <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#a6a6a6] text-base tracking-[0] leading-6 whitespace-nowrap">
              Settings
            </span>
          )}
        </Link>
      </div>

      {/* Sign Out */}
      <div className={`flex flex-col items-start self-stretch w-full flex-shrink-0 border-t border-solid border-[#1f1f1f] ${collapsed ? "p-2" : "p-4"}`}>
        <button
          type="button"
          onClick={() => {
            router.push("/login");
            onNavClick?.();
          }}
          title={collapsed ? "Sign Out" : undefined}
          className={`flex items-center cursor-pointer text-left w-full rounded-lg
            ${collapsed ? "justify-center p-3" : "gap-3 p-3"} hover:bg-[#ffffff0d]`}
        >
          <img className="w-5 h-5 flex-shrink-0" alt="Sign Out" src="/figmaAssets/svg-7.svg" />
          {!collapsed && (
            <span className="[font-family:'Montserrat',Helvetica] font-normal text-[#ef3e34] text-base tracking-[0] leading-6 whitespace-nowrap">
              Sign Out
            </span>
          )}
        </button>
      </div>
    </>
  );
};

export const AppShell = ({ children }: { children: ReactNode }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-neutral-50">
      <nav className="z-10 hidden w-72 shrink-0 flex-col items-stretch self-stretch overflow-hidden border-r border-solid border-[#1f1f1f] bg-[#0d0d0d] min-h-screen lg:flex">
        <SidebarContent collapsed={false} />
      </nav>

      <nav className="z-10 hidden w-16 shrink-0 flex-col items-stretch self-stretch overflow-hidden border-r border-solid border-[#1f1f1f] bg-[#0d0d0d] min-h-screen md:flex lg:hidden">
        <SidebarContent collapsed />
      </nav>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}
      <nav
        className={`fixed left-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] w-72 flex-col overflow-hidden border-r border-[#1f1f1f] bg-[#0d0d0d] transition-transform duration-300 md:hidden
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent collapsed={false} onNavClick={() => setDrawerOpen(false)} />
      </nav>

      <main className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-[#f0f0f0] bg-white px-4 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            data-testid="button-hamburger"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e7eb] transition-colors hover:bg-[#f3f4f6]"
          >
            <Menu size={18} className="text-[#374151]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#ef3e34]">
              <span className="[font-family:'Oswald',Helvetica] text-xs font-bold text-white">RD</span>
            </div>
            <span className="[font-family:'Oswald',Helvetica] text-sm font-bold tracking-[0.5px] text-black">
              RED DOG RADIOS
            </span>
          </div>
        </div>

        <div className="min-w-0 w-full">{children}</div>
      </main>
    </div>
  );
};
