import { handleOAuthCallback } from "../_handler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleOAuthCallback(request, "tiktok");
}
