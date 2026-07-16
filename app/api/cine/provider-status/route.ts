import { NextResponse } from "next/server";
import { getCapCutProviderStatus } from "@/lib/cine/providers/capcut";

export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    capcut: getCapCutProviderStatus(),
    elevenlabs: { configured: Boolean(process.env.ELEVENLABS_API_KEY) },
    runway: { configured: Boolean(process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_KEY) },
    openai: { configured: Boolean(process.env.OPENAI_API_KEY) },
  });
}
