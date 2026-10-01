"use client";

import { CalendarDays, Mail, MessageCircle, MessageSquareText, Phone } from "lucide-react";
import type { ComponentType } from "react";
import { trackEvent } from "@/lib/analytics";
import { useMessages } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";
import {
  DIGISOL_BOOKING_URL,
  DIGISOL_EMAIL,
  DIGISOL_PHONE_DISPLAY,
  DIGISOL_SMS_HREF,
  DIGISOL_TEL_HREF,
} from "@/lib/site";

/** Fired to open the Kaylev visitor chat from anywhere on the page. */
export const OPEN_KAYLEV_EVENT = "kaylev:open";
/** Opens Kaylev on the free website audit, including on a phone. */
export const AUDIT_KAYLEV_EVENT = "kaylev:audit";

export function openKaylevChat() {
  window.dispatchEvent(new Event(OPEN_KAYLEV_EVENT));
}

export function openKaylevAudit() {
  window.dispatchEvent(new Event(AUDIT_KAYLEV_EVENT));
}

type Option = {
  id: string;
  label: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  external?: boolean;
  onClick?: () => void;
};

function options(t: Messages["contactOptions"]): Option[] {
  return [
    { id: "call", label: t.call, detail: DIGISOL_PHONE_DISPLAY, icon: Phone, href: DIGISOL_TEL_HREF },
    { id: "text", label: t.text, detail: DIGISOL_PHONE_DISPLAY, icon: MessageSquareText, href: DIGISOL_SMS_HREF },
    { id: "email", label: t.email, detail: DIGISOL_EMAIL, icon: Mail, href: `mailto:${DIGISOL_EMAIL}` },
    ...(DIGISOL_BOOKING_URL
      ? [
          {
            id: "book",
            label: t.book,
            detail: t.bookDetail,
            icon: CalendarDays,
            href: DIGISOL_BOOKING_URL,
            external: true,
          },
        ]
      : []),
    {
      id: "chat",
      label: t.chat,
      detail: t.chatDetail,
      icon: MessageCircle,
      onClick: openKaylevChat,
    },
  ];
}

export function ContactOptions({
  location,
  layout = "pills",
  className = "",
}: {
  location: string;
  layout?: "pills" | "stack";
  className?: string;
}) {
  const t = useMessages().contactOptions;
  const track = (id: string) =>
    trackEvent("contact_option_click", { option: id, location });

  if (layout === "stack") {
    return (
      <ul className={`space-y-2 ${className}`}>
        {options(t).map((o) => {
          const Icon = o.icon;
          const body = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-semibold text-white">{o.label}</span>
                <span className="block truncate text-xs text-zinc-400">{o.detail}</span>
              </span>
            </>
          );
          const cls =
            "flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-indigo-400/40 hover:bg-indigo-500/10";
          return (
            <li key={o.id}>
              {o.href ? (
                <a
                  href={o.href}
                  className={cls}
                  onClick={() => track(o.id)}
                  {...(o.external ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {body}
                </a>
              ) : (
                <button
                  type="button"
                  className={cls}
                  onClick={() => {
                    track(o.id);
                    o.onClick?.();
                  }}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  const pill =
    "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-indigo-400/40 hover:text-white sm:text-sm";
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {options(t).map((o) => {
        const Icon = o.icon;
        return o.href ? (
          <a
            key={o.id}
            href={o.href}
            className={pill}
            onClick={() => track(o.id)}
            {...(o.external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            <Icon className="h-3.5 w-3.5" />
            {o.id === "call" ? t.callNumber(o.detail) : o.label}
          </a>
        ) : (
          <button
            key={o.id}
            type="button"
            className={pill}
            onClick={() => {
              track(o.id);
              o.onClick?.();
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
