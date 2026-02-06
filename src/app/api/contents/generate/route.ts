import { NextResponse } from "next/server";
import type { Channel } from "@/types/content_package";
import { isGeminiAvailable, generateJSON } from "@/lib/gemini";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GenerationContext {
  title: string;
  summary: string;
  channel: Channel;
  files?: { name: string; category: string }[];
  fileContents?: { name: string; content: string }[];
  analysisDirection?: string;
  taste?: string;
  customInstructions?: string;
}

// ---------------------------------------------------------------------------
// Gemini プロンプト構築
// ---------------------------------------------------------------------------

function buildChannelPrompt(ctx: GenerationContext): string {
  let base = `あなたはマルチチャネル・コンテンツ運用のプロフェッショナルです。
以下の情報をもとに、指定チャネル向けのコンテンツを生成してください。

## コンテンツ情報
タイトル: ${ctx.title}
概要: ${ctx.summary || ctx.title}

`;

  if (ctx.files && ctx.files.length > 0) {
    base += `## 参照素材ファイル
${ctx.files.map((f) => `- ${f.name}（${f.category}）`).join("\n")}

素材ファイルの内容を踏まえて、具体的で実用的なコンテンツを生成すること。
ファイル名から推測できるテーマ・内容を最大限活用する。

`;
  }

  if (ctx.fileContents && ctx.fileContents.length > 0) {
    base += `## アップロードされたファイルの内容

以下のファイル内容に基づいて、正確で具体的なコンテンツを生成すること。ファイル名の推測ではなく、実際の内容を活用すること。

`;
    for (const fc of ctx.fileContents) {
      // 長すぎるファイルは先頭3000文字に制限
      const truncated = fc.content.length > 3000 ? fc.content.slice(0, 3000) + "\n...（以下省略）" : fc.content;
      base += `### ${fc.name}\n\`\`\`\n${truncated}\n\`\`\`\n\n`;
    }
  }

  if (ctx.analysisDirection) {
    base += `## AI分析による方向性
${ctx.analysisDirection}

`;
  }

  if (ctx.taste) {
    const tasteMap: Record<string, string> = {
      scientific: "科学的・エビデンスベース。研究データや専門家の見解を重視",
      casual: "カジュアル・親しみやすい。日常語で読者に寄り添うトーン",
      professional: "プロフェッショナル・信頼感。業界用語を適切に使い権威性を出す",
      emotional: "感情に訴える。ストーリーテリングや共感を重視",
    };
    base += `## トーン・テイスト
${tasteMap[ctx.taste] || ctx.taste}

`;
  }

  if (ctx.customInstructions) {
    base += `## 追加指示
${ctx.customInstructions}

`;
  }

  switch (ctx.channel) {
    case "instagram_reels":
      return base + `## チャネル: Instagram Reels

台本構造: Hook(3秒) → 課題提示(10秒) → エビデンス(20秒) → 実践例(15秒) → CTA(7秒)

## 出力JSON形式
{
  "hook": "最初の3秒で注意を引くセリフ",
  "problem": "課題提示（10秒分）",
  "evidence": "エビデンス・根拠（20秒分）",
  "evidence_source": "引用元",
  "practice": "実践例・具体的アクション（15秒分）",
  "cta": "行動喚起（7秒分）",
  "thumbnail_text": "サムネ文言（20文字以内）",
  "caption": "キャプション全文（300文字以内）",
  "hashtags": ["タグ1", "タグ2"],
  "disclaimer": "免責事項"
}`;

    case "instagram_stories":
      return base + `## チャネル: Instagram Stories

3〜5枚のスライドで1つの学びを提供するステップ構成。

## 出力JSON形式
{
  "story_type": "step_learning または poll または announcement",
  "poll_question": "投票の質問（pollの場合）",
  "slides": [
    { "text": "スライドのテキスト（15文字以内）", "sticker": "question/countdown/link/none", "image_note": "背景画像の指示" }
  ]
}`;

    case "instagram_feed":
      return base + `## チャネル: Instagram Feed（カルーセル5枚）

スライド1: 表紙（課題提起 or 数字フック）
スライド2: よくある誤解
スライド3: 正しい理解（エビデンス付き）
スライド4: 実践方法
スライド5: CTA + 免責

## 出力JSON形式
{
  "slide1_cover": "表紙テキスト",
  "slide2_misconception": "よくある誤解",
  "slide3_truth": "正しい理解（エビデンス付き）",
  "slide4_practice": "実践方法",
  "slide5_cta": "CTA",
  "caption": "キャプション全文",
  "hashtags": ["タグ1", "タグ2"],
  "disclaimer": "免責事項"
}`;

    case "event_lp":
      return base + `## チャネル: イベントLP

Hero + 価値提案 + FAQ + SEO情報を生成。

## 出力JSON形式
{
  "title": "LPタイトル",
  "subtitle": "サブコピー",
  "event_date": "開催日時の提案",
  "event_location": "開催場所の提案",
  "event_price": "価格の提案",
  "cta_text": "CTAボタンテキスト",
  "benefits": ["ベネフィット1", "ベネフィット2", "ベネフィット3"],
  "faqs": [{ "q": "質問", "a": "回答" }],
  "meta_title": "メタタイトル（60文字以内）",
  "meta_description": "メタディスクリプション（120文字以内）",
  "disclaimer": "免責事項"
}`;

    case "note":
      return base + `## チャネル: note記事

タイトル案3つ + リード + 本文（Markdown） + タグ + CTA。

## 出力JSON形式
{
  "title_option1": "タイトル案1（数字訴求）",
  "title_option2": "タイトル案2（疑問形）",
  "lead": "リード文（100文字以内）",
  "body_markdown": "本文（Markdown形式、h2見出し3〜5個）",
  "tags": ["タグ1", "タグ2"],
  "og_text": "OG画像テキスト（25文字以内）",
  "cta_label": "CTA",
  "disclaimer": "免責事項"
}`;

    case "line":
      return base + `## チャネル: LINE配信

メッセージ本文 + セグメント + ステップ配信メッセージ。

## 出力JSON形式
{
  "delivery_type": "broadcast",
  "segment": "all/b2b_team/b2c_subscriber/academy_student",
  "message_text": "メッセージ本文（改行含む、CTA含む）",
  "cta_label": "CTAテキスト",
  "step_messages": [
    { "timing": "7日前", "content": "メッセージ" },
    { "timing": "前日", "content": "メッセージ" },
    { "timing": "翌日", "content": "メッセージ" }
  ]
}`;

    default:
      return base + `## 出力JSON形式
{ "text": "生成されたコンテンツテキスト" }`;
  }
}

// ---------------------------------------------------------------------------
// フォールバック
// ---------------------------------------------------------------------------

function fallbackContent(ctx: GenerationContext): Record<string, unknown> {
  const t = ctx.title;
  switch (ctx.channel) {
    case "instagram_reels":
      return {
        hook: `${t}、知っていますか？`,
        problem: "多くの人が見落としているポイントがあります。",
        evidence: "研究データによると効果が期待できます。",
        evidence_source: "参考文献",
        practice: "明日から実践できる3つのステップ",
        cta: "詳しくはプロフィールのリンクから",
        thumbnail_text: t.slice(0, 20),
        caption: `${t}\n\n科学的根拠に基づいた解説をお届けします。\n\n※個人差があります。`,
        hashtags: ["スポーツ栄養", "FAMアカデミー"],
        disclaimer: "※個人差があります。専門家にご相談ください。",
      };
    case "instagram_stories":
      return {
        story_type: "step_learning",
        slides: [
          { text: t.slice(0, 15), sticker: "countdown", image_note: "テーマに合った画像" },
          { text: "ポイントはこれ", sticker: "none", image_note: "解説画像" },
          { text: "詳しくはリンクから", sticker: "link", image_note: "CTA画像" },
        ],
      };
    case "instagram_feed":
      return {
        slide1_cover: `知らないと損する\n${t.slice(0, 15)}`, slide2_misconception: "よくある誤解があります", slide3_truth: "研究では効果が示されています",
        slide4_practice: "明日から実践できるステップ", slide5_cta: "詳しくはプロフィールのリンクから",
        caption: `${t}\n\n5枚でわかる科学的アプローチ`, hashtags: ["スポーツ栄養"], disclaimer: "※個人差があります。",
      };
    case "event_lp":
      return {
        title: t, subtitle: "科学的根拠に基づく実践セミナー", event_date: "未定", event_location: "オンライン（Zoom）", event_price: "無料",
        cta_text: "今すぐ申し込む", benefits: ["最新のエビデンスに基づく知識", "すぐに実践できるノウハウ", "専門家への質問機会"],
        faqs: [{ q: "知識がなくても参加できますか？", a: "はい、初心者向けです。" }],
        meta_title: `${t.slice(0, 50)} | FAM`, meta_description: `${t}についてエビデンスベースで学べるセミナー。`, disclaimer: "※内容は予告なく変更になる場合があります。",
      };
    case "note":
      return {
        title_option1: t, title_option2: `${t}を科学的に解説`,
        lead: `${t}について、最新の研究をもとに解説します。`,
        body_markdown: `## はじめに\n\n${t}について解説します。\n\n## 科学的根拠\n\n...\n\n## 実践方法\n\n...\n\n## まとめ\n\n※個人差があります。`,
        tags: ["スポーツ栄養", "科学"], og_text: t.slice(0, 25), cta_label: "無料体験に申し込む", disclaimer: "※一般的な情報提供です。",
      };
    case "line":
      return {
        delivery_type: "broadcast", segment: "all",
        message_text: `【NEW】${t}\n\n詳しくはこちら▼`, cta_label: "詳細はこちら",
        step_messages: [{ timing: "7日前", content: "イベント告知" }, { timing: "前日", content: "リマインダー" }, { timing: "翌日", content: "お礼+アンケート" }],
      };
    default:
      return { text: t };
  }
}

// ---------------------------------------------------------------------------
// API Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { channel, title, summary } = body;

    if (!channel || !title) {
      return NextResponse.json({ error: "channel and title are required" }, { status: 400 });
    }

    // Validate fileContents if provided
    const validFileContents: { name: string; content: string }[] | undefined =
      Array.isArray(body.fileContents) && body.fileContents.length > 0
        ? body.fileContents.filter((fc: { name?: string; content?: string }) => fc.name && fc.content)
        : undefined;

    if (validFileContents) {
      console.log(`[generate] ファイル内容 ${validFileContents.length}件を含むリクエスト`);
    }

    const ctx: GenerationContext = {
      title,
      summary: summary || title,
      channel,
      files: body.files,
      fileContents: validFileContents,
      analysisDirection: body.analysisDirection,
      taste: body.taste,
      customInstructions: body.customInstructions,
    };

    let source: "gemini" | "simulation" = "simulation";
    let fallbackReason = "";
    let content: Record<string, unknown>;

    if (isGeminiAvailable) {
      try {
        console.log(`[generate] Gemini API でチャネル ${channel} のコンテンツを生成...`);
        const prompt = buildChannelPrompt(ctx);
        console.log(`[generate] Prompt preview (first 500 chars):`, prompt.slice(0, 500));
        content = await generateJSON<Record<string, unknown>>(prompt, {
          temperature: 0.7,
          maxOutputTokens: 4096,
        });
        console.log(`[generate] Gemini raw response:`, JSON.stringify(content, null, 2).slice(0, 1000));
        source = "gemini";
        console.log(`[generate] Gemini API 成功: ${channel}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[generate] Gemini API エラー (${channel}), フォールバック:`, errMsg);
        content = fallbackContent(ctx);
        fallbackReason = `Gemini APIエラー: ${errMsg}`;
      }
    } else {
      console.log("[generate] GEMINI_API_KEY 未設定のためシミュレーションモードで動作");
      content = fallbackContent(ctx);
      fallbackReason = "GEMINI_API_KEY が未設定です";
    }

    return NextResponse.json({
      channel,
      content,
      source,
      ...(fallbackReason ? { fallback_reason: fallbackReason } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
