param(
  [string]$ProjectRoot = (Get-Location).Path,
  [string]$OutputDirectory = (Join-Path (Get-Location).Path "transfer-packages")
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-IsReparsePoint([System.IO.FileSystemInfo]$Item) {
  return (($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
}

function Get-LongPath([string]$Path) {
  if ($Path.StartsWith("\\?\")) { return $Path }
  if ($Path.StartsWith("\\")) { return "\\?\UNC\" + $Path.TrimStart("\") }
  return "\\?\" + $Path
}

function Get-ProjectFiles([string]$Root, [string[]]$ExcludedDirectories) {
  $rootDirectory = New-Object System.IO.DirectoryInfo($Root)
  $stack = New-Object "System.Collections.Generic.Stack[System.IO.DirectoryInfo]"
  $stack.Push($rootDirectory)

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
      }
      else {
        if (Test-IsReparsePoint $item) {
          Write-Host "Skipping linked file: $($item.FullName)" -ForegroundColor DarkYellow
          continue
        }

        Write-Output $item
      }
    }
  }
}

function Copy-FileLongPath([string]$Source, [string]$Destination) {
  $destinationDirectory = Split-Path -Parent $Destination
  [System.IO.Directory]::CreateDirectory((Get-LongPath $destinationDirectory)) | Out-Null
  [System.IO.File]::Copy((Get-LongPath $Source), (Get-LongPath $Destination), $true)
}

function New-ZipFromDirectory([string]$SourceDirectory, [string]$DestinationZip) {
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
      $base = $SourceDirectory.TrimEnd("\") + "\"
      $files = Get-ChildItem -LiteralPath $SourceDirectory -Recurse -File -Force

      foreach ($file in $files) {
        $relative = $file.FullName.Substring($base.Length).Replace("\", "/")
        $entry = $archive.CreateEntry(
          $relative,
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
$packageName = "ROYALOS_SOURCE_TRANSFER_$timestamp"

# Short staging path helps prevent Windows path-length issues.
$stagingRoot = Join-Path $env:TEMP ("ROS-" + $timestamp)
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
  "transfer-packages",
  "uploads",
  "generated",
  "exports",
  "recordings",
  "renders",
  "cache",
  ".cache"
)

$excludedFileNames = @(
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  ".npmrc",
  "tsconfig.tsbuildinfo",
  "npm-debug.log",
  "yarn-error.log",
  "pnpm-debug.log"
)

# Source/config/document formats needed by the next conversation.
$allowedExtensions = @(
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".css", ".scss", ".sass", ".less",
  ".md", ".mdx", ".sql", ".txt", ".yml", ".yaml",
  ".toml", ".prisma", ".html", ".htm", ".xml",
  ".graphql", ".gql", ".sh", ".ps1", ".bat", ".cmd",
  ".svg", ".ico"
)

# Small design images may be useful for understanding the current UI.
$smallImageExtensions = @(".png", ".jpg", ".jpeg", ".webp", ".gif")
$maxSmallImageBytes = 2MB
$maxAnyFileBytes = 15MB

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
foreach ($required in @("package.json", "app", "lib")) {
  if (-not (Test-Path -LiteralPath (Join-Path $project $required))) {
    throw "This folder does not look like RoyalOS. Missing: $required"
  }
}

if (Test-Path -LiteralPath $stagingRoot) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
}

[System.IO.Directory]::CreateDirectory((Get-LongPath $packageRoot)) | Out-Null
[System.IO.Directory]::CreateDirectory((Get-LongPath $OutputDirectory)) | Out-Null

Write-Step "Building compact source package"
$base = $project.TrimEnd("\") + "\"
$copied = New-Object System.Collections.Generic.List[string]
$omitted = New-Object System.Collections.Generic.List[string]

$allFiles = Get-ProjectFiles -Root $project -ExcludedDirectories $excludedDirectoryNames

foreach ($file in $allFiles) {
  $relative = $file.FullName.Substring($base.Length)
  $extension = $file.Extension.ToLowerInvariant()

  if ($excludedFileNames -contains $file.Name) {
    $omitted.Add("$relative`tExcluded sensitive/generated filename")
    continue
  }

  $isSecret = $false
  foreach ($pattern in $secretNamePatterns) {
    if ($file.Name -match $pattern) {
      $isSecret = $true
      break
    }
  }

  if ($isSecret) {
    $omitted.Add("$relative`tExcluded possible credential file")
    continue
  }

  if ($file.Length -gt $maxAnyFileBytes) {
    $omitted.Add("$relative`tExcluded because file is larger than 15 MB")
    continue
  }

  $include = $false

  if ($allowedExtensions -contains $extension) {
    $include = $true
  }
  elseif (($smallImageExtensions -contains $extension) -and ($file.Length -le $maxSmallImageBytes)) {
    $include = $true
  }
  elseif ($file.Name -in @(
    ".gitignore",
    "Dockerfile",
    "LICENSE",
    "README",
    "Procfile"
  )) {
    $include = $true
  }

  if (-not $include) {
    $omitted.Add("$relative`tExcluded non-source or large media format")
    continue
  }

  $destination = Join-Path $packageRoot $relative
  Copy-FileLongPath -Source $file.FullName -Destination $destination
  $copied.Add($relative.Replace("\", "/"))
}

Write-Step "Creating safe .env.example"
$envKeys = New-Object System.Collections.Generic.HashSet[string]
$envCandidates = Get-ChildItem -LiteralPath $project -Force -File |
  Where-Object { $_.Name -match "^\.env(\..+)?$" }

foreach ($envFile in $envCandidates) {
  try {
    foreach ($line in Get-Content -LiteralPath $envFile.FullName) {
      $trimmed = $line.Trim()
      if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }

      if ($trimmed -match "^([A-Za-z_][A-Za-z0-9_]*)\s*=") {
        [void]$envKeys.Add($Matches[1])
      }
    }
  }
  catch {
    Write-Warning "Could not inspect $($envFile.Name)."
  }
}

foreach ($key in @(
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
)) {
  [void]$envKeys.Add($key)
}

$envExampleLines = @(
  "# RoyalOS environment template"
  "# Copy to .env.local and enter real values locally."
  "# Never upload or commit real credentials."
  ""
)

foreach ($key in ($envKeys | Sort-Object)) {
  $envExampleLines += "$key="
}

[System.IO.File]::WriteAllLines(
  (Get-LongPath (Join-Path $packageRoot ".env.example")),
  $envExampleLines,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Step "Creating transfer notes and inventories"
$inventoryPath = Join-Path $packageRoot "ROYALOS_FILE_INVENTORY.txt"
[System.IO.File]::WriteAllLines(
  (Get-LongPath $inventoryPath),
  ($copied | Sort-Object),
  (New-Object System.Text.UTF8Encoding($false))
)

$omittedPath = Join-Path $packageRoot "ROYALOS_OMITTED_LARGE_MEDIA.txt"
[System.IO.File]::WriteAllLines(
  (Get-LongPath $omittedPath),
  ($omitted | Sort-Object),
  (New-Object System.Text.UTF8Encoding($false))
)

$handoff = @"
# RoyalOS Project Handoff

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Source project: `$project`
Package: `$packageName`

## Purpose

This compact package contains the current RoyalOS source code, APIs, imported helper files, employee configuration, dashboard components, types, styles, Supabase files, migrations, and project configuration needed to continue development in a new conversation.

Large videos, audio, PDFs, archives, generated outputs, uploads, caches, build folders, `node_modules`, `.next`, Git data, and real environment files were intentionally excluded so the package remains uploadable.

See:

- `ROYALOS_FILE_INVENTORY.txt` for included files.
- `ROYALOS_OMITTED_LARGE_MEDIA.txt` for intentionally omitted files.
- `.env.example` for required environment-variable names without secret values.

## Current architecture

RoyalOS is a Next.js and TypeScript executive operating system and multi-agent AI workforce platform. The main dashboard is centered in `app/page.tsx`. Server endpoints live under `app/api`. Shared logic is organized under `lib`, while dashboard tools and work surfaces are organized under `components`.

The platform currently coordinates AI employees, missions, tasks, chat, approvals, memory, development tools, generated assets, Supabase persistence, and company workspaces.

## Current employees

- Adedeji — Executive Assistant and Chief of Staff
- Atlas — Research and Business Intelligence
- Emmy — Marketing and Content Strategy
- Nova — Creative and image generation
- Jack — Media and video leadership
- Tyson — Analytics and business performance
- Titan — Operations and automation
- Janet — Customer success and engagement
- Orion — Software development
- Ifeoluwa — Private CEO adviser

## Exact next development step

Add two employees through the shared employee model:

### Cine

Director of AI Video Production.

Responsibilities:

- Scripts
- Storyboards
- Visuals
- Video clips
- Voice-over
- Captions
- Thumbnails
- Final exports
- RoyalOS Media Library storage
- Handoff to the social-publishing employee

### Michael P

Chief Bookkeeping, Accounting and Records Officer.

Responsibilities:

- Receive receipts, invoices, expenses, income records, contracts, tax files, and company documents
- Preserve originals
- Extract metadata
- Detect duplicates
- Create searchable records
- Organize files by company, year, month, and category
- Generate PDF summaries and reports
- Maintain approval-controlled corrections and audit history
- Never make payments, submit taxes, alter official records, or delete originals without CEO approval

Implementation order:

1. Inspect every employee union, registry, role map, department map, validation list, avatar map, mission router, API validation array, and permission map.
2. Centralize duplicated employee definitions.
3. Add `Cine` and `Michael P` to the shared type and configuration.
4. Add their avatars and dashboard cards.
5. Add employee selection and handoff buttons to Chat, Tasks, and Missions.
6. Run `npx tsc --noEmit`.
7. Test locally with `npm run dev`.
8. Build Michael P persistence and private document intake.
9. Build Cine's multi-provider video pipeline.
10. Commit and deploy through GitHub and Vercel.

## Known cautions

- Never commit `.env.local`, API keys, passwords, service-role keys, or social-platform tokens.
- Do not run `npm audit fix --force`.
- Keep Next.js route handlers under `app/api/.../route.ts`.
- Treat the packaged source as the current source of truth.
- The current build is still an internal single-company system, not yet a secure multi-tenant SaaS.
- Orion's filesystem features may behave differently on Vercel because deployed filesystems are read-only.
"@

[System.IO.File]::WriteAllText(
  (Get-LongPath (Join-Path $packageRoot "ROYALOS_HANDOFF.md")),
  $handoff,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Step "Creating compact ZIP"
New-ZipFromDirectory -SourceDirectory $stagingRoot -DestinationZip $zipPath

$zipInfo = Get-Item -LiteralPath $zipPath
$sizeMB = [Math]::Round($zipInfo.Length / 1MB, 2)

Write-Step "Compact package complete"
Write-Host "ZIP: $zipPath" -ForegroundColor Green
Write-Host "Included files: $($copied.Count)" -ForegroundColor Green
Write-Host "ZIP size: $sizeMB MB" -ForegroundColor Green
Write-Host "Large media and generated files were intentionally omitted." -ForegroundColor Green

try {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force -ErrorAction Stop
}
catch {
  Write-Warning "The ZIP is complete. Windows could not remove the temporary staging folder, but this does not affect the package."
}
