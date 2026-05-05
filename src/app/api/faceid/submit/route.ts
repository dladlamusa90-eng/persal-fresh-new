import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: true, removed: true }, { status: 200 });
}
