import {
  listRoyalAssets,
} from "@/lib/tools/local-assets";
import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
) {
  try {
    const q =
      request.nextUrl.searchParams.get(
        "q"
      ) || "";

    const assets =
      await listRoyalAssets(q);

    return NextResponse.json({
      ok: true,
      count: assets.length,
      assets,
    });
  } catch (error) {
    console.error(
      "RoyalOS Asset Gallery GET error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "RoyalOS could not retrieve the asset library.",
      },
      {
        status: 500,
      }
    );
  }
}