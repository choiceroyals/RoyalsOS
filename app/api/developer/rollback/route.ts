import { rollbackRoyalOSOrionTransaction } from "@/lib/developer/executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const transactionId = text(body.transactionId);
    if (!transactionId) return Response.json({ error: "Transaction ID is required." }, { status: 400 });

    const transaction = await rollbackRoyalOSOrionTransaction({
      transactionId,
      approvalText: text(body.approvalText, 100),
      approvedBy: text(body.approvedBy, 200) || "Ayobami",
    });

    return Response.json({ message: "Orion restored the approved backup.", transaction }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Orion could not roll back the transaction." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
