import { NextResponse } from "next/server";
import { installUploadedPlugin } from "@/lib/plugins/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const raw = form.get("plugin");
    if (!(raw instanceof File)) return NextResponse.json({ error: "Choose a plugin ZIP file." }, { status: 400 });
    if (!raw.name.toLowerCase().endsWith(".zip")) return NextResponse.json({ error: "RoyalOS plugins must be uploaded as ZIP files." }, { status: 400 });
    const plugin = await installUploadedPlugin(Buffer.from(await raw.arrayBuffer()));
    return NextResponse.json({ ok: true, plugin }, { status: 201 });
  } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Plugin upload failed." }, { status: 400 }); }
}
