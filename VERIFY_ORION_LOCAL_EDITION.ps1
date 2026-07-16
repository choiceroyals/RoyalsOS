$ErrorActionPreference = "Stop"

$required = @(
  "app/api/developer/apply/route.ts",
  "app/api/developer/health/route.ts",
  "app/api/developer/history/route.ts",
  "app/api/developer/inspect/route.ts",
  "app/api/developer/plan/route.ts",
  "app/api/developer/propose/route.ts",
  "app/api/developer/rollback/route.ts",
  "app/api/developer/search/route.ts",
  "app/api/developer/validate/route.ts",
  "app/api/reports/company-pdf/route.ts",
  "components/dashboard/OrionCodeProposal.tsx",
  "components/dashboard/OrionDeveloperWorkbench.tsx",
  "components/dashboard/OrionDeveloperWorkbenchShell.tsx",
  "components/dashboard/OrionOperationsHistory.tsx",
  "components/reports/SaveCompanyPdfButton.tsx",
  "components/reports/CompanyRecordsLibrary.tsx",
  "lib/developer/executor.ts",
  "lib/developer/local-runtime.ts",
  "lib/developer/security.ts",
  "lib/developer/validation.ts",
  "lib/reports/company-records.ts",
  "lib/reports/pdf.ts",
  "supabase/migrations/20260714_orion_company_records.sql",
  ".gitignore",
  ".env.example"
)

$missing = @()
foreach ($item in $required) {
  if (-not (Test-Path $item)) { $missing += $item }
}

if ($missing.Count -gt 0) {
  Write-Host "Missing required Orion files:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "All required Orion Local Developer Edition files are present." -ForegroundColor Green
Write-Host "Next run: npm install; npx tsc --noEmit; npm run lint; npm run build" -ForegroundColor Cyan
