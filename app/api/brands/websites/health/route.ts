import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type WebsiteHealthRequest = {
  url?: unknown;
};

function isPrivateAddress(address: string): boolean {
  if (address === "::1") return true;
  if (address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:")) {
    return true;
  }

  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function validatePublicTarget(url: URL): Promise<void> {
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS websites can be checked.");
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private or local network addresses cannot be checked.");
  }

  if (isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new Error("Private network addresses cannot be checked.");
    }
    return;
  }

  const addresses = await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((item) => isPrivateAddress(item.address))) {
    throw new Error("The website resolves to a private or unavailable address.");
  }
}

async function fetchWithTimeout(url: string, method: "HEAD" | "GET") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, {
      method,
      redirect: "manual",
      cache: "no-store",
      headers:
        method === "GET"
          ? { Range: "bytes=0-1024", "User-Agent": "RoyalOS-Website-Health/1.0" }
          : { "User-Agent": "RoyalOS-Website-Health/1.0" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  let body: WebsiteHealthRequest;
  try {
    body = (await request.json()) as WebsiteHealthRequest;
  } catch {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
  }

  if (typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "A website URL is required." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(body.url.trim());
  } catch {
    return NextResponse.json(
      { error: "The website URL is invalid." },
      { status: 400 },
    );
  }

  try {
    await validatePublicTarget(target);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Website address validation failed.";
    if (
      message.includes("Private") ||
      message.includes("Only HTTP") ||
      message.includes("private or unavailable")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({
      url: target.toString(),
      health: "offline",
      sslStatus: target.protocol === "https:" ? "not_checked" : "not_checked",
      checkedAt: new Date().toISOString(),
      message: `Website could not be resolved: ${message}`,
    });
  }

  try {
    let response = await fetchWithTimeout(target.toString(), "HEAD");
    if ([403, 405].includes(response.status)) {
      response = await fetchWithTimeout(target.toString(), "GET");
    }

    const health =
      response.status >= 200 && response.status < 400
        ? "healthy"
        : response.status < 500
          ? "warning"
          : "offline";

    return NextResponse.json({
      url: target.toString(),
      health,
      sslStatus: target.protocol === "https:" ? "valid" : "not_checked",
      statusCode: response.status,
      checkedAt: new Date().toISOString(),
      message:
        health === "healthy"
          ? "Website responded successfully."
          : health === "warning"
            ? `Website responded with status ${response.status}.`
            : `Website appears unavailable (status ${response.status}).`,
    });
  } catch (error) {
    return NextResponse.json({
      url: target.toString(),
      health: "offline",
      sslStatus: target.protocol === "https:" ? "invalid" : "not_checked",
      checkedAt: new Date().toISOString(),
      message:
        error instanceof Error && error.name === "AbortError"
          ? "Website health check timed out."
          : error instanceof Error
            ? error.message
            : "Website health check failed.",
    });
  }
}
