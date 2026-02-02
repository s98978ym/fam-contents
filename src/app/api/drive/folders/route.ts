import { NextResponse } from "next/server";
import { driveFolderStore } from "@/lib/drive_store";

export async function GET() {
  return NextResponse.json(driveFolderStore.list());
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const folder = driveFolderStore.create(name);
  return NextResponse.json(folder, { status: 201 });
}
