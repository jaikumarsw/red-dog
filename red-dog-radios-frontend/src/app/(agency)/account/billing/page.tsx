"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ArrowRight,
  Sparkles,
  FileText,
  Radio,
  MessageCircle,
  Lock,
  Star,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Tier = { key: string; name: string; price: number; features: string[] };

type BillingStatus = {
  betaAccess?: boolean;
  hasAccess?: boolean;
  status?: string;
  tier?: string;
  currentPeriodEnd?: string | number | Date;
  cancelAtPeriodEnd?: boolean;
};

const UNLOCK_ITEMS = [
  {
    icon: Sparkles,
    title: "AI grant writing",
    desc: "Full application drafts, regeneration, and funder-aligned tone across the platform.",
  },
  {
    icon: MessageCircle,
    title: "Ashleen assistant",
    desc: "Chat with your grant expert for strategy, sections, and funder questions.",
  },
  {
    icon: FileText,
    title: "Weekly digest & outreach",
    desc: "AI-powered weekly summaries and funder outreach drafts.",
  },
  {
    icon: Radio,
    title: "Smart matching",
    desc: "Prioritized fit scores and tools to act on the best opportunities.",
  },
];

export default function BillingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, tiersRes] = await Promise.all([
          api.get("/billing/status"),
          api.get("/billing/tiers").catch(() => ({ data: { data: [] } })),
        ]);
        setStatus(statusRes.data?.data);
        setTiers(tiersRes.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch billing data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleManage = async () => {
    try {
      setPortalLoading(true);
      const res = await api.post("/billing/portal");
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err) {
      console.error("Failed to open portal:", err);
      alert("Failed to open billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[480px] w-full items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-[#ef3e34]" />
          <p className="[font-family:'Montserrat',Helvetica] text-sm text-gray-500">Loading subscription…</p>
        </div>
      </div>
    );
  }

  const isBeta = status?.betaAccess;
  const isPastDue = status?.status === "past_due";
  const hasPlan = !!status && status.tier !== "none";

  return (
    <div className="flex w-full min-w-0 flex-col px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <div className="relative mx-auto w-full max-w-[1100px]">
        {/* subtle top accent — scoped to content column so it aligns with card */}
        <div
          className="pointer-events-none absolute -top-4 left-0 right-0 h-32 rounded-b-[2rem] bg-gradient-to-b from-[#fff0f0] to-transparent opacity-90 sm:h-40"
          aria-hidden
        />

        <div className="relative flex w-full flex-col gap-8">
        <header className="pt-1">
          <p className="[font-family:'Montserrat',Helvetica] text-xs font-semibold uppercase tracking-[0.2em] text-[#ef3e34]">
            Account
          </p>
          <h1 className="mt-1 [font-family:'Oswald',Helvetica] text-3xl font-bold uppercase tracking-tight text-black sm:text-4xl">
            Billing & Subscription
          </h1>
          <p className="mt-2 max-w-2xl [font-family:'Montserrat',Helvetica] text-base text-gray-600">
            Manage your plan, payment methods, and invoices. Your subscription unlocks AI grant tools across the platform.
          </p>
        </header>

        {isPastDue && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/50 p-4 shadow-sm sm:flex-row sm:items-center">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-700" />
            <div className="flex-1">
              <p className="[font-family:'Montserrat',Helvetica] text-sm font-bold text-amber-900">
                Payment overdue
              </p>
              <p className="mt-0.5 text-xs text-amber-800 [font-family:'Montserrat',Helvetica]">
                Update your payment method to keep AI grant writing and premium features active.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleManage}
              className="shrink-0 bg-amber-600 font-bold text-white hover:bg-amber-700"
            >
              Update payment
            </Button>
          </div>
        )}

        {isBeta && (
          <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-white p-5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="[font-family:'Oswald',Helvetica] text-lg font-bold uppercase tracking-wide text-green-900">
                Beta access active
              </p>
              <p className="mt-1 text-sm text-green-800 [font-family:'Montserrat',Helvetica]">
                Full platform access through your beta code — including Premium-tier AI features.
              </p>
            </div>
          </div>
        )}

        <Card className="overflow-hidden border-[#e8e8e8] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]">
          <div className="h-1 bg-gradient-to-r from-[#ef3e34] via-[#ff6b5c] to-[#ef3e34]" aria-hidden />
          <CardHeader className="border-b border-[#f0f0f0] bg-gradient-to-b from-[#fafafa] to-white pb-6 pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="[font-family:'Oswald',Helvetica] text-xl uppercase tracking-wide text-black">
                  Current plan
                </CardTitle>
                <CardDescription className="mt-1.5 text-sm text-gray-600 [font-family:'Montserrat',Helvetica]">
                  {hasPlan
                    ? "Your agency is subscribed and billing runs through Stripe."
                    : "No active paid plan — upgrade to unlock AI grant writing and related tools."}
                </CardDescription>
              </div>
              {hasPlan && (
                <span
                  className={cn(
                    "inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider",
                    status.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-100 text-gray-700"
                  )}
                >
                  {String(status.status).replace("_", " ")}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {hasPlan ? (
              <div className="flex flex-col gap-6 p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ef3e34]/10 ring-1 ring-[#ef3e34]/20">
                      <CreditCard className="h-7 w-7 text-[#ef3e34]" />
                    </div>
                    <div>
                      <p className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase text-black">
                        {status.tier} plan
                      </p>
                      <p className="text-sm text-gray-500 [font-family:'Montserrat',Helvetica]">
                        {status.tier === "basic" ? "$199" : "$385"} per month
                      </p>
                    </div>
                  </div>

                  {!isBeta && (
                    <Button
                      onClick={handleManage}
                      disabled={portalLoading}
                      variant="outline"
                      className="border-gray-200 font-bold shadow-sm [font-family:'Montserrat',Helvetica] hover:bg-gray-50"
                    >
                      {portalLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-2 h-4 w-4" />
                      )}
                      Manage in Stripe
                    </Button>
                  )}
                </div>

                {status.currentPeriodEnd && !isBeta && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="[font-family:'Montserrat',Helvetica]">
                      Next billing date:{" "}
                      <strong>{format(new Date(status.currentPeriodEnd), "MMMM d, yyyy")}</strong>
                    </span>
                    {status.cancelAtPeriodEnd && (
                      <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                        Cancelling at period end
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-0 lg:grid-cols-[1fr_340px] lg:gap-0">
                <div className="border-b border-[#f0f0f0] p-6 sm:p-8 lg:border-b-0 lg:border-r">
                  <div className="mb-6 flex items-center gap-2 text-gray-500">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                      <Lock className="h-5 w-5 text-gray-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider [font-family:'Montserrat',Helvetica]">
                      Subscription required for AI features
                    </span>
                  </div>
                  <h3 className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase tracking-tight text-black sm:text-3xl">
                    Unlock the full grant intelligence stack
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-600 [font-family:'Montserrat',Helvetica]">
                    Subscribe to turn on AI application generation, Ashleen chat, weekly digest AI, outreach drafts, and
                    other premium tools — all tied to your agency profile and match scores.
                  </p>

                  <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                    {UNLOCK_ITEMS.map(({ icon: Icon, title, desc }) => (
                      <li
                        key={title}
                        className="flex gap-3 rounded-xl border border-[#f0f0f0] bg-[#fafafa]/50 p-4 transition-colors hover:border-[#ef3e34]/25 hover:bg-white"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ef3e34]/10">
                          <Icon className="h-4 w-4 text-[#ef3e34]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 [font-family:'Montserrat',Helvetica]">{title}</p>
                          <p className="mt-1 text-xs leading-snug text-gray-500 [font-family:'Montserrat',Helvetica]">
                            {desc}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      onClick={() => router.push("/pricing")}
                      size="lg"
                      className="bg-[#ef3e34] px-8 font-bold text-white shadow-lg shadow-[#ef3e34]/25 hover:bg-[#d9382e] [font-family:'Montserrat',Helvetica]"
                    >
                      Choose a plan
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-center text-xs text-gray-400 sm:text-left [font-family:'Montserrat',Helvetica]">
                      No free trial · Secure checkout via Stripe
                    </p>
                  </div>
                </div>

                <div className="bg-[#fafafa]/80 p-6 sm:p-8 lg:bg-gradient-to-b lg:from-[#fafafa] lg:to-white">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 [font-family:'Montserrat',Helvetica]">
                    Plans at a glance
                  </p>
                  <div className="mt-4 flex flex-col gap-3">
                    {tiers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                        Could not load plans.{" "}
                        <button type="button" className="font-bold text-[#ef3e34] underline" onClick={() => router.push("/pricing")}>
                          View pricing
                        </button>
                      </div>
                    ) : (
                      tiers.map((tier) => (
                        <button
                          key={tier.key}
                          type="button"
                          onClick={() => router.push("/pricing")}
                          className={cn(
                            "group w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:border-[#ef3e34]/40 hover:shadow-md",
                            tier.key === "premium" && "border-[#ef3e34]/30 ring-1 ring-[#ef3e34]/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="[font-family:'Oswald',Helvetica] text-lg font-bold uppercase text-black">
                                  {tier.name}
                                </span>
                                {tier.key === "premium" && (
                                  <Star className="h-3.5 w-3.5 fill-[#ef3e34] text-[#ef3e34]" />
                                )}
                              </div>
                              <p className="mt-1 [font-family:'Montserrat',Helvetica] text-2xl font-bold text-black">
                                ${tier.price}
                                <span className="text-sm font-medium text-gray-500">/mo</span>
                              </p>
                            </div>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#ef3e34]" />
                          </div>
                          <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                            {(tier.features || []).slice(0, 3).map((f) => (
                              <li key={f} className="flex items-start gap-2 text-xs text-gray-600 [font-family:'Montserrat',Helvetica]">
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </button>
                      ))
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    className="mt-4 w-full font-bold text-[#ef3e34] hover:bg-[#ef3e34]/5 [font-family:'Montserrat',Helvetica]"
                    onClick={() => router.push("/pricing")}
                  >
                    Compare all features
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <footer className="w-full rounded-2xl border border-dashed border-gray-200 bg-[#fafafa]/80 px-6 py-5">
          <p className="text-center text-sm text-gray-600 [font-family:'Montserrat',Helvetica] sm:text-left">
            Need help with your billing or plan? Contact our support team at{" "}
            <a
              href="mailto:support@reddogradios.com"
              className="font-bold text-[#ef3e34] hover:underline"
            >
              support@reddogradios.com
            </a>
            .
          </p>
        </footer>
        </div>
      </div>
    </div>
  );
}
