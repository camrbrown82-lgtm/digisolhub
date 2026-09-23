"use client";

import { Suspense } from "react";
import { AttributionCapture } from "@/components/AttributionCapture";

/** Suspense boundary required for useSearchParams in App Router. */
export function AttributionCaptureBoundary() {
  return (
    <Suspense fallback={null}>
      <AttributionCapture />
    </Suspense>
  );
}
