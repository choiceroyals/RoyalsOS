import "server-only";

import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";

import { ROYALOS_PLUGIN_CATALOG } from "./catalog";
import { royalOSPluginManifestSchema } from "./schema";
import type { InstalledRoyalOSPlugin, RoyalOSPluginManifest } from "./types";

const ROOT = path.join(process.cwd(), "data", "plugins");
const PACKAGES = path.join(ROOT, "packages");
const REGISTRY = path.join(ROOT, "registry.json");
const MAX_ZIP_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".json", ".md", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".css", ".html"]);

function supportsRoyalOSV3(range: string) {
  const normalized = range.trim().toLowerCase();
  return normalized === "*" || normalized === "3" || normalized.startsWith("3.") || normalized.includes(">=3") || normalized.includes("^3") || normalized.includes("~3");
}

async function marketplaceCatalog(): Promise<RoyalOSPluginManifest[]> {
  const remoteUrl = process.env.ROYALOS_MARKETPLACE_URL?.trim();
  if (!remoteUrl) return ROYALOS_PLUGIN_CATALOG;
  try {
    const url = new URL(remoteUrl);
    if (url.protocol !== "https:") return ROYALOS_PLUGIN_CATALOG;
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return ROYALOS_PLUGIN_CATALOG;
    const payload = await response.json() as unknown;
    const raw = Array.isArray(payload) ? payload : (payload as { plugins?: unknown[] })?.plugins;
    if (!Array.isArray(raw)) return ROYALOS_PLUGIN_CATALOG;
    const remote = raw.flatMap((item) => {
      const parsed = royalOSPluginManifestSchema.safeParse(item);
      return parsed.success ? [parsed.data as RoyalOSPluginManifest] : [];
    });
    const byId = new Map<string, RoyalOSPluginManifest>();
    [...ROYALOS_PLUGIN_CATALOG, ...remote].forEach((item) => byId.set(item.id, item));
    return [...byId.values()];
  } catch {
    return ROYALOS_PLUGIN_CATALOG;
  }
}

async function ensureStorage() {
  await fs.mkdir(PACKAGES, { recursive: true });
  try {
    await fs.access(REGISTRY);
  } catch {
    const now = new Date().toISOString();
    const seeded: InstalledRoyalOSPlugin[] = ROYALOS_PLUGIN_CATALOG.map((manifest) => ({
      manifest,
      enabled: true,
      source: "marketplace",
      installedAt: now,
      updatedAt: now,
    }));
    await fs.writeFile(REGISTRY, JSON.stringify(seeded, null, 2), "utf8");
  }
}

export async function readInstalledPlugins(): Promise<InstalledRoyalOSPlugin[]> {
  await ensureStorage();
  try {
    const raw = JSON.parse(await fs.readFile(REGISTRY, "utf8")) as InstalledRoyalOSPlugin[];
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

async function writeInstalledPlugins(plugins: InstalledRoyalOSPlugin[]) {
  await ensureStorage();
  const temp = `${REGISTRY}.tmp`;
  await fs.writeFile(temp, JSON.stringify(plugins, null, 2), "utf8");
  await fs.rename(temp, REGISTRY);
}

function pluginHealth(plugin: InstalledRoyalOSPlugin): InstalledRoyalOSPlugin["lastHealthCheck"] {
  if (!plugin.enabled) return { status: "disabled", message: "Plugin is installed but disabled.", checkedAt: new Date().toISOString() };
  const required = new Set([
    ...(plugin.manifest.requiredEnvironment ?? []),
    ...(plugin.manifest.actions ?? []).flatMap((action) => [
      ...(action.requiredEnvironment ?? []),
      ...(action.authEnvironment ? [action.authEnvironment] : []),
    ]),
  ]);
  const missing = [...required].filter((name) => !process.env[name]?.trim());
  return missing.length
    ? { status: "setup_required", message: `Add ${missing.join(", ")} to .env.local, then restart RoyalOS.`, checkedAt: new Date().toISOString() }
    : { status: "healthy", message: "Manifest, permissions, and required configuration passed the health check.", checkedAt: new Date().toISOString() };
}

export async function getPluginOverview() {
  const installed = await readInstalledPlugins();
  const checked = installed.map((plugin) => ({ ...plugin, lastHealthCheck: pluginHealth(plugin) }));
  if (JSON.stringify(installed) !== JSON.stringify(checked)) await writeInstalledPlugins(checked);
  return { catalog: await marketplaceCatalog(), installed: checked };
}

export async function installCatalogPlugin(id: string): Promise<InstalledRoyalOSPlugin> {
  const manifest = (await marketplaceCatalog()).find((item) => item.id === id);
  if (!manifest) throw new Error("Marketplace plugin was not found.");
  const installed = await readInstalledPlugins();
  const existing = installed.find((item) => item.manifest.id === id);
  if (existing) return existing;
  const now = new Date().toISOString();
  const plugin: InstalledRoyalOSPlugin = { manifest, enabled: true, source: "marketplace", installedAt: now, updatedAt: now };
  plugin.lastHealthCheck = pluginHealth(plugin);
  await writeInstalledPlugins([plugin, ...installed]);
  return plugin;
}

export async function setPluginEnabled(id: string, enabled: boolean) {
  const installed = await readInstalledPlugins();
  let updated: InstalledRoyalOSPlugin | undefined;
  const next = installed.map((plugin) => {
    if (plugin.manifest.id !== id) return plugin;
    updated = { ...plugin, enabled, updatedAt: new Date().toISOString() };
    updated.lastHealthCheck = pluginHealth(updated);
    return updated;
  });
  if (!updated) throw new Error("Installed plugin was not found.");
  await writeInstalledPlugins(next);
  return updated;
}

export async function uninstallPlugin(id: string) {
  const installed = await readInstalledPlugins();
  const target = installed.find((plugin) => plugin.manifest.id === id);
  if (!target) throw new Error("Installed plugin was not found.");
  if (target.packagePath) {
    const full = path.resolve(process.cwd(), target.packagePath);
    if (full.startsWith(path.resolve(PACKAGES))) await fs.rm(full, { recursive: true, force: true });
  }
  await writeInstalledPlugins(installed.filter((plugin) => plugin.manifest.id !== id));
}

function findManifestEntry(zip: AdmZip) {
  const matches = zip.getEntries().filter((entry) => !entry.isDirectory && /(^|\/)royalos-plugin\.json$/i.test(entry.entryName));
  if (matches.length !== 1) throw new Error("The ZIP must contain exactly one royalos-plugin.json file.");
  return matches[0];
}

function validateEntries(zip: AdmZip, manifestDir: string) {
  for (const entry of zip.getEntries()) {
    const normalized = entry.entryName.replace(/\\/g, "/");
    if (normalized.includes("../") || normalized.startsWith("/") || normalized.includes("\0")) throw new Error("The ZIP contains an unsafe path.");
    if (entry.isDirectory) continue;
    if (!normalized.startsWith(manifestDir)) throw new Error("All plugin files must be inside the manifest folder.");
    const ext = path.extname(normalized).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error(`Unsupported plugin file type: ${ext || "no extension"}. RoyalOS V3 accepts declarative plugins only.`);
  }
}

export async function installUploadedPlugin(bytes: Buffer): Promise<InstalledRoyalOSPlugin> {
  if (!bytes.length || bytes.length > MAX_ZIP_BYTES) throw new Error("Plugin ZIP must be between 1 byte and 25 MB.");
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const zip = new AdmZip(bytes);
  const manifestEntry = findManifestEntry(zip);
  const manifestDir = manifestEntry.entryName.slice(0, -"royalos-plugin.json".length);
  validateEntries(zip, manifestDir);
  const manifest = royalOSPluginManifestSchema.parse(JSON.parse(manifestEntry.getData().toString("utf8"))) as RoyalOSPluginManifest;
  if (!supportsRoyalOSV3(manifest.royalosVersion)) {
    throw new Error(`This plugin requires RoyalOS ${manifest.royalosVersion}. Upload a plugin compatible with RoyalOS V3.`);
  }
  const installed = await readInstalledPlugins();
  if (installed.some((plugin) => plugin.manifest.id === manifest.id)) throw new Error("A plugin with this ID is already installed. Uninstall it before uploading a replacement.");
  const target = path.join(PACKAGES, manifest.id);
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const relative = entry.entryName.slice(manifestDir.length);
    const destination = path.join(target, relative);
    const resolved = path.resolve(destination);
    if (!resolved.startsWith(path.resolve(target))) throw new Error("Unsafe plugin extraction path.");
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, entry.getData());
  }
  const now = new Date().toISOString();
  const plugin: InstalledRoyalOSPlugin = {
    manifest,
    enabled: true,
    source: "upload",
    installedAt: now,
    updatedAt: now,
    packagePath: path.relative(process.cwd(), target),
    checksum,
  };
  plugin.lastHealthCheck = pluginHealth(plugin);
  await writeInstalledPlugins([plugin, ...installed]);
  return plugin;
}

export async function enabledPluginCapabilities() {
  const installed = await readInstalledPlugins();
  return installed.filter((plugin) => plugin.enabled).flatMap((plugin) =>
    (plugin.manifest.assignedEmployees ?? []).map((employee) => ({
      pluginId: plugin.manifest.id,
      pluginName: plugin.manifest.name,
      employee,
      capabilities: plugin.manifest.capabilities,
      health: pluginHealth(plugin),
    })),
  );
}

export async function getInstalledPlugin(id: string) {
  const installed = await readInstalledPlugins();
  return installed.find((plugin) => plugin.manifest.id === id);
}
