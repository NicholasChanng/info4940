import { NextResponse } from "next/server";

import { expandPromptOptions } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const prompt =
    body !== null &&
    typeof body === "object" &&
    "prompt" in body &&
    typeof (body as { prompt: unknown }).prompt === "string"
      ? ((body as { prompt: string }).prompt).trim()
      : null;

  if (!prompt) {
    return NextResponse.json(
      { error: "A non-empty prompt string is required." },
      { status: 400 },
    );
  }

  try {
    const options = await expandPromptOptions(prompt);
    return NextResponse.json({ options });
  } catch {
    return NextResponse.json(
      { error: "Could not generate prompt expansions." },
      { status: 500 },
    );
  }
}
