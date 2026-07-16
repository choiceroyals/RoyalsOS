import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let cachedAdminClient: SupabaseClient | null = null;

function getRequiredEnvironmentVariable(
  name: string,
  fallbackName?: string
): string {
  const primaryValue =
    process.env[name]?.trim();

  if (primaryValue) {
    return primaryValue;
  }

  if (fallbackName) {
    const fallbackValue =
      process.env[fallbackName]?.trim();

    if (fallbackValue) {
      return fallbackValue;
    }
  }

  throw new Error(
    fallbackName
      ? `${name} is missing. You may also provide ${fallbackName}.`
      : `${name} is missing from the RoyalOS environment variables.`
  );
}

function getSupabaseUrl(): string {
  const url =
    getRequiredEnvironmentVariable(
      "SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_URL"
    );

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(
      "SUPABASE_URL is not a valid URL."
    );
  }

  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.hostname !== "localhost"
  ) {
    throw new Error(
      "SUPABASE_URL must use HTTPS."
    );
  }

  return url;
}

function getSupabaseAdminKey(): string {
  const key =
    getRequiredEnvironmentVariable(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

  if (
    key.startsWith("sb_publishable_") ||
    key.startsWith("eyJ") === false &&
      key.startsWith("sb_secret_") === false
  ) {
    console.warn(
      "RoyalOS could not confidently identify the Supabase key format. Confirm that SUPABASE_SERVICE_ROLE_KEY contains a secret key or legacy service_role key."
    );
  }

  return key;
}

export function getSupabaseAdminClient():
  SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "The RoyalOS Supabase administrative client cannot run in the browser."
    );
  }

  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(
    getSupabaseUrl(),
    getSupabaseAdminKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },

      global: {
        headers: {
          "X-Client-Info":
            "royalos-server-memory",
        },
      },
    }
  );

  return cachedAdminClient;
}

export function createFreshSupabaseAdminClient():
  SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "The RoyalOS Supabase administrative client cannot run in the browser."
    );
  }

  return createClient(
    getSupabaseUrl(),
    getSupabaseAdminKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },

      global: {
        headers: {
          "X-Client-Info":
            "royalos-server-memory",
        },
      },
    }
  );
}