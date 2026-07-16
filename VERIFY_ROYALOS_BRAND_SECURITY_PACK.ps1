$ErrorActionPreference = "Stop"

$required = @(
  "app/page.tsx",
  "app/api/brands/route.ts",
  "app/api/integrations/oauth/start/route.ts",
  "app/api/integrations/oauth/callback/meta/route.ts",
  "app/api/integrations/oauth/callback/google/route.ts",
  "app/api/integrations/oauth/callback/linkedin/route.ts",
  "app/api/integrations/oauth/callback/x/route.ts",
  "app/api/integrations/oauth/callback/tiktok/route.ts",
  "app/api/integrations/oauth/callback/github/route.ts",
  "app/api/security/events/route.ts",
  "components/dashboard/BrandOperationsCenter.tsx",
  "components/dashboard/BrandSwitcher.tsx",
  "components/dashboard/EmployeeDirectory.tsx",
  "components/dashboard/SecurityAuditCenter.tsx",
  "lib/brands/config.ts",
  "lib/brands/server.ts",
  "lib/employees/equipment.ts",
  "lib/integrations/oauth.ts",
  "lib/security/types.ts",
  "public/brands/choiceroyals/logo.png",
  "supabase/migrations/20260715_brand_identity_security_foundation.sql",
  ".env.example",
  "ROYALOS_API_AND_CONNECTION_SETUP.md"
)

$missing = @()
foreach ($item in $required) {
  if (-not (Test-Path (Join-Path $PSScriptRoot $item))) {
    $missing += $item
  }
}

if ($missing.Count -gt 0) {
  Write-Host "Missing required files:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "RoyalOS Brand/Security pack file check passed." -ForegroundColor Green
Write-Host "Next run: npm install; npx tsc --noEmit; npm run lint; npm run build" -ForegroundColor Cyan
