import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/allowlist";
import {
  cameFromHub,
  clearHubPass,
  hasFreshHubPass,
  setHubPass,
} from "@/lib/hubPass";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return supabaseResponse;
  }

  const path = request.nextUrl.pathname;
  const isHub = path === "/hub" || path.startsWith("/hub/");
  const isLogin = path === "/hub/login";
  const isHubApi = path.startsWith("/api/hub/");
  // Typed URL, bookmark, or a link from outside the Hub = a new visit.
  const enteringHub =
    isHub &&
    request.headers.get("sec-fetch-dest") === "document" &&
    !cameFromHub(request);

  // A new visit always re-asks the password, so drop the old session locally
  // instead of waiting on a Supabase round trip (which can stall the click).
  if (isLogin && enteringHub) {
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        supabaseResponse.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
      }
    }
    clearHubPass(supabaseResponse);
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const passFresh = !enteringHub && hasFreshHubPass(request);

    const redirectTo = (pathname: string, params: Record<string, string> = {}) => {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = pathname;
      redirectUrl.search = "";
      for (const [k, v] of Object.entries(params)) {
        redirectUrl.searchParams.set(k, v);
      }
      const response = NextResponse.redirect(redirectUrl);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie);
      });
      return response;
    };

    if (isHub && !isLogin) {
      if (!user) {
        return redirectTo("/hub/login", { next: path });
      }
      if (!isAllowedEmail(user.email)) {
        await supabase.auth.signOut();
        const response = redirectTo("/hub/login", { error: "not-allowed" });
        clearHubPass(response);
        return response;
      }
      if (!passFresh) {
        await supabase.auth.signOut({ scope: "local" });
        const response = redirectTo("/hub/login", { next: path });
        clearHubPass(response);
        return response;
      }
      setHubPass(supabaseResponse);
    }

    if (isLogin && user) {
      if (isAllowedEmail(user.email) && passFresh) {
        return redirectTo("/hub/analytics");
      }
      await supabase.auth.signOut({ scope: "local" });
      clearHubPass(supabaseResponse);
    }

    if (isHubApi && user && passFresh) {
      setHubPass(supabaseResponse);
    }
  } catch (error) {
    console.error("Hub auth middleware failed", error);
  }

  return supabaseResponse;
}
