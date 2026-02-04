import { NextResponse } from "next/server";
import { contentStore } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const content = contentStore.get(id);
  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }
  return NextResponse.json(content);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const updated = contentStore.update(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
