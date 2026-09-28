import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { ensureGoogleSetupSchema } from "@/lib/ensureGoogleSetupSchema";
import { errorMessage } from "@/lib/google/auth";
import {
  FIX_PRODUCT,
  applyGoogleFix,
  discoverGoogleAccess,
  houseDefaults,
  loadGoogleSetup,
  logGoogleFix,
  recentGoogleFixes,
  runGoogleAudit,
  saveGoogleAudit,
  saveGoogleIds,
  type GoogleSetupIds,
} from "@/lib/google/audit";
import { getWorkspaceClient } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function scope() {
  const { supabase, user, error } = await requireHubSession();
  if (error) return { error } as const;
  const client = await getWorkspaceClient(supabase);
  if (!client) {
    return {
      error: NextResponse.json({ error: "Pick a company under Working on first." }, { status: 400 }),
    } as const;
  }
  await ensureGoogleSetupSchema().catch(() => null);
  const isHouse = client.name.toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  const setup = await loadGoogleSetup(supabase, client.id, isHouse ? houseDefaults() : undefined);
  if (setup.needsMigration) {
    return {
      error: NextResponse.json(
        { error: "Run supabase/migrations/20261001000000_google_setup.sql in the Supabase SQL editor first." },
        { status: 409 },
      ),
    } as const;
  }
  return { supabase, user, client, setup } as const;
}

const text = (value: unknown, max = 200) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

export async function GET(request: Request) {
  const ctx = await scope();
  if ("error" in ctx) return ctx.error;
  if (new URL(request.url).searchParams.get("discover")) {
    return NextResponse.json(await discoverGoogleAccess(ctx.client.domain));
  }
  return NextResponse.json({
    setup: ctx.setup,
    fixes: await recentGoogleFixes(ctx.supabase, ctx.client.id),
  });
}

/** `{ action: "save", ids }`, `{ action: "audit" }` or `{ action: "fix", checkId }`. */
export async function POST(request: Request) {
  const ctx = await scope();
  if ("error" in ctx) return ctx.error;
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    ids?: Partial<GoogleSetupIds>;
    checkId?: string;
  };
  const { supabase, client, setup } = ctx;

  try {
    if (body.action === "save") {
      const ids: GoogleSetupIds = {
        ga4PropertyId: text(body.ids?.ga4PropertyId, 40),
        searchConsoleSite: text(body.ids?.searchConsoleSite),
        adsCustomerId: text(body.ids?.adsCustomerId, 20),
      };
      await saveGoogleIds(supabase, client.id, ids);
      const audit = await runGoogleAudit(ids, client.domain);
      await saveGoogleAudit(supabase, client.id, audit);
      return NextResponse.json({ setup: await loadGoogleSetup(supabase, client.id) });
    }

    if (body.action === "audit") {
      const audit = await runGoogleAudit(setup.ids, client.domain);
      await saveGoogleAudit(supabase, client.id, audit);
      return NextResponse.json({ setup: await loadGoogleSetup(supabase, client.id) });
    }

    if (body.action === "fix") {
      const check = setup.audit?.checks.find((c) => c.id === body.checkId);
      if (!check?.fix) {
        return NextResponse.json({ error: "That fix is out of date. Run the check again." }, { status: 400 });
      }
      let message = "";
      try {
        message = (await applyGoogleFix(check, setup.ids)) || "Done.";
        await logGoogleFix(supabase, { clientId: client.id, check, ok: true, detail: message, userEmail: ctx.user?.email });
      } catch (error) {
        const detail = errorMessage(error);
        await logGoogleFix(supabase, { clientId: client.id, check, ok: false, detail, userEmail: ctx.user?.email });
        return NextResponse.json({ error: `Google refused: ${detail}` }, { status: 502 });
      }
      const audit = await runGoogleAudit(setup.ids, client.domain, {
        only: [FIX_PRODUCT[check.fix.kind]],
        previous: setup.audit,
      });
      await saveGoogleAudit(supabase, client.id, audit, { keepPrevious: true });
      return NextResponse.json({
        message,
        setup: await loadGoogleSetup(supabase, client.id),
        fixes: await recentGoogleFixes(supabase, client.id),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
