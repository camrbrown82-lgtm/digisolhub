import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const script = `(() => {
  try {
    var script = document.currentScript;
    var key = script && script.getAttribute("data-key");
    if (!key) return;
    var origin = script.src ? new URL(script.src).origin : location.origin;
    var storageKey = "ds_vid_" + key;
    var visitor = null;
    try { visitor = localStorage.getItem(storageKey); } catch (e) {}
    if (!visitor) {
      visitor = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
      try { localStorage.setItem(storageKey, visitor); } catch (e) {}
    }
    fetch(origin + "/api/collect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        k: key,
        path: location.pathname + location.search,
        host: location.host,
        title: document.title,
        referrer: document.referrer,
        locale: navigator.language,
        vid: visitor
      }),
      keepalive: true,
      mode: "cors"
    }).catch(function () {});
  } catch (e) {}
})();`;

export function GET() {
  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
