import { NextResponse } from "next/server";
import { systemPromptStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(systemPromptStore.list());
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const existing = systemPromptStore.getByKey(key);
    if (!existing) {
      return NextResponse.json({ error: `System prompt "${key}" not found` }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.prompt === "string") patch.prompt = body.prompt;
    if (typeof body.model === "string") patch.model = body.model;
    if (typeof body.temperature === "number") patch.temperature = body.temperature;
    if (typeof body.maxOutputTokens === "number") patch.maxOutputTokens = body.maxOutputTokens;
    if (typeof body.updated_by === "string") patch.updated_by = body.updated_by;

    const updated = systemPromptStore.update(key, patch);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
