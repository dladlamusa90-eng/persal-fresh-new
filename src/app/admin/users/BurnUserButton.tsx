"use client";

import { useState } from "react";

type Props = {
  userId: string;
  role: string;
  initialBurned: boolean;
};

export default function BurnUserButton({ userId, role, initialBurned }: Props) {
  const [isBurned, setIsBurned] = useState(initialBurned);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleToggle() {
    if (role === "ADMIN") {
      setMessage("Admin accounts cannot be burned.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/burn`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ burned: !isBurned }),
      });

      const body = (await response.json()) as {
        error?: string;
        user?: { isBurned?: boolean };
      };

      if (!response.ok) {
        setMessage(body.error ?? "Failed to update user access.");
        return;
      }

      setIsBurned(Boolean(body.user?.isBurned));
      setMessage(Boolean(body.user?.isBurned) ? "User has been burned." : "User access restored.");
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isSubmitting || role === "ADMIN"}
        className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed ${
          isBurned ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {isSubmitting ? "Saving..." : isBurned ? "Restore User" : "Burn User"}
      </button>
      {message && <p className="text-xs text-gray-600">{message}</p>}
    </div>
  );
}
