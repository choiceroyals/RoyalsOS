"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import CompanyRecordsLibrary from "@/components/reports/CompanyRecordsLibrary";
import { MICHAEL_P_APPROVAL_RULES } from "@/lib/finance/michaelP";
import styles from "./MichaelPRecordsCenter.module.css";

type RecordItem = {
  id: string;
  name: string;
  type: "folder" | "document" | "file";
  parentId: string | null;
  mimeType?: string;
  sizeBytes?: number;
  content?: string;
  tags: string[];
  status: "active" | "trash";
  createdAt: string;
  updatedAt: string;
  versions?: Array<{ id: string; content: string; createdAt: string }>;
};

type View = "files" | "trash" | "company-pdfs";

function formatSize(size?: number) {
  if (!size) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function MichaelPRecordsCenter() {
  const [view, setView] = useState<View>("files");
  const [items, setItems] = useState<RecordItem[]>([]);
  const [folderStack, setFolderStack] = useState<Array<{ id: string | null; name: string }>>([{ id: null, name: "Company Files" }]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const currentFolder = folderStack[folderStack.length - 1];

  async function load() {
    if (view === "company-pdfs") return;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (currentFolder.id) params.set("parentId", currentFolder.id);
      if (view === "trash") params.set("status", "trash");
      if (search.trim()) params.set("q", search.trim());
      const response = await fetch(`/api/records?${params}`, { cache: "no-store" });
      const data = await response.json() as { items?: RecordItem[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not load records.");
      setItems(data.items ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load records."); }
    finally { setLoading(false); }
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [currentFolder.id, view]);

  const metrics = useMemo(() => ({ folders: items.filter((item) => item.type === "folder").length, documents: items.filter((item) => item.type !== "folder").length, trash: view === "trash" ? items.length : 0 }), [items, view]);

  async function createItem(event: FormEvent<HTMLFormElement>, type: "folder" | "document") {
    event.preventDefault(); const form = new FormData(event.currentTarget); const name = String(form.get("name") ?? "").trim(); if (!name) return;
    const response = await fetch("/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, name, parentId: currentFolder.id }) });
    const data = await response.json() as { error?: string }; if (!response.ok) { setError(data.error || "Could not create item."); return; }
    setNotice(type === "folder" ? "Folder created." : "Document created and ready to edit."); event.currentTarget.reset(); await load();
  }

  async function upload(file: File | null) {
    if (!file) return; const form = new FormData(); form.set("file", file); if (currentFolder.id) form.set("parentId", currentFolder.id);
    const response = await fetch("/api/records", { method: "POST", body: form }); const data = await response.json() as { error?: string };
    if (!response.ok) { setError(data.error || "Upload failed."); return; } setNotice(`${file.name} was added to Michael P Records.`); await load();
  }

  async function patch(id: string, changes: Record<string, unknown>) {
    const response = await fetch("/api/records", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...changes }) });
    const data = await response.json() as { error?: string }; if (!response.ok) { setError(data.error || "Update failed."); return false; } await load(); return true;
  }

  async function permanentDelete(id: string) {
    if (!window.confirm("Permanently delete this item and anything inside it? This cannot be undone.")) return;
    const response = await fetch(`/api/records?id=${encodeURIComponent(id)}`, { method: "DELETE" }); const data = await response.json() as { error?: string };
    if (!response.ok) { setError(data.error || "Delete failed."); return; } setNotice("Item permanently deleted."); await load();
  }

  function openItem(item: RecordItem) {
    if (item.type === "folder") { setFolderStack((stack) => [...stack, { id: item.id, name: item.name }]); return; }
    if (item.type === "file") { window.open(`/api/records/file?id=${encodeURIComponent(item.id)}`, "_blank", "noopener,noreferrer"); return; }
    setEditing(item); setEditorContent(item.content ?? "");
  }

  async function saveDocument() {
    if (!editing) return; if (await patch(editing.id, { content: editorContent })) { setNotice("Document saved with version history."); setEditing(null); }
  }

  return <div className={styles.center}>
    <section className={styles.hero}><div className={styles.identity}><div className={styles.avatar}>MP</div><div><span className={styles.eyebrow}>RoyalOS Records & Bookkeeping</span><h1>Michael P Drive</h1><p>Create folders, write company documents, upload records, maintain versions, and organize bookkeeping files in one controlled workspace.</p></div></div><span className={styles.status}>● Records service online</span></section>

    <section className={styles.metrics}><article><strong>{metrics.folders}</strong><span>Folders in view</span></article><article><strong>{metrics.documents}</strong><span>Files and documents</span></article><article><strong>{folderStack.length - 1}</strong><span>Folder depth</span></article><article><strong>{metrics.trash}</strong><span>Items in Trash</span></article></section>

    <div className={styles.tabs}><button className={view === "files" ? styles.activeTab : ""} onClick={() => setView("files")}>My Drive</button><button className={view === "company-pdfs" ? styles.activeTab : ""} onClick={() => setView("company-pdfs")}>Company PDFs</button><button className={view === "trash" ? styles.activeTab : ""} onClick={() => { setFolderStack([{ id: null, name: "Company Files" }]); setView("trash"); }}>Trash</button></div>

    {notice ? <div className={styles.notice}>{notice}<button onClick={() => setNotice("")}>×</button></div> : null}{error ? <div className={styles.error}>{error}<button onClick={() => setError("")}>×</button></div> : null}

    {view === "company-pdfs" ? <CompanyRecordsLibrary /> : <section className={styles.drive}>
      <div className={styles.toolbar}>
        <form onSubmit={(event) => createItem(event, "folder")}><input name="name" placeholder="New folder name" /><button type="submit">＋ Folder</button></form>
        <form onSubmit={(event) => createItem(event, "document")}><input name="name" placeholder="New document name" /><button type="submit">＋ Document</button></form>
        <label className={styles.uploadButton}>⇧ Upload<input type="file" onChange={(event) => { void upload(event.target.files?.[0] ?? null); event.target.value = ""; }} /></label>
        <div className={styles.search}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search files and tags…" /><button onClick={() => void load()}>Search</button></div>
      </div>

      <div className={styles.breadcrumb}>{folderStack.map((folder, index) => <button key={`${folder.id}-${index}`} onClick={() => setFolderStack((stack) => stack.slice(0, index + 1))}>{folder.name}{index < folderStack.length - 1 ? " /" : ""}</button>)}</div>

      <div className={styles.tableHeader}><span>Name</span><span>Type</span><span>Updated</span><span>Size</span><span>Actions</span></div>
      <div className={styles.fileList}>{loading ? <p>Loading company files…</p> : items.length === 0 ? <p className={styles.muted}>This folder is empty.</p> : items.map((item) => <article className={styles.fileRow} key={item.id}>
        <button className={styles.fileName} onClick={() => openItem(item)}><span className={styles.fileIcon}>{item.type === "folder" ? "▣" : item.type === "document" ? "▤" : "◫"}</span><span><strong>{item.name}</strong><small>{item.tags.join(", ") || (item.type === "document" ? `${item.versions?.length ?? 0} saved versions` : "Michael P record")}</small></span></button>
        <span>{item.type}</span><span>{new Date(item.updatedAt).toLocaleDateString()}</span><span>{formatSize(item.sizeBytes)}</span>
        <div className={styles.rowActions}><button onClick={() => openItem(item)}>Open</button>{view === "trash" ? <><button onClick={() => void patch(item.id, { action: "restore" })}>Restore</button><button className={styles.danger} onClick={() => void permanentDelete(item.id)}>Delete forever</button></> : <><button onClick={() => { const name = window.prompt("Rename item", item.name); if (name?.trim()) void patch(item.id, { name }); }}>Rename</button><button className={styles.danger} onClick={() => void patch(item.id, { action: "trash" })}>Trash</button></>}</div>
      </article>)}</div>
    </section>}

    <section className={styles.rules}><h2>Approval and safety rules</h2><div>{MICHAEL_P_APPROVAL_RULES.map((rule) => <span key={rule}>✓ {rule}</span>)}</div></section>

    {editing ? <div className={styles.modalBackdrop} role="dialog" aria-modal="true"><section className={styles.editor}><header><div><span className={styles.eyebrow}>Editable company document</span><h2>{editing.name}</h2></div><button onClick={() => setEditing(null)}>×</button></header><textarea value={editorContent} onChange={(event) => setEditorContent(event.target.value)} placeholder="Type company records, bookkeeping notes, policies, reports, or structured information here…" /><footer><small>{editing.versions?.length ?? 0} previous versions preserved</small><div><button onClick={() => setEditing(null)}>Cancel</button><button className={styles.primary} onClick={() => void saveDocument()}>Save document</button></div></footer></section></div> : null}
  </div>;
}
