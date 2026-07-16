import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ELEVENLABS_API_KEY is not configured." }, { status: 400 });
    const form = await request.formData();
    const name = String(form.get("name") || "").trim();
    const consent = String(form.get("consent") || "") === "true";
    const files = form.getAll("files").filter((item): item is File => item instanceof File);
    if (!name || !consent || files.length === 0) return NextResponse.json({ error: "Voice name, authorized samples, and explicit consent are required." }, { status: 400 });
    const outgoing = new FormData();
    outgoing.set("name", name);
    outgoing.set("description", "Authorized RoyalOS voice clone. Consent confirmed by the account owner.");
    for (const file of files) outgoing.append("files", file, file.name);
    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", { method: "POST", headers: { "xi-api-key": apiKey }, body: outgoing });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.detail?.message || data.detail || "Voice cloning failed." }, { status: response.status });
    return NextResponse.json({ ok: true, voiceId: data.voice_id, requiresVerification: data.requires_verification ?? false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Voice cloning failed." }, { status: 500 });
  }
}
