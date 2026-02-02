import { NextResponse } from "next/server";
import { sampleMetrics } from "@/lib/sample_data";

export async function GET() {
  return NextResponse.json(sampleMetrics);
}
