"use client";

import type { ClipboardEvent, KeyboardEvent } from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RedDogLogo } from "@/components/RedDogLogo";
import { AuthFooter } from "@/components/AuthFooter";
import { cn } from "@/lib/utils";
import { otpSchema } from "@/lib/validation-schemas";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuthGateRedirects } from "@/lib/useAuthGateRedirects";
import { useAuth, type AgencyUser } from "@/lib/AuthContext";

export const OtpVerification = () => {
  useAuthGateRedirects();
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();

    // Defensive cleanup: when the user lands here during a fresh signup/reset
    // flow, there should be NO active session yet. If a stale rdg_token cookie
    // exists (left over from a previous session), middleware would attempt to
    // redirect the user away on the next navigation. Clear stale auth cookies
    // unless there's a real session token in localStorage.
    if (typeof window !== "undefined") {
      const realToken = localStorage.getItem("rdg_token");
      if (!realToken) {
        document.cookie = "rdg_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "rdg_onboarding=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const pendingEmail =
    typeof window !== "undefined" ? sessionStorage.getItem("rdg_pending_email")?.trim() || "" : "";
  const resetEmail =
    typeof window !== "undefined" ? sessionStorage.getItem("rdg_reset_email")?.trim() || "" : "";
  const mode: "signup" | "reset" = pendingEmail ? "signup" : "reset";
  const email = (pendingEmail || resetEmail || "").trim().toLowerCase();

  const confirmOtp = async () => {
    const code = otp.join("");
    const parsed = otpSchema.safeParse(code);
    if (!parsed.success) {
      setOtpError(parsed.error.issues[0]?.message ?? "Invalid code");
      return;
    }
    setOtpError(null);

    if (!email) {
      setOtpError("Session expired. Please restart the flow.");
      return;
    }

    setVerifying(true);
    try {
      if (mode === "signup") {
        const res = await api.post("/auth/verify-email", { email: email.trim().toLowerCase(), otp: code });
        const { user, token } = res.data?.data as { user: unknown; token: unknown };
        if (!user || !token) throw new Error("missing auth");
        const agencyUser = user as AgencyUser;
        login(agencyUser, String(token));
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("rdg_pending_email");
          // Full navigation so middleware receives cookies set by login() (client
          // router transitions can omit freshly-written cookies).
          const dest = agencyUser.onboardingCompleted ? "/dashboard" : "/onboarding";
          window.location.assign(dest);
        }
      } else {
        const res = await api.post("/auth/verify-otp", { email: email.trim().toLowerCase(), otp: code });
        const token = res.data?.data?.resetToken as string | undefined;
        if (!token) throw new Error("missing token");
        if (typeof window !== "undefined") {
          sessionStorage.setItem("rdg_reset_token", token);
          // keep rdg_reset_email until password set
        }
        if (typeof window !== "undefined") {
          window.location.assign("/create-password");
        }
      }
    } catch {
      setOtpError("Invalid or expired code.");
      toast({ title: "Verification failed", description: "Check the code and try again.", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast({ title: "Session expired", description: "Please restart the flow.", variant: "destructive" });
      router.push(mode === "signup" ? "/signup" : "/forgot-password");
      return;
    }

    setResendLoading(true);
    try {
      const endpoint = mode === "signup" ? "/auth/resend-verification" : "/auth/forgot-password";
      const res = await api.post(endpoint, { email: email.trim().toLowerCase() });
      const emailSent = (res.data?.data as { emailSent?: boolean } | undefined)?.emailSent;
      if (emailSent === false) {
        toast({
          title: "Email may not have been sent",
          description:
            "Railway backend needs Pro plan + SMTP_USER/SMTP_PASS, then redeploy. Try port 587 (SMTP_SECURE=false) if 465 times out.",
          variant: "destructive",
        });
      } else {
        toast({ title: "New code sent!", description: "Check your email (and spam folder if you use Gmail)." });
        setResendCooldown(60);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not resend code.";
      toast({ title: "Could not resend", description: msg, variant: "destructive" });
    } finally {
      setResendLoading(false);
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
    <div className="flex min-h-screen flex-col items-center justify-start bg-[#f9fafb] px-3 pb-10 pt-6 sm:px-4 sm:pt-8">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm sm:p-10">
        <div className="flex w-full justify-center">
          <RedDogLogo className="w-[160px] max-w-full" />
        </div>

        <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#fed7aa] bg-[#fff7ed]">
          <ShieldCheck size={28} className="text-[#f97316]" />
        </div>

        <h2 className="mt-5 px-1 text-center [font-family:'Oswald',Helvetica] text-xl font-bold tracking-[-0.5px] text-black sm:text-2xl">
          {mode === "signup" ? "Verify your email" : "Enter reset code"}
        </h2>
        <p className="mt-2 max-w-full px-0.5 text-center [font-family:'Montserrat',Helvetica] text-xs font-normal leading-relaxed text-[#6b7280] sm:text-sm">
          Enter the 6-digit code sent to{" "}
          {email ? (
            <span className="inline-block max-w-full break-all font-semibold text-[#374151]">{email}</span>
          ) : (
            "your email"
          )}
        </p>

        <div
          className="mx-auto mt-6 grid w-full max-w-[min(100%,18rem)] grid-cols-6 gap-1.5 touch-manipulation sm:mt-8 sm:max-w-sm sm:gap-2 md:max-w-md md:gap-3"
          onPaste={handlePaste}
        >
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              autoComplete="one-time-code"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              data-testid={`input-otp-${i}`}
              className={cn(
                "box-border aspect-square h-auto min-h-[2.5rem] w-full min-w-0 rounded-md border-2 border-[#d1d5db] bg-white text-center text-sm font-bold tabular-nums text-black transition-colors [font-family:'Montserrat',Helvetica] focus:border-[#ef3e34] focus:outline-none focus:ring-2 focus:ring-[#ef3e34]/20 sm:min-h-[2.75rem] sm:rounded-lg sm:text-base md:min-h-[3rem] md:text-lg",
                otpError && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              )}
            />
          ))}
        </div>
        {otpError && (
          <p className="mt-2 text-center [font-family:'Montserrat',Helvetica] text-sm text-red-600">{otpError}</p>
        )}

        <div className="mt-4 flex min-h-11 w-full items-center justify-center">
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resendCooldown > 0 || resendLoading}
            aria-busy={resendLoading}
            className="inline-flex items-center justify-center gap-2 rounded-md px-2 py-2 [font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#ef3e34] hover:bg-[#fef2f2] hover:underline disabled:pointer-events-none disabled:text-gray-400 disabled:no-underline sm:min-h-11 sm:px-3"
          >
            {resendLoading ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                <span>Sending code…</span>
              </>
            ) : resendCooldown > 0 ? (
              <span>Resend code in {resendCooldown}s</span>
            ) : (
              <span>Resend code</span>
            )}
          </button>
        </div>

        <div className="mt-6 w-full">
          <Button
            type="button"
            onClick={() => void confirmOtp()}
            disabled={verifying || resendLoading}
            data-testid="button-confirm-otp"
            className="h-11 w-full bg-[#ef3e34] text-white [font-family:'Montserrat',Helvetica] text-sm font-bold hover:bg-[#d63530] disabled:opacity-70"
          >
            {verifying ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Verifying…
              </span>
            ) : (
              "CONFIRM OTP"
            )}
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <AuthFooter />
      </div>
    </div>
  );
};