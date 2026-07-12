import { NextResponse } from "next/server";
import { searchPublicProfiles } from "@/lib/userSettings";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ members: [] });
  }

  try {
    const members = await searchPublicProfiles(query, 5);

    return NextResponse.json(
      { members },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Member search is temporarily unavailable" },
      { status: 503 },
    );
  }
}
