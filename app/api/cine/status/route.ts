import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function safeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "cine-video";
}

async function preserveOutput(remoteUrl: string, workspace: string, projectId: string) {
  const relativeDirectory = path.join("royalos-assets", "cine", safeSlug(workspace));
  const fileName = `${safeSlug(projectId)}.mp4`;
  const absoluteDirectory = path.join(process.cwd(), "public", relativeDirectory);
  const absolutePath = path.join(absoluteDirectory, fileName);
  const publicUrl = `/${relativeDirectory.replace(/\\/g, "/")}/${fileName}`;

  try {
    await fs.access(absolutePath);
    return publicUrl;
  } catch {
    // Continue and download the provider result.
  }

  const response = await fetch(remoteUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Cine could not preserve the generated video (HTTP ${response.status}).`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 250 * 1024 * 1024) {
    throw new Error("Generated video exceeds the current 250 MB local preservation limit.");
  }
  await fs.mkdir(absoluteDirectory, { recursive: true });
  await fs.writeFile(absolutePath, bytes);
  return publicUrl;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id")?.trim();
    const workspace = url.searchParams.get("workspace")?.trim() || "ChoiceRoyals";
    const projectId = url.searchParams.get("projectId")?.trim() || id || `cine_${Date.now()}`;
    if (!id) {
      return Response.json({ error: "A Runway task ID is required." }, { status: 400 });
    }

    const apiKey =
      process.env.RUNWAYML_API_SECRET?.trim() ||
      process.env.RUNWAY_API_KEY?.trim();
    if (!apiKey) {
      return Response.json({ error: "Runway API key is missing." }, { status: 503 });
    }

    const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(id)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      output?: string[];
      failure?: string;
      failureCode?: string;
      progress?: number;
    };
    if (!response.ok) {
      throw new Error(data.failure || `Runway status returned HTTP ${response.status}.`);
    }

    let localUrl: string | undefined;
    if (data.status === "SUCCEEDED" && data.output?.[0]) {
      localUrl = await preserveOutput(data.output[0], workspace, projectId);
    }

    return Response.json({
      taskId: id,
      status: data.status || "UNKNOWN",
      progress: data.progress,
      output: data.output ?? [],
      localUrl,
      error: data.failure || data.failureCode,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Cine could not retrieve generation status." },
      { status: 400 },
    );
  }
}
