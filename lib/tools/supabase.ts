import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

/*
 * ============================================================
 * ROYALOS TOOLS SUPABASE ADMIN CLIENT
 * ============================================================
 *
 * This client is server-only.
 *
 * Never import this file into a React client component.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */

let royalOSToolsSupabaseClient:
  SupabaseClient | null =
    null;

function requireEnvironmentVariable(
  name: string
): string {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is missing from the RoyalOS environment variables.`
    );
  }

  return value;
}

export function getRoyalOSToolsSupabaseClient():
  SupabaseClient {
  if (
    royalOSToolsSupabaseClient
  ) {
    return royalOSToolsSupabaseClient;
  }

  const supabaseUrl =
    requireEnvironmentVariable(
      "SUPABASE_URL"
    );

  const serviceRoleKey =
    requireEnvironmentVariable(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

  royalOSToolsSupabaseClient =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession:
            false,

          autoRefreshToken:
            false,

          detectSessionInUrl:
            false,
        },

        global: {
          headers: {
            "X-Client-Info":
              "RoyalOS-Tools",
          },
        },
      }
    );

  return royalOSToolsSupabaseClient;
}

export function isRoyalOSToolsSupabaseConfigured():
  boolean {
  return Boolean(
    process.env
      .SUPABASE_URL
      ?.trim() &&
    process.env
      .SUPABASE_SERVICE_ROLE_KEY
      ?.trim()
  );
}