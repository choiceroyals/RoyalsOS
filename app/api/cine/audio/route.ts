import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function chunks(text: string, maximum = 9000): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((v) => v.trim()).filter(Boolean);
  const result: string[] = [];
  let current = "";
  for (const paragraph of paragraphs.length ? paragraphs : [text]) {
    if ((current + "\n\n" + paragraph).length <= maximum) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }
    if (current) result.push(current);
    if (paragraph.length <= maximum) current = paragraph;
    else {
      for (let index = 0; index < paragraph.length; index += maximum) {
        result.push(paragraph.slice(index, index + maximum));
      }
      current = "";
    }
  }
  if (current) result.push(current);
  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      text?: string; voiceId?: string; quality?: "standard" | "premium"; title?: string;
    };
    const text = body.text?.trim();
    if (!text) return NextResponse.json({ error: "Enter a script before generating audio." }, { status: 400 });
    if (text.length > 180000) return NextResponse.json({ error: "This script is above the two-hour safety limit." }, { status: 400 });

    if (body.quality === "standard") {
      const enabled = process.env.CAPCUT_API_ENABLED === "true";
      if (!enabled || !process.env.CAPCUT_API_BASE_URL || !process.env.CAPCUT_API_KEY) {
        return NextResponse.json({
          error: "Standard audio is prepared for CapCut, but the official CapCut API is not configured. Choose Premium or add verified CapCut credentials in .env.local.",
          setupRequired: ["CAPCUT_API_ENABLED", "CAPCUT_API_BASE_URL", "CAPCUT_API_KEY"],
        }, { status: 503 });
      }
      return NextResponse.json({ error: "The CapCut adapter is configured but needs the official endpoint contract before requests can be enabled safely." }, { status: 501 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = body.voiceId?.trim() || process.env.ELEVENLABS_DEFAULT_VOICE_ID;
    if (!apiKey || !voiceId) {
      return NextResponse.json({ error: "Premium audio requires ELEVENLABS_API_KEY and ELEVENLABS_DEFAULT_VOICE_ID." }, { status: 400 });
    }

    const modelId = process.env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5";
    const audioParts: Buffer[] = [];
    const scriptParts = chunks(text);
    for (const part of scriptParts) {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text: part, model_id: modelId, voice_settings: { stability: 0.72, similarity_boost: 0.82, style: 0.12, use_speaker_boost: true } }),
      });
      if (!response.ok) throw new Error(`ElevenLabs failed (${response.status}): ${await response.text()}`);
      audioParts.push(Buffer.from(await response.arrayBuffer()));
    }

    const directory = path.join(process.cwd(), "public", "royalos-assets", "audio");
    await fs.mkdir(directory, { recursive: true });
    const safeTitle = (body.title || "cine-narration").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "cine-narration";
    const fileName = `${Date.now()}-${safeTitle}.mp3`;
    await fs.writeFile(path.join(directory, fileName), Buffer.concat(audioParts));
    return NextResponse.json({ ok: true, url: `/royalos-assets/audio/${fileName}`, chunks: scriptParts.length, provider: "elevenlabs", quality: "premium" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Audio generation failed." }, { status: 500 });
  }
}
