"use client";

import { useEffect, useState } from "react";
import styles from "./ProviderEquipmentSettings.module.css";

type Provider = { id: string; name: string; purpose: string; configured: boolean };

export default function ProviderEquipmentSettings() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cine", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { providers?: Provider[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Could not load provider equipment.");
        if (!cancelled) setProviders(data.providers ?? []);
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load provider equipment."); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div>
          <h2>Provider equipment</h2>
          <p>Central configuration status for image, video, voice, AI, rendering, and future plugin providers.</p>
        </div>
        <span>{providers.filter((provider) => provider.configured).length}/{providers.length || 6} ready</span>
      </div>
      {error ? <div className={styles.error}>{error}</div> : null}
      <div className={styles.list}>
        {providers.map((provider) => (
          <article key={provider.id}>
            <div><strong>{provider.name}</strong><p>{provider.purpose}</p></div>
            <span className={provider.configured ? styles.ready : styles.missing}>{provider.configured ? "Ready" : "Needs key"}</span>
          </article>
        ))}
      </div>
      <p className={styles.note}>Provider secrets remain in <code>.env.local</code>. Plugins may register additional providers without modifying Cine or Nova source files.</p>
    </section>
  );
}
