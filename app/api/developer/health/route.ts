import { getRoyalOSOrionExecutionCapabilities } from "@/lib/developer/executor";
import { getRoyalOSDeveloperSecuritySummary } from "@/lib/developer/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      status: "ready",
      employee: "Orion",
      capabilities: getRoyalOSOrionExecutionCapabilities(),
      readPolicy: getRoyalOSDeveloperSecuritySummary(),
      validationAllowlist: ["npx tsc --noEmit", "npm run lint", "npm run build"],
      safeguards: [
        "CEO approval text required",
        "One-time proposal token required",
        "Source hash checked before write",
        "Automatic backup before every change",
        "Automatic rollback available",
        "Secrets and .env files blocked",
        "Package installation and deployment blocked",
      ],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
