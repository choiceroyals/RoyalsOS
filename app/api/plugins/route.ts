import { NextResponse } from "next/server";
import { getPluginOverview, installCatalogPlugin, setPluginEnabled, uninstallPlugin } from "@/lib/plugins/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try { return NextResponse.json({ ok: true, ...(await getPluginOverview()) }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not load plugins." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; id?: string; enabled?: boolean };
    if (!body.id) return NextResponse.json({ error: "Plugin ID is required." }, { status: 400 });
    if (body.action === "install") return NextResponse.json({ ok: true, plugin: await installCatalogPlugin(body.id) }, { status: 201 });
    if (body.action === "enable" || body.action === "disable") return NextResponse.json({ ok: true, plugin: await setPluginEnabled(body.id, body.action === "enable") });
    if (body.action === "uninstall") { await uninstallPlugin(body.id); return NextResponse.json({ ok: true }); }
    return NextResponse.json({ error: "Unsupported plugin action." }, { status: 400 });
  } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Plugin action failed." }, { status: 400 }); }
}
