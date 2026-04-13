"use client";

import { cn } from "@/lib/utils";

/** Multi-select tag picker backed by a predefined list of options. */
export function TagSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label?: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-sm font-medium text-[#111827] [font-family:'Montserrat',Helvetica]">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors [font-family:'Montserrat',Helvetica]",
                active
                  ? "border-[#ef3e34] bg-[#ef3e34] text-white"
                  : "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#ef3e34]/50"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-[#9ca3af] [font-family:'Montserrat',Helvetica]">
          Selected: {selected.join(", ")}
        </p>
      )}
    </div>
  );
}

/** Single-select category picker (radio-button style, but rendered as tags). */
export function CategorySelect({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-sm font-medium text-[#111827] [font-family:'Montserrat',Helvetica]">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(active ? "" : opt)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors [font-family:'Montserrat',Helvetica]",
                active
                  ? "border-[#ef3e34] bg-[#ef3e34] text-white"
                  : "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#ef3e34]/50"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
