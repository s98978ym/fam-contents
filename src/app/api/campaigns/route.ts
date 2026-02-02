import { NextResponse } from "next/server";
import { campaignStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(campaignStore.list());
}

export async function POST(request: Request) {
  const body = await request.json();
  const required = ["name", "objective", "start_date", "end_date", "status"];
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json({ error: `${key} is required` }, { status: 400 });
    }
  }
  const campaign = campaignStore.create({
    name: body.name,
    objective: body.objective,
    start_date: body.start_date,
    end_date: body.end_date,
    status: body.status,
    content_ids: body.content_ids ?? [],
  });
  return NextResponse.json(campaign, { status: 201 });
}
