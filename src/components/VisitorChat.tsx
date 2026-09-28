"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { OPEN_KAYLEV_EVENT } from "@/components/ContactOptions";
import { MicDictateButton, appendDictation } from "@/components/hub/MicDictateButton";
import { fireAdsConversion } from "@/lib/ads";
import { trackEvent } from "@/lib/analytics";
import { readStoredAttribution } from "@/lib/attributionClient";
import { LOCALE_META } from "@/lib/i18n/config";
import { useLocale, useMessages } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";
import {
  GEO_AUDIENCE_COOKIE,
  GEO_COUNTRY_COOKIE,
  parseAudienceCookie,
  type VisitorAudience,
} from "@/lib/visitorRegion";

const KAYLEV_NAME = "Kaylev";

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
}

function createGreetingMessage(audience: VisitorAudience, t: Messages["chat"]): UIMessage {
  const text = audience === "alberta" ? t.greetingAlberta(KAYLEV_NAME) : t.greetingGeneral(KAYLEV_NAME);
  return {
    id: "kaylev-visitor-greeting",
    role: "assistant",
    parts: [{ type: "text", text }],
  };
}

function messageText(message: UIMessage) {
  return (message.parts ?? [])
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" && typeof (part as { text?: string }).text === "string",
    )
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function VisitorChat() {
  const locale = useLocale();
  const t = useMessages().chat;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [audience, setAudience] = useState<VisitorAudience>("international");
  const [country, setCountry] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextAudience =
      parseAudienceCookie(readCookie(GEO_AUDIENCE_COOKIE)) || "international";
    setAudience(nextAudience);
    setCountry(readCookie(GEO_COUNTRY_COOKIE).toUpperCase());
  }, []);

  // Open by default on desktop; stay collapsed on small screens so copy isn't covered.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener(OPEN_KAYLEV_EVENT, openChat);
    return () => window.removeEventListener(OPEN_KAYLEV_EVENT, openChat);
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/visitor-agent",
        body: () => ({
          audience,
          country: country || undefined,
          lang: locale,
          attribution: readStoredAttribution() ?? undefined,
        }),
      }),
    [audience, country, locale],
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    id: `kaylev-${locale}-${audience}-${country || "xx"}`,
    transport,
    messages: [createGreetingMessage(audience, t)],
  });

  const busy = status === "submitted" || status === "streaming";

  const countedLeads = useRef(new Set<string>());
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts ?? []) {
        if (part.type !== "tool-captureVisitorLead") continue;
        const toolPart = part as {
          toolCallId?: string;
          state?: string;
          output?: { reportedToHub?: boolean };
        };
        if (toolPart.state !== "output-available" || !toolPart.output?.reportedToHub) continue;
        const key = toolPart.toolCallId || message.id;
        if (countedLeads.current.has(key)) continue;
        countedLeads.current.add(key);
        fireAdsConversion("chat_lead");
        trackEvent("generate_lead", { method: "kaylev_chat" });
      }
    }
  }, [messages]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    clearError();
    await sendMessage({ text });
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  return (
    <div className="pointer-events-none fixed bottom-[4.75rem] right-3 z-40 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 sm:bottom-4 sm:right-4">
      {open ? (
        <section
          className="pointer-events-auto flex h-[min(17.5rem,42vh)] w-[min(17.5rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-indigo-400/25 bg-zinc-950/95 shadow-xl shadow-indigo-950/30 backdrop-blur"
          aria-label={t.panelAria(KAYLEV_NAME)}
        >
          <header className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-gradient-to-r from-indigo-600/20 to-zinc-950 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {KAYLEV_NAME}
              </p>
              <p className="truncate text-[10px] text-zinc-400">
                {t.subtitle}
                {country ? ` · ${country}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-md p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              aria-label={t.close}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </header>

          <div
            ref={listRef}
            className="flex-1 space-y-2 overflow-y-auto px-2.5 py-2"
            role="log"
            aria-live="polite"
          >
            {messages.map((message) => {
              const text = messageText(message);
              if (!text && message.role === "assistant") {
                const toolBits = (message.parts ?? [])
                  .filter((part) => part.type.startsWith("tool-"))
                  .map((part) => part.type.replace(/^tool-/, ""));
                if (toolBits.length === 0) return null;
                return (
                  <div
                    key={message.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1.5 text-[10px] text-zinc-400"
                  >
                    {t.working}: {toolBits.join(", ")}…
                  </div>
                );
              }
              if (!text) return null;
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`max-w-[95%] rounded-xl px-2.5 py-1.5 text-xs leading-snug ${
                    isUser
                      ? "ml-auto bg-indigo-500 text-white"
                      : "mr-auto border border-zinc-800 bg-zinc-900 text-zinc-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{text}</p>
                </div>
              );
            })}
            {busy ? (
              <p className="text-[10px] text-zinc-500">{t.typing(KAYLEV_NAME)}</p>
            ) : null}
            {error ? (
              <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[10px] text-rose-200">
                {error.message || t.error}
              </p>
            ) : null}
          </div>

          <form
            onSubmit={onSubmit}
            className="flex items-end gap-1.5 border-t border-zinc-800 bg-zinc-950/80 p-2"
          >
            <label className="sr-only" htmlFor="visitor-chat-input">
              {t.inputLabel(KAYLEV_NAME)}
            </label>
            <textarea
              id="visitor-chat-input"
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void onSubmit(event);
                }
              }}
              placeholder={t.placeholder}
              className="min-h-[2rem] max-h-16 flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              disabled={busy}
            />
            <MicDictateButton
              disabled={busy}
              label={t.mic}
              lang={LOCALE_META[locale].intl}
              strings={t.micStrings}
              onText={(chunk) => setInput((current) => appendDictation(current, chunk))}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t.send}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-950/40 transition hover:bg-indigo-400"
        aria-expanded={open}
        aria-label={open ? t.hideAria(KAYLEV_NAME) : t.openAria(KAYLEV_NAME)}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {open ? t.hide : KAYLEV_NAME}
      </button>
    </div>
  );
}
