import { NextResponse } from "next/server";
import { auditStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(auditStore.list());
}
