import Link from "next/link";

export const AuthFooter = () => {
  return (
    <div className="text-center">
      <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs">
        © 2026 Red Dog Grant Intelligence · Grant Intelligence Platform
      </p>
      <p className="mt-2 [font-family:'Montserrat',Helvetica] text-[10px] text-[#9ca3af]">
        <Link href="/terms-of-use" className="text-[#ef3e34] hover:underline">
          Terms of Use
        </Link>
        <span className="mx-1">·</span>
        <Link href="/privacy-policy" className="text-[#ef3e34] hover:underline">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
};
