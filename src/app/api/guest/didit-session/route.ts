import { NextResponse } from "next/server";
import { isSouthAfricanIdNumber, normalizeIdNumber } from "@/lib/validators/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { idNumber?: string };
  const idNumber = normalizeIdNumber(String(body.idNumber ?? "").trim());

  if (!isSouthAfricanIdNumber(idNumber)) {
    return NextResponse.json({ error: "Please enter a valid South African ID number." }, { status: 400 });
  }

  const apiKey = process.env.DIDIT_API_KEY;
  const workflowId = process.env.DIDIT_WORKFLOW_ID;

  if (!apiKey || !workflowId) {
    return NextResponse.json({ error: "Verification service not configured." }, { status: 503 });
  }

  const diditRes = await fetch("https://verification.didit.me/v3/session/", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      workflow_id: workflowId,
      // vendor_data stores the SA ID number so we can issue the HMAC token on webhook/poll
      vendor_data: `guest-id-${idNumber}`,
    }),
  });

  if (!diditRes.ok) {
    const detail = await diditRes.text().catch(() => "");
    console.error("Didit guest session creation failed:", diditRes.status, detail);
    return NextResponse.json({ error: "Could not start verification session." }, { status: 502 });
  }

  const data = (await diditRes.json()) as { session_id: string; url: string };

  return NextResponse.json({ sessionId: data.session_id, url: data.url }, { status: 201 });
}
