/**
 * System notification utility — fires-and-forgets notifications to a user's
 * notification bell.  Never throws; errors are logged so they never break
 * the calling request.
 */
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

export async function sendSystemNotification(
  userId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "AdminNotification" ("id", "userId", "type", "title", "body", "createdById", "createdAt")
      VALUES (${id}, ${userId}, 'MESSAGE', ${title}, ${body}, ${null}, NOW())
    `;
  } catch (err: unknown) {
    // Keep request flow resilient: notification delivery failure must never block
    // the parent action (loan apply/approve/pay, etc.).
    console.warn("[system-notification] failed to deliver notification", {
      userId,
      title,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function formatRand(amount: number): string {
  return `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
