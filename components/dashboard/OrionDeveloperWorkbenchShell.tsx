"use client";

import { useState } from "react";

import OrionReadOnlyWorkbench from "./OrionDeveloperWorkbench";
import OrionCodeProposal from "./OrionCodeProposal";
import OrionOperationsHistory from "./OrionOperationsHistory";

type WorkbenchStage =
  | "read-only"
  | "proposal"
  | "operations";

export default function OrionDeveloperWorkbenchShell() {
  const [stage, setStage] =
    useState<WorkbenchStage>("read-only");

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
          gap: 8,
          padding: 8,
          borderRadius: 16,
          border:
            "1px solid rgba(255,255,255,0.08)",
          background:
            "rgba(10,15,24,0.86)",
        }}
      >
        <button
          type="button"
          onClick={() =>
            setStage("read-only")
          }
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border:
              stage === "read-only"
                ? "1px solid rgba(116,185,255,0.42)"
                : "1px solid transparent",
            background:
              stage === "read-only"
                ? "rgba(116,185,255,0.1)"
                : "transparent",
            color:
              stage === "read-only"
                ? "#9dc9ff"
                : "rgba(255,255,255,0.58)",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Inspect · Search · Plan
        </button>

        <button
          type="button"
          onClick={() =>
            setStage("proposal")
          }
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border:
              stage === "proposal"
                ? "1px solid rgba(246,202,98,0.42)"
                : "1px solid transparent",
            background:
              stage === "proposal"
                ? "rgba(246,202,98,0.1)"
                : "transparent",
            color:
              stage === "proposal"
                ? "#f6ca62"
                : "rgba(255,255,255,0.58)",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Code Proposal
        </button>

        <button
          type="button"
          onClick={() => setStage("operations")}
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: stage === "operations"
              ? "1px solid rgba(112,221,176,0.42)"
              : "1px solid transparent",
            background: stage === "operations"
              ? "rgba(112,221,176,0.1)"
              : "transparent",
            color: stage === "operations"
              ? "#8cf0c4"
              : "rgba(255,255,255,0.58)",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Execute · Validate · History
        </button>
      </section>

      {stage === "proposal" ? (
        <OrionCodeProposal />
      ) : stage === "operations" ? (
        <OrionOperationsHistory />
      ) : (
        <OrionReadOnlyWorkbench />
      )}
    </div>
  );
}