import dns from "dns/promises";
import net from "net";
import { NextResponse } from "next/server";

import { POST as executeRoyalOSMission } from "@/app/api/royalos/route";
import { getInstalledPlugin } from "@/lib/plugins/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ActionRequest = {
  pluginId?: string;
  actionId?: string;
  input?: string;
  workspace?: string;
  approved?: boolean;
};

function isPrivateIPv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) || parts[0] === 0;
}

function isPrivateIPv6(address: string) {
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized === "::";
}

async function assertSafeRemoteUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("Plugin webhooks must use HTTPS.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Local and private webhook destinations are blocked.");
  }
  const directVersion = net.isIP(hostname);
  if ((directVersion === 4 && isPrivateIPv4(hostname)) || (directVersion === 6 && isPrivateIPv6(hostname))) {
    throw new Error("Private network webhook destinations are blocked.");
  }
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address, family }) => family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address))) {
    throw new Error("The plugin webhook resolves to a blocked network address.");
  }
  return url;
}

function applyTemplate(template: string, input: string) {
  return template.includes("{{input}}") ? template.replaceAll("{{input}}", input) : `${template}\n\nUser input: ${input}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ActionRequest;
    if (!body.pluginId || !body.actionId) {
      return NextResponse.json({ error: "Plugin ID and action ID are required." }, { status: 400 });
    }
    const plugin = await getInstalledPlugin(body.pluginId);
    if (!plugin) return NextResponse.json({ error: "Installed plugin was not found." }, { status: 404 });
    if (!plugin.enabled) return NextResponse.json({ error: "Enable the plugin before running its actions." }, { status: 409 });
    const action = plugin.manifest.actions?.find((item) => item.id === body.actionId);
    if (!action) return NextResponse.json({ error: "Plugin action was not found." }, { status: 404 });

    const requiredEnvironment = [...(plugin.manifest.requiredEnvironment ?? []), ...(action.requiredEnvironment ?? [])];
    const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]?.trim());
    if (missingEnvironment.length) {
      return NextResponse.json({ error: `Configuration required: ${missingEnvironment.join(", ")}. Add the values to .env.local and restart RoyalOS.` }, { status: 409 });
    }
    if (action.approvalRequired && !body.approved) {
      return NextResponse.json({ error: "CEO approval is required before this plugin action can run.", approvalRequired: true }, { status: 428 });
    }

    if (action.kind === "open_url") {
      if (!action.url) throw new Error("The plugin action does not define a URL.");
      const url = await assertSafeRemoteUrl(action.url);
      return NextResponse.json({ ok: true, kind: action.kind, url: url.toString() });
    }

    if (action.kind === "webhook") {
      if (!action.url) throw new Error("The plugin action does not define a webhook URL.");
      const url = await assertSafeRemoteUrl(action.url);
      const headers: Record<string, string> = { "Content-Type": "application/json", "X-RoyalOS-Plugin": plugin.manifest.id };
      if (action.authEnvironment) {
        const token = process.env[action.authEnvironment]?.trim();
        if (!token) return NextResponse.json({ error: `Configuration required: ${action.authEnvironment}.` }, { status: 409 });
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(url, {
        method: action.method ?? "POST",
        headers,
        body: (action.method ?? "POST") === "GET" ? undefined : JSON.stringify({
          pluginId: plugin.manifest.id,
          actionId: action.id,
          input: body.input ?? "",
          workspace: body.workspace ?? "Triple-Hay Concept LLC",
          requestedAt: new Date().toISOString(),
        }),
        cache: "no-store",
        signal: AbortSignal.timeout((action.timeoutSeconds ?? 30) * 1000),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`Plugin provider returned ${response.status}: ${text.slice(0, 500)}`);
      let result: unknown = text;
      try { result = JSON.parse(text); } catch { /* provider returned plain text */ }
      return NextResponse.json({ ok: true, kind: action.kind, result });
    }

    const input = typeof body.input === "string" ? body.input.trim() : "";
    const promptTemplate = action.promptTemplate ?? "Complete the requested plugin workflow: {{input}}";
    const missionRequest = new Request(new URL("/api/royalos", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea: applyTemplate(promptTemplate, input || "Run the configured workflow and return a complete report."),
        workspace: body.workspace || "Triple-Hay Concept LLC",
        employee: action.employee || plugin.manifest.assignedEmployees?.[0] || "Adedeji",
        mode: "Mission",
      }),
    });
    const execution = await executeRoyalOSMission(missionRequest);
    const result = await execution.json();
    return NextResponse.json({ ok: execution.ok, kind: action.kind, result }, { status: execution.status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Plugin action failed." }, { status: 400 });
  }
}
