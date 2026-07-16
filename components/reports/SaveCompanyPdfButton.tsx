"use client";

import { useMemo, useState } from "react";
import type { RoyalOSWorkspace } from "@/lib/missions/types";

type SavedRecord = {
  recordId: string;
  title: string;
  url: string;
  storageMode: "supabase" | "local";
  createdAt: string;
};

export default function SaveCompanyPdfButton({
  content,
  workspace,
  employee,
  defaultTitle,
  missionId,
  conversationId,
  sources = [],
  compact = false,
}: {
  content: string;
  workspace: RoyalOSWorkspace;
  employee: string;
  defaultTitle: string;
  missionId?: string;
  conversationId?: string;
  sources?: string[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [tagsText, setTagsText] = useState("research, company record");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [record, setRecord] = useState<SavedRecord | null>(null);

  const tags = useMemo(
    () => Array.from(new Set(tagsText.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))).slice(0, 20),
    [tagsText],
  );

  async function save() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/reports/company-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || defaultTitle,
          content,
          workspace,
          employee,
          missionId,
          conversationId,
          sources,
          tags,
        }),
      });
      const data = (await response.json()) as { record?: SavedRecord; error?: string };
      if (!response.ok || !data.record) throw new Error(data.error || "RoyalOS could not save this company PDF.");
      setRecord(data.record);
      setOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "RoyalOS could not save this company PDF.");
    } finally {
      setLoading(false);
    }
  }

  if (record) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <span style={{ color: "#70ddb0", fontSize: 12, fontWeight: 800 }}>✓ Saved to Company Records</span>
        <a href={record.url} target="_blank" rel="noreferrer" style={{ color: "#9dc9ff", fontSize: 12, fontWeight: 750 }}>Open PDF</a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: compact ? 8 : 12 }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          padding: compact ? "7px 10px" : "9px 12px",
          borderRadius: 10,
          border: "1px solid rgba(246,202,98,.28)",
          background: "rgba(246,202,98,.08)",
          color: "#f6d47d",
          fontSize: 12,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        ▤ Save as Company PDF
      </button>

      {open ? (
        <div style={{ marginTop: 10, padding: 13, borderRadius: 13, background: "rgba(7,12,20,.96)", border: "1px solid rgba(255,255,255,.1)", display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6, color: "rgba(255,255,255,.72)", fontSize: 12, fontWeight: 750 }}>
            Report title
            <input value={title} onChange={(event) => setTitle(event.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "10px 11px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.045)", color: "#fff", outline: "none" }} />
          </label>
          <label style={{ display: "grid", gap: 6, color: "rgba(255,255,255,.72)", fontSize: 12, fontWeight: 750 }}>
            Tags
            <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="research, marketing, competitor" style={{ width: "100%", boxSizing: "border-box", padding: "10px 11px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.045)", color: "#fff", outline: "none" }} />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void save()} disabled={loading} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(112,221,176,.3)", background: "rgba(112,221,176,.1)", color: "#8cf0c4", fontWeight: 850, cursor: loading ? "wait" : "pointer" }}>
              {loading ? "Creating PDF…" : "Create and Save PDF"}
            </button>
            <button type="button" onClick={() => setOpen(false)} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
          </div>
          {error ? <div style={{ color: "#ff9aa5", fontSize: 12 }}>{error}</div> : null}
          <small style={{ color: "rgba(255,255,255,.42)", lineHeight: 1.5 }}>
            RoyalOS stores the original report and a branded PDF under {workspace} Company Records. Supabase is used when configured; otherwise a local company-record copy is created.
          </small>
        </div>
      ) : null}
    </div>
  );
}
