import { NextResponse } from "next/server";
import { inspectSystem, performMaintenanceAction } from "@/lib/system/maintenance";
import type { SystemMaintenanceAction } from "@/lib/system/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedHost(request: Request): boolean {
  if (process.env.ROYALOS_ALLOW_REMOTE_SYSTEM_CARE === "true") return true;
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export async function GET() {
  try {
    return NextResponse.json(await inspectSystem());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "System inspection failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: SystemMaintenanceAction;
      confirmation?: string;
    };
    if (!body.action) {
      return NextResponse.json({ error: "A maintenance action is required." }, { status: 400 });
    }
    const remotelySafe = new Set<SystemMaintenanceAction>(["quick_scan", "generate_report"]);
    if (!isAllowedHost(request) && !remotelySafe.has(body.action)) {
      return NextResponse.json({ error: "This System Care action changes local software files and is disabled on cloud deployments. Use Orion locally, GitHub, and Vercel redeployment." }, { status: 403 });
    }
    const result = await performMaintenanceAction(body.action, body.confirmation);
    return NextResponse.json({ ...result, snapshot: await inspectSystem() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Maintenance action failed." },
      { status: 500 },
    );
  }
}
