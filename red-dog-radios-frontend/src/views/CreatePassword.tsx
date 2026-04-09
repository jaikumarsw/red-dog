"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedDogLogo } from "@/components/RedDogLogo";
import { AuthFooter } from "@/components/AuthFooter";
import { cn } from "@/lib/utils";
import { createPasswordSchema, type CreatePasswordFormValues } from "@/lib/validation-schemas";

export const CreatePassword = () => {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePasswordFormValues>({
    resolver: zodResolver(createPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = () => {
    router.push("/login");
  };

  const errBorder = (name: keyof CreatePasswordFormValues) =>
    errors[name] ? "border-red-500 focus-visible:ring-red-500" : "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-[#f9fafb] px-4 pb-10 pt-6 sm:pt-8">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm sm:p-10">
        <RedDogLogo />

        <div className="mt-5 w-16 h-16 rounded-full bg-[#fff7ed] border-2 border-[#fed7aa] flex items-center justify-center">
          <ShieldCheck size={28} className="text-[#f97316]" />
        </div>

        <h2 className="[font-family:'Oswald',Helvetica] font-bold text-black text-2xl tracking-[-0.5px] mt-5">
          Create New Password
        </h2>
        <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#6b7280] text-sm mt-2 text-center">
          Congratulations, Enter new password to recover your account
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 w-full mt-8" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-black">
              New Password
            </Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                data-testid="input-new-password"
                className={cn(
                  "h-11 border-[#d1d5db] pr-10 [font-family:'Montserrat',Helvetica] text-sm focus-visible:ring-[#ef3e34]",
                  errBorder("newPassword")
                )}
                {...register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280]"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="[font-family:'Montserrat',Helvetica] text-xs text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="[font-family:'Montserrat',Helvetica] font-medium text-sm text-black">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                data-testid="input-confirm-password"
                className={cn(
                  "h-11 border-[#d1d5db] pr-10 [font-family:'Montserrat',Helvetica] text-sm focus-visible:ring-[#ef3e34]",
                  errBorder("confirmPassword")
                )}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280]"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="[font-family:'Montserrat',Helvetica] text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
            <p className="[font-family:'Montserrat',Helvetica] text-xs text-[#9ca3af]">
              You can use at least 8 characters long
            </p>
          </div>

          <Button
            type="submit"
            data-testid="button-confirm-password"
            className="h-11 w-full bg-[#ef3e34] hover:bg-[#d63530] text-white [font-family:'Montserrat',Helvetica] font-bold text-sm mt-1"
          >
            CONFIRM PASSWORD
          </Button>
        </form>
      </div>

      <div className="mt-8">
        <AuthFooter />
      </div>
    </div>
  );
};
