import { NextResponse } from "next/server";
import { sampleReviews } from "@/lib/sample_data";

export async function GET() {
  return NextResponse.json(sampleReviews);
}
