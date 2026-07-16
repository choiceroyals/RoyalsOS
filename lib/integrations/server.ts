import "server-only";

import {
  ROYALOS_INTEGRATIONS,
  type RoyalOSIntegrationDefinition,
  type RoyalOSIntegrationStatus,
  type RoyalOSIntegrationId,
} from "@/lib/integrations/config";
import type { RoyalOSIntegrationPublicStatus } from "@/lib/integrations/types";

function hasEnvironmentValue(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

function determineStatus(
  integration: RoyalOSIntegrationDefinition
): RoyalOSIntegrationStatus {
  if (integration.authMode === "planned") return "planned";

  const requiredReady = integration.requiredEnvironmentVariables.every(hasEnvironmentValue);
  if (!requiredReady) return "not_configured";

  const connectedKeys = integration.connectedEnvironmentVariables ?? [];
  if (connectedKeys.length === 0) return "credentials_ready";

  return connectedKeys.every(hasEnvironmentValue)
    ? "connected"
    : "credentials_ready";
}

export function getRoyalOSIntegrationStatuses(): RoyalOSIntegrationPublicStatus[] {
  return ROYALOS_INTEGRATIONS.map((integrationValue) => {
    const integration: RoyalOSIntegrationDefinition = integrationValue;
    const missingEnvironmentVariables = integration.requiredEnvironmentVariables.filter(
      (key) => !hasEnvironmentValue(key)
    );

    return {
      id: integration.id as RoyalOSIntegrationId,
      name: integration.name,
      shortName: integration.shortName,
      description: integration.description,
      category: integration.category,
      icon: integration.icon,
      color: integration.color,
      authMode: integration.authMode,
      status: determineStatus(integration),
      requiredEnvironmentVariables: [...integration.requiredEnvironmentVariables],
      missingEnvironmentVariables,
      callbackPath: integration.callbackPath,
      capabilities: [...integration.capabilities],
      allowedEmployees: [...integration.allowedEmployees],
      approvalRule: integration.approvalRule,
      notes: integration.notes,
    };
  });
}
