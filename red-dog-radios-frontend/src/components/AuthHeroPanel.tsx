"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** Left rail hero for auth screens (same asset as before: `public/auth-background.png`). */
export function AuthHeroPanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative hidden flex-shrink-0 overflow-hidden lg:block lg:w-[42%]",
        className
      )}
    >
      <Image
        src="/auth-background.png"
        alt=""
        fill
        priority
        fetchPriority="high"
        sizes="(max-width: 1023px) 0px, 42vw"
        quality={80}
        className="object-cover object-center"
      />
    </div>
  );
}
