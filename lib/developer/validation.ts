import "server-only";

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { getRoyalOSDeveloperSecurityPolicy } from "@/lib/developer/security";
import type { RoyalOSDeveloperValidationResult } from "@/lib/developer/types";

const MAX_OUTPUT_CHARACTERS = 200_000;

export const ROYALOS_ORION_VALIDATION_COMMANDS = [
  "npx tsc --noEmit",
  "npm run lint",
  "npm run build",
] as const;

function normalizeCommand(value: string): (typeof ROYALOS_ORION_VALIDATION_COMMANDS)[number] | null {
  const normalized = value.trim().replace(/\s+/g, " ");
  return ROYALOS_ORION_VALIDATION_COMMANDS.find((item) => item === normalized) ?? null;
}

function executableName(base: "npm" | "npx"): string {
  return process.platform === "win32" ? `${base}.cmd` : base;
}

async function hasPackageScript(scriptName: string): Promise<boolean> {
  try {
    const root = getRoyalOSDeveloperSecurityPolicy().projectRoot;
    const raw = await fs.readFile(path.join(root, "package.json"), "utf8");
    const packageJson = JSON.parse(raw) as { scripts?: Record<string, string> };
    return Boolean(packageJson.scripts?.[scriptName]);
  } catch {
    return false;
  }
}

async function commandSpec(command: string): Promise<{
  executable: string;
  args: string[];
  timeoutMs: number;
} | null> {
  const allowed = normalizeCommand(command);
  if (!allowed) return null;

  if (allowed === "npx tsc --noEmit") {
    return { executable: executableName("npx"), args: ["tsc", "--noEmit"], timeoutMs: 180_000 };
  }

  if (allowed === "npm run lint") {
    if (!(await hasPackageScript("lint"))) return null;
    return { executable: executableName("npm"), args: ["run", "lint"], timeoutMs: 180_000 };
  }

  if (!(await hasPackageScript("build"))) return null;
  return { executable: executableName("npm"), args: ["run", "build"], timeoutMs: 360_000 };
}

function appendLimited(current: string, chunk: Buffer | string): string {
  if (current.length >= MAX_OUTPUT_CHARACTERS) return current;
  return `${current}${chunk.toString()}`.slice(0, MAX_OUTPUT_CHARACTERS);
}

export async function runRoyalOSOrionValidationCommand(
  command: string,
): Promise<RoyalOSDeveloperValidationResult> {
  const startedAt = new Date();
  const spec = await commandSpec(command);

  if (!spec) {
    const completedAt = new Date();
    return {
      command,
      status: "blocked",
      exitCode: null,
      stdout: "",
      stderr: "The command is not in Orion's validation allowlist or its package script is unavailable.",
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };
  }

  return new Promise((resolve) => {
    const child = spawn(spec.executable, spec.args, {
      cwd: getRoyalOSDeveloperSecurityPolicy().projectRoot,
      env: { ...process.env, CI: "1", NEXT_TELEMETRY_DISABLED: "1" },
      shell: false,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    child.stdout.on("data", (chunk) => {
      stdout = appendLimited(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendLimited(stderr, chunk);
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, spec.timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      const completedAt = new Date();
      resolve({
        command,
        status: "failed",
        exitCode: null,
        stdout,
        stderr: appendLimited(stderr, error.message),
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const completedAt = new Date();
      resolve({
        command,
        status: timedOut ? "timed_out" : code === 0 ? "passed" : "failed",
        exitCode: code,
        stdout,
        stderr,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
      });
    });
  });
}

export async function runRoyalOSOrionValidationSuite(
  commands: string[],
): Promise<RoyalOSDeveloperValidationResult[]> {
  const unique = Array.from(new Set(commands.map((value) => value.trim()).filter(Boolean))).slice(0, 3);
  const results: RoyalOSDeveloperValidationResult[] = [];
  for (const command of unique) {
    results.push(await runRoyalOSOrionValidationCommand(command));
  }
  return results;
}
