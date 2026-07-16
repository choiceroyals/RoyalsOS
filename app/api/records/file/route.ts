import { NextRequest, NextResponse } from "next/server";
import { getRecordItem, readRecordFile } from "@/lib/records/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required." }, { status: 400 });
    const item = await getRecordItem(id);
    if (!item || item.type !== "file") return NextResponse.json({ error: "File not found." }, { status: 404 });
    const bytes = await readRecordFile(item);
   return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": item.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(item.name)}`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "File not found." }, { status: 404 });
  }
}
