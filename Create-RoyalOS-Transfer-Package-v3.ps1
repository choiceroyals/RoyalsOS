param(
  [string]$ProjectRoot = (Get-Location).Path,
  [string]$OutputDirectory = (Join-Path (Get-Location).Path "transfer-packages")
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}


function Get-RelativePathCompat([string]$BasePath, [string]$TargetPath) {
  $baseFull = [System.IO.Path]::GetFullPath($BasePath)

  if (-not $baseFull.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $baseFull += [System.IO.Path]::DirectorySeparatorChar
  }

  $targetFull = [System.IO.Path]::GetFullPath($TargetPath)

  $baseUri = New-Object System.Uri($baseFull)
  $targetUri = New-Object System.Uri($targetFull)

  $relativeUri = $baseUri.MakeRelativeUri($targetUri)
  $relativePath = [System.Uri]::UnescapeDataString($relativeUri.ToString())

  return $relativePath.Replace("/", "\")
}

function Test-IsReparsePoint([System.IO.FileSystemInfo]$Item) {
  return (($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
}

function Get-SafeFiles([string]$Root, [string[]]$ExcludedDirectories) {
  $rootItem = Get-Item -LiteralPath $Root -Force
  $stack = New-Object "System.Collections.Generic.Stack[System.IO.DirectoryInfo]"
  $stack.Push([System.IO.DirectoryInfo]$rootItem)

  while ($stack.Count -gt 0) {
    $directory = $stack.Pop()

    foreach ($item in Get-ChildItem -LiteralPath $directory.FullName -Force -ErrorAction Stop) {
      if ($item.PSIsContainer) {
        if ($ExcludedDirectories -contains $item.Name) { continue }
        if (Test-IsReparsePoint $item) {
          Write-Host "Skipping linked folder: $($item.FullName)" -ForegroundColor DarkYellow
          continue
        }

        $stack.Push([System.IO.DirectoryInfo]$item)
        continue
      }

      if (Test-IsReparsePoint $item) {
        Write-Host "Skipping linked file: $($item.FullName)" -ForegroundColor DarkYellow
        continue
      }

      Write-Output $item
    }
  }
}

function Get-LongPath([string]$Path) {
  if ($Path.StartsWith("\\?\")) { return $Path }
  if ($Path.StartsWith("\\")) {
    return "\\?\UNC\" + $Path.TrimStart("\")
  }
  return "\\?\" + $Path
}

function Copy-FileSafely([string]$Source, [string]$Destination) {
  $destinationDirectory = Split-Path -Parent $Destination
  [System.IO.Directory]::CreateDirectory((Get-LongPath $destinationDirectory)) | Out-Null
  [System.IO.File]::Copy(
    (Get-LongPath $Source),
    (Get-LongPath $Destination),
    $true
  )
}

function New-ZipSafely([string]$SourceDirectory, [string]$DestinationZip) {
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem

  if (Test-Path -LiteralPath $DestinationZip) {
    Remove-Item -LiteralPath $DestinationZip -Force
  }

  $zipStream = [System.IO.File]::Open(
    (Get-LongPath $DestinationZip),
    [System.IO.FileMode]::CreateNew,
    [System.IO.FileAccess]::ReadWrite,
    [System.IO.FileShare]::None
  )

  try {
    $archive = New-Object System.IO.Compression.ZipArchive(
      $zipStream,
      [System.IO.Compression.ZipArchiveMode]::Create,
      $false
    )

    try {
      $zipFiles = Get-SafeFiles -Root $SourceDirectory -ExcludedDirectories @()

      foreach ($file in $zipFiles) {
        $relativePath = (Get-RelativePathCompat -BasePath $SourceDirectory -TargetPath $file.FullName).Replace("\", "/")

        $entry = $archive.CreateEntry(
          $relativePath,
          [System.IO.Compression.CompressionLevel]::Optimal
        )

        $input = [System.IO.File]::OpenRead((Get-LongPath $file.FullName))
        try {
          $output = $entry.Open()
          try {
            $input.CopyTo($output)
          }
          finally {
            $output.Dispose()
          }
        }
        finally {
          $input.Dispose()
        }
      }
    }
    finally {
      $archive.Dispose()
    }
  }
  finally {
    $zipStream.Dispose()
  }
}

$project = (Resolve-Path -LiteralPath $ProjectRoot).Path
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "ROYALOS_TRANSFER_PACKAGE_$timestamp"

# A short staging path prevents Windows path-length errors.
$stagingRoot = Join-Path $env:TEMP ("RTP-" + $timestamp)
$packageRoot = Join-Path $stagingRoot "royalos-app"
$zipPath = Join-Path $OutputDirectory "$packageName.zip"

$excludedDirectoryNames = @(
  ".git",
  ".next",
  "node_modules",
  ".vercel",
  ".turbo",
  "coverage",
  "dist",
  "build",
  ".royalos-backups",
  "transfer-packages"
)

$excludedFileNames = @(
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  "tsconfig.tsbuildinfo",
  "npm-debug.log",
  "yarn-error.log",
  "pnpm-debug.log"
)

$secretNamePatterns = @(
  "^\.env(\..+)?$",
  "\.pem$",
  "\.key$",
  "\.p12$",
  "\.pfx$",
  "service[-_]?account.*\.json$",
  "credentials.*\.json$"
)

Write-Step "Validating RoyalOS project"
$required = @("package.json", "app", "lib")
foreach ($item in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $project $item))) {
    throw "Project root does not look like RoyalOS. Missing: $item"
  }
}

if (Test-Path -LiteralPath $stagingRoot) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

[System.IO.Directory]::CreateDirectory((Get-LongPath $packageRoot)) | Out-Null
[System.IO.Directory]::CreateDirectory((Get-LongPath $OutputDirectory)) | Out-Null

Write-Step "Copying RoyalOS source while excluding secrets, build folders, and linked folders"
$allFiles = Get-SafeFiles -Root $project -ExcludedDirectories $excludedDirectoryNames
$copiedCount = 0

foreach ($file in $allFiles) {
  $relative = Get-RelativePathCompat -BasePath $project -TargetPath $file.FullName

  if ($relative.StartsWith("..")) {
    Write-Host "Skipping path outside project: $($file.FullName)" -ForegroundColor DarkYellow
    continue
  }

  if ($excludedFileNames -contains $file.Name) { continue }

  $skip = $false
  foreach ($pattern in $secretNamePatterns) {
    if ($file.Name -match $pattern) {
      $skip = $true
      break
    }
  }
  if ($skip) { continue }

  $destination = Join-Path $packageRoot $relative
  Copy-FileSafely -Source $file.FullName -Destination $destination
  $copiedCount++
}

Write-Step "Creating safe .env.example"
$envCandidates = Get-ChildItem -LiteralPath $project -Force -File |
  Where-Object { $_.Name -match "^\.env(\..+)?$" }

$envKeys = New-Object System.Collections.Generic.HashSet[string]

foreach ($envFile in $envCandidates) {
  try {
    foreach ($line in Get-Content -LiteralPath $envFile.FullName -ErrorAction Stop) {
      $trimmed = $line.Trim()
      if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }

      if ($trimmed -match "^([A-Za-z_][A-Za-z0-9_]*)\s*=") {
        [void]$envKeys.Add($Matches[1])
      }
    }
  }
  catch {
    Write-Warning "Could not read $($envFile.Name) to extract variable names."
  }
}

$knownKeys = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ASSETS_BUCKET",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_DEVELOPER_MODEL",
  "WORDPRESS_URL",
  "WORDPRESS_USERNAME",
  "WORDPRESS_APPLICATION_PASSWORD",
  "ELEVENLABS_API_KEY",
  "RUNWAY_API_KEY"
)

foreach ($key in $knownKeys) {
  [void]$envKeys.Add($key)
}

$envExample = @(
  "# RoyalOS environment variable template"
  "# Copy this file to .env.local and add real values locally."
  "# Never commit .env.local or real credentials."
  ""
)

foreach ($key in ($envKeys | Sort-Object)) {
  $envExample += "$key="
}

$envExamplePath = Join-Path $packageRoot ".env.example"
[System.IO.File]::WriteAllLines(
  (Get-LongPath $envExamplePath),
  $envExample,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Step "Creating file inventory"
$inventoryFiles = Get-SafeFiles -Root $packageRoot -ExcludedDirectories @() |
  Sort-Object FullName |
  ForEach-Object {
    (Get-RelativePathCompat -BasePath $packageRoot -TargetPath $_.FullName).Replace("\", "/")
  }

$inventoryPath = Join-Path $packageRoot "ROYALOS_FILE_INVENTORY.txt"
[System.IO.File]::WriteAllLines(
  (Get-LongPath $inventoryPath),
  $inventoryFiles,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Step "Creating ROYALOS_HANDOFF.md"
$packageJsonPath = Join-Path $packageRoot "package.json"
$packageJson = $null

if (Test-Path -LiteralPath $packageJsonPath) {
  try {
    $packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
  }
  catch {}
}

$frameworkSummary = if ($packageJson -and $packageJson.dependencies.next) {
  "Next.js $($packageJson.dependencies.next), React $($packageJson.dependencies.react)"
}
else {
  "Next.js / React application"
}

$apiRoot = Join-Path $packageRoot "app\api"
$apiRoutes = @()
if (Test-Path -LiteralPath $apiRoot) {
  $apiRoutes = Get-ChildItem -LiteralPath $apiRoot -Recurse -Filter "route.ts" -File -ErrorAction SilentlyContinue |
    ForEach-Object {
      "/" + ($_.DirectoryName.Substring((Join-Path $packageRoot "app").Length).TrimStart("\").Replace("\", "/"))
    } |
    Sort-Object -Unique
}

$componentsRoot = Join-Path $packageRoot "components"
$components = @()
if (Test-Path -LiteralPath $componentsRoot) {
  $components = Get-ChildItem -LiteralPath $componentsRoot -Recurse -Filter "*.tsx" -File -ErrorAction SilentlyContinue |
    ForEach-Object {
      (Get-RelativePathCompat -BasePath $packageRoot -TargetPath $_.FullName).Replace("\", "/")
    } |
    Sort-Object
}

$migrations = Get-SafeFiles -Root $packageRoot -ExcludedDirectories @() |
  Where-Object {
    $_.Extension -eq ".sql" -or
    $_.FullName -match "[\\/]migrations[\\/]"
  } |
  ForEach-Object {
    (Get-RelativePathCompat -BasePath $packageRoot -TargetPath $_.FullName).Replace("\", "/")
  } |
  Sort-Object -Unique

$apiRouteList = if ($apiRoutes.Count -gt 0) {
  ($apiRoutes | ForEach-Object { "- ``$_``" }) -join "`r`n"
}
else {
  "- No API route files were detected."
}

$componentList = if ($components.Count -gt 0) {
  ($components | ForEach-Object { "- ``$_``" }) -join "`r`n"
}
else {
  "- No dashboard component files were detected."
}

$migrationList = if ($migrations.Count -gt 0) {
  ($migrations | ForEach-Object { "- ``$_``" }) -join "`r`n"
}
else {
  "- No SQL migration file was detected in the local project copy. Export the current Supabase schema before major database work."
}

$handoff = @"
# RoyalOS Project Handoff

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Source project: `$project`
Package: `$packageName`

## 1. Purpose

RoyalOS is an executive operating system and multi-agent AI workforce platform for Triple-Hay Concept LLC and its brands. The current internal build coordinates specialized AI employees, missions, tools, approvals, knowledge, memory, creative production, assets, and developer workflows.

The long-term product direction is a multi-tenant SaaS where businesses can sign up and purchase individual AI employees or complete departments without rebuilding the application for every customer.

## 2. Technology stack

- $frameworkSummary
- TypeScript
- Supabase database and private Storage
- OpenAI APIs
- Vercel deployment
- GitHub source control
- Node.js server routes
- CSS Modules and component-level styles

## 3. Main architecture

### Dashboard shell

`app/page.tsx` is the main RoyalOS dashboard shell. It contains navigation, employee displays, workspaces, missions, approvals, chat surfaces, and module routing. Larger tools are progressively being moved into `components/dashboard`.

### AI workforce

Current established employees include:

- Adedeji — Executive Assistant / Chief of Staff
- Atlas — Research and Business Intelligence
- Emmy — Marketing and Content Strategy
- Nova — Creative Director and image generation
- Jack — Media and video leadership
- Tyson — Analytics and business performance
- Titan — Operations and automation
- Janet — Customer success and engagement
- Orion — Software development
- Ifeoluwa — Private CEO adviser

Planned next employees:

- Cine — Director of AI Video Production
- Michael P — Chief Bookkeeping, Accounting & Records Officer

### Mission orchestration

RoyalOS supports task and mission planning, employee routing, collaboration, executive synthesis, persistent mission records, and memory.

### Tool system

The tool layer contains:

- Tool registry
- Employee permissions
- Risk and approval rules
- Execution
- Persistent actions, approvals, connections, assets, and audit events
- OpenAI image generation
- Supabase private asset storage and signed URLs

### Orion Developer Workbench

Current stages:

1. Project inspection
2. Code search
3. Development planning
4. Complete code proposal generation
5. Original-versus-proposed review
6. Copy and download proposal

The workbench remains read-only and does not yet apply files automatically.

## 4. Important folders

```text
app/
  api/                 Next.js route handlers
  page.tsx             Main dashboard shell
  page.module.css      Main dashboard styles
components/
  dashboard/           Nova, assets, and Orion workbench components
lib/
  developer/           Orion inspection, search, planning, proposal, security
  missions/            Mission types and persistence
  orchestrator/        Mission execution and collaboration
  memory/              Permanent-memory helpers
  tools/               Tool registry, permissions, persistence, connectors
  supabase/            Supabase server/admin helpers
public/
  avatars/             Employee avatars
supabase/ or migrations/
  SQL migrations when present
```

## 5. API routes included

$apiRouteList

## 6. Dashboard components included

$componentList

## 7. Database and storage

Known tables from the current development history:

- `royalos_missions`
- `royalos_tool_actions`
- `royalos_tool_approvals`
- `royalos_tool_connections`
- `royalos_assets`
- `royalos_tool_audit_events`

Known private storage bucket:

- `royalos-assets`

Migration files included:

$migrationList

Treat the included SQL files and current Supabase project as the source of truth.

## 8. Working features

- Dark/gold RoyalOS executive dashboard
- Multiple company workspaces
- AI employee roster and departments
- Mission planning and orchestration
- Supabase mission persistence
- Permanent-memory integration
- Tool registry, permissions, actions, approvals, and audit records
- Nova image generation
- Private Supabase asset storage
- Asset Gallery listing and upload
- Ifeoluwa text chat
- Ifeoluwa image input and analysis
- Spoken response controls and evolving live-call UX
- Orion project inspection
- Orion code search
- Orion development planning
- Orion complete code proposals
- Original/proposed review
- Proposal copy and download
- GitHub-to-Vercel deployment
- Desktop/laptop Git synchronization

## 9. Incomplete features

- Cine video-generation employee
- Michael P bookkeeping/accounting/records employee
- Universal employee assignment button across Chat, Tasks, and Missions
- Content Operations Hub
- WordPress connection and draft/publish workflow
- Social publishing connectors
- Permanent Orion proposal and approval records
- True line-by-line code diff
- Protected source backups
- Controlled code apply
- Allowlisted validation runner
- Automatic rollback
- Complete developer history
- Multi-tenant organizations and user isolation
- Customer employee marketplace and subscriptions
- Production billing
- Full realtime voice conversation for all employees

## 10. Known issues and cautions

- Keep `.env.local`, API keys, service-role keys, and platform tokens out of Git.
- Do not commit `.next`, `node_modules`, or backup directories.
- Do not run `npm audit fix --force`.
- Next.js endpoints must live under `app/api/.../route.ts`.
- `OrionDeveloperWorkbench.tsx` must retain the `.tsx` extension.
- Dashboard components currently live in root `components/dashboard`.
- Verify current asset-route paths against UI fetch calls.
- Re-test all developer endpoints after route changes.
- Vercel requires the variables listed in `.env.example`.
- Filesystem-based Orion features may behave differently on Vercel because the production filesystem is read-only.
- The current app is an internal single-company build, not yet a secure multi-tenant SaaS.

## 11. Exact next development step

Add the two new employees through the shared employee model before building their individual tools.

### Cine

Role: Director of AI Video Production

Initial capabilities:

- Scripts
- Storyboards
- Visual generation
- Video clips
- Voice-over
- Captions
- Thumbnails
- Final exports
- RoyalOS Media Library storage
- Handoff to social publishing

### Michael P

Role: Chief Bookkeeping, Accounting & Records Officer

Initial capabilities:

- Receipt, invoice, expense, income, contract, tax, and company-document intake
- Original-file preservation
- Metadata extraction
- Duplicate detection
- Searchable records
- Organized company/year/month/category folders
- PDF summaries and reports
- Approval-controlled corrections
- No payments, tax submission, or deletion without CEO approval

Implementation order:

1. Identify every employee union, registry, role map, avatar map, department map, validation list, mission router, and permission map.
2. Centralize employee definitions if duplicated.
3. Add `Cine` and `Michael P` to the shared employee type and configuration.
4. Add their avatars and dashboard cards.
5. Add employee-selection buttons to Chat, Tasks, and Missions.
6. Run `npx tsc --noEmit`.
7. Test the dashboard locally.
8. Commit and push through GitHub/Vercel.
9. Build Michael P persistence and private file intake first.
10. Build Cine's multi-provider media pipeline second.

Do not add employee names only to `app/page.tsx`. Update the shared employee model first so APIs, mission routing, tools, permissions, and UI remain consistent.

## 12. Continuation checklist

1. Extract the ZIP.
2. Read this file and `ROYALOS_FILE_INVENTORY.txt`.
3. Copy `.env.example` to `.env.local`.
4. Add real secrets locally or in Vercel.
5. Run `npm install`.
6. Run `npx tsc --noEmit`.
7. Run `npm run dev`.
8. Test the dashboard and API routes.
9. Treat the packaged files as the current source of truth.
"@

$handoffPath = Join-Path $packageRoot "ROYALOS_HANDOFF.md"
[System.IO.File]::WriteAllText(
  (Get-LongPath $handoffPath),
  $handoff,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Step "Checking that forbidden files are absent"
$forbidden = Get-SafeFiles -Root $packageRoot -ExcludedDirectories @() |
  Where-Object {
    $_.Name -in $excludedFileNames -or
    ($_.Name -match "^\.env(\..+)?$" -and $_.Name -ne ".env.example")
  }

if ($forbidden) {
  $names = $forbidden | ForEach-Object { $_.FullName }
  throw "Forbidden files were detected in staging:`n$($names -join "`n")"
}

Write-Step "Creating ZIP package"
New-ZipSafely -SourceDirectory $stagingRoot -DestinationZip $zipPath

Write-Step "Package complete"
Write-Host "ZIP: $zipPath" -ForegroundColor Green
Write-Host "Files included: $copiedCount" -ForegroundColor Green
Write-Host "Secrets, node_modules, .next, Git data, build folders, and linked folders were excluded." -ForegroundColor Green

Remove-Item -LiteralPath $stagingRoot -Recurse -Force
