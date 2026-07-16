"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/system/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack, source: "app-error-boundary", pathname: window.location.pathname }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#06090f", color: "#edf3f9", padding: 24 }}>
      <section style={{ maxWidth: 620, border: "1px solid rgba(231,184,79,.28)", borderRadius: 22, padding: 28, background: "#0c1119" }}>
        <p style={{ color: "#e7b84f", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>RoyalOS System Care</p>
        <h1>The software reported a problem</h1>
        <p>{error.message}</p>
        <p style={{ color: "#96a3b5" }}>The issue was captured for Orion and Sentinel. Try the page again, then open System Care for diagnostics if it returns.</p>
        <button type="button" onClick={reset} style={{ padding: "11px 16px", borderRadius: 10, border: 0, background: "#e7b84f", color: "#15100a", fontWeight: 800 }}>Try again</button>
      </section>
    </main>
  );
}
