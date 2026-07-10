import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = requestUrl.searchParams.get("next") ?? "/";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("RoyalOS confirmation error: Supabase variables are missing.");

    return NextResponse.redirect(
      new URL("/login?error=missing_configuration", request.url)
    );
  }

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_confirmation_link", request.url)
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },

      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          console.error("RoyalOS cookie error:", error);
        }
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    console.error("RoyalOS confirmation error:", error.message);

    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", request.url)
    );
  }

  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/";

  return NextResponse.redirect(new URL(safeNextPath, request.url));
}