import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.DIDIT_API_KEY;
  const workflowId = process.env.DIDIT_WORKFLOW_ID;

  if (!apiKey || !workflowId) {
    console.error("DIDIT_API_KEY or DIDIT_WORKFLOW_ID not configured");
    return NextResponse.json({ error: "Verification service not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { callbackUrl?: string };
  const callbackUrl = typeof body.callbackUrl === "string" ? body.callbackUrl : "";

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const diditRes = await fetch("https://verification.didit.me/v3/session/", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: user.id,
      ...(callbackUrl ? { callback: callbackUrl } : {}),
    }),
  });

  if (!diditRes.ok) {
    const detail = await diditRes.text().catch(() => "");
    console.error("Didit session creation failed:", diditRes.status, detail);
    return NextResponse.json({ error: "Could not start verification session" }, { status: 502 });
  }

  const data = (await diditRes.json()) as {
    session_id: string;
    url: string;
    status: string;
  };

  // Record that a session is in progress
  await prisma.user.update({
    where: { id: user.id },
    data: {
      faceIdStatus: "IN_PROGRESS",
      faceIdLastCheckedAt: new Date(),
      faceIdExternalUserId: data.session_id,
    },
  });

  return NextResponse.json({ url: data.url, sessionId: data.session_id }, { status: 201 });
}
