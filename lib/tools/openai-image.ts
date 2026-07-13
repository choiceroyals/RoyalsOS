import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type NovaImageSize =
  | "1024x1024"
  | "1536x1024"
  | "1024x1536";

export async function generateNovaImage({
  prompt,
  size = "1024x1024",
}: {
  prompt: string;
  size?: NovaImageSize;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is missing in .env.local"
    );
  }

  const result =
    await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
    });

  const first =
    result.data?.[0];

  if (!first?.b64_json) {
    throw new Error(
      "Nova did not return an image."
    );
  }

  return {
    base64: first.b64_json,
    revisedPrompt:
      first.revised_prompt || prompt,
  };
}