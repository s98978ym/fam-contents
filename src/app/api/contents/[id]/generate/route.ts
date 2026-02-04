import { NextResponse } from "next/server";
import { contentStore, variantStore } from "@/lib/store";
import type { Channel } from "@/types/content_package";
import { isGeminiAvailable, generateJSON } from "@/lib/gemini";

// ---------------------------------------------------------------------------
// Gemini によるチャネル別コンテンツ生成
// ---------------------------------------------------------------------------

interface GenerationContext {
  title: string;
  summary: string;
  files?: { name: string; category: string }[];
  analysisDirection?: string;
  taste?: string;
  customInstructions?: string;
}

function buildChannelPrompt(channel: Channel, ctx: GenerationContext): string {
  let base = `あなたはマルチチャネル・コンテンツ運用のプロフェッショナルです。
以下のコンテンツ情報をもとに、指定チャネル向けのコンテンツを生成してください。

## コンテンツ情報
タイトル: ${ctx.title}
概要: ${ctx.summary || ctx.title}

`;

  // 素材ファイル情報を追加
  if (ctx.files && ctx.files.length > 0) {
    base += `## 参照素材ファイル
${ctx.files.map((f) => `- ${f.name}（${f.category}）`).join("\n")}

`;
  }

  // AI分析の方向性を追加
  if (ctx.analysisDirection) {
    base += `## AI分析による方向性
${ctx.analysisDirection}

`;
  }

  // テイスト指定
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

  // カスタム指示
  if (ctx.customInstructions) {
    base += `## 追加指示
${ctx.customInstructions}

`;
  }

  switch (channel) {
    case "instagram_reels":
      return base + `## チャネル: Instagram Reels

以下の仕様に基づいてReels台本を生成してください:
- 台本構造: Hook(3秒) → 課題提示(10秒) → エビデンス(20秒) → 実践例(15秒) → CTA(7秒)
- 尺: 30〜90秒
- テロップ: 各セクション見出し + 要点（20文字以内/行）
- サムネ文言: 20文字以内、疑問形 or 数字訴求
- キャプション: 300文字以内、改行あり、CTA含む
- ハッシュタグ: 最大15個（大/中/小ボリューム混合）
- 免責: キャプション末尾に記載

## 出力JSON形式
{
  "script": {
    "hook": "最初の3秒で注意を引くセリフ",
    "problem": "課題提示（10秒分）",
    "evidence": "エビデンス・根拠（20秒分）",
    "practice": "実践例・具体的アクション（15秒分）",
    "cta": "行動喚起（7秒分）"
  },
  "duration_sec": 60,
  "thumbnail_text": "サムネ文言（20文字以内）",
  "caption": "キャプション全文（300文字以内、改行・CTA・免責含む）",
  "hashtags": ["#タグ1", "#タグ2"]
}`;

    case "instagram_stories":
      return base + `## チャネル: Instagram Stories

以下の仕様に基づいてStories用コンテンツを生成してください:
- タイプ: ステップ構成（3〜5枚で1つの学びを提供）
- 各スライド: 背景画像指示 + テキスト（15文字以内）+ スタンプ指定
- 最終スライド: リンクスタンプ + CTA

## 出力JSON形式
{
  "type": "step_learning",
  "slides": [
    { "text": "スライド1のテキスト", "sticker": "question/countdown/link/none", "bg_instruction": "背景画像の指示" },
    { "text": "スライド2のテキスト", "sticker": "none", "bg_instruction": "背景画像の指示" }
  ]
}`;

    case "instagram_feed":
      return base + `## チャネル: Instagram Feed（カルーセル5枚）

以下の仕様に基づいてカルーセル投稿を生成してください:
- スライド1: 表紙（課題提起 or 数字フック）
- スライド2: よくある誤解
- スライド3: 正しい理解（エビデンス付き）
- スライド4: 実践方法
- スライド5: CTA + 免責 + 監修者名
- キャプション: 本文 + ハッシュタグ

## 出力JSON形式
{
  "carousel": [
    { "slide": 1, "content": "表紙", "text": "スライドのテキスト", "design_note": "デザイン指示" },
    { "slide": 2, "content": "よくある誤解", "text": "テキスト", "design_note": "デザイン指示" },
    { "slide": 3, "content": "正しい理解", "text": "テキスト", "design_note": "デザイン指示" },
    { "slide": 4, "content": "実践方法", "text": "テキスト", "design_note": "デザイン指示" },
    { "slide": 5, "content": "CTA", "text": "テキスト", "design_note": "デザイン指示" }
  ],
  "caption": "キャプション全文",
  "hashtags": ["#タグ1", "#タグ2"]
}`;

    case "event_lp":
      return base + `## チャネル: イベントLP

以下の仕様に基づいてLP用コンテンツを生成してください:
- Hero: タイトル / サブコピー / CTA
- 価値提案: 3つのベネフィット
- FAQ: 5〜8問
- SEO: meta title(60文字) / description(120文字) / OGテキスト

## 出力JSON形式
{
  "hero": {
    "title": "LPタイトル",
    "subtitle": "サブコピー",
    "cta": "CTAボタンテキスト"
  },
  "value_propositions": ["ベネフィット1", "ベネフィット2", "ベネフィット3"],
  "faq": [
    { "question": "質問", "answer": "回答" }
  ],
  "seo": {
    "meta_title": "メタタイトル（60文字以内）",
    "meta_description": "メタディスクリプション（120文字以内）",
    "og_text": "OGテキスト"
  }
}`;

    case "note":
      return base + `## チャネル: note記事

以下の仕様に基づいてnote記事を生成してください:
- タイトル案: 3案（数字訴求/疑問形/宣言形）
- リード文: 100文字以内
- 本文: Markdown形式、見出しh2×3〜5、h3適宜
- 引用・根拠: blockquoteで引用し引用元を明記
- 免責: 記事末尾に定型文
- タグ: 5〜10個
- OG画像テキスト: 25文字以内
- CTA: 記事末尾にイベント申込/問い合わせ導線

## 出力JSON形式
{
  "title_variants": ["タイトル案1", "タイトル案2", "タイトル案3"],
  "lead": "リード文（100文字以内）",
  "body_markdown": "本文（Markdown形式）",
  "tags": ["タグ1", "タグ2"],
  "og_text": "OG画像テキスト（25文字以内）"
}`;

    case "line":
      return base + `## チャネル: LINE配信

以下の仕様に基づいてLINEメッセージを生成してください:
- メッセージ本文: 簡潔で親しみやすいトーン、CTA含む
- セグメント: B2B(チーム)/B2C(サブスク)/アカデミーのどれに最適か判断
- ステップ配信: イベント前後の5段階メッセージ（7日前/3日前/前日/当日/翌日）

## 出力JSON形式
{
  "message": "メッセージ本文（改行含む）",
  "segment": "all/b2b_team/b2c_subscriber/academy_student",
  "step_delivery": [
    { "timing": "7days_before", "text": "7日前メッセージ" },
    { "timing": "3days_before", "text": "3日前メッセージ" },
    { "timing": "1day_before", "text": "前日メッセージ" },
    { "timing": "day_of", "text": "当日メッセージ" },
    { "timing": "after", "text": "翌日メッセージ" }
  ]
}`;

    default:
      return base + `## 出力JSON形式
{ "text": "生成されたコンテンツテキスト" }`;
  }
}

async function generateWithGemini(
  channel: Channel,
  ctx: GenerationContext
): Promise<Record<string, unknown>> {
  const prompt = buildChannelPrompt(channel, ctx);
  return await generateJSON<Record<string, unknown>>(prompt, {
    temperature: 0.7,
    maxOutputTokens: 4096,
  });
}

// ---------------------------------------------------------------------------
// フォールバック: スタブ生成（APIキー未設定時）
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// API Handler
// ---------------------------------------------------------------------------

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

  // リクエストボディからコンテキストを構築（素材ファイル・設定・分析結果）
  const ctx: GenerationContext = {
    title: body.title || content.title,
    summary: body.summary || content.summary,
    files: body.files,
    analysisDirection: body.analysisDirection,
    taste: body.taste,
    customInstructions: body.customInstructions,
  };

  const generated = [];
  for (const channel of channels) {
    const existing = variantStore.listByContent(id).find((v) => v.channel === channel);
    if (existing) {
      generated.push(existing);
      continue;
    }

    let variantBody: Record<string, unknown>;

    // Gemini API が利用可能なら本物のAI生成
    if (isGeminiAvailable) {
      try {
        console.log(`[generate] Gemini API でチャネル ${channel} のコンテンツを生成...`);
        variantBody = await generateWithGemini(channel, ctx);
        console.log(`[generate] Gemini API 成功: ${channel}`);
      } catch (err) {
        console.error(`[generate] Gemini API エラー (${channel}), フォールバック:`, err);
        variantBody = generateVariantBody(channel, ctx.title);
      }
    } else {
      variantBody = generateVariantBody(channel, ctx.title);
    }

    generated.push(
      variantStore.create({
        content_id: id,
        channel,
        status: "draft",
        body: variantBody,
      })
    );
  }

  // Update content status to review
  contentStore.update(id, { status: "review" });

  return NextResponse.json({ content_id: id, variants: generated }, { status: 201 });
}
