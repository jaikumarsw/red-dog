import { cn } from "@/lib/utils";

export const RedDogLogo = ({ 
  dark = false, 
  className,
  imgClassName 
}: { 
  dark?: boolean; 
  className?: string;
  imgClassName?: string;
}) => {
  return (
    <div className={cn("flex items-center", className)}>
      <img 
        src="/logo.png" 
        alt="Red Dog Grant Intelligence" 
        className={cn(
          "h-auto w-full",
          dark && "brightness-110",
          imgClassName
        )}
      />
    </div>
  );
};
