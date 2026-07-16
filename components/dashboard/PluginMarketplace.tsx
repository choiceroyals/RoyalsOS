"use client";

import { useEffect, useMemo, useState } from "react";
import type { InstalledRoyalOSPlugin, RoyalOSPluginManifest } from "@/lib/plugins/types";
import styles from "./PluginMarketplace.module.css";

type Tab = "marketplace" | "installed" | "upload";

type Payload = { catalog?: RoyalOSPluginManifest[]; installed?: InstalledRoyalOSPlugin[]; error?: string };

export default function PluginMarketplace() {
  const [tab, setTab] = useState<Tab>("marketplace");
  const [catalog, setCatalog] = useState<RoyalOSPluginManifest[]>([]);
  const [installed, setInstalled] = useState<InstalledRoyalOSPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [actionOutput, setActionOutput] = useState("");
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/plugins", { cache: "no-store" });
      const data = await response.json() as Payload;
      if (!response.ok) throw new Error(data.error || "Could not load plugins.");
      setCatalog(data.catalog ?? []); setInstalled(data.installed ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load plugins."); }
    finally { setLoading(false); }
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  const installedIds = useMemo(() => new Set(installed.map((plugin) => plugin.manifest.id)), [installed]);
  const filteredCatalog = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return catalog;
    return catalog.filter((plugin) => [plugin.name, plugin.description, plugin.category, ...(plugin.tags ?? []), ...plugin.capabilities].join(" ").toLowerCase().includes(value));
  }, [catalog, query]);

  async function action(id: string, nextAction: "install" | "enable" | "disable" | "uninstall") {
    if (nextAction === "uninstall" && !window.confirm("Uninstall this plugin? Its manifest registration and uploaded package will be removed.")) return;
    setBusy(id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/plugins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: nextAction }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Plugin action failed.");
      setNotice(nextAction === "install" ? "Plugin installed and registered." : nextAction === "uninstall" ? "Plugin uninstalled." : `Plugin ${nextAction}d.`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Plugin action failed."); }
    finally { setBusy(""); }
  }

  async function runPluginAction(plugin: InstalledRoyalOSPlugin, actionId: string) {
    const configuredAction = plugin.manifest.actions?.find((item) => item.id === actionId);
    if (!configuredAction) return;
    const input = window.prompt(`Instructions for ${configuredAction.label}`, "") ?? "";
    if (configuredAction.approvalRequired && !window.confirm("This action requires CEO approval. Approve and run it now?")) return;
    setBusy(`${plugin.manifest.id}:${actionId}`); setError(""); setNotice(""); setActionOutput("");
    try {
      const response = await fetch("/api/plugins/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginId: plugin.manifest.id, actionId, input, approved: configuredAction.approvalRequired === true }),
      });
      const data = await response.json() as { error?: string; url?: string; result?: unknown };
      if (!response.ok) throw new Error(data.error || "Plugin action failed.");
      if (data.url) { window.open(data.url, "_blank", "noopener,noreferrer"); setNotice("Plugin destination opened securely."); }
      else { setNotice(`${configuredAction.label} completed.`); setActionOutput(typeof data.result === "string" ? data.result : JSON.stringify(data.result, null, 2)); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Plugin action failed."); }
    finally { setBusy(""); }
  }

  async function upload() {
    if (!file) { setError("Choose a RoyalOS plugin ZIP first."); return; }
    setBusy("upload"); setError(""); setNotice("");
    const form = new FormData(); form.set("plugin", file);
    try {
      const response = await fetch("/api/plugins/upload", { method: "POST", body: form });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Plugin upload failed.");
      setFile(null); setNotice("Uploaded plugin passed validation, was installed, and is now registered with RoyalOS."); setTab("installed"); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Plugin upload failed."); }
    finally { setBusy(""); }
  }

  function pluginCard(plugin: InstalledRoyalOSPlugin) {
    const health = plugin.lastHealthCheck;
    return <article className={styles.card} key={plugin.manifest.id}>
      <div className={styles.cardTop}><div><span className={styles.category}>{plugin.manifest.category}</span><h3>{plugin.manifest.name}</h3><small className={styles.muted}>v{plugin.manifest.version} · {plugin.source}</small></div><span className={`${styles.health} ${health?.status === "setup_required" ? styles.setup : health?.status === "disabled" ? styles.disabled : ""}`}>{health?.status.replace("_", " ") ?? "unchecked"}</span></div>
      <p className={styles.muted}>{plugin.manifest.description}</p>
      <div className={styles.capabilities}>{plugin.manifest.capabilities.slice(0, 6).map((item) => <span className={styles.chip} key={item}>{item}</span>)}</div>
      <small className={styles.muted}>Employees: {(plugin.manifest.assignedEmployees ?? []).join(", ") || "Not assigned"}</small>
      {health?.message ? <small className={styles.muted}>{health.message}</small> : null}
      {plugin.enabled && health?.status === "healthy" && plugin.manifest.actions?.length ? <div className={styles.pluginActions}>{plugin.manifest.actions.map((configuredAction) => <button className={styles.button} key={configuredAction.id} disabled={busy === `${plugin.manifest.id}:${configuredAction.id}`} onClick={() => runPluginAction(plugin, configuredAction.id)}>{busy === `${plugin.manifest.id}:${configuredAction.id}` ? "Running…" : configuredAction.label}</button>)}</div> : null}
      <div className={styles.actions}><button className={styles.secondary} disabled={busy === plugin.manifest.id} onClick={() => action(plugin.manifest.id, plugin.enabled ? "disable" : "enable")}>{plugin.enabled ? "Disable" : "Enable"}</button><button className={styles.danger} disabled={busy === plugin.manifest.id} onClick={() => action(plugin.manifest.id, "uninstall")}>Uninstall</button></div>
    </article>;
  }

  return <div className={styles.shell}>
    <section className={styles.hero}><div><span className={styles.category}>RoyalOS Extension Platform</span><h1>Plugin Marketplace</h1><p>Install capability packs without editing application files. RoyalOS validates the manifest, permissions, compatibility, package paths, and configuration before registration.</p></div><span className={styles.badge}>{installed.filter((plugin) => plugin.enabled).length} enabled</span></section>
    <div className={styles.tabs}><button className={tab === "marketplace" ? styles.active : ""} onClick={() => setTab("marketplace")}>Marketplace</button><button className={tab === "installed" ? styles.active : ""} onClick={() => setTab("installed")}>Installed ({installed.length})</button><button className={tab === "upload" ? styles.active : ""} onClick={() => setTab("upload")}>Upload Plugin ZIP</button></div>
    {notice ? <div className={styles.notice}>{notice}</div> : null}{error ? <div className={styles.error}>{error}</div> : null}{actionOutput ? <section className={styles.output}><strong>Plugin output</strong><pre>{actionOutput}</pre></section> : null}
    {loading ? <section className={styles.panel}>Loading plugins…</section> : null}
    {!loading && tab === "marketplace" ? <section className={styles.panel}><div><h2>RoyalOS Marketplace</h2><p className={styles.muted}>Search official, uploaded, and optional remote marketplace plugins. External services still require their own credentials in .env.local.</p><input className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search authentication, security, backup, media…" /></div><div className={styles.grid}>{filteredCatalog.map((manifest) => <article className={styles.card} key={manifest.id}><div className={styles.cardTop}><div><span className={styles.category}>{manifest.category}</span><h3>{manifest.name}</h3><small className={styles.muted}>v{manifest.version} · {manifest.author}</small></div></div><p className={styles.muted}>{manifest.description}</p><div className={styles.capabilities}>{manifest.capabilities.slice(0, 6).map((item) => <span className={styles.chip} key={item}>{item}</span>)}</div><small className={styles.muted}>Permissions: {manifest.permissions.join(", ") || "None"}</small><div className={styles.actions}><button className={styles.button} disabled={installedIds.has(manifest.id) || busy === manifest.id} onClick={() => action(manifest.id, "install")}>{installedIds.has(manifest.id) ? "Installed" : "Install"}</button></div></article>)}</div></section> : null}
    {!loading && tab === "installed" ? <section className={styles.panel}><div><h2>Installed Plugins</h2><p className={styles.muted}>Enable, disable, inspect health, or uninstall registered capability packs.</p></div>{installed.length ? <div className={styles.grid}>{installed.map(pluginCard)}</div> : <p className={styles.muted}>No plugins installed yet.</p>}</section> : null}
    {tab === "upload" ? <section className={styles.panel}><div><h2>Upload a Plugin ZIP</h2><p className={styles.muted}>Like WordPress, RoyalOS accepts a ZIP package. V3 plugins are declarative and cannot run arbitrary JavaScript or terminal commands. The ZIP must contain one <strong>royalos-plugin.json</strong>.</p></div><div className={styles.upload}><input type="file" accept=".zip,application/zip" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><button className={styles.button} disabled={busy === "upload"} onClick={upload}>{busy === "upload" ? "Validating and installing…" : "Upload and install plugin"}</button></div><pre className={styles.manifestExample}>{`{
  "schemaVersion": 1,
  "id": "business.example-plugin",
  "name": "Example Business Plugin",
  "version": "1.0.0",
  "description": "Adds a useful business capability to RoyalOS.",
  "author": "Your Company",
  "category": "Productivity",
  "royalosVersion": ">=3.0.0",
  "permissions": ["missions:read"],
  "capabilities": ["Example capability"],
  "assignedEmployees": ["Adedeji"]
}`}</pre></section> : null}
  </div>;
}
