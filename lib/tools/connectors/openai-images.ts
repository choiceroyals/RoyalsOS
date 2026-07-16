import "server-only";

import OpenAI from "openai";

import {
  createRoyalOSAsset,
  createRoyalOSAssetSignedUrl,
  updateRoyalOSAsset,
  uploadRoyalOSAssetFile,
} from "@/lib/tools/database";

import { saveGeneratedImage } from "@/lib/tools/local-assets";

import type {
  RoyalOSToolExecutionRequest,
  RoyalOSToolExecutionResult,
} from "@/lib/tools/types";

import type {
  RoyalOSJsonObject,
  RoyalOSJsonValue,
} from "@/lib/missions/types";

/*
 * ============================================================
 * IMAGE OPTIONS
 * ============================================================
 */

export const ROYALOS_IMAGE_SIZES = [
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "auto",
] as const;

export type RoyalOSImageSize =
  (typeof ROYALOS_IMAGE_SIZES)[number];

export const ROYALOS_IMAGE_QUALITIES = [
  "low",
  "medium",
  "high",
  "auto",
] as const;

export type RoyalOSImageQuality =
  (typeof ROYALOS_IMAGE_QUALITIES)[number];

export const ROYALOS_IMAGE_BACKGROUNDS = [
  "opaque",
  "transparent",
  "auto",
] as const;

export type RoyalOSImageBackground =
  (typeof ROYALOS_IMAGE_BACKGROUNDS)[number];

export const ROYALOS_IMAGE_PURPOSES = [
  "social_post",
  "website_banner",
  "music_artwork",
  "book_cover",
  "video_thumbnail",
  "promotional_flyer",
  "presentation",
  "general",
] as const;

export type RoyalOSImagePurpose =
  (typeof ROYALOS_IMAGE_PURPOSES)[number];

/*
 * ============================================================
 * TOOL INPUT AND OUTPUT
 * ============================================================
 */

export type RoyalOSImageGenerationInput = {
  [key: string]:
    RoyalOSJsonValue |
    undefined;

  prompt: string;

  title?: string;

  purpose?:
    RoyalOSImagePurpose;

  size?:
    RoyalOSImageSize;

  quality?:
    RoyalOSImageQuality;

  background?:
    RoyalOSImageBackground;

  styleDirection?: string;

  audience?: string;

  textContent?: string;

  includeText?: boolean;

  additionalInstructions?: string;
};

export type RoyalOSImageGenerationOutput = {
  [key: string]:
    RoyalOSJsonValue |
    undefined;

  assetId: string;

  actionId: string;

  missionId:
    string | null;

  title: string;

  workspace: string;

  createdByEmployee: string;

  provider: string;

  model: string;

  purpose:
    RoyalOSImagePurpose;

  size:
    RoyalOSImageSize;

  quality:
    RoyalOSImageQuality;

  background:
    RoyalOSImageBackground;

  mimeType: string;

  storageBucket: string;

  storagePath: string;

  signedUrl: string;

  signedUrlExpiresInSeconds:
    number;

  width:
    number | null;

  height:
    number | null;

  sizeBytes: number;

  revisedPrompt:
    string | null;
};

/*
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const TOOL_ID =
  "openai.generate_image";

const DEFAULT_IMAGE_MODEL =
  "gpt-image-2";

const DEFAULT_IMAGE_SIZE:
  RoyalOSImageSize =
    "1024x1024";

const DEFAULT_IMAGE_QUALITY:
  RoyalOSImageQuality =
    "medium";

const DEFAULT_IMAGE_BACKGROUND:
  RoyalOSImageBackground =
    "opaque";

const DEFAULT_IMAGE_PURPOSE:
  RoyalOSImagePurpose =
    "general";

const IMAGE_MIME_TYPE =
  "image/png";

const IMAGE_FILE_EXTENSION =
  "png";

const SIGNED_URL_EXPIRATION_SECONDS =
  3_600;

/*
 * ============================================================
 * INTERNAL HELPERS
 * ============================================================
 */

function cleanRequiredText(
  value: unknown,
  fieldName: string,
  maximumLength:
    number
): string {
  const cleaned =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!cleaned) {
    throw new Error(
      `${fieldName} is required for RoyalOS image generation.`
    );
  }

  if (
    cleaned.length >
    maximumLength
  ) {
    throw new Error(
      `${fieldName} cannot exceed ${maximumLength} characters.`
    );
  }

  return cleaned;
}

function cleanOptionalText(
  value: unknown,
  maximumLength:
    number
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const cleaned =
    value.trim();

  if (!cleaned) {
    return undefined;
  }

  if (
    cleaned.length >
    maximumLength
  ) {
    return cleaned.slice(
      0,
      maximumLength
    );
  }

  return cleaned;
}

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

function isRoyalOSImageSize(
  value: unknown
): value is RoyalOSImageSize {
  return (
    typeof value === "string" &&
    ROYALOS_IMAGE_SIZES.includes(
      value as RoyalOSImageSize
    )
  );
}

function isRoyalOSImageQuality(
  value: unknown
): value is RoyalOSImageQuality {
  return (
    typeof value === "string" &&
    ROYALOS_IMAGE_QUALITIES.includes(
      value as RoyalOSImageQuality
    )
  );
}

function isRoyalOSImageBackground(
  value: unknown
): value is RoyalOSImageBackground {
  return (
    typeof value === "string" &&
    ROYALOS_IMAGE_BACKGROUNDS.includes(
      value as RoyalOSImageBackground
    )
  );
}

function isRoyalOSImagePurpose(
  value: unknown
): value is RoyalOSImagePurpose {
  return (
    typeof value === "string" &&
    ROYALOS_IMAGE_PURPOSES.includes(
      value as RoyalOSImagePurpose
    )
  );
}

function createAssetTitle(
  input:
    RoyalOSImageGenerationInput
): string {
  const suppliedTitle =
    cleanOptionalText(
      input.title,
      150
    );

  if (suppliedTitle) {
    return suppliedTitle;
  }

  const prompt =
    cleanRequiredText(
      input.prompt,
      "Image prompt",
      32_000
    )
      .replace(
        /\s+/g,
        " "
      );

  if (
    prompt.length <= 90
  ) {
    return prompt;
  }

  return `${prompt.slice(
    0,
    87
  )}...`;
}

function createStorageSlug(
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
      );

  return slug ||
    "royalos";
}

function getImageDimensions(
  size:
    RoyalOSImageSize
): {
  width: number;
  height: number;
} | null {
  if (
    size ===
    "1024x1024"
  ) {
    return {
      width:
        1024,

      height:
        1024,
    };
  }

  if (
    size ===
    "1024x1536"
  ) {
    return {
      width:
        1024,

      height:
        1536,
    };
  }

  if (
    size ===
    "1536x1024"
  ) {
    return {
      width:
        1536,

      height:
        1024,
    };
  }

  return null;
}

function buildNovaImagePrompt(
  input:
    RoyalOSImageGenerationInput,
  workspace: string
): string {
  const prompt =
    cleanRequiredText(
      input.prompt,
      "Image prompt",
      32_000
    );

  const purpose =
    isRoyalOSImagePurpose(
      input.purpose
    )
      ? input.purpose
      : DEFAULT_IMAGE_PURPOSE;

  const styleDirection =
    cleanOptionalText(
      input.styleDirection,
      4_000
    );

  const audience =
    cleanOptionalText(
      input.audience,
      1_000
    );

  const textContent =
    cleanOptionalText(
      input.textContent,
      500
    );

  const additionalInstructions =
    cleanOptionalText(
      input.additionalInstructions,
      4_000
    );

  const includeText =
    input.includeText ===
    true;

  const sections = [
    `Create a polished, professional image for the ${workspace} workspace.`,

    `Primary creative request:\n${prompt}`,

    `Intended purpose:\n${purpose.replace(
      /_/g,
      " "
    )}`,
  ];

  if (styleDirection) {
    sections.push(
      `Visual and artistic direction:\n${styleDirection}`
    );
  }

  if (audience) {
    sections.push(
      `Target audience:\n${audience}`
    );
  }

  if (
    includeText &&
    textContent
  ) {
    sections.push(
      `Text that must appear accurately in the image:\n${textContent}`
    );

    sections.push(
      "Make the supplied text readable, correctly spelled, well positioned, and visually integrated into the design."
    );
  } else {
    sections.push(
      "Do not add unnecessary words, random letters, logos, watermarks, signatures, or placeholder text."
    );
  }

  if (
    additionalInstructions
  ) {
    sections.push(
      `Additional requirements:\n${additionalInstructions}`
    );
  }

  sections.push(
    "Produce a finished commercial-quality image with strong composition, clear visual hierarchy, realistic lighting or intentional illustration quality, and no obvious AI-generation defects."
  );

  return sections.join(
    "\n\n"
  );
}

function getErrorInformation(
  error: unknown
): {
  message: string;
  code: string;
  retryable: boolean;
} {
  if (
    error instanceof Error
  ) {
    const possibleError =
      error as Error & {
        code?: string;
        status?: number;
      };

    const status =
      possibleError.status;

    return {
      message:
        possibleError.message ||
        "Unknown OpenAI image-generation error.",

      code:
        possibleError.code ||
        "OPENAI_IMAGE_GENERATION_FAILED",

      retryable:
        status === 408 ||
        status === 409 ||
        status === 425 ||
        status === 429 ||
        (
          typeof status ===
            "number" &&
          status >= 500
        ),
    };
  }

  return {
    message:
      "Unknown OpenAI image-generation error.",

    code:
      "OPENAI_IMAGE_GENERATION_FAILED",

    retryable:
      false,
  };
}

/*
 * ============================================================
 * OPENAI IMAGE HANDLER
 * ============================================================
 */

export async function generateRoyalOSImage(
  request:
    RoyalOSToolExecutionRequest<
      RoyalOSImageGenerationInput
    >
): Promise<
  RoyalOSToolExecutionResult<
    RoyalOSImageGenerationOutput
  >
> {
  const startedAt =
    new Date()
      .toISOString();

  const actionId =
    request.context.actionId;

  const assetId =
    createIdentifier(
      "asset"
    );

  const title =
    createAssetTitle(
      request.input
    );

  const purpose =
    isRoyalOSImagePurpose(
      request.input.purpose
    )
      ? request.input.purpose
      : DEFAULT_IMAGE_PURPOSE;

  const size =
    isRoyalOSImageSize(
      request.input.size
    )
      ? request.input.size
      : DEFAULT_IMAGE_SIZE;

  const quality =
    isRoyalOSImageQuality(
      request.input.quality
    )
      ? request.input.quality
      : DEFAULT_IMAGE_QUALITY;

  const background =
    isRoyalOSImageBackground(
      request.input.background
    )
      ? request.input.background
      : DEFAULT_IMAGE_BACKGROUND;

  const dimensions =
    getImageDimensions(
      size
    );

  const model =
    process.env
      .OPENAI_IMAGE_MODEL
      ?.trim() ||
    DEFAULT_IMAGE_MODEL;

  let assetCreated =
    false;

  try {
    const apiKey =
      process.env
        .OPENAI_API_KEY
        ?.trim();

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is missing from the RoyalOS environment variables."
      );
    }

    const finalPrompt =
      buildNovaImagePrompt(
        request.input,
        request.context
          .workspace
      );

    await createRoyalOSAsset({
      assetId,

      missionId:
        request.context
          .missionId,

      actionId,

      workspace:
        request.context
          .workspace,

      createdByEmployee:
        request.context
          .employee,

      assetType:
        "image",

      provider:
        "openai",

      status:
        "processing",

      title,

      description:
        `RoyalOS image generated by ${request.context.employee} for ${purpose.replace(
          /_/g,
          " "
        )}.`,

      prompt:
        request.input
          .prompt,

      storageBucket:
        "royalos-assets",

      mimeType:
        IMAGE_MIME_TYPE,

      approvalStatus:
        "pending",

      metadata: {
        model,

        purpose,

        requestedSize:
          size,

        requestedQuality:
          quality,

        requestedBackground:
          background,

        requestedBy:
          request.context
            .requestedBy,

        mode:
          request.context
            .mode,
      },

      ...(
        dimensions
          ? {
              width:
                dimensions.width,

              height:
                dimensions.height,
            }
          : {}
      ),
    });

    assetCreated =
      true;

    const client =
      new OpenAI({
        apiKey,
      });

    const generation =
      await client.images.generate({
        model,

        prompt:
          finalPrompt,

        n:
          1,

        size,

        quality,

        background,

        output_format:
          "png",
      });

    const generatedImage =
      generation.data?.[0];

    const imageBase64 =
      generatedImage
        ?.b64_json;

    if (!imageBase64) {
      throw new Error(
        "OpenAI completed the image request but returned no image data."
      );
    }

    const imageBuffer =
      Buffer.from(
        imageBase64,
        "base64"
      );

    if (
      imageBuffer.length ===
      0
    ) {
      throw new Error(
        "OpenAI returned an empty generated image."
      );
    }

    const workspaceSlug =
      createStorageSlug(
        request.context
          .workspace
      );

    const dateFolder =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );

    const storagePath =
      `${workspaceSlug}/${dateFolder}/${assetId}.${IMAGE_FILE_EXTENSION}`;

    const uploadResult =
      await uploadRoyalOSAssetFile({
        storagePath,

        file:
          new Uint8Array(
            imageBuffer
          ),

        mimeType:
          IMAGE_MIME_TYPE,

        bucket:
          "royalos-assets",

        upsert:
          false,
      });

    const revisedPrompt =
      generatedImage
        .revised_prompt
        ?.trim() ||
      null;

    /*
     * Keep a stable local mirror for the desktop/local RoyalOS Asset Gallery.
     * Supabase remains the authoritative cloud record, while this mirror stops
     * images from disappearing when a signed URL expires or the database is
     * temporarily unavailable.
     */
    try {
      await saveGeneratedImage({
        base64: imageBase64,
        title,
        prompt: finalPrompt,
      });
    } catch (localMirrorError) {
      console.warn(
        "RoyalOS generated the image but could not create the local asset mirror:",
        localMirrorError
      );
    }

    await updateRoyalOSAsset(
      assetId,
      {
        status:
          "ready",

        storageBucket:
          uploadResult.bucket,

        storagePath:
          uploadResult
            .storagePath,

        mimeType:
          IMAGE_MIME_TYPE,

        width:
          dimensions
            ?.width ??
          null,

        height:
          dimensions
            ?.height ??
          null,

        sizeBytes:
          imageBuffer.length,

        revisedPrompt,

        metadata: {
          model,

          purpose,

          size,

          quality,

          background,

          outputFormat:
            "png",

          generatedAt:
            new Date()
              .toISOString(),

          requestedBy:
            request.context
              .requestedBy,
        },
      }
    );

    const signedUrl =
      await createRoyalOSAssetSignedUrl(
        assetId,
        SIGNED_URL_EXPIRATION_SECONDS
      );

    const completedAt =
      new Date()
        .toISOString();

    const output:
      RoyalOSImageGenerationOutput = {
        assetId,

        actionId,

        missionId:
          request.context
            .missionId ??
          null,

        title,

        workspace:
          request.context
            .workspace,

        createdByEmployee:
          request.context
            .employee,

        provider:
          "openai",

        model,

        purpose,

        size,

        quality,

        background,

        mimeType:
          IMAGE_MIME_TYPE,

        storageBucket:
          uploadResult.bucket,

        storagePath:
          uploadResult
            .storagePath,

        signedUrl,

        signedUrlExpiresInSeconds:
          SIGNED_URL_EXPIRATION_SECONDS,

        width:
          dimensions
            ?.width ??
          null,

        height:
          dimensions
            ?.height ??
          null,

        sizeBytes:
          imageBuffer.length,

        revisedPrompt,
      };

    return {
      actionId,

      toolId:
        TOOL_ID,

      status:
        "succeeded",

      success:
        true,

      output,

      externalId:
        assetId,

      externalUrl:
        signedUrl,

      startedAt,

      completedAt,

      durationMs:
        new Date(
          completedAt
        ).getTime() -
        new Date(
          startedAt
        ).getTime(),

      metadata: {
        assetId,

        model,

        purpose,

        size,

        quality,

        background,

        storagePath:
          uploadResult
            .storagePath,
      },
    };
  } catch (error) {
    const completedAt =
      new Date()
        .toISOString();

    const errorInformation =
      getErrorInformation(
        error
      );

    if (assetCreated) {
      try {
        await updateRoyalOSAsset(
          assetId,
          {
            status:
              "failed",

            metadata: {
              model,

              purpose,

              size,

              quality,

              background,

              failedAt:
                completedAt,

              error:
                errorInformation
                  .message,

              errorCode:
                errorInformation
                  .code,
            },
          }
        );
      } catch (
        assetUpdateError
      ) {
        console.error(
          "RoyalOS could not mark the failed image asset:",
          assetUpdateError
        );
      }
    }

    return {
      actionId,

      toolId:
        TOOL_ID,

      status:
        "failed",

      success:
        false,

      error:
        errorInformation
          .message,

      errorCode:
        errorInformation
          .code,

      retryable:
        errorInformation
          .retryable,

      startedAt,

      completedAt,

      durationMs:
        new Date(
          completedAt
        ).getTime() -
        new Date(
          startedAt
        ).getTime(),

      metadata: {
        assetId,

        model,

        purpose,

        size,

        quality,

        background,

        assetCreated,
      },
    };
  }
}