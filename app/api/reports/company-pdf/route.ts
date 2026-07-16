import { createRoyalOSCompanyRecord, listRoyalOSCompanyRecords } from "@/lib/reports/company-records";
import {
  isRoyalOSWorkspace,
  type RoyalOSWorkspace,
} from "@/lib/missions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function text(value: unknown, maximum: number): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function strings(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.flatMap((item) => (typeof item === "string" && item.trim() ? [item.trim().slice(0, maxLength)] : []))),
  ).slice(0, maxItems);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit")) || 100, 500));
  const records = await listRoyalOSCompanyRecords(limit);
  return Response.json({ records }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const title = text(body.title, 180);
    const content = text(body.content, 300_000);
    const workspace: RoyalOSWorkspace = isRoyalOSWorkspace(body.workspace) ? body.workspace : "ChoiceRoyals";
    const employee = text(body.employee, 120) || "Atlas";

    if (!title) return Response.json({ error: "A report title is required." }, { status: 400 });
    if (!content) return Response.json({ error: "Report content is required." }, { status: 400 });

    const record = await createRoyalOSCompanyRecord({
      title,
      workspace,
      employee,
      content,
      missionId: text(body.missionId, 300) || undefined,
      conversationId: text(body.conversationId, 300) || undefined,
      sources: strings(body.sources, 50, 1_000),
      tags: strings(body.tags, 20, 100),
    });

    return Response.json(
      {
        message: `RoyalOS saved “${record.title}” as an official company PDF.`,
        record,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "RoyalOS could not create the company PDF." },
      { status: 500 },
    );
  }
}
