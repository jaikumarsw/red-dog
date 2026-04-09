"use client";

import type { ClipboardEvent, KeyboardEvent } from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RedDogLogo } from "@/components/RedDogLogo";
import { AuthFooter } from "@/components/AuthFooter";
import { cn } from "@/lib/utils";
import { otpSchema } from "@/lib/validation-schemas";

export const OtpVerification = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = searchParams.get("flow");

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [otpError, setOtpError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const confirmOtp = () => {
    const code = otp.join("");
    const parsed = otpSchema.safeParse(code);
    if (!parsed.success) {
      setOtpError(parsed.error.issues[0]?.message ?? "Invalid code");
      return;
    }
    setOtpError(null);
    if (flow === "signup") {
      router.push("/onboarding");
    } else {
      router.push("/create-password");
    }
  };

  const handleChange = (index: number, value: string) => {
    setOtpError(null);
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    setOtpError(null);
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] ?? "";
    }
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-[#f9fafb] px-4 pb-10 pt-6 sm:pt-8">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm sm:p-10">
        <RedDogLogo />

        <div className="mt-5 w-16 h-16 rounded-full bg-[#fff7ed] border-2 border-[#fed7aa] flex items-center justify-center">
          <ShieldCheck size={28} className="text-[#f97316]" />
        </div>

        <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl tracking-[-0.5px] mt-5">
          OTP Verification
        </h2>
        <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-sm mt-2 text-center">
          Enter the 6-digit verification code sent to your email address
        </p>

        <div className="mt-8 flex max-w-full flex-wrap justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              data-testid={`input-otp-${i}`}
              className={cn(
                "h-11 w-10 rounded-lg border-2 border-[#d1d5db] text-center text-base font-bold text-black transition-colors [font-family:'Montserrat',Helvetica] focus:border-[#ef3e34] focus:outline-none sm:h-12 sm:w-12 sm:text-lg",
                otpError && "border-red-500 focus:border-red-500"
              )}
            />
          ))}
        </div>
        {otpError && (
          <p className="[font-family:'Montserrat',Helvetica] text-sm text-red-600 mt-2 text-center">{otpError}</p>
        )}

        <div className="mt-4">
          {countdown > 0 ? (
            <p className="[font-family:'Montserrat',Helvetica] text-sm text-[#9ca3af]">
              Resend Code In:{" "}
              <span className="font-semibold text-[#ef3e34]">{countdown}</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setCountdown(60)}
              className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#ef3e34] hover:underline"
            >
              Resend Code
            </button>
          )}
        </div>

        <div className="w-full mt-6">
          <Button
            type="button"
            onClick={confirmOtp}
            data-testid="button-confirm-otp"
            className="h-11 w-full bg-[#ef3e34] hover:bg-[#d63530] text-white [font-family:'Montserrat',Helvetica] font-bold text-sm"
          >
            CONFIRM OTP
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <AuthFooter />
      </div>
    </div>
  );
};
