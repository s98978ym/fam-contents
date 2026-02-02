import { NextResponse } from "next/server";
import { reviewStore, contentStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(reviewStore.list());
}

export async function POST(request: Request) {
  const body = await request.json();
  const required = ["content_id", "reviewer", "role", "decision", "comment"];
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json({ error: `${key} is required` }, { status: 400 });
    }
  }

  const review = reviewStore.create({
    content_id: body.content_id,
    reviewer: body.reviewer,
    role: body.role,
    decision: body.decision,
    comment: body.comment,
    labels: body.labels ?? [],
  });

  if (body.decision === "approved") {
    contentStore.update(body.content_id, { status: "approved" });
  } else if (body.decision === "revision_requested") {
    contentStore.update(body.content_id, { status: "draft" });
  } else if (body.decision === "rejected") {
    contentStore.update(body.content_id, { status: "draft" });
  }

  return NextResponse.json(review, { status: 201 });
}
