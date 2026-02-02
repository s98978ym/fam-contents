import { NextResponse } from "next/server";
import { contentStore, variantStore } from "@/lib/store";
import type { Channel } from "@/types/content_package";

/**
 * POST /api/contents/:id/generate
 * Generates channel variants for the given content.
 * In production, this calls Dify/Gemini APIs. For now, generates stub variants.
 */

// Channel-specific stub generators
function generateVariantBody(channel: Channel, title: string): Record<string, unknown> {
  switch (channel) {
    case "instagram_reels":
      return {
        script: {
          hook: `${title}、知っていますか？`,
          problem: "多くの人が見落としているポイント",
          evidence: "研究データによると...",
          practice: "明日から実践できる3つのステップ",
          cta: "詳しくはプロフィールのリンクから",
        },
        duration_sec: 60,
        thumbnail_text: title.slice(0, 20),
        caption: `${title}\n\n科学的根拠に基づいた解説をお届けします。\n\n※個人差があります。`,
        hashtags: ["#スポーツ栄養", "#FAMアカデミー", "#栄養学"],
      };
    case "instagram_stories":
      return {
        type: "announcement",
        slides: [
          { text: title, sticker: "countdown" },
          { text: "詳しくはリンクから", sticker: "link" },
        ],
      };
    case "instagram_feed":
      return {
        carousel: [
          { slide: 1, content: "表紙", text: title },
          { slide: 2, content: "よくある誤解", text: "実は..." },
          { slide: 3, content: "正しい理解", text: "研究によると..." },
          { slide: 4, content: "実践方法", text: "ステップ1,2,3" },
          { slide: 5, content: "CTA", text: "無料体験はこちら" },
        ],
        caption: `${title}\n\n5枚でわかる科学的アプローチ`,
        hashtags: ["#スポーツ栄養", "#カルーセル"],
      };
    case "event_lp":
      return {
        hero: { title, subtitle: "科学的根拠に基づく実践セミナー", cta: "今すぐ申し込む" },
        value_propositions: ["最新のエビデンスに基づく知識", "すぐに実践できるノウハウ", "専門家への質問機会"],
        seo: {
          meta_title: `${title.slice(0, 50)} | FAM`,
          meta_description: `${title}についてエビデンスベースで学べるセミナー。`,
        },
      };
    case "note":
      return {
        title_variants: [title, `【保存版】${title}`, `${title}を科学的に解説`],
        lead: `${title}について、最新の研究をもとに解説します。`,
        body_markdown: `## はじめに\n\n${title}について解説します。\n\n## 科学的根拠\n\n...\n\n## 実践方法\n\n...\n\n## まとめ\n\n※個人差があります。`,
        tags: ["スポーツ栄養", "科学", "FAM"],
        og_text: title.slice(0, 25),
      };
    case "line":
      return {
        message: `【NEW】${title}\n\n詳しくはこちら▼`,
        segment: "all",
        step_delivery: [
          { timing: "7days_before", text: "イベント告知" },
          { timing: "1day_before", text: "リマインダー" },
          { timing: "after", text: "お礼+アンケート" },
        ],
      };
    default:
      return { text: title };
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const content = contentStore.get(id);
  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const channels: Channel[] = body.channels ?? content.target_channels;

  const generated = channels.map((channel) => {
    const existing = variantStore.listByContent(id).find((v) => v.channel === channel);
    if (existing) return existing;
    return variantStore.create({
      content_id: id,
      channel,
      status: "draft",
      body: generateVariantBody(channel, content.title),
    });
  });

  // Update content status to review
  contentStore.update(id, { status: "review" });

  return NextResponse.json({ content_id: id, variants: generated }, { status: 201 });
}
