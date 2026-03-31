import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type DraftData = Record<string, unknown>;
type DraftDocuments = Record<string, unknown>;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const draft = await prisma.loanApplicationDraft.findUnique({
      where: { userId: user.id },
      select: {
        data: true,
        documents: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        draft: {
          data: (draft?.data ?? {}) as DraftData,
          documents: (draft?.documents ?? {}) as DraftDocuments,
          updatedAt: draft?.updatedAt ?? null,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      data?: DraftData;
      documents?: DraftDocuments;
    };

    const existing = await prisma.loanApplicationDraft.findUnique({
      where: { userId: user.id },
      select: { data: true, documents: true },
    });

    const nextData = {
      ...((existing?.data as DraftData | null) ?? {}),
      ...((body.data ?? {}) as DraftData),
    } as Prisma.InputJsonValue;

    const nextDocuments = {
      ...((existing?.documents as DraftDocuments | null) ?? {}),
      ...((body.documents ?? {}) as DraftDocuments),
    } as Prisma.InputJsonValue;

    const draft = await prisma.loanApplicationDraft.upsert({
      where: { userId: user.id },
      update: {
        data: nextData,
        documents: nextDocuments,
      },
      create: {
        userId: user.id,
        data: nextData,
        documents: nextDocuments,
      },
      select: {
        data: true,
        documents: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Application draft saved",
        draft: {
          data: draft.data,
          documents: draft.documents,
          updatedAt: draft.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}