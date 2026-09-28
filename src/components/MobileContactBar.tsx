"use client";

import { FileText, MessageSquareText, Phone } from "lucide-react";
import { usePathname } from "next/navigation";
import { QUOTE_HREF, jumpToQuote } from "@/components/QuickQuote";
import { trackEvent } from "@/lib/analytics";
import { DIGISOL_SMS_HREF, DIGISOL_TEL_HREF } from "@/lib/site";

/** Phone-only bottom bar on public pages: call, text, or jump to the quote form. */
export function MobileContactBar() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/hub")) return null;
  const track = (option: string) =>
    trackEvent("contact_option_click", { option, location: "mobile_bar" });
  const item =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-zinc-200 active:bg-white/5";

  return (
    <>
      <div className="h-16 sm:hidden" aria-hidden="true" />
      <nav
        aria-label="Contact DigiSol"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <a href={DIGISOL_TEL_HREF} className={item} onClick={() => track("call")}>
          <Phone className="h-5 w-5 text-indigo-300" aria-hidden="true" />
          Call
        </a>
        <a href={DIGISOL_SMS_HREF} className={item} onClick={() => track("text")}>
          <MessageSquareText className="h-5 w-5 text-indigo-300" aria-hidden="true" />
          Text
        </a>
        <a
          href={QUOTE_HREF}
          className={`${item} bg-indigo-600 text-white active:bg-indigo-500`}
          onClick={(event) => {
            track("quote");
            jumpToQuote(event);
          }}
        >
          <FileText className="h-5 w-5" aria-hidden="true" />
          Free quote
        </a>
      </nav>
    </>
  );
}
