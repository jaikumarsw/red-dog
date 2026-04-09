"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { loginSchema, type LoginFormValues } from "@/lib/validation-schemas";

export const Login = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = () => {
    router.push("/dashboard");
  };

  const fieldBorder = (name: keyof LoginFormValues) =>
    cn(
      "h-10 border-[#e5e7eb] rounded-lg [font-family:'Montserrat',Helvetica] text-sm text-[#111827] placeholder:text-[#d1d5db] focus-visible:ring-[#ef3e34] focus-visible:ring-1 focus-visible:border-[#ef3e34]",
      errors[name] && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500"
    );

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="hidden lg:block lg:w-[42%] flex-shrink-0 relative overflow-hidden">
        <img
          src="/auth-background.png"
          alt="Red Dog Radios"
          className="w-full h-full object-cover object-center"
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch overflow-y-auto bg-white px-4 py-4 sm:px-8 sm:py-6">
        <div className="mx-auto flex min-h-full w-full max-w-[400px] flex-col items-start justify-center gap-5">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ef3e34] shadow-[0_4px_14px_-2px_rgba(239,62,52,0.45)] sm:h-14 sm:w-14 sm:rounded-[14px]">
              <span className="[font-family:'Oswald',Helvetica] text-xl font-bold tracking-[1px] text-white sm:text-2xl">
                RD
              </span>
            </div>
            <div className="flex min-w-0 flex-col items-start">
              <span className="[font-family:'Oswald',Helvetica] text-lg font-bold leading-tight tracking-[0.5px] text-black sm:text-xl">
                RED DOG LOGO
              </span>
              <span className="[font-family:'Montserrat',Helvetica] text-[10px] font-semibold uppercase leading-snug tracking-[0.85px] text-[#9ca3af] sm:text-[11px]">
                Real Time Intelligence On Grants
              </span>
            </div>
          </div>

          <div className="w-full bg-[#f3f4f6] rounded-full p-1 flex gap-1">
            <button
              type="button"
              className="flex-1 bg-white rounded-full py-2 px-4 flex items-center justify-center gap-1.5 shadow-sm border border-[#e5e7eb]"
              data-testid="tab-signin"
            >
              <LogIn size={13} className="text-[#374151]" />
              <span className="[font-family:'Montserrat',Helvetica] font-semibold text-[#111827] text-sm">
                Sign In
              </span>
            </button>
            <Link
              href="/signup"
              className="flex-1 rounded-full py-2 px-4 flex items-center justify-center gap-1.5 no-underline"
              data-testid="tab-signup"
            >
              <UserPlus size={13} className="text-[#9ca3af]" />
              <span className="[font-family:'Montserrat',Helvetica] font-medium text-[#6b7280] text-sm">
                Sign Up
              </span>
            </Link>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-[#f0f0f0] p-6 flex flex-col gap-5"
            noValidate
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#fff1f0] flex items-center justify-center flex-shrink-0">
                <LogIn size={16} className="text-[#ef3e34]" />
              </div>
              <div>
                <h2 className="[font-family:'Montserrat',Helvetica] font-bold text-[#111827] text-[15px] leading-tight">
                  Welcome Back
                </h2>
                <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-xs mt-0.5">
                  Sign in to access your dashboard
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="[font-family:'Montserrat',Helvetica] font-medium text-xs text-[#374151]">
                Email
              </Label>
              <Input
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                data-testid="input-email"
                className={fieldBorder("email")}
                {...register("email")}
              />
              {errors.email && (
                <p className="[font-family:'Montserrat',Helvetica] text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="[font-family:'Montserrat',Helvetica] font-medium text-xs text-[#374151]">
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  data-testid="input-password"
                  className={cn(fieldBorder("password"), "pr-10")}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280]"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="[font-family:'Montserrat',Helvetica] text-xs text-red-600">{errors.password.message}</p>
              )}
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="[font-family:'Montserrat',Helvetica] text-xs font-medium text-[#ef3e34] hover:underline no-underline"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              data-testid="button-signin"
              className="w-full h-11 bg-[#ef3e34] hover:bg-[#d63530] active:bg-[#c02c28] text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn size={16} className="text-white" />
              <span className="[font-family:'Montserrat',Helvetica] font-bold text-sm tracking-[0.3px]">
                SIGN IN TO ACCOUNT
              </span>
            </button>

            <p className="[font-family:'Montserrat',Helvetica] font-normal text-[#9ca3af] text-[10px] text-center leading-4">
              By continuing, you agree to the Red Dog Radios platform terms of service.
            </p>
          </form>
          <p className="mt-5 w-full text-center [font-family:'Montserrat',Helvetica] text-xs font-normal text-[#9ca3af] sm:mt-6">
            © 2026 Red Dog Radios · Grant Intelligence Platform
          </p>
        </div>
      </div>
    </div>
  );
};
