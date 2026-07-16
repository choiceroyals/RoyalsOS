$ErrorActionPreference = "Stop"

$requiredFiles = @(
  "app\page.tsx",
  "app\api\cine\route.ts",
  "app\api\integrations\route.ts",
  "components\dashboard\OrionDeveloperWorkbenchShell.tsx",
  "components\dashboard\CineVideoStudio.tsx",
  "components\dashboard\CineVideoStudio.module.css",
  "components\dashboard\MichaelPRecordsCenter.tsx",
  "components\dashboard\MichaelPRecordsCenter.module.css",
  "components\dashboard\IntegrationsCenter.tsx",
  "components\dashboard\IntegrationsCenter.module.css",
  "components\dashboard\CoreOperationsCenter.tsx",
  "components\dashboard\CoreOperationsCenter.module.css",
  "lib\employees\config.ts",
  "lib\cine\config.ts",
  "lib\finance\michaelP.ts",
  "lib\integrations\config.ts",
  "lib\core-operations\types.ts",
  "lib\core-operations\seed.ts",
  "lib\core-operations\storage.ts",
  "supabase\migrations\20260714_core_operations_foundation.sql",
  "ROYALOS_CORE_OPERATIONS_PACK_20260714.md",
  "ROYALOS_PRODUCT_ROADMAP.md",
  "ROYALOS_HANDOFF.md",
  "package.json",
  "tsconfig.json",
  "next.config.ts"
)

$missing = @()
foreach ($file in $requiredFiles) {
  if (-not (Test-Path -LiteralPath $file)) {
    $missing += $file
  }
}

if ($missing.Count -gt 0) {
  Write-Host "RoyalOS verification failed. Missing files:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "RoyalOS required-file verification passed." -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  npm install"
Write-Host "  npm run dev"
Write-Host "Then open http://localhost:3000 and test Workspaces, Missions, Approvals, Knowledge, Memory, Messages, Analytics, and Settings."
