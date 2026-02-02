import { NextRequest, NextResponse } from "next/server";
import { driveFileStore } from "@/lib/drive_store";

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get("folderId");
  if (!folderId) {
    return NextResponse.json({ error: "folderId is required" }, { status: 400 });
  }
  return NextResponse.json(driveFileStore.listByFolder(folderId));
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.folderId || !body.name) {
    return NextResponse.json({ error: "folderId and name are required" }, { status: 400 });
  }
  const file = driveFileStore.create({
    folderId: body.folderId,
    name: body.name,
    mimeType: body.mimeType ?? "application/octet-stream",
    category: body.category ?? "other",
    url: body.url ?? "",
  });
  return NextResponse.json(file, { status: 201 });
}
