import {
  createRoyalOSAsset,
  createRoyalOSAssetSignedUrl,
  updateRoyalOSAsset,
  uploadRoyalOSAssetFile,
  type RoyalOSAssetType,
} from "@/lib/tools/database";

import {
  isRoyalOSEmployeeName,
  isRoyalOSWorkspace,
  type RoyalOSEmployeeName,
  type RoyalOSWorkspace,
} from "@/lib/missions/types";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  300;

const MAXIMUM_FILE_SIZE =
  50 * 1024 * 1024;

const SIGNED_URL_EXPIRATION_SECONDS =
  3_600;

const ALLOWED_MIME_TYPES =
  new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",

    "application/pdf",
    "text/plain",
    "text/csv",
    "application/json",

    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    "application/zip",

    "audio/mpeg",
    "audio/wav",
    "audio/mp4",

    "video/mp4",
    "video/webm",
    "video/quicktime",
  ]);

function createIdentifier(
  prefix: string
): string {
  if (
    typeof globalThis.crypto !==
      "undefined" &&
    typeof globalThis.crypto
      .randomUUID === "function"
  ) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function cleanText(
  value: FormDataEntryValue | null,
  maximumLength: number
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function createSlug(
  value: string
): string {
  const slug =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(
        0,
        100
      );

  return slug ||
    "file";
}

function getFileExtension(
  fileName: string
): string {
  const finalDot =
    fileName.lastIndexOf(
      "."
    );

  if (
    finalDot < 1 ||
    finalDot ===
      fileName.length - 1
  ) {
    return "";
  }

  return fileName
    .slice(finalDot)
    .toLowerCase()
    .replace(
      /[^a-z0-9.]/g,
      ""
    )
    .slice(
      0,
      12
    );
}

function removeExtension(
  fileName: string
): string {
  const finalDot =
    fileName.lastIndexOf(
      "."
    );

  if (finalDot < 1) {
    return fileName;
  }

  return fileName.slice(
    0,
    finalDot
  );
}

function resolveAssetType(
  mimeType: string
): RoyalOSAssetType {
  if (
    mimeType.startsWith(
      "image/"
    )
  ) {
    return "image";
  }

  if (
    mimeType.startsWith(
      "video/"
    )
  ) {
    return "video";
  }

  if (
    mimeType.startsWith(
      "audio/"
    )
  ) {
    return "audio";
  }

  if (
    mimeType ===
      "application/pdf" ||
    mimeType.startsWith(
      "text/"
    ) ||
    mimeType.includes(
      "word"
    ) ||
    mimeType.includes(
      "document"
    ) ||
    mimeType.includes(
      "excel"
    ) ||
    mimeType.includes(
      "spreadsheet"
    ) ||
    mimeType.includes(
      "powerpoint"
    ) ||
    mimeType.includes(
      "presentation"
    )
  ) {
    return "document";
  }

  return "other";
}

function resolveWorkspace(
  value: string
): RoyalOSWorkspace {
  return isRoyalOSWorkspace(
    value
  )
    ? value
    : "ChoiceRoyals";
}

function resolveEmployee(
  value: string
): RoyalOSEmployeeName {
  return isRoyalOSEmployeeName(
    value
  )
    ? value
    : "Nova";
}

function getUploadError(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : "Unknown RoyalOS asset-upload error.";
}

export async function POST(
  request: Request
) {
  const assetId =
    createIdentifier(
      "asset"
    );

  let assetRecordCreated =
    false;

  try {
    let formData:
      FormData;

    try {
      formData =
        await request.formData();
    } catch {
      return Response.json(
        {
          error:
            "RoyalOS received invalid upload form data.",
        },
        {
          status: 400,
        }
      );
    }

    const fileEntry =
      formData.get(
        "file"
      );

    if (
      !(fileEntry instanceof File)
    ) {
      return Response.json(
        {
          error:
            "Choose an image or file to upload.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      fileEntry.size ===
      0
    ) {
      return Response.json(
        {
          error:
            "The selected file is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      fileEntry.size >
      MAXIMUM_FILE_SIZE
    ) {
      return Response.json(
        {
          error:
            "The file exceeds the RoyalOS 50 MB upload limit.",
        },
        {
          status: 413,
        }
      );
    }

    const mimeType =
      fileEntry.type
        .trim()
        .toLowerCase();

    if (
      !mimeType ||
      !ALLOWED_MIME_TYPES.has(
        mimeType
      )
    ) {
      return Response.json(
        {
          error:
            `RoyalOS does not currently accept the file type "${mimeType || "unknown"}".`,
        },
        {
          status: 415,
        }
      );
    }

    const suppliedTitle =
      cleanText(
        formData.get(
          "title"
        ),
        180
      );

    const workspace =
      resolveWorkspace(
        cleanText(
          formData.get(
            "workspace"
          ),
          200
        )
      );

    const employee =
      resolveEmployee(
        cleanText(
          formData.get(
            "employee"
          ),
          100
        )
      );

    const missionId =
      cleanText(
        formData.get(
          "missionId"
        ),
        200
      ) ||
      undefined;

    const originalFileName =
      fileEntry.name
        .trim()
        .slice(
          0,
          255
        ) ||
      "royalos-upload";

    const extension =
      getFileExtension(
        originalFileName
      );

    const originalTitle =
      removeExtension(
        originalFileName
      )
        .replace(
          /[-_]+/g,
          " "
        )
        .trim();

    const title =
      suppliedTitle ||
      originalTitle ||
      "RoyalOS Asset";

    const workspaceSlug =
      createSlug(
        workspace
      );

    const fileSlug =
      createSlug(
        removeExtension(
          originalFileName
        )
      );

    const dateFolder =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );

    const storagePath =
      `uploads/${workspaceSlug}/${dateFolder}/${assetId}-${fileSlug}${extension}`;

    const assetType =
      resolveAssetType(
        mimeType
      );

    await createRoyalOSAsset({
      assetId,

      missionId,

      workspace,

      createdByEmployee:
        employee,

      assetType,

      provider:
        "supabase",

      status:
        "processing",

      title,

      description:
        `Uploaded to RoyalOS by ${employee}.`,

      storageBucket:
        "royalos-assets",

      storagePath,

      mimeType,

      sizeBytes:
        fileEntry.size,

      approvalStatus:
        "pending",

      metadata: {
        originalFileName,

        source:
          "RoyalOS Asset Gallery",

        endpoint:
          "/api/tools/assets/upload",

        uploadedBy:
          employee,

        uploadedAt:
          new Date()
            .toISOString(),
      },
    });

    assetRecordCreated =
      true;

    const fileBytes =
      new Uint8Array(
        await fileEntry
          .arrayBuffer()
      );

    await uploadRoyalOSAssetFile({
      storagePath,

      file:
        fileBytes,

      mimeType,

      bucket:
        "royalos-assets",

      upsert:
        false,
    });

    const asset =
      await updateRoyalOSAsset(
        assetId,
        {
          status:
            "ready",

          storageBucket:
            "royalos-assets",

          storagePath,

          mimeType,

          sizeBytes:
            fileEntry.size,

          metadata: {
            originalFileName,

            source:
              "RoyalOS Asset Gallery",

            endpoint:
              "/api/tools/assets/upload",

            uploadedBy:
              employee,

            uploadedAt:
              new Date()
                .toISOString(),

            uploadCompleted:
              true,
          },
        }
      );

    const signedUrl =
      await createRoyalOSAssetSignedUrl(
        assetId,
        SIGNED_URL_EXPIRATION_SECONDS
      );

    return Response.json(
      {
        message:
          `${employee} uploaded the asset successfully.`,

        asset: {
          ...asset,

          signed_url:
            signedUrl,

          signed_url_expires_in_seconds:
            SIGNED_URL_EXPIRATION_SECONDS,
        },
      },
      {
        status: 201,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    const errorMessage =
      getUploadError(
        error
      );

    console.error(
      "RoyalOS asset upload error:",
      error
    );

    if (
      assetRecordCreated
    ) {
      try {
        await updateRoyalOSAsset(
          assetId,
          {
            status:
              "failed",

            metadata: {
              failedAt:
                new Date()
                  .toISOString(),

              error:
                errorMessage,

              endpoint:
                "/api/tools/assets/upload",
            },
          }
        );
      } catch (
        updateError
      ) {
        console.error(
          "RoyalOS could not mark the upload as failed:",
          updateError
        );
      }
    }

    return Response.json(
      {
        error:
          "RoyalOS could not upload the file.",

        details:
          process.env
            .NODE_ENV ===
          "development"
            ? errorMessage
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}