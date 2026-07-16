export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CineScene = {
  number?: number;
  durationSeconds?: number;
  purpose?: string;
  visualDirection?: string;
  narration?: string;
  onScreenText?: string;
};

type GenerateBody = {
  approvalStatus?: unknown;
  projectId?: unknown;
  title?: unknown;
  prompt?: unknown;
  workspace?: unknown;
  aspectRatio?: unknown;
  durationSeconds?: unknown;
  voiceoverRequired?: unknown;
  scenes?: unknown;
};

function text(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function chooseDuration(value: unknown): 5 | 10 | 15 {
  const duration = Number(value);
  if (Number.isFinite(duration) && duration <= 5) return 5;
  if (Number.isFinite(duration) && duration <= 10) return 10;
  return 15;
}

function chooseRatio(value: unknown): "720:1280" | "1280:720" | "960:960" {
  if (value === "16:9") return "1280:720";
  if (value === "1:1") return "960:960";
  return "720:1280";
}

function buildShots(rawScenes: unknown, fallbackPrompt: string, duration: 5 | 10 | 15) {
  const scenes = Array.isArray(rawScenes)
    ? (rawScenes.filter((scene): scene is CineScene => Boolean(scene) && typeof scene === "object").slice(0, 5))
    : [];
  const selected = scenes.length >= 3 ? scenes : Array.from({ length: 3 }, (_, index) => ({
    purpose: index === 0 ? "Premium opening hook" : index === 2 ? "Brand close and call to action" : "Develop the business story",
    visualDirection: fallbackPrompt,
    narration: "",
    onScreenText: "",
  }));
  const count = Math.min(5, Math.max(3, selected.length));
  const base = Math.floor(duration / count);
  let remainder = duration - base * count;

  return selected.slice(0, count).map((scene, index) => {
    const seconds = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    const pieces = [
      text(scene.purpose, 150),
      text(scene.visualDirection, 360),
      text(scene.onScreenText, 120) ? `On-screen message: ${text(scene.onScreenText, 120)}` : "",
      text(scene.narration, 180) ? `Audio direction: ${text(scene.narration, 180)}` : "",
    ].filter(Boolean);
    const prompt = pieces.join(". ").slice(0, 512);
    return {
      prompt: prompt.length >= 3 ? prompt : `Scene ${index + 1}: ${fallbackPrompt}`.slice(0, 512),
      duration: seconds,
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateBody;
    if (body.approvalStatus !== "Approved") {
      return Response.json(
        { error: "CEO approval is required before Cine can spend provider credits." },
        { status: 403 },
      );
    }

    const apiKey =
      process.env.RUNWAYML_API_SECRET?.trim() ||
      process.env.RUNWAY_API_KEY?.trim();
    if (!apiKey) {
      return Response.json(
        {
          error:
            "Runway is not configured. Add RUNWAYML_API_SECRET (recommended) or RUNWAY_API_KEY to .env.local, then restart RoyalOS.",
        },
        { status: 503 },
      );
    }

    const prompt = text(body.prompt, 2500);
    const title = text(body.title, 200) || "RoyalOS Cine video";
    const workspace = text(body.workspace, 120) || "ChoiceRoyals";
    const projectId = text(body.projectId, 160) || `cine_${Date.now()}`;
    const duration = chooseDuration(body.durationSeconds);
    const ratio = chooseRatio(body.aspectRatio);
    const shots = buildShots(body.scenes, prompt || title, duration);

    const response = await fetch(
      "https://api.dev.runwayml.com/v1/recipes/multi_shot_video",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Runway-Version": "2024-11-06",
        },
        body: JSON.stringify({
          version: "2026-06",
          mode: "custom",
          duration,
          ratio,
          audio: body.voiceoverRequired !== false,
          shots,
        }),
      },
    );

    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      error?: string;
      message?: string;
    };
    if (!response.ok || !data.id) {
      throw new Error(data.error || data.message || `Runway returned HTTP ${response.status}.`);
    }

    return Response.json({
      taskId: data.id,
      provider: "Runway multi-shot video",
      projectId,
      title,
      workspace,
      generatedDurationSeconds: duration,
      requestedDurationSeconds: Number(body.durationSeconds) || duration,
      status: "PENDING",
      message:
        duration < Number(body.durationSeconds)
          ? `Cine started a ${duration}-second approved provider test. Full ${Number(body.durationSeconds)}-second assembly will be added after multi-clip rendering is connected.`
          : `Cine started the approved ${duration}-second video generation.`,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Cine could not start video generation." },
      { status: 400 },
    );
  }
}
