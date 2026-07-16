import { NextResponse } from "next/server";
import { saveBrandCredential } from "@/lib/brands/server";
import { exchangeOAuthCode, getPublicUrl, type OAuthProviderId, type OAuthSession } from "@/lib/integrations/oauth";

export async function handleOAuthCallback(request: Request, provider: OAuthProviderId) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const providerError = requestUrl.searchParams.get("error");
  const cookie = request.headers.get("cookie") || "";
  const cookieValue = cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("royalos_oauth_session="))
    ?.split("=")
    .slice(1)
    .join("=");

  const target = new URL("/", getPublicUrl());
  target.searchParams.set("section", "Connections");

  if (providerError) {
    target.searchParams.set("connectionError", providerError);
    return NextResponse.redirect(target);
  }
  if (!cookieValue || !code || !state) {
    target.searchParams.set("connectionError", "OAuth session, code, or state is missing.");
    return NextResponse.redirect(target);
  }

  try {
    const session = JSON.parse(Buffer.from(cookieValue, "base64url").toString("utf8")) as OAuthSession;
    if (session.provider !== provider || session.nonce !== state) {
      throw new Error("OAuth state validation failed.");
    }
    const tokenPayload = await exchangeOAuthCode(session, code);
    const expiresIn = typeof tokenPayload.expires_in === "number" ? tokenPayload.expires_in : undefined;
    await saveBrandCredential({
      brandId: session.brandId,
      providerId: session.requestedProvider,
      tokenPayload,
      expiresAt: expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : undefined,
      scopes:
        typeof tokenPayload.scope === "string"
          ? tokenPayload.scope.split(/[ ,]+/).filter(Boolean)
          : [],
    });
    target.searchParams.set("brand", session.brandId);
    target.searchParams.set("connected", session.requestedProvider);
    const response = NextResponse.redirect(target);
    response.cookies.delete("royalos_oauth_session");
    return response;
  } catch (error) {
    target.searchParams.set(
      "connectionError",
      error instanceof Error ? error.message : "OAuth connection failed.",
    );
    const response = NextResponse.redirect(target);
    response.cookies.delete("royalos_oauth_session");
    return response;
  }
}
