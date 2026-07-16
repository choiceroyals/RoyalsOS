"use client";

import { useEffect } from "react";

function report(input: { message: string; stack?: string; source?: string }) {
  void fetch("/api/system/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      pathname: window.location.pathname,
    }),
    keepalive: true,
  }).catch(() => undefined);
}

export default function SystemErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      report({
        message: event.message || "Unknown browser error",
        stack: event.error instanceof Error ? event.error.stack : undefined,
        source: event.filename,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      report({
        message: reason instanceof Error ? reason.message : String(reason ?? "Unhandled promise rejection"),
        stack: reason instanceof Error ? reason.stack : undefined,
        source: "unhandledrejection",
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
