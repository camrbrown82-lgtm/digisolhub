"use client";

import { Suspense } from "react";
import { GaRouteTracker } from "@/components/GaRouteTracker";

/** Suspense boundary required because GaRouteTracker reads searchParams. */
export function GaRouteTrackerBoundary() {
  return (
    <Suspense fallback={null}>
      <GaRouteTracker />
    </Suspense>
  );
}
