import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { status: "ok", service: "deal-rakyat-web" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
