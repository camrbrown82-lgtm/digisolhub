"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessageCircle, Send, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

const KAYLEV_NAME = "Kaylev";

const GREETING =
  `Hi — I'm ${KAYLEV_NAME}, DigiSol's site assistant. What are you looking for today: a custom website, local marketing/SEO, a quick site audit, or something else?`;

function createGreetingMessage(): UIMessage {
  return {
    id: "kaylev-visitor-greeting",
    role: "assistant",
    parts: [{ type: "text", text: GREETING }],
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
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/visitor-agent" }),
    [],
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport,
    messages: [createGreetingMessage()],
  });

  const busy = status === "submitted" || status === "streaming";

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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <section
          className="flex h-[min(32rem,72vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-indigo-400/25 bg-zinc-950/95 shadow-2xl shadow-indigo-950/40 backdrop-blur"
          aria-label={`${KAYLEV_NAME} DigiSol chat`}
        >
          <header className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-gradient-to-r from-indigo-600/20 to-zinc-950 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">{KAYLEV_NAME}</p>
              <p className="text-xs text-zinc-400">
                DigiSol assistant · ask about our work or share a site URL
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
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
                    className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-400"
                  >
                    Working: {toolBits.join(", ")}…
                  </div>
                );
              }
              if (!text) return null;
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
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
              <p className="text-xs text-zinc-500">{KAYLEV_NAME} is typing…</p>
            ) : null}
            {error ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error.message || "Something went wrong. Try again."}
              </p>
            ) : null}
          </div>

          <form
            onSubmit={onSubmit}
            className="flex items-end gap-2 border-t border-zinc-800 bg-zinc-950/80 p-3"
          >
            <label className="sr-only" htmlFor="visitor-chat-input">
              Message {KAYLEV_NAME}
            </label>
            <textarea
              id="visitor-chat-input"
              rows={2}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void onSubmit(event);
                }
              }}
              placeholder={`Ask ${KAYLEV_NAME}, or paste your site URL…`}
              className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition hover:bg-indigo-400"
        aria-expanded={open}
        aria-label={open ? `Hide ${KAYLEV_NAME}` : `Chat with ${KAYLEV_NAME}`}
      >
        <MessageCircle className="h-4 w-4" />
        {open ? "Hide chat" : `Chat with ${KAYLEV_NAME}`}
      </button>
    </div>
  );
}
