import { NextResponse } from "next/server";
import { samplePublishJobs } from "@/lib/sample_data";

export async function GET() {
  return NextResponse.json(samplePublishJobs);
}
