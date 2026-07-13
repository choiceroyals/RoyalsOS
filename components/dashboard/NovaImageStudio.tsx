"use client";

import {
  useState,
} from "react";

type RoyalAssetRecord = {
  id: string;
  title: string;
  fileName: string;
  originalFileName: string;
  kind:
    | "image"
    | "document"
    | "audio"
    | "video"
    | "other";
  source:
    | "upload"
    | "generated";
  mimeType: string;
  sizeBytes: number;
  publicUrl: string;
  relativePath: string;
  prompt?: string | null;
  createdAt: string;
};

type Props = {
  onAssetCreated?: () => void;
  onOpenGallery?: () => void;
};

export default function NovaImageStudio({
  onAssetCreated,
  onOpenGallery,
}: Props) {
  const [title, setTitle] =
    useState("");
  const [prompt, setPrompt] =
    useState("");
  const [size, setSize] =
    useState<
      | "1024x1024"
      | "1536x1024"
      | "1024x1536"
    >("1024x1024");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    result,
    setResult,
  ] =
    useState<RoyalAssetRecord | null>(
      null
    );

  async function handleGenerate() {
    setError("");

    if (!prompt.trim()) {
      setError(
        "Please enter a prompt for Nova."
      );
      return;
    }

    try {
      setLoading(true);

      const res =
        await fetch(
          "/api/tools/images/generate",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              title,
              prompt,
              size,
            }),
          }
        );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Nova generation failed."
        );
      }

      setResult(data.asset);
      onAssetCreated?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 20,
      }}
    >
      <div
        style={{
          background:
            "rgba(21, 27, 39, 0.92)",
          border:
            "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: "#f8d36d",
                fontSize: 26,
              }}
            >
              Nova Image Studio
            </h2>
            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                color:
                  "rgba(255,255,255,0.72)",
              }}
            >
              Generate premium visuals
              for RoyalOS, ChoiceRoyals,
              Xena Grace, and more.
            </p>
          </div>

          <button
            onClick={onOpenGallery}
            style={{
              padding:
                "10px 16px",
              borderRadius: 12,
              border:
                "1px solid rgba(255,255,255,0.12)",
              background:
                "rgba(255,255,255,0.04)",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Open Asset Gallery
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          <input
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
            placeholder="Image title (example: Cybersecurity Webinar Flyer)"
            style={{
              width: "100%",
              padding:
                "14px 16px",
              borderRadius: 14,
              border:
                "1px solid rgba(255,255,255,0.1)",
              background:
                "rgba(255,255,255,0.04)",
              color: "#ffffff",
              outline: "none",
            }}
          />

          <textarea
            value={prompt}
            onChange={(e) =>
              setPrompt(
                e.target.value
              )
            }
            placeholder="Describe what Nova should generate..."
            rows={8}
            style={{
              width: "100%",
              padding:
                "14px 16px",
              borderRadius: 14,
              border:
                "1px solid rgba(255,255,255,0.1)",
              background:
                "rgba(255,255,255,0.04)",
              color: "#ffffff",
              outline: "none",
              resize: "vertical",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              value={size}
              onChange={(e) =>
                setSize(
                  e.target
                    .value as
                    | "1024x1024"
                    | "1536x1024"
                    | "1024x1536"
                )
              }
              style={{
                padding:
                  "12px 14px",
                borderRadius: 12,
                border:
                  "1px solid rgba(255,255,255,0.1)",
                background:
                  "rgba(255,255,255,0.04)",
                color: "#ffffff",
              }}
            >
              <option value="1024x1024">
                Square
              </option>
              <option value="1536x1024">
                Landscape
              </option>
              <option value="1024x1536">
                Portrait
              </option>
            </select>

            <button
              onClick={
                handleGenerate
              }
              disabled={loading}
              style={{
                padding:
                  "12px 18px",
                borderRadius: 12,
                border: "none",
                background:
                  "#f5c451",
                color: "#131720",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {loading
                ? "Nova is generating..."
                : "Generate image"}
            </button>
          </div>

          {error ? (
            <div
              style={{
                color: "#ff8c8c",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          ) : null}
        </div>
      </div>

      {result ? (
        <div
          style={{
            background:
              "rgba(21, 27, 39, 0.92)",
            border:
              "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: 24,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#ffffff",
            }}
          >
            Latest Nova Result
          </h3>

          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            <img
              src={result.publicUrl}
              alt={result.title}
              style={{
                width: "100%",
                maxWidth: 680,
                borderRadius: 18,
                border:
                  "1px solid rgba(255,255,255,0.08)",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <a
                href={result.publicUrl}
                download
                style={{
                  textDecoration:
                    "none",
                  padding:
                    "12px 18px",
                  borderRadius: 12,
                  background:
                    "#6fd3ff",
                  color: "#081018",
                  fontWeight: 700,
                }}
              >
                Download image
              </a>

              <a
                href={result.publicUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  textDecoration:
                    "none",
                  padding:
                    "12px 18px",
                  borderRadius: 12,
                  background:
                    "rgba(255,255,255,0.08)",
                  color:
                    "#ffffff",
                  fontWeight: 700,
                }}
              >
                Open file
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}