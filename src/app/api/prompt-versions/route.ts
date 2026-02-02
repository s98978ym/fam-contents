import { NextResponse } from "next/server";
import { promptVersionStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(promptVersionStore.list());
}

export async function POST(request: Request) {
  const body = await request.json();
  const required = ["name", "type", "prompt", "changelog", "created_by"];
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json({ error: `${key} is required` }, { status: 400 });
    }
  }

  const version = promptVersionStore.create({
    name: body.name,
    type: body.type,
    version: 0, // auto-calculated in store
    prompt: body.prompt,
    changelog: body.changelog,
    created_by: body.created_by,
  });

  return NextResponse.json(version, { status: 201 });
}
