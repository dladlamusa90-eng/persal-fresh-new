import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.trim()) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  let messages: unknown;

  try {
    const body = await req.json();
    messages = body?.messages ?? body;
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "messages must be an array." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const safeMessages = Array.isArray(messages) ? messages.slice(-10) : [];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a support assistant for a loan dashboard. Be concise and helpful.",
        },
        ...safeMessages,
      ],
      temperature: 0.4,
    });

    const reply = completion.choices?.[0]?.message?.content ?? "No response generated.";
    return NextResponse.json({ reply });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "OpenAI authentication failed. Check OPENAI_API_KEY." },
          { status: 401 }
        );
      }

      if (error.status === 429) {
        const isQuotaIssue = error.code === "insufficient_quota";
        return NextResponse.json(
          {
            error: isQuotaIssue
              ? "OpenAI quota/billing limit reached. Check plan and usage."
              : "OpenAI rate limit hit. Please retry shortly.",
          },
          { status: 429 }
        );
      }

      if (error.status === 403) {
        return NextResponse.json(
          { error: "OpenAI request forbidden. Check project permissions/billing." },
          { status: 403 }
        );
      }

      if (error.status === 400) {
        return NextResponse.json(
          { error: "Invalid chat request payload." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "OpenAI request failed. Please try again." },
        { status: error.status || 500 }
      );
    }

    if (err.status === 401 || /api key|authentication|unauthorized/i.test(err.message ?? "")) {
      return NextResponse.json(
        { error: "OpenAI authentication failed. Check OPENAI_API_KEY." },
        { status: 401 }
      );
    }

    if (err.status === 429 || /rate limit|quota|insufficient_quota/i.test(`${err.code ?? ""} ${err.message ?? ""}`)) {
      const isQuotaIssue = /insufficient_quota|quota/i.test(`${err.code ?? ""} ${err.message ?? ""}`);
      return NextResponse.json(
        {
          error: isQuotaIssue
            ? "OpenAI quota/billing limit reached. Check plan and usage."
            : "OpenAI rate limit hit. Please retry shortly.",
        },
        { status: 429 }
      );
    }

    if (err.status === 403 || /forbidden|permission|billing/i.test(err.message ?? "")) {
      return NextResponse.json(
        { error: "OpenAI request forbidden. Check project permissions/billing." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected server error while processing chat." },
      { status: 500 }
    );
  }
}
