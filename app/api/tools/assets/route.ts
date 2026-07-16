import { GET as getAssets, PATCH as patchAsset, DELETE as deleteAsset } from "@/lib/tools/assets/route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = getAssets;
export const PATCH = patchAsset;
export const DELETE = deleteAsset;
