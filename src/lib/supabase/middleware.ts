import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/allowlist";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
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

    const path = request.nextUrl.pathname;
    const isHub = path === "/hub" || path.startsWith("/hub/");
    const isLogin = path === "/hub/login";

    if (isHub && !isLogin) {
      if (!user) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/hub/login";
        redirectUrl.searchParams.set("next", path);
        return NextResponse.redirect(redirectUrl);
      }
      if (!isAllowedEmail(user.email)) {
        await supabase.auth.signOut();
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/hub/login";
        redirectUrl.searchParams.set("error", "not-allowed");
        return NextResponse.redirect(redirectUrl);
      }
    }

    if (isLogin && user && isAllowedEmail(user.email)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/hub";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error("Hub auth middleware failed", error);
  }

  return supabaseResponse;
}
