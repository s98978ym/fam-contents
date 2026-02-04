import { NextResponse } from "next/server";
import { knowledgePostStore } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!body.user) {
    return NextResponse.json({ error: "user is required" }, { status: 400 });
  }

  const updated = knowledgePostStore.toggleLike(id, body.user);

  if (!updated) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
