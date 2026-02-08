import { NextResponse } from "next/server";
import { knowledgePostStore, knowledgeCommentStore } from "@/lib/store";

export async function GET() {
  const posts = knowledgePostStore.list();
  const comments = knowledgeCommentStore.list();
  return NextResponse.json({ posts, comments });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.author || !body.title || !body.body) {
    return NextResponse.json(
      { error: "author, title, body are required" },
      { status: 400 }
    );
  }

  const post = knowledgePostStore.create({
    author: body.author,
    team_id: body.team_id,
    title: body.title,
    body: body.body,
    images: body.images || [],
    tags: body.tags || [],
    category: body.category || "other",
    attachments: body.attachments || [],
  });

  return NextResponse.json(post, { status: 201 });
}
