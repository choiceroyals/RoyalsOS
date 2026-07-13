"use client";

import {
  useEffect,
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
  refreshKey?: number;
};

function formatBytes(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

export default function RoyalOSAssetGallery({
  refreshKey = 0,
}: Props) {
  const [assets, setAssets] =
    useState<RoyalAssetRecord[]>(
      []
    );

  const [search, setSearch] =
    useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    uploadTitle,
    setUploadTitle,
  ] = useState("");

  const [
    uploadFile,
    setUploadFile,
  ] =
    useState<File | null>(null);

  async function loadAssets(
    query = ""
  ) {
    try {
      setLoading(true);
      setError("");

      const url =
        query.trim()
          ? `/api/tools/assets?q=${encodeURIComponent(
              query.trim()
            )}`
          : "/api/tools/assets";

      const res =
        await fetch(url);

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Could not load assets."
        );
      }

      setAssets(
        data.assets || []
      );
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

  useEffect(() => {
    loadAssets(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function handleUpload() {
    if (!uploadFile) {
      setError(
        "Please choose a file to upload."
      );
      return;
    }

    try {
      setUploading(true);
      setError("");

      const formData =
        new FormData();

      formData.append(
        "file",
        uploadFile
      );

      if (
        uploadTitle.trim()
      ) {
        formData.append(
          "title",
          uploadTitle.trim()
        );
      }

      const res =
        await fetch(
          "/api/tools/assets/upload",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Upload failed."
        );
      }

      setUploadFile(null);
      setUploadTitle("");
      await loadAssets(search);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed."
      );
    } finally {
      setUploading(false);
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
        <h2
          style={{
            marginTop: 0,
            color: "#f8d36d",
            fontSize: 26,
          }}
        >
          RoyalOS Asset Gallery
        </h2>

        <p
          style={{
            color:
              "rgba(255,255,255,0.72)",
          }}
        >
          Upload files, manage image
          assets, and download
          generated materials.
        </p>

        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 18,
          }}
        >
          <input
            value={uploadTitle}
            onChange={(e) =>
              setUploadTitle(
                e.target.value
              )
            }
            placeholder="Optional asset title"
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

          <input
            type="file"
            onChange={(e) =>
              setUploadFile(
                e.target.files?.[0] ||
                  null
              )
            }
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

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={
                handleUpload
              }
              disabled={uploading}
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
              {uploading
                ? "Uploading..."
                : "Upload asset"}
            </button>

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search assets..."
              style={{
                flex: 1,
                minWidth: 240,
                padding:
                  "12px 14px",
                borderRadius: 12,
                border:
                  "1px solid rgba(255,255,255,0.1)",
                background:
                  "rgba(255,255,255,0.04)",
                color: "#ffffff",
              }}
            />

            <button
              onClick={() =>
                loadAssets(
                  search
                )
              }
              style={{
                padding:
                  "12px 18px",
                borderRadius: 12,
                border:
                  "1px solid rgba(255,255,255,0.1)",
                background:
                  "rgba(255,255,255,0.04)",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Search
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
          <h3
            style={{
              margin: 0,
              color: "#ffffff",
            }}
          >
            Asset Library
          </h3>

          <div
            style={{
              color:
                "rgba(255,255,255,0.72)",
              fontSize: 14,
            }}
          >
            {loading
              ? "Loading..."
              : `${assets.length} asset(s)`}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {assets.map(
            (asset) => (
              <div
                key={asset.id}
                style={{
                  background:
                    "rgba(255,255,255,0.03)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 18,
                  padding: 14,
                  display: "grid",
                  gap: 12,
                }}
              >
                {asset.kind ===
                "image" ? (
                  <img
                    src={
                      asset.publicUrl
                    }
                    alt={asset.title}
                    style={{
                      width: "100%",
                      aspectRatio:
                        "1 / 1",
                      objectFit:
                        "cover",
                      borderRadius: 12,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio:
                        "1 / 1",
                      borderRadius: 12,
                      display: "grid",
                      placeItems:
                        "center",
                      background:
                        "rgba(255,255,255,0.05)",
                      color:
                        "#f8d36d",
                      fontWeight: 700,
                      fontSize: 22,
                    }}
                  >
                    {asset.kind.toUpperCase()}
                  </div>
                )}

                <div>
                  <div
                    style={{
                      color:
                        "#ffffff",
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    {asset.title}
                  </div>

                  <div
                    style={{
                      color:
                        "rgba(255,255,255,0.66)",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    <div>
                      Source:{" "}
                      {asset.source}
                    </div>
                    <div>
                      Type:{" "}
                      {asset.kind}
                    </div>
                    <div>
                      Size:{" "}
                      {formatBytes(
                        asset.sizeBytes
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <a
                    href={
                      asset.publicUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      textDecoration:
                        "none",
                      padding:
                        "10px 12px",
                      borderRadius: 10,
                      background:
                        "rgba(255,255,255,0.08)",
                      color:
                        "#ffffff",
                      fontSize: 13,
                    }}
                  >
                    Open
                  </a>

                  <a
                    href={
                      asset.publicUrl
                    }
                    download
                    style={{
                      textDecoration:
                        "none",
                      padding:
                        "10px 12px",
                      borderRadius: 10,
                      background:
                        "#6fd3ff",
                      color:
                        "#081018",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Download
                  </a>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}