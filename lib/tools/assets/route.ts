import { listRoyalAssets, moveRoyalAssetToTrash, permanentlyDeleteRoyalAsset, restoreRoyalAsset } from "@/lib/tools/local-assets";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const q=request.nextUrl.searchParams.get("q")||"";
    const source=request.nextUrl.searchParams.get("source") as "upload"|"generated"|null;
    const status=(request.nextUrl.searchParams.get("status")||"active") as "active"|"trash"|"all";
    const assets=await listRoyalAssets(q,{source:source||undefined,status});
    return NextResponse.json({ok:true,count:assets.length,assets});
  } catch { return NextResponse.json({ok:false,error:"RoyalOS could not retrieve the asset library."},{status:500}); }
}
export async function PATCH(request: Request){
  const body=await request.json() as {id?:string;action?:"trash"|"restore"};
  if(!body.id) return NextResponse.json({error:"Asset ID is required."},{status:400});
  const asset=body.action==="restore"?await restoreRoyalAsset(body.id):await moveRoyalAssetToTrash(body.id);
  return asset?NextResponse.json({ok:true,asset}):NextResponse.json({error:"Asset not found."},{status:404});
}
export async function DELETE(request: NextRequest){
  const id=request.nextUrl.searchParams.get("id");
  if(!id) return NextResponse.json({error:"Asset ID is required."},{status:400});
  return (await permanentlyDeleteRoyalAsset(id))?NextResponse.json({ok:true}):NextResponse.json({error:"Asset not found."},{status:404});
}
