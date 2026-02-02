import { NextResponse } from "next/server";
import { publishJobStore, contentStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(publishJobStore.list());
}

export async function POST(request: Request) {
  const body = await request.json();
  const required = ["content_id", "channel", "scheduled_at"];
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json({ error: `${key} is required` }, { status: 400 });
    }
  }

  const content = contentStore.get(body.content_id);
  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }
  if (content.status !== "approved") {
    return NextResponse.json({ error: "Content must be approved before publishing" }, { status: 400 });
  }

  const job = publishJobStore.create({
    content_id: body.content_id,
    channel: body.channel,
    status: "queued",
    scheduled_at: body.scheduled_at,
  });

  return NextResponse.json(job, { status: 201 });
}
