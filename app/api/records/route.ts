import { NextRequest, NextResponse } from "next/server";
import { createDocument, createFolder, deleteRecordItem, getRecordItem, listRecordItems, updateRecordItem, uploadRecordFile } from "@/lib/records/storage";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parent = request.nextUrl.searchParams.get("parentId"); const status = request.nextUrl.searchParams.get("status") === "trash" ? "trash" : "active"; const query = request.nextUrl.searchParams.get("q") ?? "";
  if (request.nextUrl.searchParams.get("id")) return NextResponse.json({ ok: true, item: await getRecordItem(request.nextUrl.searchParams.get("id")!) });
  return NextResponse.json({ ok: true, items: await listRecordItems(parent || null, status, query) });
}

export async function POST(request: Request) {
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("multipart/form-data")) { const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file." }, { status: 400 }); return NextResponse.json({ ok: true, item: await uploadRecordFile(file, String(form.get("parentId") ?? "") || null) }, { status: 201 }); }
    const body = await request.json() as { type?: "folder" | "document"; name?: string; parentId?: string | null; content?: string };
    if (!body.name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    const item = body.type === "folder" ? await createFolder(body.name, body.parentId ?? null) : await createDocument(body.name, body.parentId ?? null, body.content ?? "");
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create record." }, { status: 400 }); }
}

export async function PATCH(request: Request) { try { const body = await request.json() as { id?: string; name?: string; parentId?: string | null; content?: string; tags?: string[]; action?: "trash" | "restore" }; if (!body.id) return NextResponse.json({ error: "ID is required." }, { status: 400 }); return NextResponse.json({ ok: true, item: await updateRecordItem(body.id, body) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed." }, { status: 400 }); } }
export async function DELETE(request: NextRequest) { try { const id = request.nextUrl.searchParams.get("id"); if (!id) return NextResponse.json({ error: "ID is required." }, { status: 400 }); await deleteRecordItem(id); return NextResponse.json({ ok: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Delete failed." }, { status: 400 }); } }
