import { AgencyProfile } from "../../../views/AgencyProfile";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[240px] w-full bg-white" />}>
      <AgencyProfile />
    </Suspense>
  );
}

