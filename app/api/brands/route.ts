import { NextResponse } from "next/server";
import { ROYALOS_BRANDS } from "@/lib/brands/config";
import { getBrandConnectionStatuses } from "@/lib/brands/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const brandId = url.searchParams.get("brandId") ?? ROYALOS_BRANDS[0].id;
  const brand = ROYALOS_BRANDS.find((item) => item.id === brandId);
  if (!brand) {
    return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  }
  const connections = await getBrandConnectionStatuses(brandId);
  return NextResponse.json({
    brand,
    brands: ROYALOS_BRANDS,
    connections,
    summary: {
      total: connections.length,
      connected: connections.filter((item) => item.status === "connected").length,
      ready: connections.filter((item) => item.status === "credentials_ready").length,
      attention: connections.filter((item) => ["error", "expiring"].includes(item.status)).length,
      setup: connections.filter((item) => item.status === "setup_required").length,
    },
  });
}
