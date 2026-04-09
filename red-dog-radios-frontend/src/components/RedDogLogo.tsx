interface RedDogLogoProps {
  dark?: boolean;
}

export const RedDogLogo = ({ dark = false }: RedDogLogoProps) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-10 h-10 items-center justify-center bg-[#ef3e34] rounded-lg shadow-[0px_4px_6px_-4px_#c6102e33,0px_10px_15px_-3px_#c6102e33] flex-shrink-0">
        <span className="[font-family:'Oswald',Helvetica] font-bold text-white text-xl tracking-[1.00px]">
          RD
        </span>
      </div>
      <div className="flex flex-col items-start">
        <span className={`[font-family:'Oswald',Helvetica] font-bold text-lg tracking-[0.45px] leading-tight ${dark ? "text-neutral-50" : "text-black"}`}>
          RED DOG LOGO
        </span>
        <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#a6a6a6] text-[10px] tracking-[1.00px] leading-tight">
          REAL TIME INTELLIGENCE ON GRANTS
        </span>
      </div>
    </div>
  );
};
