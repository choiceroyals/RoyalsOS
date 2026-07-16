"use client";

import { useEffect, useMemo, useState } from "react";

type CompanyRecord = {
  recordId: string;
  title: string;
  workspace: string;
  employee: string;
  tags: string[];
  storageMode: "supabase" | "local";
  url: string;
  createdAt: string;
  sizeBytes: number;
  version: number;
};

function formatBytes(value: number): string {
  if (!value) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CompanyRecordsLibrary() {
  const [records, setRecords] = useState<CompanyRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/reports/company-pdf?limit=200", { cache: "no-store" });
      const data = (await response.json()) as { records?: CompanyRecord[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Company records could not be loaded.");
      setRecords(data.records ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Company records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Loading company records is the intended external synchronization for this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) =>
      `${record.title} ${record.workspace} ${record.employee} ${record.tags.join(" ")}`.toLowerCase().includes(query),
    );
  }, [records, search]);

  return (
    <section style={{ padding: 20, borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", background: "rgba(13,18,29,.88)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, color: "#fff" }}>Official company PDF records</h2>
          <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,.58)", lineHeight: 1.55 }}>
            Research, executive briefings, and employee reports saved through the reusable Company PDF action.
          </p>
        </div>
        <button type="button" onClick={() => void load()} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#fff", cursor: "pointer" }}>Refresh records</button>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search title, workspace, employee, or tag..."
        style={{ width: "100%", boxSizing: "border-box", marginTop: 14, padding: "11px 12px", borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#fff", outline: "none" }}
      />

      {error ? <div style={{ marginTop: 12, color: "#ff9aa5" }}>{error}</div> : null}
      {loading ? <p style={{ color: "rgba(255,255,255,.52)" }}>Loading company records…</p> : filtered.length === 0 ? <p style={{ color: "rgba(255,255,255,.52)" }}>No saved company PDFs match this view yet.</p> : (
        <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
          {filtered.map((record) => (
            <article key={record.recordId} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center", padding: 13, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ color: "#fff", overflowWrap: "anywhere" }}>{record.title}</strong>
                <div style={{ marginTop: 4, color: "rgba(255,255,255,.48)", fontSize: 12 }}>
                  {record.workspace} · {record.employee} · {new Date(record.createdAt).toLocaleString()} · {formatBytes(record.sizeBytes)} · {record.storageMode}
                </div>
                {record.tags.length ? <div style={{ marginTop: 6, color: "#f6d47d", fontSize: 11 }}>{record.tags.join(" · ")}</div> : null}
              </div>
              {record.url ? <a href={record.url} target="_blank" rel="noreferrer" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid rgba(116,185,255,.24)", color: "#9dc9ff", textDecoration: "none", fontSize: 12, fontWeight: 800 }}>Open PDF</a> : <span style={{ color: "rgba(255,255,255,.35)", fontSize: 12 }}>URL unavailable</span>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
