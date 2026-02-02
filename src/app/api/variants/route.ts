import { NextResponse } from "next/server";
import { variantStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(variantStore.list());
}
