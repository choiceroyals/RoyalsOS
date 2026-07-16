import { NextResponse } from "next/server";
import { isRoyalOSIntegrationId } from "@/lib/integrations/config";
import { getRoyalOSIntegrationStatuses } from "@/lib/integrations/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const integrations = getRoyalOSIntegrationStatuses();
  const summary = {
    total: integrations.length,
    connected: integrations.filter((item) => item.status === "connected").length,
    credentialsReady: integrations.filter((item) => item.status === "credentials_ready").length,
    notConfigured: integrations.filter((item) => item.status === "not_configured").length,
    planned: integrations.filter((item) => item.status === "planned").length,
  };

  return NextResponse.json({ integrations, summary });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
  }

  const action =
    typeof (body as { action?: unknown })?.action === "string"
      ? (body as { action: string }).action
      : "inspect";
  const integrationId = (body as { integrationId?: unknown })?.integrationId;

  if (!isRoyalOSIntegrationId(integrationId)) {
    return NextResponse.json({ error: "A valid RoyalOS integration ID is required." }, { status: 400 });
  }

  const integration = getRoyalOSIntegrationStatuses().find((item) => item.id === integrationId);
  if (!integration) {
    return NextResponse.json({ error: "Integration not found." }, { status: 404 });
  }

  if (action === "inspect" || action === "prepare" || action === "test") {
    if (integration.status === "planned") {
      return NextResponse.json({
        integration,
        ready: false,
        message: integration.notes || "This provider connection is planned but not yet available.",
      });
    }

    if (integration.status === "not_configured") {
      return NextResponse.json({
        integration,
        ready: false,
        message: "Add the required environment variables, restart RoyalOS, and check again.",
        missingEnvironmentVariables: integration.missingEnvironmentVariables,
      });
    }

    return NextResponse.json({
      integration,
      ready: integration.status === "connected",
      credentialsReady: true,
      message:
        integration.status === "connected"
          ? "RoyalOS detected the provider credential or token. A live provider-specific health check will be added with the publishing adapter."
          : "The provider application credentials are present. The OAuth consent and callback adapter is the next connection step.",
      callbackPath: integration.callbackPath,
    });
  }

  return NextResponse.json({ error: "Unsupported integration action." }, { status: 400 });
}
