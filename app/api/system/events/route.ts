import { NextResponse } from "next/server";
import { recordRuntimeError } from "@/lib/system/maintenance";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      stack?: string;
      source?: string;
      pathname?: string;
    };
    if (!body.message) {
      return NextResponse.json({ error: "Error message is required." }, { status: 400 });
    }
    await recordRuntimeError({
      message: body.message,
      stack: body.stack,
      source: body.source,
      pathname: body.pathname,
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Runtime error could not be recorded." },
      { status: 500 },
    );
  }
}
