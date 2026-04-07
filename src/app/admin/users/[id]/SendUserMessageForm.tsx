"use client";

import { useState } from "react";

type Props = {
  userId: string;
  isDeleted: boolean;
  isAdmin: boolean;
};

export default function SendUserMessageForm({ userId, isDeleted, isAdmin }: Props) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleSend() {
    if (isAdmin) {
      setFeedback("Cannot send dashboard messages to admin accounts.");
      return;
    }

    if (isDeleted) {
      setFeedback("Cannot send message to a deleted user.");
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTitle || !trimmedMessage) {
      setFeedback("Please enter both title and message.");
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle, message: trimmedMessage }),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setFeedback(body.error ?? "Failed to send message.");
        return;
      }

      setTitle("");
      setMessage("");
      setFeedback("Message sent to user notifications.");
    } catch {
      setFeedback("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50">
      <p className="text-xs text-gray-500 mb-2">Message User</p>
      <div className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Message title"
          maxLength={120}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          disabled={isSubmitting || isDeleted || isAdmin}
        />
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write a message for this user"
          maxLength={1000}
          rows={4}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          disabled={isSubmitting || isDeleted || isAdmin}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isSubmitting || isDeleted || isAdmin}
          className="px-3 py-1.5 rounded-md bg-persal-blue text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Sending..." : "Send Message"}
        </button>
      </div>
      {feedback && <p className="text-xs text-gray-600 mt-2">{feedback}</p>}
    </div>
  );
}
