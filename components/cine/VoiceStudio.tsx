"use client";

import { useState } from "react";
import styles from "./CineWorkspace.module.css";

export default function VoiceStudio() {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("TD Talk podcast narration");
  const [voiceId, setVoiceId] = useState("");
  const [quality, setQuality] = useState<"standard" | "premium">("premium");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [cloneName, setCloneName] = useState("");
  const [cloneFiles, setCloneFiles] = useState<FileList | null>(null);
  const [consent, setConsent] = useState(false);

  async function generateAudio() {
    setBusy(true); setMessage(""); setAudioUrl("");
    try {
      const response = await fetch("/api/cine/audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, title, voiceId, quality }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Audio generation failed.");
      setAudioUrl(data.url); setMessage(`${quality === "premium" ? "Premium" : "Standard"} audio generated in ${data.chunks} section(s).`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Audio generation failed."); }
    finally { setBusy(false); }
  }

  async function cloneVoice() {
    if (!cloneFiles?.length) { setMessage("Choose at least one authorized voice sample."); return; }
    setBusy(true); setMessage("");
    try {
      const form = new FormData(); form.set("name", cloneName); form.set("consent", String(consent));
      Array.from(cloneFiles).forEach((file) => form.append("files", file));
      const response = await fetch("/api/cine/voice-clone", { method: "POST", body: form });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Voice cloning failed.");
      setVoiceId(data.voiceId); setMessage(`Authorized voice created. Voice ID: ${data.voiceId}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Voice cloning failed."); }
    finally { setBusy(false); }
  }

  return <div className={styles.toolPage}>
    <div className={styles.pageHeader}><div><span className={styles.eyebrow}>Cine Voice Studio</span><h2>Text to audio and podcast production</h2><p>Create long-form narration with a clear Standard/Premium quality choice.</p></div></div>
    <section className={styles.panel}>
      <div className={styles.fieldGrid}>
        <label>Project title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Quality<select value={quality} onChange={(e) => setQuality(e.target.value as "standard" | "premium")}><option value="standard">Standard — CapCut when officially configured</option><option value="premium">Premium — ElevenLabs</option></select></label>
        <label>Voice ID <small>(blank uses brand default)</small><input value={voiceId} onChange={(e) => setVoiceId(e.target.value)} placeholder="Optional ElevenLabs voice ID" /></label>
      </div>
      <label>Script<textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a TD Talk episode, narration, audiobook, or campaign script. Long scripts are split into safe sections automatically." /></label>
      <div className={styles.actionRow}><button className={styles.primary} disabled={busy || !text.trim()} onClick={generateAudio}>{busy ? "Generating…" : "Generate audio"}</button><span>{text.length.toLocaleString()} characters</span></div>
      {audioUrl && <audio className={styles.audio} controls src={audioUrl} />}
    </section>
    <section className={styles.panel}>
      <h3>Authorized Voice Lab</h3><p>Only clone your own voice or a voice you have explicit permission to use.</p>
      <div className={styles.fieldGrid}><label>Voice name<input value={cloneName} onChange={(e) => setCloneName(e.target.value)} /></label><label>Voice samples<input type="file" accept="audio/*" multiple onChange={(e) => setCloneFiles(e.target.files)} /></label></div>
      <label className={styles.check}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I confirm I own this voice or have explicit permission to clone and use it.</label>
      <button className={styles.secondary} disabled={busy || !consent || !cloneName.trim()} onClick={cloneVoice}>Create authorized voice</button>
    </section>
    {message && <div className={styles.notice}>{message}</div>}
  </div>;
}
