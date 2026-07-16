export type CapCutProviderStatus = {
  configured: boolean;
  enabled: boolean;
  message: string;
};

export function getCapCutProviderStatus(): CapCutProviderStatus {
  const enabled = process.env.CAPCUT_API_ENABLED === "true";
  const configured = Boolean(
    enabled && process.env.CAPCUT_API_BASE_URL && process.env.CAPCUT_API_KEY,
  );
  return {
    enabled,
    configured,
    message: configured
      ? "CapCut Standard provider is configured."
      : "CapCut Standard remains disabled until official API credentials and endpoint documentation are configured.",
  };
}
