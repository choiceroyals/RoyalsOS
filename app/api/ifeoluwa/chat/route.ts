import OpenAI from "openai";

import {
  isRoyalOSWorkspace,
  type RoyalOSWorkspace,
} from "@/lib/missions/types";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  180;

type ConversationRole =
  | "user"
  | "assistant";

type ConversationMessage = {
  role?: unknown;
  content?: unknown;
};

type IfeoluwaChatRequest = {
  message?: unknown;

  history?: unknown;

  workspace?: unknown;

  imageDataUrl?: unknown;

  imageMimeType?: unknown;

  imageName?: unknown;
};

const MAXIMUM_MESSAGE_LENGTH =
  20_000;

const MAXIMUM_HISTORY_MESSAGES =
  14;

const MAXIMUM_IMAGE_BYTES =
  8 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES =
  new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
  ]);

function cleanText(
  value: unknown,
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

function resolveWorkspace(
  value: unknown
): RoyalOSWorkspace {
  return isRoyalOSWorkspace(
    value
  )
    ? value
    : "ChoiceRoyals";
}

function isConversationRole(
  value: unknown
): value is ConversationRole {
  return (
    value === "user" ||
    value === "assistant"
  );
}

function normalizeHistory(
  value: unknown
): Array<{
  role:
    ConversationRole;

  content:
    string;
}> {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .slice(
      -MAXIMUM_HISTORY_MESSAGES
    )
    .flatMap(
      (
        item
      ) => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          return [];
        }

        const possibleMessage =
          item as
            ConversationMessage;

        if (
          !isConversationRole(
            possibleMessage.role
          )
        ) {
          return [];
        }

        const content =
          cleanText(
            possibleMessage.content,
            MAXIMUM_MESSAGE_LENGTH
          );

        if (!content) {
          return [];
        }

        return [
          {
            role:
              possibleMessage.role,

            content,
          },
        ];
      }
    );
}

function createConversationTranscript(
  history: Array<{
    role:
      ConversationRole;

    content:
      string;
  }>,
  currentMessage: string
): string {
  let previousMessages =
    history;

  const finalHistoryMessage =
    history[
      history.length - 1
    ];

  if (
    finalHistoryMessage
      ?.role ===
      "user" &&
    finalHistoryMessage
      .content ===
      currentMessage
  ) {
    previousMessages =
      history.slice(
        0,
        -1
      );
  }

  if (
    previousMessages.length ===
    0
  ) {
    return "There is no earlier conversation in this request.";
  }

  return previousMessages
    .map(
      (
        item
      ) =>
        `${
          item.role ===
          "user"
            ? "Ayobami"
            : "Ifeoluwa"
        }: ${item.content}`
    )
    .join(
      "\n\n"
    );
}

function normalizeImageDataUrl(
  imageDataUrl: unknown,
  suppliedMimeType: unknown
): {
  dataUrl: string;

  mimeType: string;

  sizeBytes: number;
} | null {
  if (
    typeof imageDataUrl !==
      "string" ||
    !imageDataUrl.trim()
  ) {
    return null;
  }

  const cleanedDataUrl =
    imageDataUrl.trim();

  const match =
    cleanedDataUrl.match(
      /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/i
    );

  if (!match) {
    throw new Error(
      "The attached image is not a supported base64 image."
    );
  }

  let mimeType =
    match[1]
      .toLowerCase();

  if (
    mimeType ===
    "image/jpg"
  ) {
    mimeType =
      "image/jpeg";
  }

  const requestedMimeType =
    cleanText(
      suppliedMimeType,
      100
    ).toLowerCase();

  if (
    requestedMimeType ===
    "image/jpg"
  ) {
    mimeType =
      "image/jpeg";
  } else if (
    requestedMimeType &&
    SUPPORTED_IMAGE_TYPES.has(
      requestedMimeType
    )
  ) {
    mimeType =
      requestedMimeType;
  }

  if (
    !SUPPORTED_IMAGE_TYPES.has(
      mimeType
    )
  ) {
    throw new Error(
      `Ifeoluwa cannot currently read "${mimeType}" images. Use PNG, JPEG, WebP, or GIF.`
    );
  }

  const base64Data =
    match[2].replace(
      /\s+/g,
      ""
    );

  const padding =
    base64Data.endsWith(
      "=="
    )
      ? 2
      : base64Data.endsWith(
          "="
        )
        ? 1
        : 0;

  const sizeBytes =
    Math.floor(
      base64Data.length *
        3 /
        4
    ) -
    padding;

  if (
    sizeBytes <= 0
  ) {
    throw new Error(
      "The attached image is empty."
    );
  }

  if (
    sizeBytes >
    MAXIMUM_IMAGE_BYTES
  ) {
    throw new Error(
      "The attached image exceeds the 8 MB Ifeoluwa image limit."
    );
  }

  return {
    dataUrl:
      `data:${mimeType};base64,${base64Data}`,

    mimeType,

    sizeBytes,
  };
}

function getOpenAIErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Unknown Ifeoluwa response error.";
}

export async function GET() {
  const model =
    process.env
      .OPENAI_VISION_MODEL
      ?.trim() ||
    process.env
      .OPENAI_MODEL
      ?.trim() ||
    "gpt-5.6";

  return Response.json(
    {
      message:
        "Ifeoluwa private conversation API is online.",

      status:
        process.env
          .OPENAI_API_KEY
          ?.trim()
          ? "ready"
          : "not_ready",

      capabilities: {
        privateConversation:
          true,

        conversationHistory:
          true,

        imageUnderstanding:
          true,

        spokenConversationInterface:
          true,
      },

      model,

      supportedImageTypes:
        Array.from(
          SUPPORTED_IMAGE_TYPES
        ),

      maximumImageBytes:
        MAXIMUM_IMAGE_BYTES,

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
}

export async function POST(
  request: Request
) {
  try {
    let body:
      IfeoluwaChatRequest;

    try {
      body =
        (await request.json()) as
          IfeoluwaChatRequest;
    } catch {
      return Response.json(
        {
          error:
            "Ifeoluwa received invalid conversation JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const message =
      cleanText(
        body.message,
        MAXIMUM_MESSAGE_LENGTH
      );

    if (!message) {
      return Response.json(
        {
          error:
            "Please say or type something to Ifeoluwa.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey =
      process.env
        .OPENAI_API_KEY
        ?.trim();

    if (!apiKey) {
      return Response.json(
        {
          error:
            "OPENAI_API_KEY is not configured for Ifeoluwa.",
        },
        {
          status: 503,
        }
      );
    }

    const workspace =
      resolveWorkspace(
        body.workspace
      );

    const history =
      normalizeHistory(
        body.history
      );

    let image:
      ReturnType<
        typeof normalizeImageDataUrl
      >;

    try {
      image =
        normalizeImageDataUrl(
          body.imageDataUrl,
          body.imageMimeType
        );
    } catch (error) {
      return Response.json(
        {
          error:
            getOpenAIErrorMessage(
              error
            ),
        },
        {
          status: 400,
        }
      );
    }

    const imageName =
      cleanText(
        body.imageName,
        255
      );

    const transcript =
      createConversationTranscript(
        history,
        message
      );

    const model =
      process.env
        .OPENAI_VISION_MODEL
        ?.trim() ||
      process.env
        .OPENAI_MODEL
        ?.trim() ||
      "gpt-5.6";

    const instructions = `
You are Ifeoluwa, Ayobami's private personal adviser, wellness and life coach inside RoyalOS.

Your communication style:
- Warm, thoughtful, calm, honest, and practical.
- Speak naturally, as though you are having a direct private conversation with Ayobami.
- Give clear opinions when they would help.
- Do not flatter him automatically or agree with everything.
- Encourage him when he is tired, discouraged, overwhelmed, or uncertain.
- Keep spoken responses reasonably concise unless the subject genuinely requires depth.
- Use plain language suitable for being read aloud during a voice conversation.
- Never claim that you completed a real-world action unless the system actually completed it.
- Keep personal discussion separate from company missions unless Ayobami asks to transfer it.
- The currently selected RoyalOS workspace is ${workspace}.

When an image is attached:
- Carefully describe and analyze only what is visibly supported by the image.
- Answer Ayobami's specific question about the image.
- Read visible text when possible.
- Mention uncertainty when details are unclear.
- Do not identify real people from an image.
- Do not infer sensitive personal traits or private facts from appearance.
`.trim();

    const imageDescription =
      image
        ? [
            "",
            "An image is attached to this message.",
            imageName
              ? `Image filename: ${imageName}`
              : "",
            `Image format: ${image.mimeType}`,
            "Use the image together with Ayobami's current message.",
          ]
            .filter(Boolean)
            .join(
              "\n"
            )
        : "";

    const conversationPrompt = `
Previous private conversation:

${transcript}

Ayobami's current message:

${message}
${imageDescription}

Respond directly to Ayobami as Ifeoluwa.
`.trim();

    const openai =
      new OpenAI({
        apiKey,
      });

    const input = [
      {
        role:
          "user" as const,

        content: image
          ? [
              {
                type:
                  "input_text" as const,

                text:
                  conversationPrompt,
              },
              {
                type:
                  "input_image" as const,

                image_url:
                  image.dataUrl,

                detail:
                  "auto" as const,
              },
            ]
          : [
              {
                type:
                  "input_text" as const,

                text:
                  conversationPrompt,
              },
            ],
      },
    ];

    const response =
      await openai.responses.create({
        model,

        instructions,

        input,

        max_output_tokens:
          1_200,

        store:
          false,
      });

    const reply =
      response.output_text
        ?.trim();

    if (!reply) {
      throw new Error(
        "Ifeoluwa returned an empty response."
      );
    }

    return Response.json(
      {
        reply,

        responseId:
          response.id,

        model,

        imageAnalyzed:
          Boolean(image),

        imageName:
          imageName ||
          null,
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
    const errorMessage =
      getOpenAIErrorMessage(
        error
      );

    console.error(
      "Ifeoluwa private chat error:",
      error
    );

    return Response.json(
      {
        error:
          "Ifeoluwa could not respond right now.",

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