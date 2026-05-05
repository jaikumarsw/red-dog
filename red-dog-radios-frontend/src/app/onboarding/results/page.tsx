import { OnboardingResults } from "@/views/onboarding/OnboardingResults";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <OnboardingResults />
    </Suspense>
  );
}

