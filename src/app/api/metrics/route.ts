import { NextResponse } from "next/server";
import { metricStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(metricStore.list());
}
