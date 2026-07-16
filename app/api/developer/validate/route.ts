import { validateRoyalOSOrionProject } from "@/lib/developer/executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { commands?: unknown };
    const commands = Array.isArray(body.commands)
      ? body.commands.flatMap((item) => (typeof item === "string" ? [item.trim()] : [])).filter(Boolean).slice(0, 3)
      : [];
    if (commands.length === 0) return Response.json({ error: "Choose at least one approved validation command." }, { status: 400 });
    const validations = await validateRoyalOSOrionProject(commands);
    return Response.json({
      message: validations.every((item) => item.status === "passed")
        ? "All Orion validation commands passed."
        : "One or more Orion validation commands did not pass.",
      validations,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Orion could not validate the project." },
      { status: 400 },
    );
  }
}
