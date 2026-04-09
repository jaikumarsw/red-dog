"use client";

import { useState } from "react";
// Navigation menu items data
const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "/figmaAssets/svg-8.svg",
    active: true,
    badge: null,
  },
  {
    id: "organizations",
    label: "Organizations",
    icon: "/figmaAssets/svg-14.svg",
    active: false,
    badge: null,
  },
  {
    id: "opportunities",
    label: "Opportunities",
    icon: "/figmaAssets/svg-4.svg",
    active: false,
    badge: null,
  },
  {
    id: "applications",
    label: "Applications",
    icon: "/figmaAssets/svg-11.svg",
    active: false,
    badge: null,
  },
  {
    id: "matches",
    label: "Matches",
    icon: "/figmaAssets/svg-6.svg",
    active: false,
    badge: null,
  },
  {
    id: "weekly-summary",
    label: "Weekly Summary",
    icon: "/figmaAssets/svg-12.svg",
    active: false,
    badge: null,
  },
  {
    id: "outbox",
    label: "Outbox",
    icon: "/figmaAssets/svg-5.svg",
    active: false,
    badge: null,
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: "/figmaAssets/svg-1.svg",
    active: false,
    badge: "3",
  },
];

export const PrimaryNavigationMenuSection = () => {
  const [activeItem, setActiveItem] = useState("dashboard");

  return (
    <nav className="z-[1] flex w-72 min-h-screen flex-col items-stretch self-stretch border-r border-solid border-[#1f1f1f] bg-[#0d0d0d]">
      {/* Logo / Brand Header */}
      <div className="h-20 items-center px-6 py-0 border-[#1f1f1f] flex self-stretch w-full border-b border-solid flex-shrink-0">
        <div className="inline-flex items-center gap-3 relative flex-[0_0_auto]">
          {/* Logo badge */}
          <div className="flex w-10 h-10 items-center justify-center relative bg-[#ef3e34] rounded-lg flex-shrink-0">
            <div className="absolute top-0 left-0 w-10 h-10 bg-[#ffffff01] rounded-lg shadow-[0px_4px_6px_-4px_#c6102e33,0px_10px_15px_-3px_#c6102e33]" />
            <span className="relative [font-family:'Oswald',Helvetica] font-bold text-white text-xl tracking-[1.00px] leading-7 whitespace-nowrap">
              RD
            </span>
          </div>

          {/* Brand name and tagline */}
          <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
            <span className="relative [font-family:'Oswald',Helvetica] font-bold text-neutral-50 text-lg tracking-[0.45px] leading-[22.5px] whitespace-nowrap">
              RED DOG LOGO
            </span>
            <span className="relative [font-family:'Montserrat',Helvetica] font-semibold text-[#a6a6a6] text-[10px] tracking-[1.00px] leading-[15px] whitespace-nowrap">
              TAGLINE
            </span>
          </div>
        </div>
      </div>

      {/* Menu — grows with items */}
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex w-full flex-col items-start gap-2.5 px-4 py-6">
          {/* MENU label */}
          <div className="flex flex-col items-start px-2 py-0 self-stretch w-full flex-[0_0_auto]">
            <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#a6a6a6] text-xs tracking-[0.60px] leading-4">
              MENU
            </span>
          </div>

          {/* Navigation items */}
          {menuItems.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveItem(item.id)}
                className={`flex gap-3 self-stretch w-full overflow-hidden items-center relative flex-[0_0_auto] cursor-pointer text-left transition-colors
                  ${
                    isActive
                      ? "p-3 bg-[#ef3e341a] rounded-lg"
                      : "px-4 py-3 rounded-2xl"
                  }`}
              >
                {/* Active left border indicator */}
                {isActive && (
                  <div className="absolute h-full top-0 left-0 w-1 bg-[#ef3e34] rounded-[0px_33554400px_33554400px_0px]" />
                )}

                <img
                  className="relative w-5 h-5 flex-shrink-0"
                  alt={item.label}
                  src={item.icon}
                />

                <span
                  className={`relative flex items-center w-fit mt-[-1.00px] [font-family:'Montserrat',Helvetica] text-base tracking-[0] leading-6 whitespace-nowrap
                    ${
                      isActive
                        ? "font-bold text-[#ef3e34]"
                        : "font-medium text-[#a6a6a6]"
                    }`}
                >
                  {item.label}
                </span>

                {/* Badge for alerts */}
                {item.badge && (
                  <div className="inline-flex flex-col items-start px-2 py-0.5 absolute top-3.5 right-[13px] bg-white rounded-[33554400px]">
                    <div className="bg-[#ffffff01] rounded-[33554400px] shadow-[0px_1px_2px_-1px_#0000001a,0px_1px_3px_#0000001a] absolute w-full h-full top-0 left-0" />
                    <span className="relative [font-family:'Inter',Helvetica] font-bold text-[#ef3e34] text-[10px] tracking-[0] leading-[15px] whitespace-nowrap">
                      {item.badge}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings section */}
      <div className="flex flex-col items-start p-4 self-stretch w-full flex-[0_0_auto] border-t border-solid border-[#1f1f1f]">
        <button className="flex gap-3 px-4 py-3 self-stretch w-full rounded-2xl items-center relative flex-[0_0_auto] cursor-pointer text-left">
          <img
            className="relative w-5 h-5 flex-shrink-0"
            alt="Settings"
            src="/figmaAssets/svg-9.svg"
          />
          <span className="relative [font-family:'Montserrat',Helvetica] font-normal text-[#a6a6a6] text-base text-center tracking-[0] leading-6 whitespace-nowrap">
            Settings
          </span>
        </button>
      </div>

      {/* Sign Out section */}
      <div className="flex flex-col items-start p-4 self-stretch w-full flex-[0_0_auto] border-t border-solid border-[#1f1f1f]">
        <button className="flex gap-3 p-3 self-stretch w-full rounded-lg items-center relative flex-[0_0_auto] cursor-pointer text-left">
          <img
            className="relative w-5 h-5 flex-shrink-0"
            alt="Sign Out"
            src="/figmaAssets/svg-7.svg"
          />
          <span className="relative [font-family:'Montserrat',Helvetica] font-normal text-[#ef3e34] text-base text-center tracking-[0] leading-6 whitespace-nowrap">
            Sign Out
          </span>
        </button>
      </div>
    </nav>
  );
};
