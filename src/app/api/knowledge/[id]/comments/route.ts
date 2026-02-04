import { NextResponse } from "next/server";
import { knowledgeCommentStore, knowledgePostStore } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const comments = knowledgeCommentStore.listByPost(id);
  return NextResponse.json(comments);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Check if post exists
  const post = knowledgePostStore.get(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (!body.author || !body.body) {
    return NextResponse.json(
      { error: "author and body are required" },
      { status: 400 }
    );
  }

  const comment = knowledgeCommentStore.create({
    post_id: id,
    author: body.author,
    body: body.body,
  });

  return NextResponse.json(comment, { status: 201 });
}
