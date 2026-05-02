interface RedDogLogoProps {
  dark?: boolean;
}

export const RedDogLogo = ({ dark = false }: RedDogLogoProps) => {
  const titleCls = dark
    ? "text-neutral-50"
    : "text-black";
  const taglineCls = dark
    ? "text-[#b8bcc4] [text-wrap:balance]"
    : "text-[#6b7280] [text-wrap:balance]";

  return (
    <div className="flex items-center">
      <img 
        src="/logo.png" 
        alt="Red Dog Grant Intelligence" 
        className={dark ? "w-full h-auto brightness-110" : "w-full h-auto"}
      />
    </div>
  );
};
