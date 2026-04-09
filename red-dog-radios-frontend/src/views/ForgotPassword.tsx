"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedDogLogo } from "@/components/RedDogLogo";
import { AuthFooter } from "@/components/AuthFooter";
import { cn } from "@/lib/utils";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/lib/validation-schemas";

export const ForgotPassword = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = () => {
    router.push("/otp-verification?flow=reset");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-[#f9fafb] px-4 pb-10 pt-6 sm:pt-8">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm sm:p-10">
        <RedDogLogo />

        <div className="mt-5 w-16 h-16 rounded-full bg-[#fff7ed] border-2 border-[#fed7aa] flex items-center justify-center">
          <KeyRound size={28} className="text-[#f97316]" />
        </div>

        <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl tracking-[-0.5px] mt-5">
          Reset Password
        </h2>
        <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-sm mt-2 text-center">
          Enter your email address to recover your account
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 w-full mt-8" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-black">
              Email
            </Label>
            <Input
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              data-testid="input-email"
              className={cn(
                "h-11 border-[#d1d5db] [font-family:'Montserrat',Helvetica] text-sm focus-visible:ring-[#ef3e34]",
                errors.email && "border-red-500 focus-visible:ring-red-500"
              )}
              {...register("email")}
            />
            {errors.email && (
              <p className="[font-family:'Montserrat',Helvetica] text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            data-testid="button-send-otp"
            className="h-11 w-full bg-[#ef3e34] hover:bg-[#d63530] text-white [font-family:'Montserrat',Helvetica] font-bold text-sm"
          >
            SEND OTP
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 [font-family:'Montserrat',Helvetica] text-sm font-medium text-[#6b7280] hover:text-[#ef3e34] transition-colors no-underline"
          >
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </form>
      </div>

      <div className="mt-8">
        <AuthFooter />
      </div>
    </div>
  );
};
