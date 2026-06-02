import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  // Verify the session belongs to the requesting user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, faceIdExternalUserId: true },
  });

  if (!user || user.faceIdExternalUserId !== sessionId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Verification service not configured" }, { status: 503 });
  }

  const diditRes = await fetch(
    `https://verification.didit.me/v3/session/${encodeURIComponent(sessionId)}/decision/`,
    { headers: { "x-api-key": apiKey }, cache: "no-store" }
  );

  if (!diditRes.ok) {
    // Non-fatal — session may still be in progress
    return NextResponse.json({ status: "In Progress", verified: false }, { status: 200 });
  }

  const data = (await diditRes.json()) as { status?: string };
  const status = data.status ?? "In Progress";

  return NextResponse.json({ status, verified: status === "Approved" }, { status: 200 });
}
