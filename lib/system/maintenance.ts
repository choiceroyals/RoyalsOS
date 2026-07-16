import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type {
  RestorePoint,
  SystemCheck,
  SystemMaintenanceAction,
  SystemMaintenanceLog,
  SystemMaintenanceSnapshot,
} from "./types";

const execFileAsync = promisify(execFile);
const SYSTEM_DIR = ".royalos";
const LOG_FILE = "system-maintenance-log.json";
const ERROR_FILE = "runtime-errors.json";
const MAX_LOGS = 100;

function root(): string {
  return process.cwd();
}

function systemPath(...parts: string[]): string {
  return path.join(root(), SYSTEM_DIR, ...parts);
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureSystemDirectories(): Promise<void> {
  await Promise.all([
    mkdir(systemPath("backups"), { recursive: true }),
    mkdir(systemPath("reports"), { recursive: true }),
    mkdir(path.join(root(), "public", "royalos-assets", "cine"), { recursive: true }),
    mkdir(path.join(root(), "data"), { recursive: true }),
  ]);
}

async function readJsonArray<T>(file: string): Promise<T[]> {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

export async function appendMaintenanceLog(
  input: Omit<SystemMaintenanceLog, "id" | "createdAt">,
): Promise<SystemMaintenanceLog> {
  await ensureSystemDirectories();
  const log: SystemMaintenanceLog = {
    ...input,
    id: `system_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const file = systemPath(LOG_FILE);
  const logs = await readJsonArray<SystemMaintenanceLog>(file);
  await writeJson(file, [log, ...logs].slice(0, MAX_LOGS));
  return log;
}

export async function recordRuntimeError(input: {
  message: string;
  stack?: string;
  source?: string;
  pathname?: string;
}): Promise<void> {
  await ensureSystemDirectories();
  const file = systemPath(ERROR_FILE);
  const errors = await readJsonArray<Record<string, unknown>>(file);
  const safe = {
    id: `runtime_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message: input.message.slice(0, 2000),
    stack: input.stack?.slice(0, 8000),
    source: input.source?.slice(0, 500),
    pathname: input.pathname?.slice(0, 500),
    createdAt: new Date().toISOString(),
  };
  await writeJson(file, [safe, ...errors].slice(0, 100));
}

async function packageInfo(): Promise<{ version: string; scripts: Record<string, string> }> {
  try {
    const raw = await readFile(path.join(root(), "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { version?: string; scripts?: Record<string, string> };
    return { version: parsed.version ?? "unknown", scripts: parsed.scripts ?? {} };
  } catch {
    return { version: "unknown", scripts: {} };
  }
}

async function listRestorePoints(): Promise<RestorePoint[]> {
  await ensureSystemDirectories();
  const base = systemPath("backups");
  const entries = await readdir(base, { withFileTypes: true });
  const points: RestorePoint[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(base, entry.name, "restore-point.json");
    try {
      const raw = await readFile(manifestPath, "utf8");
      const manifest = JSON.parse(raw) as RestorePoint;
      points.push(manifest);
    } catch {
      // Ignore incomplete restore directories.
    }
  }
  return points.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function check(
  id: string,
  label: string,
  status: SystemCheck["status"],
  detail: string,
  remediation?: string,
): SystemCheck {
  return { id, label, status, detail, remediation, checkedAt: new Date().toISOString() };
}

export async function quickScan(): Promise<SystemCheck[]> {
  await ensureSystemDirectories();
  const requiredFiles = [
    "package.json",
    "app/page.tsx",
    "app/layout.tsx",
    "components/dashboard/OrionDeveloperWorkbenchShell.tsx",
    "components/dashboard/SecurityAuditCenter.tsx",
    "lib/employees/config.ts",
  ];
  const missing: string[] = [];
  for (const file of requiredFiles) {
    if (!(await exists(path.join(root(), file)))) missing.push(file);
  }

  const pkg = await packageInfo();
  const envFile = await exists(path.join(root(), ".env.local"));
  const nextInstalled = await exists(path.join(root(), "node_modules", "next"));
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const migrationsPresent = await exists(path.join(root(), "supabase", "migrations"));
  const runtimeErrors = await readJsonArray<Record<string, unknown>>(systemPath(ERROR_FILE));

  return [
    missing.length === 0
      ? check("files", "Core project files", "pass", "All required RoyalOS files are present.")
      : check("files", "Core project files", "fail", `Missing: ${missing.join(", ")}`, "Restore from the latest working package or assign the issue to Orion."),
    nextInstalled
      ? check("dependencies", "Node dependencies", "pass", "Next.js is installed locally.")
      : check("dependencies", "Node dependencies", "fail", "node_modules/next is missing.", "Use Repair dependencies or run npm install."),
    pkg.scripts.dev && pkg.scripts.build && pkg.scripts.lint
      ? check("scripts", "Project scripts", "pass", "Development, build, and lint scripts are available.")
      : check("scripts", "Project scripts", "warning", "One or more expected npm scripts are missing.", "Review package.json with Orion."),
    envFile
      ? check("env", "Private environment file", "pass", ".env.local is present. Secret values were not inspected.")
      : check("env", "Private environment file", "warning", ".env.local was not found.", "Copy your private .env.local into the RoyalOS project root."),
    openAiConfigured
      ? check("openai", "OpenAI connection", "pass", "OPENAI_API_KEY is available to the server.")
      : check("openai", "OpenAI connection", "warning", "OPENAI_API_KEY is not configured.", "Add OPENAI_API_KEY to .env.local and restart RoyalOS."),
    supabaseConfigured
      ? check("supabase", "Supabase connection", "pass", "Supabase server configuration is available.")
      : check("supabase", "Supabase connection", "warning", "Supabase server configuration is incomplete.", "Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local."),
    migrationsPresent
      ? check("migrations", "Database migrations", "pass", "Supabase migration files are present.")
      : check("migrations", "Database migrations", "warning", "No Supabase migrations directory was found.", "Restore the supabase/migrations folder."),
    runtimeErrors.length === 0
      ? check("runtime", "Captured runtime errors", "pass", "No browser runtime errors have been captured by System Care.")
      : check("runtime", "Captured runtime errors", "warning", `${runtimeErrors.length} recent runtime error(s) are available for investigation.`, "Assign the latest issue to Orion and Sentinel."),
  ];
}

async function runCommand(
  command: string,
  args: string[],
  timeout: number,
): Promise<{ ok: boolean; output: string }> {
  const executable = process.platform === "win32" ? `${command}.cmd` : command;
  try {
    const result = await execFileAsync(executable, args, {
      cwd: root(),
      timeout,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, CI: "1" },
    });
    return { ok: true, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() };
  } catch (error) {
    const detail = error as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      output: `${detail.stdout ?? ""}\n${detail.stderr ?? ""}\n${detail.message ?? "Command failed."}`.trim(),
    };
  }
}

async function verifyCode(): Promise<SystemCheck[]> {
  const typeCheck = await runCommand("npx", ["tsc", "--noEmit"], 120_000);
  const lint = await runCommand("npm", ["run", "lint"], 180_000);
  return [
    typeCheck.ok
      ? check("typescript", "TypeScript verification", "pass", "TypeScript completed without errors.")
      : check("typescript", "TypeScript verification", "fail", typeCheck.output.slice(-4000), "Assign the errors to Orion."),
    lint.ok
      ? check("lint", "ESLint verification", "pass", "ESLint completed without errors.")
      : check("lint", "ESLint verification", "fail", lint.output.slice(-4000), "Assign the errors to Orion."),
  ];
}

async function countFiles(directory: string): Promise<number> {
  let count = 0;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) count += await countFiles(full);
    else count += 1;
  }
  return count;
}

async function createRestorePoint(): Promise<RestorePoint> {
  await ensureSystemDirectories();
  const id = `restore-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const destination = systemPath("backups", id);
  await mkdir(destination, { recursive: true });
  const include = [
    "app",
    "components",
    "lib",
    "supabase",
    "Knowledge",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    ".env.example",
  ];
  for (const item of include) {
    const source = path.join(root(), item);
    if (!(await exists(source))) continue;
    await cp(source, path.join(destination, item), { recursive: true, force: true });
  }
  const point: RestorePoint = {
    id,
    path: path.relative(root(), destination),
    createdAt: new Date().toISOString(),
    fileCount: await countFiles(destination),
  };
  await writeJson(path.join(destination, "restore-point.json"), point);
  return point;
}

async function restoreLast(): Promise<RestorePoint> {
  const points = await listRestorePoints();
  const latest = points[0];
  if (!latest) throw new Error("No restore point is available.");
  const source = path.join(root(), latest.path);
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "restore-point.json") continue;
    await cp(path.join(source, entry.name), path.join(root(), entry.name), {
      recursive: true,
      force: true,
    });
  }
  return latest;
}

export async function inspectSystem(): Promise<SystemMaintenanceSnapshot> {
  const pkg = await packageInfo();
  const checks = await quickScan();
  const logs = await readJsonArray<SystemMaintenanceLog>(systemPath(LOG_FILE));
  const restorePoints = await listRestorePoints();
  const attention = checks.some((item) => item.status === "fail" || item.status === "warning");
  return {
    engine: attention ? "attention" : "active",
    connected: true,
    projectRoot: root(),
    appVersion: pkg.version,
    nodeVersion: process.version,
    checks,
    logs,
    restorePoints,
    lastScanAt: new Date().toISOString(),
  };
}

export async function performMaintenanceAction(
  action: SystemMaintenanceAction,
  confirmation?: string,
): Promise<{ message: string; checks?: SystemCheck[]; detail?: string }> {
  if (action === "quick_scan") {
    const checks = await quickScan();
    await appendMaintenanceLog({ action, status: checks.some((item) => item.status === "fail") ? "warning" : "success", summary: "Quick system scan completed." });
    return { message: "Quick system scan completed.", checks };
  }
  if (action === "verify_code") {
    const checks = await verifyCode();
    const failed = checks.some((item) => item.status === "fail");
    await appendMaintenanceLog({ action, status: failed ? "error" : "success", summary: failed ? "Code verification found errors." : "Code verification passed." });
    return { message: failed ? "Code verification found errors." : "Code verification passed.", checks };
  }
  if (action === "safe_repair") {
    await ensureSystemDirectories();
    await rm(path.join(root(), ".next", "cache"), { recursive: true, force: true });
    await appendMaintenanceLog({ action, status: "success", summary: "Safe repair completed.", detail: "Runtime directories were created and the Next.js cache was cleared. Restart RoyalOS if the current page is stale." });
    return { message: "Safe repair completed. Restart RoyalOS if the current page is stale." };
  }
  if (action === "clear_build_cache") {
    await rm(path.join(root(), ".next", "cache"), { recursive: true, force: true });
    await appendMaintenanceLog({ action, status: "success", summary: "Next.js cache cleared." });
    return { message: "Next.js cache cleared. Restart npm run dev." };
  }
  if (action === "repair_dependencies") {
    const result = await runCommand("npm", ["install"], 300_000);
    await appendMaintenanceLog({ action, status: result.ok ? "success" : "error", summary: result.ok ? "Dependencies repaired." : "Dependency repair failed.", detail: result.output.slice(-8000) });
    if (!result.ok) throw new Error(result.output.slice(-4000));
    return { message: "Dependencies repaired successfully.", detail: result.output.slice(-4000) };
  }
  if (action === "create_restore_point") {
    const point = await createRestorePoint();
    await appendMaintenanceLog({ action, status: "success", summary: `Restore point ${point.id} created.`, detail: `${point.fileCount} files protected.` });
    return { message: `Restore point created with ${point.fileCount} protected files.` };
  }
  if (action === "restore_last") {
    if (confirmation !== "RESTORE") throw new Error("Type RESTORE to confirm rollback.");
    const point = await restoreLast();
    await appendMaintenanceLog({ action, status: "warning", summary: `Restored ${point.id}.`, detail: "Restart RoyalOS before continuing." });
    return { message: `Restored ${point.id}. Restart RoyalOS.` };
  }
  if (action === "generate_report") {
    const snapshot = await inspectSystem();
    const name = `system-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const target = systemPath("reports", name);
    await writeJson(target, snapshot);
    await appendMaintenanceLog({ action, status: "success", summary: "System diagnostic report generated.", detail: path.relative(root(), target) });
    return { message: "System report generated.", detail: path.relative(root(), target) };
  }
  throw new Error("Unsupported maintenance action.");
}
