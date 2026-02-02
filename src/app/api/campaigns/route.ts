import { NextResponse } from "next/server";
import { sampleCampaigns } from "@/lib/sample_data";

export async function GET() {
  return NextResponse.json(sampleCampaigns);
}
