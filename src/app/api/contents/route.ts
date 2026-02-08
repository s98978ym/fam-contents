import { NextResponse } from "next/server";
import { contentStore } from "@/lib/store";

export async function GET() {
  return NextResponse.json(contentStore.list());
}

export async function POST(request: Request) {
  const body = await request.json();
  // title と created_by は必須。それ以外はデフォルト値で補完
  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const content = contentStore.create({
    campaign_id: body.campaign_id ?? "",
    status: body.status ?? "draft",
    info_classification: body.info_classification ?? "public",
    objective: body.objective ?? "",
    funnel_stage: body.funnel_stage ?? "",
    persona: body.persona ?? [],
    title: body.title,
    summary: body.summary ?? body.title,
    key_messages: body.key_messages ?? [],
    disclaimers: body.disclaimers ?? [],
    do_not_say: body.do_not_say ?? ["絶対", "必ず痩せる", "治る", "医学的に証明"],
    risk_flags: body.risk_flags ?? [],
    cta_set: body.cta_set ?? [],
    utm_plan: body.utm_plan ?? { source: "", medium: "", campaign: "" },
    asset_plan: body.asset_plan ?? [],
    target_channels: body.target_channels ?? [],
    created_by: body.created_by ?? "unknown",
    attachments: body.attachments ?? [],
  });
  return NextResponse.json(content, { status: 201 });
}
