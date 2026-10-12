import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { ensureMetaSetupSchema } from "@/lib/ensureMetaSetupSchema";
import {
  discoverMetaAccess,
  houseMetaIds,
  instagramForPage,
  loadMetaSetup,
  metaTargetFromIds,
  normalizeAdAccountId,
  saveMetaIds,
  type MetaSetupIds,
} from "@/lib/meta/setup";
import { metaGraph } from "@/lib/meta/graph";
import { isDigisolClient, getWorkspaceClient } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function digits(raw: string | null | undefined) {
  return (raw || "").replace(/\D/g, "");
}

async function scope() {
  const { supabase, error } = await requireHubSession();
  if (error) return { error } as const;
  const client = await getWorkspaceClient(supabase);
  if (!client) {
    return {
      error: NextResponse.json({ error: "Pick a company under Working on first." }, { status: 400 }),
    } as const;
  }
  await ensureMetaSetupSchema().catch(() => null);
  const isHouse = isDigisolClient(client);
  const defaults = isHouse ? houseMetaIds() : undefined;
  const setup = await loadMetaSetup(supabase, client.id, defaults);
  if (setup.needsMigration) {
    return {
      error: NextResponse.json(
        { error: "Run supabase/migrations/20261009000000_meta_setups.sql in the Supabase SQL editor first." },
        { status: 409 },
      ),
    } as const;
  }
  return { supabase, client, setup, isHouse } as const;
}

const text = (value: unknown, max = 40) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

export async function GET(request: Request) {
  const ctx = await scope();
  if ("error" in ctx) return ctx.error;
  if (new URL(request.url).searchParams.get("discover")) {
    return NextResponse.json(await discoverMetaAccess(ctx.client.name));
  }
  return NextResponse.json({ setup: ctx.setup });
}

/** `{ action: "save", ids }` — stores this company's Meta ad account, Page, and Instagram. */
export async function POST(request: Request) {
  const ctx = await scope();
  if ("error" in ctx) return ctx.error;
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    ids?: Partial<MetaSetupIds>;
  };
  if (body.action !== "save") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const ids: MetaSetupIds = {
    adAccountId: text(body.ids?.adAccountId),
    pageId: text(body.ids?.pageId),
    instagramUserId: text(body.ids?.instagramUserId),
    pixelId: text(body.ids?.pixelId),
  };
  if (ids.pageId && !digits(ids.instagramUserId)) {
    const instagramUserId = await instagramForPage(ids.pageId);
    if (instagramUserId) ids.instagramUserId = instagramUserId;
  }

  const house = houseMetaIds();
  const target = metaTargetFromIds(ids);
  if (!ctx.isHouse) {
    const clashes = [
      target.adAccountId && target.adAccountId === normalizeAdAccountId(house.adAccountId)
        ? "ad account"
        : "",
      target.pageId && target.pageId === digits(house.pageId) ? "Facebook Page" : "",
      target.instagramUserId && target.instagramUserId === digits(house.instagramUserId) ? "Instagram account" : "",
      target.pixelId && house.pixelId && target.pixelId === digits(house.pixelId) ? "pixel" : "",
    ].filter(Boolean);
    if (clashes.length) {
      return NextResponse.json(
        { error: `That ${clashes.join(" and ")} belongs to DigiSol. Link ${ctx.client.name}'s own Meta assets.` },
        { status: 400 },
      );
    }
  }

  try {
    await saveMetaIds(ctx.supabase, ctx.client.id, ids);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save.";
    const missing = /meta_setups|schema cache|does not exist/i.test(message);
    return NextResponse.json(
      {
        error: missing
          ? "Run supabase/migrations/20261009000000_meta_setups.sql in the Supabase SQL editor first."
          : message,
      },
      { status: missing ? 409 : 500 },
    );
  }

  let warning = "";
  if (target.adAccountId) {
    try {
      await metaGraph("GET", target.adAccountId, { fields: "name" });
    } catch (error) {
      warning =
        error instanceof Error
          ? `Saved, but the Hub cannot use that ad account yet. ${error.message}`
          : "Saved, but the Hub cannot use that ad account yet. Assign it to the system user and save again.";
    }
  }

  const setup = await loadMetaSetup(ctx.supabase, ctx.client.id, ctx.isHouse ? house : undefined);
  return NextResponse.json({
    setup,
    message: warning ? undefined : "Saved. Posts and ads for this company use these Meta assets.",
    warning: warning || undefined,
  });
}
