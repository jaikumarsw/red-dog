"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Calendar, CheckCircle2, AlertCircle, Loader2, ExternalLink, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get("/billing/status");
        setStatus(res.data?.data);
      } catch (err) {
        console.error("Failed to fetch billing status:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
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
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ef3e34]" />
      </div>
    );
  }

  const isBeta = status?.betaAccess;
  const isPastDue = status?.status === "past_due";
  const isCancelled = status?.status === "cancelled";
  const hasPlan = !!status && status.tier !== "none";

  return (
    <div className="flex flex-col gap-8 max-w-[800px]">
      <div>
        <h1 className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase tracking-tight text-black sm:text-3xl">
          Billing & Subscription
        </h1>
        <p className="mt-1 [font-family:'Montserrat',Helvetica] text-sm text-gray-500">
          Manage your plan, payment methods, and invoices.
        </p>
      </div>

      {isPastDue && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold [font-family:'Montserrat',Helvetica]">Action Required: Payment Overdue</p>
            <p className="text-xs [font-family:'Montserrat',Helvetica]">Your last payment failed. Please update your payment method to avoid service interruption.</p>
          </div>
          <Button 
            size="sm" 
            onClick={handleManage}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            Update Payment
          </Button>
        </div>
      )}

      {isBeta && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-4 text-green-800 shadow-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-bold [font-family:'Montserrat',Helvetica]">Beta Access Active</p>
            <p className="text-xs [font-family:'Montserrat',Helvetica]">You have full platform access courtesy of your beta tester code.</p>
          </div>
        </div>
      )}

      <Card className="border-[#e5e7eb] shadow-md overflow-hidden">
        <CardHeader className="bg-[#f9fafb] border-b border-[#e5e7eb] pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="[font-family:'Oswald',Helvetica] text-xl uppercase tracking-wide">
                Current Plan
              </CardTitle>
              <CardDescription className="[font-family:'Montserrat',Helvetica]">
                {hasPlan ? "Your agency is currently on the" : "You do not have an active subscription."}
              </CardDescription>
            </div>
            {hasPlan && (
              <span className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                status.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
              )}>
                {status.status.replace("_", " ")}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          {hasPlan ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ef3e341a]">
                    <CreditCard className="h-6 w-6 text-[#ef3e34]" />
                  </div>
                  <div>
                    <p className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase text-black">
                      {status.tier} Plan
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
                    className="border-[#e5e7eb] hover:bg-gray-50 font-bold [font-family:'Montserrat',Helvetica]"
                  >
                    {portalLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Manage in Stripe
                  </Button>
                )}
              </div>

              {status.currentPeriodEnd && !isBeta && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <Calendar className="h-4 w-4" />
                  <span className="[font-family:'Montserrat',Helvetica]">
                    Next billing date: <strong>{format(new Date(status.currentPeriodEnd), "MMMM d, yyyy")}</strong>
                  </span>
                  {status.cancelAtPeriodEnd && (
                    <span className="ml-2 text-red-600 font-bold uppercase text-[10px]">Cancelling soon</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="[font-family:'Oswald',Helvetica] text-xl font-bold uppercase text-black">No Active Plan</h3>
              <p className="mt-2 mb-6 max-w-[400px] [font-family:'Montserrat',Helvetica] text-sm text-gray-500">
                Subscribe to a plan to unlock AI grant writing, unlimited funder matching, and advanced analytics.
              </p>
              <Button 
                onClick={() => router.push("/pricing")}
                className="bg-[#ef3e34] hover:bg-[#d9382e] text-white font-bold px-8"
              >
                Choose a Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-dashed border-[#e5e7eb] p-6 text-center">
        <p className="text-xs text-gray-400 [font-family:'Montserrat',Helvetica]">
          Need help with your billing or plan? Contact our support team at <a href="mailto:support@reddogradios.com" className="text-[#ef3e34] hover:underline">support@reddogradios.com</a>
        </p>
      </div>
    </div>
  );
}
