"use client";

import { useState } from "react";

type Props = {
  userId: string;
  initialPoints: number;
};

export default function UpdateUserPointsForm({ userId, initialPoints }: Props) {
  const [points, setPoints] = useState(String(initialPoints));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    const numericPoints = Number(points);

    if (!Number.isInteger(numericPoints) || numericPoints < 0) {
      setMessage("Points must be a whole number (0 or more).");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/points`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ points: numericPoints }),
      });

      const body = (await response.json()) as {
        error?: string;
        user?: { points?: number };
      };

      if (!response.ok) {
        setMessage(body.error ?? "Failed to update points.");
        return;
      }

      setPoints(String(body.user?.points ?? numericPoints));
      setMessage("Points updated successfully.");
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full md:w-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
      <p className="text-xs text-gray-500 mb-2">User Points</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          step={1}
          value={points}
          onChange={(event) => setPoints(event.target.value)}
          className="w-28 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="px-3 py-1.5 rounded-md bg-persal-blue text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Save Points"}
        </button>
      </div>
      {message && <p className="text-xs text-gray-600 mt-2">{message}</p>}
    </div>
  );
}
