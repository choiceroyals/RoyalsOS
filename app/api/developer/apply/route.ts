import { applyRoyalOSOrionProposal } from "@/lib/developer/executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

function text(value: unknown, max = 10_000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.flatMap((item) => (typeof item === "string" && item.trim() ? [item.trim().slice(0, 300)] : []))),
  ).slice(0, 3);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const proposalId = text(body.proposalId, 300);
    const approvalToken = text(body.approvalToken, 1_000);
    const approvalText = text(body.approvalText, 100);

    if (!proposalId || !approvalToken) {
      return Response.json({ error: "Proposal ID and approval token are required." }, { status: 400 });
    }

    const transaction = await applyRoyalOSOrionProposal({
      proposalId,
      approvalToken,
      approvalText,
      approvedBy: text(body.approvedBy, 200) || "Ayobami",
      approvalNote: text(body.approvalNote, 2_000) || undefined,
      validationCommands: strings(body.validationCommands),
      autoRollbackOnValidationFailure: body.autoRollbackOnValidationFailure !== false,
    });

    return Response.json(
      {
        message:
          transaction.status === "succeeded"
            ? "Orion applied the approved changes and completed validation."
            : transaction.status === "rolled_back"
              ? "Orion restored the backup because the change or validation failed."
              : "Orion completed the approved execution workflow with issues.",
        transaction,
      },
      { status: transaction.status === "failed" ? 500 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Orion could not apply the proposal.";
    return Response.json({ error: message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
