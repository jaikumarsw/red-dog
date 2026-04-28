"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RedDogLogo } from "@/components/RedDogLogo";
import { Check, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Tier = { key: string; name: string; price: number; features: string[] };

type BillingStatus = {
  hasAccess?: boolean;
  betaAccess?: boolean;
  tier?: string;
};

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingTier, setSubmittingTier] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tiersRes, statusRes] = await Promise.all([
          api.get("/billing/tiers"),
          api.get("/billing/status").catch(() => ({ data: { data: { hasAccess: false } } }))
        ]);
        setTiers(tiersRes.data?.data || []);
        setStatus(statusRes.data?.data || null);
      } catch (err) {
        console.error("Failed to fetch billing data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubscribe = async (tier: string) => {
    if (!user) {
      router.push("/login?redirect=/pricing");
      return;
    }
    try {
      setSubmittingTier(tier);
      const res = await api.post("/billing/checkout", { tier });
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("Failed to start checkout. Please try again.");
      setSubmittingTier(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#ef3e34]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-4 pb-20 pt-8 sm:pt-12">
      <div className="mb-12 self-start sm:self-center">
        <RedDogLogo />
      </div>

      <div className="mb-12 text-center">
        <h1 className="[font-family:'Oswald',Helvetica] text-4xl font-bold uppercase tracking-tight text-black sm:text-5xl">
          Choose Your Plan
        </h1>
        <p className="mt-4 [font-family:'Montserrat',Helvetica] text-lg text-gray-600">
          Find more grants. Win more funding. Power your agency.
        </p>
      </div>

      {status?.hasAccess && (
        <div className="mb-10 w-full max-w-[800px] rounded-xl bg-[#fff4f4] border border-red-100 p-4 text-center">
          <p className="[font-family:'Montserrat',Helvetica] font-medium text-gray-900">
            {status.betaAccess 
              ? "You have free Premium access through your beta code." 
              : `You're on the ${(status.tier || "").toUpperCase()} plan.`}
            <button 
              onClick={() => router.push("/account/billing")}
              className="ml-2 text-[#ef3e34] font-bold hover:underline"
            >
              Manage your subscription →
            </button>
          </p>
        </div>
      )}

      <div className="grid w-full max-w-[900px] grid-cols-1 gap-8 md:grid-cols-2">
        {tiers.map((tier) => (
          <Card 
            key={tier.key} 
            className={cn(
              "relative flex flex-col border-[#e5e7eb] shadow-lg transition-all hover:shadow-xl",
              tier.key === "premium" && "border-[#ef3e34] ring-1 ring-[#ef3e34]"
            )}
          >
            {tier.key === "premium" && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#ef3e34] px-4 py-1 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 shadow-md">
                <Star className="h-3 w-3 fill-white" />
                Recommended
              </div>
            )}
            
            <CardHeader className="pb-8 pt-8">
              <CardTitle className="[font-family:'Oswald',Helvetica] text-2xl uppercase tracking-wide">
                {tier.name}
              </CardTitle>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-black">${tier.price}</span>
                <span className="text-gray-500">/month</span>
              </div>
            </CardHeader>

            <CardContent className="flex-1 pb-8">
              <ul className="space-y-4">
                {tier.features.map((feature: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600 [font-family:'Montserrat',Helvetica]">
                    <Check className="h-5 w-5 shrink-0 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-4 pb-8">
              {!status?.hasAccess ? (
                <Button 
                  onClick={() => handleSubscribe(tier.key)}
                  disabled={submittingTier !== null}
                  className={cn(
                    "w-full py-6 [font-family:'Montserrat',Helvetica] text-base font-bold transition-all",
                    tier.key === "premium" 
                      ? "bg-[#ef3e34] hover:bg-[#d9382e] text-white" 
                      : "bg-black hover:bg-neutral-800 text-white"
                  )}
                >
                  {submittingTier === tier.key ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    `Subscribe to ${tier.name}`
                  )}
                </Button>
              ) : (
                <Button 
                  disabled 
                  className="w-full py-6 bg-gray-100 text-gray-400 [font-family:'Montserrat',Helvetica] font-bold"
                >
                  {status.tier === tier.key ? "Current Plan" : "Plan Active"}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-gray-400 [font-family:'Montserrat',Helvetica]">
        No free trial. Secure payment processing by Stripe.
      </p>
    </div>
  );
}
