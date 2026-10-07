import type { CompanyBrand } from "@/lib/branding";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { competitiveBadgeLine, loadDigisolEarnedBadges } from "@/lib/competitive/publicBadge";
import { createOpenAIClient, getOpenAIApiKey, getOpenAITextModel } from "@/lib/openai";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { HOUSE_AWARD_ID, loadAward } from "@/lib/websiteAward";

export type CardPlan = {
  headerColor: string;
  showHeader: boolean;
  name: string;
  roles: string[];
  details: string[];
  backHeadline: string;
  backSubline: string;
  qrFace: "front" | "back";
  qrSide: "left" | "right" | "center";
  emblemSize: number;
  awardsFace: "front" | "back";
  showBadges: boolean;
  reply: string;
};

type FormFields = {
  personName: string;
  personTitle: string;
  phone: string;
  email: string;
  line: string;
  directions: string;
};

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function hex(value: string, fallback: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : fallback;
}

function mentions(directions: string, value: string) {
  const words = value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
  if (!words.length) return false;
  const hay = directions.toLowerCase();
  const hits = words.filter((word) => hay.includes(word)).length;
  return hits >= Math.min(words.length, Math.max(1, Math.ceil(words.length * 0.6)));
}

function emailsIn(text: string) {
  return Array.from(new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []));
}

function phoneIn(text: string) {
  const match = text.match(/\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function hostIn(text: string) {
  const match = text.match(/https?:\/\/[^\s]+/i);
  if (!match) return "";
  return match[0].replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
}

function bodyChunk(directions: string) {
  const match = directions.match(/body:\s*([\s\S]+?)(?=\binclude\b|\bheadline\b|$)/i);
  return (match?.[1] || "").replace(/\s+/g, " ").trim();
}

function quotedHeadline(directions: string) {
  const match = directions.match(/headline\s+["“]([^"”]+)["”]/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function splitHeadline(quote: string) {
  const parts = quote
    .split(/[!?.]\s+/)
    .map((part) => part.replace(/[!?.]+$/, "").trim())
    .filter(Boolean);
  return {
    backHeadline: (parts[0] || quote).slice(0, 80),
    backSubline: parts.slice(1).join(". ").slice(0, 110),
  };
}

function proseLines(directions: string) {
  let chunk = bodyChunk(directions);
  if (!chunk) return [];
  chunk = chunk
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
    .replace(/\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const name = chunk.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/);
  if (name) chunk = chunk.slice(name[0].length).trim();
  const words = chunk.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const size = Math.max(3, Math.ceil(words.length / 6));
  const lines: string[] = [];
  for (let i = 0; i < words.length && lines.length < 6; i += size) {
    lines.push(words.slice(i, i + size).join(" "));
  }
  return lines;
}

function clampEmblem(value: number) {
  if (!Number.isFinite(value)) return 360;
  return Math.min(420, Math.max(200, Math.round(value)));
}

function blankPlan(brand: CompanyBrand, form: FormFields): CardPlan {
  const header = hex(brand.primaryColor, "#4f46e5");
  return {
    headerColor: header,
    showHeader: true,
    name: form.personName,
    roles: form.personTitle ? [form.personTitle] : [],
    details: [form.line, form.phone, form.email].map((item) => item.trim()).filter(Boolean),
    backHeadline: "",
    backSubline: "",
    qrFace: "front",
    qrSide: "right",
    emblemSize: 360,
    awardsFace: "back",
    showBadges: true,
    reply:
      "Front has two sections: an indigo header with the logo, then your lines on the left, a large logo badge in the center, and the QR on the right. Back has the headline and the awards.",
  };
}

/** Directions win over the form. Missing badges, the QR side, emails, and the headline are put back. */
export function enforceCardPlan(plan: CardPlan, brand: CompanyBrand, form: FormFields): CardPlan {
  const directions = form.directions.trim();
  if (!directions) return plan;
  const next = { ...plan, roles: [...plan.roles], details: [...plan.details] };
  const hay = directions.toLowerCase();

  if (/\bno (badge|award)/.test(hay) || /\bwithout (the )?(badge|award)/.test(hay)) next.showBadges = false;
  else if (/\b(badge|award)/.test(hay)) next.showBadges = true;
  if (/\bqr\b/.test(hay) && /\bback\b/.test(hay)) next.qrFace = "back";
  else if (/\bqr\b/.test(hay) && /\bfront\b/.test(hay)) next.qrFace = "front";
  if (/\bqr\b/.test(hay) && /\bright\b/.test(hay)) next.qrSide = "right";
  else if (/\bqr\b/.test(hay) && /\bleft\b/.test(hay)) next.qrSide = "left";
  else if (/\bqr\b/.test(hay) && /\bcenter\b/.test(hay)) next.qrSide = "center";
  if (/\b(award|badge)s?\b/.test(hay) && /\bfront\b/.test(hay) && /\b(put|move|on the front)\b/.test(hay)) next.awardsFace = "front";
  else if (/\b(award|badge)s?\b/.test(hay) && /\bback\b/.test(hay)) next.awardsFace = "back";
  if (/\bno header\b|\bwithout (the |an )?header\b|\bremove the header\b/.test(hay)) next.showHeader = false;
  else if (/\bheader\b/.test(hay)) next.showHeader = true;
  if (/\bindigo\b/.test(hay)) {
    next.headerColor = "#4f46e5";
    if (!/\bno header\b/.test(hay)) next.showHeader = true;
  }
  if (/\b(bigger|larger)\b/.test(hay) && /\b(logo badge|center logo|badge|emblem)\b/.test(hay)) next.emblemSize = 420;
  else if (/\b(smaller|small)\b/.test(hay) && /\b(logo badge|center logo|badge|emblem)\b/.test(hay)) next.emblemSize = 240;

  const named = bodyChunk(directions).match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/);
  if (named && !mentions(directions, next.name)) next.name = named[1];

  next.roles = next.roles.filter((role) => mentions(directions, role)).slice(0, 6);
  if (!next.roles.length) next.roles = proseLines(directions).slice(0, 6);

  const contacts = [...emailsIn(directions)];
  const phone = phoneIn(directions);
  const host = hostIn(directions);
  if (phone) contacts.push(phone);
  if (host) contacts.push(host);
  next.details = next.details.filter((line) => mentions(directions, line) || contacts.some((item) => line.includes(item)));
  for (const item of contacts) {
    if (!next.details.some((line) => line.toLowerCase().includes(item.toLowerCase()))) next.details.push(item);
  }
  next.details = next.details.slice(0, 6);

  const quote = quotedHeadline(directions);
  if (quote) {
    const tightened = splitHeadline(quote);
    const current = `${next.backHeadline} ${next.backSubline}`.toLowerCase();
    const keepsAudit = !/audit/i.test(quote) || /audit/.test(current);
    const keepsBadge = !/badge/i.test(quote) || /badge/.test(current);
    if (!keepsAudit || !keepsBadge || !next.backHeadline) {
      next.backHeadline = tightened.backHeadline;
      next.backSubline = tightened.backSubline;
    }
  }

  if (!/\bqr\b/.test(hay)) {
    next.qrFace = "front";
    next.qrSide = "right";
  }
  if (!/\bheader\b/.test(hay)) next.showHeader = true;
  if (!(/\b(bigger|larger|smaller|small)\b/.test(hay) && /\b(badge|emblem|center logo|logo badge)\b/.test(hay))) {
    next.emblemSize = 360;
  }
  if (!(/\b(award|badge)/.test(hay) && /\b(front|back)\b/.test(hay) && /\b(put|move|on the)\b/.test(hay))) {
    next.awardsFace = "back";
  }
  next.emblemSize = clampEmblem(next.emblemSize);
  if (!next.backHeadline && /\b(audit|badge)/.test(hay)) next.backHeadline = "Get your free audit & badges";
  if (!next.reply || /form/i.test(next.reply)) {
    const headerBit = next.showHeader ? "an indigo header with the logo" : "no header";
    const qrBit = `the QR on the ${next.qrFace}, ${next.qrSide}`;
    const awardBit = next.showBadges ? `awards on the ${next.awardsFace}` : "no awards";
    next.reply = `Front has ${headerBit}, ${next.name || "the name"} on the left, the logo badge in the center, and ${qrBit}. Back has ${next.backHeadline || "your headline"} and ${awardBit}.`;
  }
  return next;
}

export async function planBusinessCard(companyName: string, brand: CompanyBrand, form: FormFields): Promise<CardPlan> {
  const base = blankPlan(brand, form);
  if (!form.directions.trim() || !getOpenAIApiKey()) return enforceCardPlan(base, brand, form);
  try {
    const completion = await createOpenAIClient().chat.completions.create({
      model: getOpenAITextModel(),
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are Kaylev. You design both sides of a printed business card (3.5 × 2 inches). Return JSON:
headerColor (hex), showHeader (boolean), name, roles (string array, max 6), details (string array, max 6), backHeadline, backSubline, qrFace ("front"|"back"), qrSide ("left"|"right"|"center"), emblemSize (number 200-420), awardsFace ("front"|"back"), showBadges (boolean), reply.
Start from this design, then change whatever they ask:
Front has two sections. Section one is an indigo header (#4f46e5) with the logo centered in it (showHeader true). Section two is the body: their lines on the left, a large circular logo badge in the center (emblemSize 360), and the QR on the right (qrFace "front", qrSide "right").
Back is the other side: one headline, then up to four award images in a 2 by 2 grid (awardsFace "back", showBadges true).
If they move the QR, change qrFace and qrSide. If they drop or recolor the header, change showHeader and headerColor. If they want the center logo bigger or smaller, change emblemSize. If they move the awards, change awardsFace. Follow the placement they name.
The directions override the form. Do not keep a title, phone, or email from the form unless the directions repeat it.
You may tighten wording so it fits. Do not drop a fact they named. Do not invent a person, title, phone, email, or award.
headerColor is #4f46e5 when they ask for indigo, otherwise ${brand.primaryColor || "#4f46e5"}.
backHeadline is their headline. Use "Get your free audit & badges" when they ask for a free audit and badges.
reply says what is on the front and what is on the back, including any move they asked for.`,
        },
        {
          role: "user",
          content: `Company: ${companyName}
Form name (ignore unless the directions repeat it): ${form.personName || "(blank)"}
Form title (ignore unless the directions repeat it): ${form.personTitle || "(blank)"}
Form phone: ${form.phone || "(blank)"}
Form email: ${form.email || "(blank)"}
Form line: ${form.line || "(blank)"}
Directions: ${form.directions}`,
        },
      ],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as Record<string, unknown>;
    const roles = Array.isArray(parsed.roles) ? parsed.roles.map((item) => clip(item, 80)).filter(Boolean).slice(0, 6) : [];
    const details = Array.isArray(parsed.details) ? parsed.details.map((item) => clip(item, 80)).filter(Boolean).slice(0, 6) : [];
    const side = parsed.qrSide === "left" || parsed.qrSide === "center" ? parsed.qrSide : "right";
    const emblemSize = Number(parsed.emblemSize);
    const planned: CardPlan = {
      headerColor: hex(clip(parsed.headerColor, 7), base.headerColor),
      showHeader: parsed.showHeader !== false,
      name: clip(parsed.name, 80) || base.name,
      roles: roles.length ? roles : base.roles,
      details: details.length ? details : base.details,
      backHeadline: clip(parsed.backHeadline, 90),
      backSubline: clip(parsed.backSubline, 120),
      qrFace: parsed.qrFace === "back" ? "back" : "front",
      qrSide: side,
      emblemSize: clampEmblem(Number.isFinite(emblemSize) ? emblemSize : base.emblemSize),
      awardsFace: parsed.awardsFace === "front" ? "front" : "back",
      showBadges: parsed.showBadges !== false,
      reply: clip(parsed.reply, 280) || base.reply,
    };
    return enforceCardPlan(planned, brand, form);
  } catch (err) {
    console.error("Kaylev card design failed", err);
    return enforceCardPlan(base, brand, form);
  }
}

/** Labels for badges this company has actually earned. */
export async function cardBadgeLabels(companyName: string) {
  if (!hasAdminClient()) return [];
  const house = companyName.trim().toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  if (!house) return [];
  const db = createAdminClient();
  const labels: string[] = [];
  const audit = await loadAward(db, HOUSE_AWARD_ID).catch(() => ({ state: "missing" as const }));
  if (audit.state === "valid") labels.push(`We pass our own audit · ${audit.score}`);
  const earned = await loadDigisolEarnedBadges().catch(() => []);
  for (const badge of earned) labels.push(`${competitiveBadgeLine(badge.key)} · ${badge.score}`);
  return labels;
}
