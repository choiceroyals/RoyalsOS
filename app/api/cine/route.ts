import OpenAI from "openai";

import {
  CINE_ASPECT_RATIOS,
  CINE_BUDGET_MODES,
  CINE_PROVIDER_DIRECTORY,
  CINE_VIDEO_TYPES,
  type CineBudgetMode,
  type CineProductionRequest,
  type CineVideoType,
} from "@/lib/cine/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type CineRequestBody = {
  prompt?: unknown;
  workspace?: unknown;
  videoType?: unknown;
  aspectRatio?: unknown;
  durationSeconds?: unknown;
  budgetMode?: unknown;
  presenterRequired?: unknown;
  voiceoverRequired?: unknown;
  captionsRequired?: unknown;
  brandLogoRequired?: unknown;
};

type CineScene = {
  number: number;
  durationSeconds: number;
  purpose: string;
  visualDirection: string;
  narration: string;
  onScreenText: string;
  recommendedProvider: string;
};

type CinePlan = {
  title: string;
  creativeDirection: string;
  providerStrategy: string[];
  productionSteps: string[];
  scenes: CineScene[];
  deliverables: string[];
  approvalNotes: string[];
};

function cleanText(value: unknown, maximumLength: number): string {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function isVideoType(value: unknown): value is CineVideoType {
  return (
    typeof value === "string" &&
    CINE_VIDEO_TYPES.includes(value as CineVideoType)
  );
}

function isBudgetMode(value: unknown): value is CineBudgetMode {
  return (
    typeof value === "string" &&
    CINE_BUDGET_MODES.some((mode) => mode.value === value)
  );
}

function normalizeRequest(body: CineRequestBody): CineProductionRequest {
  const prompt = cleanText(body.prompt, 12_000);

  if (!prompt) {
    throw new Error("Describe the video Cine should create.");
  }

  const aspectRatio = CINE_ASPECT_RATIOS.some(
    (ratio) => ratio.value === body.aspectRatio
  )
    ? (body.aspectRatio as CineProductionRequest["aspectRatio"])
    : "9:16";

  const requestedDuration =
    typeof body.durationSeconds === "number"
      ? body.durationSeconds
      : Number(body.durationSeconds);

  const durationSeconds = Number.isFinite(requestedDuration)
    ? Math.min(180, Math.max(10, Math.round(requestedDuration)))
    : 30;

  return {
    prompt,
    workspace: cleanText(body.workspace, 120) || "ChoiceRoyals",
    videoType: isVideoType(body.videoType)
      ? body.videoType
      : "Social media video",
    aspectRatio,
    durationSeconds,
    budgetMode: isBudgetMode(body.budgetMode)
      ? body.budgetMode
      : "Balanced",
    presenterRequired: body.presenterRequired === true,
    voiceoverRequired: body.voiceoverRequired !== false,
    captionsRequired: body.captionsRequired !== false,
    brandLogoRequired: body.brandLogoRequired !== false,
  };
}

function configuredProviders() {
  return CINE_PROVIDER_DIRECTORY.map((provider) => ({
    id: provider.id,
    name: provider.name,
    purpose: provider.purpose,
    configured:
      provider.envKeys.length === 0 ||
      provider.envKeys.every((key) =>
        key.split("|").some((candidate) => Boolean(process.env[candidate]?.trim())),
      ),
  }));
}

function extractJson(value: string): unknown {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  return JSON.parse(candidate);
}

function buildTemplatePlan(request: CineProductionRequest): CinePlan {
  const sceneCount = Math.max(3, Math.min(8, Math.ceil(request.durationSeconds / 8)));
  const sceneDuration = Math.max(2, Math.round(request.durationSeconds / sceneCount));
  const scenes: CineScene[] = Array.from({ length: sceneCount }, (_, index) => ({
    number: index + 1,
    durationSeconds:
      index === sceneCount - 1
        ? Math.max(2, request.durationSeconds - sceneDuration * (sceneCount - 1))
        : sceneDuration,
    purpose:
      index === 0
        ? "Open with a strong hook."
        : index === sceneCount - 1
          ? "Close with the message and call to action."
          : "Develop the story and maintain attention.",
    visualDirection:
      index === 0
        ? `A premium opening visual for ${request.workspace}.`
        : `A branded scene supporting: ${request.prompt.slice(0, 160)}`,
    narration: request.voiceoverRequired
      ? "Narration will be written after CEO approval of the storyboard."
      : "No narration requested.",
    onScreenText: request.captionsRequired
      ? "Concise caption or key message."
      : "No on-screen caption required.",
    recommendedProvider: request.presenterRequired
      ? "HeyGen for presenter footage; Runway, Veo, or OpenAI for supporting scenes."
      : request.budgetMode === "Premium"
        ? "Veo, Runway, or an available premium OpenAI video model."
        : "Runway or an available OpenAI video model, with FFmpeg assembly.",
  }));

  return {
    title: `${request.workspace} ${request.videoType}`,
    creativeDirection:
      "Build a clear, emotionally coherent, brand-consistent video with a strong first three seconds and one primary call to action.",
    providerStrategy: [
      "OpenAI for script, storyboard, prompt engineering, and production coordination.",
      request.presenterRequired
        ? "HeyGen for presenter or avatar scenes."
        : "Use the best configured text-to-video or image-to-video provider for each scene.",
      "RoyalOS FFmpeg renderer for captions, logo placement, audio mixing, resizing, and export.",
    ],
    productionSteps: [
      "Approve the creative brief and storyboard.",
      "Generate or collect source assets.",
      "Generate scenes through the selected providers.",
      "Review and regenerate failed or inconsistent scenes.",
      "Assemble, caption, brand, and render the final video.",
      "Save to the RoyalOS Media Library and hand off for publishing.",
    ],
    scenes,
    deliverables: [
      `${request.aspectRatio} master video`,
      "Caption file",
      "Thumbnail or cover frame",
      "Provider and cost record",
      "Publishing handoff package",
    ],
    approvalNotes: [
      "This step creates the production plan; provider generation is executed only after API keys, cost limits, and CEO approval are available.",
      "Cine must record real provider results and must not claim unconfirmed generation, storage, or publishing.",
    ],
  };
}

function isCinePlan(value: unknown): value is CinePlan {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CinePlan>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.creativeDirection === "string" &&
    Array.isArray(candidate.providerStrategy) &&
    Array.isArray(candidate.productionSteps) &&
    Array.isArray(candidate.scenes) &&
    Array.isArray(candidate.deliverables) &&
    Array.isArray(candidate.approvalNotes)
  );
}

export async function GET() {
  return Response.json({
    employee: "Cine",
    title: "Director of AI Video Production",
    status: "planning_ready",
    providers: configuredProviders(),
    message:
      "Cine planning and provider routing are available. Final video generation requires the selected provider API keys and execution adapters.",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CineRequestBody;
    const productionRequest = normalizeRequest(body);
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return Response.json({
        plan: buildTemplatePlan(productionRequest),
        planningMode: "local-template",
        productionRequest,
        providers: configuredProviders(),
      });
    }

    const openai = new OpenAI({ apiKey });
    const model =
      process.env.OPENAI_MODEL?.trim() ||
      process.env.OPENAI_PLANNING_MODEL?.trim() ||
      "gpt-5.6";

    const instructions = `
You are Cine, Director of AI Video Production inside RoyalOS.
Create a practical production plan, not a claim that a video was already generated.
Choose providers by capability, budget, presenter needs, aspect ratio, and reliability.
Keep the project brand-consistent and suitable for CEO approval.
Return only valid JSON with this exact shape:
{
  "title": string,
  "creativeDirection": string,
  "providerStrategy": string[],
  "productionSteps": string[],
  "scenes": [{
    "number": number,
    "durationSeconds": number,
    "purpose": string,
    "visualDirection": string,
    "narration": string,
    "onScreenText": string,
    "recommendedProvider": string
  }],
  "deliverables": string[],
  "approvalNotes": string[]
}
Do not use markdown fences.
`.trim();

    const response = await openai.responses.create({
      model,
      instructions,
      input: JSON.stringify(productionRequest, null, 2),
      max_output_tokens: 3000,
      store: false,
    });

    let plan: CinePlan;
    try {
      const parsed = extractJson(response.output_text || "");
      plan = isCinePlan(parsed) ? parsed : buildTemplatePlan(productionRequest);
    } catch {
      plan = buildTemplatePlan(productionRequest);
    }

    return Response.json({
      plan,
      planningMode: "openai",
      model,
      responseId: response.id,
      productionRequest,
      providers: configuredProviders(),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Cine could not prepare the video project.",
      },
      { status: 400 }
    );
  }
}
