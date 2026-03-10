"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHiddenByFooter, setIsHiddenByFooter] = useState(false);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! How can I help you?" },
  ]);

  useEffect(() => {
    function updateOverlapState() {
      const widget = widgetRef.current;
      const footerTarget = document.getElementById("join-our-community");

      if (!widget || !footerTarget) {
        setIsHiddenByFooter(false);
        return;
      }

      const widgetRect = widget.getBoundingClientRect();
      const footerRect = footerTarget.getBoundingClientRect();

      const overlaps = !(
        widgetRect.right < footerRect.left ||
        widgetRect.left > footerRect.right ||
        widgetRect.bottom < footerRect.top ||
        widgetRect.top > footerRect.bottom
      );

      setIsHiddenByFooter(overlaps);
    }

    updateOverlapState();
    window.addEventListener("scroll", updateOverlapState, { passive: true });
    window.addEventListener("resize", updateOverlapState);

    return () => {
      window.removeEventListener("scroll", updateOverlapState);
      window.removeEventListener("resize", updateOverlapState);
    };
  }, []);

  async function send() {
    const value = text.trim();
    if (!value || loading) return;

    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next);
    setText("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply ?? "Sorry, something went wrong." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={widgetRef}
      className={`fixed bottom-4 right-4 z-50 transition-opacity duration-200 ${isHiddenByFooter ? "opacity-0 pointer-events-none" : "opacity-100"}`}
    >
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-3 md:px-4 py-2 rounded-lg bg-persal-blue text-white font-semibold text-sm md:text-base"
        >
          Live Chat
        </button>
      ) : (
        <div className="w-72 md:w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm">Support Chat</h3>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="h-64 overflow-auto border rounded p-2 mb-2 space-y-2">
            {messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? "text-right" : "text-left"}>
                <span className="inline-block bg-gray-100 px-2 py-1 rounded text-sm">{message.content}</span>
              </div>
            ))}
            {loading && <div className="text-sm text-gray-500">Thinking...</div>}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 border rounded px-2 py-1 text-sm"
              placeholder="Type message..."
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && send()}
            />
            <button onClick={send} className="px-3 py-1 rounded bg-persal-blue text-white text-sm">
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
