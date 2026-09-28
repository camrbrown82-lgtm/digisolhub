import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  getClientPlaceId,
  loadReviewSummary,
  placesConfigured,
  setClientPlaceId,
  snapshotClientReviews,
  suggestClientPlaces,
} from "@/lib/googleReviews";
import { getWorkspaceClient } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const MIGRATION_HINT =
  "Run supabase/migrations/20260930000000_google_reviews.sql in the Supabase SQL editor first.";

async function scope() {
  const { supabase, error } = await requireHubSession();
  if (error) return { error } as const;
  if (!placesConfigured()) {
    return {
      error: NextResponse.json(
        { error: "GOOGLE_PLACES_API_KEY is not set on the server." },
        { status: 503 },
      ),
    } as const;
  }
  const client = await getWorkspaceClient(supabase);
  if (!client) {
    return {
      error: NextResponse.json({ error: "Pick a company under Working on first." }, { status: 400 }),
    } as const;
  }
  return { supabase, client } as const;
}

function fail(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = /google_place_id|google_review_snapshots|schema cache/i.test(message) ? 409 : 500;
  return NextResponse.json(
    { error: status === 409 ? MIGRATION_HINT : message },
    { status },
  );
}

/** Search Google listings for the Working-on company (`?q=` overrides the name). */
export async function GET(request: Request) {
  const ctx = await scope();
  if ("error" in ctx) return ctx.error;
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 200) || "";
  try {
    const result = await suggestClientPlaces({
      name: ctx.client.name,
      domain: ctx.client.domain,
      query: q,
    });
    return NextResponse.json(result);
  } catch (error) {
    return fail(error, "Google search failed");
  }
}

/** `{ placeId }` links a listing; `{ refresh: true }` re-pulls today's numbers. */
export async function POST(request: Request) {
  const ctx = await scope();
  if ("error" in ctx) return ctx.error;
  const body = (await request.json().catch(() => ({}))) as {
    placeId?: string;
    refresh?: boolean;
  };
  try {
    let placeId = typeof body.placeId === "string" ? body.placeId.trim().slice(0, 300) : "";
    if (placeId) {
      await setClientPlaceId(ctx.supabase, ctx.client.id, placeId);
    } else if (body.refresh) {
      const current = await getClientPlaceId(ctx.supabase, ctx.client.id);
      if (current.needsMigration) return NextResponse.json({ error: MIGRATION_HINT }, { status: 409 });
      placeId = current.placeId || "";
    }
    if (!placeId) {
      return NextResponse.json({ error: "Link a Google listing first." }, { status: 400 });
    }
    await snapshotClientReviews(ctx.supabase, ctx.client.id, placeId);
    return NextResponse.json({ summary: await loadReviewSummary(ctx.supabase, ctx.client.id) });
  } catch (error) {
    return fail(error, "Could not load Google reviews");
  }
}

export async function DELETE() {
  const ctx = await scope();
  if ("error" in ctx) return ctx.error;
  try {
    await setClientPlaceId(ctx.supabase, ctx.client.id, null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error, "Could not unlink");
  }
}
