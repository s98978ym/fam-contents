import { NextResponse } from "next/server";
import { sampleContents } from "@/lib/sample_data";

export async function GET() {
  return NextResponse.json(sampleContents);
}
