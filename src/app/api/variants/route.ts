import { NextRequest, NextResponse } from "next/server";
import { variantStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(variantStore.list());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { channel, ...rest } = body;
  if (!channel) {
    return NextResponse.json({ error: "channel is required" }, { status: 400 });
  }
  const variant = variantStore.create({
    content_id: body.content_id ?? "cnt_unlinked",
    channel,
    status: "draft",
    body: rest,
  });
  return NextResponse.json(variant, { status: 201 });
}
