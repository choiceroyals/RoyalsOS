import {
  ensureRoyalOSBuiltInTools,
} from "@/lib/tools/builtins";

import {
  OPENAI_IMAGE_TOOL_ID,
} from "@/lib/tools/builtins/openai-image-tool";

import {
  ROYALOS_IMAGE_BACKGROUNDS,
  ROYALOS_IMAGE_PURPOSES,
  ROYALOS_IMAGE_QUALITIES,
  ROYALOS_IMAGE_SIZES,
  type RoyalOSImageBackground,
  type RoyalOSImageGenerationInput,
  type RoyalOSImageGenerationOutput,
  type RoyalOSImagePurpose,
  type RoyalOSImageQuality,
  type RoyalOSImageSize,
} from "@/lib/tools/connectors/openai-images";

import {
  getRoyalOSToolConnection,
} from "@/lib/tools/database";

import {
  createRoyalOSToolActionId,
  executeRoyalOSTool,
} from "@/lib/tools/executor";

import {
  getRoyalOSToolDefinition,
} from "@/lib/tools/registry";

import {
  isRoyalOSEmployeeName,
  isRoyalOSMissionMode,
  isRoyalOSWorkspace,
  type RoyalOSEmployeeName,
  type RoyalOSJsonObject,
  type RoyalOSMissionMode,
  type RoyalOSWorkspace,
} from "@/lib/missions/types";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  300;

/*
 * ============================================================
 * REQUEST TYPE
 * ============================================================
 */

type GenerateImageRequest = {
  prompt?: unknown;

  title?: unknown;

  purpose?: unknown;

  size?: unknown;

  quality?: unknown;

  background?: unknown;

  styleDirection?: unknown;

  audience?: unknown;

  textContent?: unknown;

  includeText?: unknown;

  additionalInstructions?:
    unknown;

  workspace?: unknown;

  employee?: unknown;

  mode?: unknown;

  missionId?: unknown;
};

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function cleanText(
  value: unknown,
  maximumLength =
    32_000
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

function parseBoolean(
  value: unknown
): boolean {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  if (
    typeof value !==
    "string"
  ) {
    return false;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  return (
    normalized ===
      "true" ||
    normalized ===
      "1" ||
    normalized ===
      "yes"
  );
}

function isAllowedValue<
  TValue extends string,
>(
  values:
    readonly TValue[],
  value: unknown
): value is TValue {
  return (
    typeof value ===
      "string" &&
    values.includes(
      value as TValue
    )
  );
}

function resolveWorkspace(
  value: unknown
): RoyalOSWorkspace {
  return isRoyalOSWorkspace(
    value
  )
    ? value
    : "ChoiceRoyals";
}

function resolveEmployee(
  value: unknown
): RoyalOSEmployeeName {
  return isRoyalOSEmployeeName(
    value
  )
    ? value
    : "Nova";
}

function resolveMode(
  value: unknown
): RoyalOSMissionMode {
  return isRoyalOSMissionMode(
    value
  )
    ? value
    : "Task";
}

function resolvePurpose(
  value: unknown
): RoyalOSImagePurpose {
  return isAllowedValue(
    ROYALOS_IMAGE_PURPOSES,
    value
  )
    ? value
    : "general";
}

function resolveSize(
  value: unknown
): RoyalOSImageSize {
  return isAllowedValue(
    ROYALOS_IMAGE_SIZES,
    value
  )
    ? value
    : "1024x1024";
}

function resolveQuality(
  value: unknown
): RoyalOSImageQuality {
  return isAllowedValue(
    ROYALOS_IMAGE_QUALITIES,
    value
  )
    ? value
    : "medium";
}

function resolveBackground(
  value: unknown
): RoyalOSImageBackground {
  return isAllowedValue(
    ROYALOS_IMAGE_BACKGROUNDS,
    value
  )
    ? value
    : "opaque";
}

function buildImageInput(
  body:
    GenerateImageRequest
): RoyalOSImageGenerationInput {
  const prompt =
    cleanText(
      body.prompt,
      32_000
    );

  const input:
    RoyalOSImageGenerationInput = {
      prompt,

      purpose:
        resolvePurpose(
          body.purpose
        ),

      size:
        resolveSize(
          body.size
        ),

      quality:
        resolveQuality(
          body.quality
        ),

      background:
        resolveBackground(
          body.background
        ),

      includeText:
        parseBoolean(
          body.includeText
        ),
  };

  const title =
    cleanText(
      body.title,
      150
    );

  const styleDirection =
    cleanText(
      body.styleDirection,
      4_000
    );

  const audience =
    cleanText(
      body.audience,
      1_000
    );

  const textContent =
    cleanText(
      body.textContent,
      500
    );

  const additionalInstructions =
    cleanText(
      body.additionalInstructions,
      4_000
    );

  if (title) {
    input.title =
      title;
  }

  if (styleDirection) {
    input.styleDirection =
      styleDirection;
  }

  if (audience) {
    input.audience =
      audience;
  }

  if (textContent) {
    input.textContent =
      textContent;
  }

  if (
    additionalInstructions
  ) {
    input.additionalInstructions =
      additionalInstructions;
  }

  return input;
}

function getResultStatus(
  result: {
    success: boolean;

    status: string;

    errorCode?: string;
  }
): number {
  if (
    result.success
  ) {
    return 201;
  }

  if (
    result.status ===
    "awaiting_approval"
  ) {
    return 202;
  }

  if (
    result.status ===
    "rejected"
  ) {
    return 403;
  }

  if (
    result.errorCode ===
    "TOOL_INPUT_VALIDATION_FAILED"
  ) {
    return 400;
  }

  return 500;
}

/*
 * ============================================================
 * GET — TOOL STATUS
 * ============================================================
 */

export async function GET() {
  try {
    const initialization =
      ensureRoyalOSBuiltInTools();

    const definition =
      getRoyalOSToolDefinition(
        OPENAI_IMAGE_TOOL_ID
      );

    const connection =
      await getRoyalOSToolConnection(
        "openai-images"
      );

    const apiKeyConfigured =
      Boolean(
        process.env
          .OPENAI_API_KEY
          ?.trim()
      );

    const model =
      process.env
        .OPENAI_IMAGE_MODEL
        ?.trim() ||
      "gpt-image-2";

    return Response.json(
      {
        message:
          "RoyalOS image-generation API is online.",

        status:
          definition?.enabled &&
          apiKeyConfigured
            ? "ready"
            : "not_ready",

        endpoint:
          "/api/tools/images",

        tool: definition
          ? {
              id:
                definition.id,

              name:
                definition.name,

              enabled:
                definition.enabled,

              provider:
                definition.provider,

              riskLevel:
                definition.riskLevel,

              approvalPolicy:
                definition
                  .approvalPolicy,

              allowedEmployees:
                definition
                  .allowedEmployees,

              allowedWorkspaces:
                definition
                  .allowedWorkspaces ??
                [],

              capabilities:
                definition
                  .capabilities,
            }
          : null,

        connection: connection
          ? {
              connectionKey:
                connection
                  .connection_key,

              displayName:
                connection
                  .display_name,

              provider:
                connection.provider,

              status:
                connection.status,

              enabled:
                connection.enabled,

              lastTestedAt:
                connection
                  .last_tested_at,

              lastSuccessAt:
                connection
                  .last_success_at,

              lastError:
                connection
                  .last_error,
            }
          : null,

        configuration: {
          openAIConfigured:
            apiKeyConfigured,

          model,

          supabaseConfigured:
            Boolean(
              process.env
                .SUPABASE_URL
                ?.trim() &&
              process.env
                .SUPABASE_SERVICE_ROLE_KEY
                ?.trim()
            ),
        },

        registry:
          initialization
            .registrySummary,

        timestamp:
          new Date()
            .toISOString(),
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "RoyalOS image tool GET error:",
      error
    );

    return Response.json(
      {
        error:
          "RoyalOS could not retrieve the image-tool status.",

        details:
          process.env
            .NODE_ENV ===
          "development"
            ? error instanceof Error
              ? error.message
              : "Unknown image-tool status error."
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ============================================================
 * POST — GENERATE IMAGE
 * ============================================================
 */

export async function POST(
  request: Request
) {
  try {
    ensureRoyalOSBuiltInTools();

    let body:
      GenerateImageRequest;

    try {
      body =
        (await request.json()) as
          GenerateImageRequest;
    } catch {
      return Response.json(
        {
          error:
            "RoyalOS received invalid image-generation JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const input =
      buildImageInput(
        body
      );

    if (
      !input.prompt.trim()
    ) {
      return Response.json(
        {
          error:
            "An image prompt is required.",
        },
        {
          status: 400,
        }
      );
    }

    const workspace =
      resolveWorkspace(
        body.workspace
      );

    const employee =
      resolveEmployee(
        body.employee
      );

    const mode =
      resolveMode(
        body.mode
      );

    const missionId =
      cleanText(
        body.missionId,
        200
      ) ||
      undefined;

    const model =
      process.env
        .OPENAI_IMAGE_MODEL
        ?.trim() ||
      "gpt-image-2";

    /*
     * GPT Image 2 currently does not support transparent
     * backgrounds. Reject the combination rather than silently
     * changing the CEO's requested design.
     */

    if (
      model ===
        "gpt-image-2" &&
      input.background ===
        "transparent"
    ) {
      return Response.json(
        {
          error:
            "The configured gpt-image-2 model does not support transparent backgrounds. Select opaque or automatic.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !process.env
        .OPENAI_API_KEY
        ?.trim()
    ) {
      return Response.json(
        {
          error:
            "OPENAI_API_KEY is not configured for RoyalOS image generation.",
        },
        {
          status: 503,
        }
      );
    }

    const actionId =
      createRoyalOSToolActionId();

    const metadata:
      RoyalOSJsonObject = {
        source:
          "RoyalOS Image API",

        endpoint:
          "/api/tools/images",

        model,
      };

    const result =
      await executeRoyalOSTool<
        RoyalOSImageGenerationInput,
        RoyalOSImageGenerationOutput
      >(
        {
          toolId:
            OPENAI_IMAGE_TOOL_ID,

          action:
            "generate_image",

          input,

          context: {
            actionId,

            missionId,

            employee,

            requestedBy:
              "CEO",

            workspace,

            mode,

            requiresCEOApproval:
              false,

            requestTimestamp:
              new Date()
                .toISOString(),

            metadata,
          },
        },
        {
          capability:
            "generate_image",

          /*
           * Avoid accidentally paying for duplicate generated
           * images when a network response fails after creation.
           */

          maximumAttempts:
            1,
        }
      );

    const responseStatus =
      getResultStatus(
        result
      );

    return Response.json(
      {
        message:
          result.success
            ? `${employee} generated and stored the image successfully.`
            : result.status ===
                "awaiting_approval"
              ? "The image-generation action is waiting for CEO approval."
              : "RoyalOS could not generate the image.",

        actionId,

        employee,

        workspace,

        mode,

        missionId:
          missionId ??
          null,

        result,
      },
      {
        status:
          responseStatus,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "RoyalOS image tool POST error:",
      error
    );

    return Response.json(
      {
        error:
          "RoyalOS could not complete the image-generation request.",

        details:
          process.env
            .NODE_ENV ===
          "development"
            ? error instanceof Error
              ? error.message
              : "Unknown image-generation error."
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}