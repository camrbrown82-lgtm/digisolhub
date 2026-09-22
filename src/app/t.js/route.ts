import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const script = `(() => {
  try {
    var nodes = document.querySelectorAll('script[src*="/t.js"]');
    var script = document.currentScript || nodes[nodes.length - 1];
    var key = script && script.getAttribute("data-key");
    if (!key && script && script.src) {
      try { key = new URL(script.src).searchParams.get("k"); } catch (e) {}
    }
    if (!key) return;
    if (location.pathname.indexOf("/hub") === 0) return;
    var origin = script.src ? new URL(script.src).origin : location.origin;
    var storageKey = "ds_vid_" + key;
    var visitor = null;
    try { visitor = localStorage.getItem(storageKey); } catch (e) {}
    if (!visitor) {
      visitor = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
      try { localStorage.setItem(storageKey, visitor); } catch (e) {}
    }

    function send() {
      if (location.pathname.indexOf("/hub") === 0) return;
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
    }

    send();

    var last = location.pathname + location.search;
    function maybeSend() {
      var next = location.pathname + location.search;
      if (next === last) return;
      last = next;
      send();
    }
    var push = history.pushState;
    var replace = history.replaceState;
    history.pushState = function () {
      var result = push.apply(this, arguments);
      maybeSend();
      return result;
    };
    history.replaceState = function () {
      var result = replace.apply(this, arguments);
      maybeSend();
      return result;
    };
    window.addEventListener("popstate", maybeSend);
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
