import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_WIDTH = 1429;
const LOGO_HEIGHT = 737;

export const RedDogLogo = ({
  dark = false,
  className,
  imgClassName,
  priority = false,
  sizes,
}: {
  dark?: boolean;
  className?: string;
  imgClassName?: string;
  /** Set on auth / first-paint views so the logo is not lazy-loaded. */
  priority?: boolean;
  /** Override default responsive `sizes` when layout is known (e.g. fixed nav width). */
  sizes?: string;
}) => {
  return (
    <div className={cn("flex items-center", className)}>
      <Image
        src="/logo.png"
        alt="Red Dog Grant Intelligence"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        priority={priority}
        sizes={sizes ?? "(max-width: 640px) 45vw, 220px"}
        className={cn("h-auto w-full", dark && "brightness-110", imgClassName)}
      />
    </div>
  );
};

