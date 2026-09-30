import { ImageResponse } from "next/og";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { awardDate, loadAward } from "@/lib/websiteAward";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PNG copy of the badge for email, since Gmail and Outlook don't show SVG images. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const award = hasAdminClient() ? await loadAward(createAdminClient(), params.id) : { state: "missing" as const };
  const valid = award.state === "valid";
  const name = valid ? award.companyName : "";

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: valid ? "linear-gradient(135deg, #0f172a, #1e293b)" : "#1e293b",
          border: `4px solid ${valid ? "#fbbf24" : "#475569"}`,
          borderRadius: 28,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            background: valid ? "#fbbf24" : "transparent",
            color: valid ? "#020617" : "#94a3b8",
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: 3,
            padding: "6px 22px",
            borderRadius: 999,
          }}
        >
          DIGISOL EXCELLENCE AWARD
        </div>
        {valid ? (
          <>
            <div style={{ display: "flex", fontSize: 36, fontWeight: 800, marginTop: 18, maxWidth: 580, textAlign: "center" }}>
              {name.length > 30 ? `${name.slice(0, 29)}…` : name}
            </div>
            <div style={{ display: "flex", fontSize: 24, color: "#cbd5e1", marginTop: 8 }}>
              Website audit&nbsp;<span style={{ color: "#fbbf24", fontWeight: 700 }}>{award.score}/100</span>
            </div>
            <div style={{ display: "flex", fontSize: 19, color: "#94a3b8", marginTop: 10 }}>
              Verified {awardDate(award.auditedAt)} · wwwdigisol.com
            </div>
          </>
        ) : (
          <div style={{ display: "flex", fontSize: 26, color: "#64748b", marginTop: 16 }}>Not current</div>
        )}
      </div>
    ),
    { width: 640, height: 240 },
  );
  image.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  return image;
}
