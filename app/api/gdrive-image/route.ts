import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const normalizedUrl = (url || "").trim().replace(/^[`"' ]+|[`"' ]+$/g, "").trim();

  if (!normalizedUrl) {
    return new NextResponse("Missing url", { status: 400 });
  }

  try {
    const response = await fetch(normalizedUrl);
    if (!response.ok) {
      return new NextResponse("Failed to fetch image", { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new NextResponse("Failed to fetch image", { status: 500 });
  }
}
