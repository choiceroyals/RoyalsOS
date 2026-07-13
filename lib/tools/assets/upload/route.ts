import {
  saveUploadedAsset,
} from "@/lib/tools/local-assets";
import {
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const rawFile =
      formData.get("file");
    const rawTitle =
      formData.get("title");

    if (
      !rawFile ||
      typeof rawFile === "string"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please select a file to upload.",
        },
        {
          status: 400,
        }
      );
    }

    const asset =
      await saveUploadedAsset({
        file: rawFile,
        title:
          typeof rawTitle === "string"
            ? rawTitle
            : undefined,
      });

    return NextResponse.json({
      ok: true,
      asset,
    });
  } catch (error) {
    console.error(
      "RoyalOS upload error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "RoyalOS could not upload the asset.",
      },
      {
        status: 500,
      }
    );
  }
}