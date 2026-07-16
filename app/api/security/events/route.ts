import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const VALID_SEVERITIES = new Set(["informational", "low", "medium", "high", "critical"]);
const VALID_RESULTS = new Set(["success", "failure", "warning"]);
const VALID_SOURCES = new Set(["full_log", "api_event", "webhook", "royalos_audit", "health_check"]);

function authorized(request: Request): boolean {
  const expected = process.env.ROYALOS_SECURITY_INGEST_SECRET?.trim();
  if (!expected) return process.env.NODE_ENV !== "production";
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const direct = request.headers.get("x-royalos-ingest-secret");
  return bearer === expected || direct === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Security event ingestion is not authorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
  }

  const value = body as Record<string, unknown>;
  const required = ["brandId", "platform", "eventType", "action", "target", "result", "source"];
  const missing = required.filter(
    (key) => typeof value[key] !== "string" || !String(value[key]).trim(),
  );
  if (missing.length) {
    return NextResponse.json({ error: `Missing fields: ${missing.join(", ")}` }, { status: 400 });
  }

  const severity = typeof value.severity === "string" ? value.severity : "informational";
  const result = String(value.result);
  const source = String(value.source);
  if (!VALID_SEVERITIES.has(severity)) {
    return NextResponse.json({ error: "Invalid severity." }, { status: 400 });
  }
  if (!VALID_RESULTS.has(result)) {
    return NextResponse.json({ error: "Invalid result." }, { status: 400 });
  }
  if (!VALID_SOURCES.has(source)) {
    return NextResponse.json({ error: "Invalid source." }, { status: 400 });
  }

  const occurredAt =
    typeof value.occurredAt === "string" && !Number.isNaN(Date.parse(value.occurredAt))
      ? value.occurredAt
      : new Date().toISOString();
  const evidence =
    value.evidence && typeof value.evidence === "object"
      ? value.evidence
      : { summary: typeof value.evidence === "string" ? value.evidence : "" };

  const event = {
    brand_id: String(value.brandId),
    platform: String(value.platform),
    event_type: String(value.eventType),
    actor: typeof value.actor === "string" ? value.actor : null,
    action: String(value.action),
    target: String(value.target),
    result,
    severity,
    source_type: source,
    evidence,
    source_ip: typeof value.ipAddress === "string" ? value.ipAddress : null,
    occurred_at: occurredAt,
  };

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("security_events")
      .insert(event)
      .select("id, received_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ accepted: true, persisted: true, event: { ...event, ...data } });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error: "The event was validated but could not be stored.",
          detail: error instanceof Error ? error.message : "Unknown storage error",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({
      accepted: true,
      persisted: false,
      event: { id: `security_event_${Date.now()}`, ...event, received_at: new Date().toISOString() },
      note: "Development fallback: apply the Supabase migration and configure service-role access for durable storage.",
    });
  }
}
