import OpenAI, { toFile } from "openai";
import { NextResponse } from "next/server";
import {
  saveGeneratedImage,
  saveUploadedAsset,
} from "@/lib/tools/local-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_REFERENCE_IMAGES = 8;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

type SupportedSize = "1024x1024" | "1536x1024" | "1024x1536";

function isSupportedSize(value: string): value is SupportedSize {
  return (
    value === "1024x1024" ||
    value === "1536x1024" ||
    value === "1024x1536"
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    return error.message || "OpenAI rejected the image-editing request.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Reference-image generation failed.";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured. Add it to .env.local and restart RoyalOS.",
        },
        { status: 400 },
      );
    }

    const form = await request.formData();

    const prompt = String(form.get("prompt") ?? "").trim();
    const requestedTitle = String(
      form.get("title") ?? "Nova Reference Image",
    ).trim();
    const requestedSize = String(form.get("size") ?? "1024x1024").trim();

    const title = requestedTitle || "Nova Reference Image";
    const size: SupportedSize = isSupportedSize(requestedSize)
      ? requestedSize
      : "1024x1024";

    const references = form
      .getAll("references")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (!prompt) {
      return NextResponse.json(
        { error: "Describe the image Nova should create." },
        { status: 400 },
      );
    }

    if (references.length === 0) {
      return NextResponse.json(
        { error: "Add at least one reference image." },
        { status: 400 },
      );
    }

    if (references.length > MAX_REFERENCE_IMAGES) {
      return NextResponse.json(
        {
          error: `Use no more than ${MAX_REFERENCE_IMAGES} reference images in one request.`,
        },
        { status: 400 },
      );
    }

    for (const file of references) {
      if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            error: `${file.name || "The selected file"} must be a PNG, JPG, JPEG, or WebP image.`,
          },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `${file.name || "The selected file"} must be smaller than 20 MB.`,
          },
          { status: 400 },
        );
      }
    }

    /*
     * Save the reference files first so they remain available in RoyalOS
     * even if the generation provider later rejects the request.
     */
    const uploadedReferences = await Promise.all(
      references.map((file) =>
        saveUploadedAsset({
          file,
          title: `Nova reference - ${file.name || "image"}`,
        }),
      ),
    );

    const openAIReferenceFiles = await Promise.all(
      references.map(async (file, index) => {
        const buffer = Buffer.from(await file.arrayBuffer());

        const fallbackExtension =
          file.type === "image/jpeg"
            ? "jpg"
            : file.type === "image/webp"
              ? "webp"
              : "png";

        const filename =
          file.name?.trim() || `nova-reference-${index + 1}.${fallbackExtension}`;

        return toFile(buffer, filename, {
          type: file.type,
        });
      }),
    );

    const client = new OpenAI({ apiKey });

    const model =
      process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";

    const enhancedPrompt = [
      prompt,
      "",
      "Use the supplied images only as authorized visual references.",
      "Preserve important product, person, composition, color, and brand details requested by the user.",
      "Do not invent, distort, or misspell logos and brand names.",
      "When exact typography is essential, leave clean space for RoyalOS to apply the final text overlay.",
    ].join("\n");

    /*
     * Do not send input_fidelity here.
     * The configured model rejected that parameter in the previous request.
     */
    let response;

    try {
      response = await client.images.edit({
        model,
        image: openAIReferenceFiles,
        prompt: enhancedPrompt,
        n: 1,
        size,
        quality: "high",
        background: "opaque",
        output_format: "png",
      });
    } catch (error) {
      /*
       * Compatibility fallback:
       * Some model or SDK combinations reject optional output controls.
       * Retry once with only the core editing parameters.
       */
      if (
        error instanceof OpenAI.APIError &&
        error.status === 400
      ) {
        console.warn(
          "Nova image edit rejected optional parameters. Retrying with core parameters only.",
          error.message,
        );

        response = await client.images.edit({
          model,
          image: openAIReferenceFiles,
          prompt: enhancedPrompt,
          n: 1,
          size,
        });
      } else {
        throw error;
      }
    }

    const base64 = response.data?.[0]?.b64_json;

    if (!base64) {
      throw new Error(
        "OpenAI completed the request but returned no image data.",
      );
    }

    const asset = await saveGeneratedImage({
      base64,
      title,
      prompt,
    });

    return NextResponse.json({
      ok: true,
      asset,
      references: uploadedReferences,
      provider: "openai",
      model,
      referenceCount: references.length,
    });
  } catch (error) {
    console.error("Nova reference generation error:", error);

    const status =
      error instanceof OpenAI.APIError &&
      typeof error.status === "number" &&
      error.status >= 400 &&
      error.status < 500
        ? error.status
        : 500;

    return NextResponse.json(
      {
        error: getErrorMessage(error),
      },
      { status },
    );
  }
}