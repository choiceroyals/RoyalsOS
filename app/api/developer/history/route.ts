import { listRoyalOSOrionAudit, listRoyalOSOrionTransactions } from "@/lib/developer/local-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit")) || 30, 100));
  const [transactions, audit] = await Promise.all([
    listRoyalOSOrionTransactions(limit),
    listRoyalOSOrionAudit(Math.max(limit * 3, 50)),
  ]);
  return Response.json({ transactions, audit }, { headers: { "Cache-Control": "no-store" } });
}
