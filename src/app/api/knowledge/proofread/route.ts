import { NextResponse } from "next/server";
import type { KnowledgeCategory } from "@/types/content_package";

// ---------------------------------------------------------------------------
// AI校正シミュレーション（実際にはOpenAI APIなどを使用）
// ---------------------------------------------------------------------------

function simulateAIProofread(text: string): string {
  if (!text.trim()) return text;

  let result = text;

  // 1. 句点・読点の正規化
  result = result.replace(/、、/g, "、");
  result = result.replace(/。。/g, "。");
  result = result.replace(/、\s*。/g, "。");

  // 2. 冗長表現の簡潔化
  const simplifications: [RegExp, string][] = [
    [/することができます/g, "できます"],
    [/することが可能です/g, "できます"],
    [/ということ(です|になります)/g, "です"],
    [/といった形で/g, "として"],
    [/を行う(こと)?/g, "する"],
    [/させていただきます/g, "します"],
    [/いただければと思います/g, "ください"],
    [/という風に/g, "のように"],
    [/の方が/g, "が"],
    [/てしまいました/g, "ました"],
    [/なのですが/g, "ですが"],
    [/というのは/g, "は"],
  ];

  for (const [pattern, replacement] of simplifications) {
    result = result.replace(pattern, replacement);
  }

  // 3. 段落の整理（連続する改行を2つに統一）
  result = result.replace(/\n{3,}/g, "\n\n");

  // 4. 箇条書きの検出と整形
  const lines = result.split("\n");
  const formattedLines = lines.map((line) => {
    const trimmed = line.trim();

    // ・で始まる行の統一
    if (/^[・\-\*]/.test(trimmed)) {
      return line.replace(/^(\s*)[・\-\*]\s*/, "$1・ ");
    }

    return line;
  });
  result = formattedLines.join("\n");

  // 5. 文章の補足（キーワードに基づく追加情報）
  const addendums: { keyword: string; supplement: string }[] = [
    { keyword: "効率", supplement: "\n\n💡 ポイント: 効率化を進める際は、まず現状の課題を明確にすることが重要です。" },
    { keyword: "Instagram", supplement: "\n\n📱 補足: Instagramの最新アルゴリズム動向も参考にしてみてください。" },
    { keyword: "テンプレート", supplement: "\n\n📋 Tip: テンプレートは定期的に見直し、改善を続けることが大切です。" },
    { keyword: "AI", supplement: "\n\n🤖 補足: AIツールの活用は日々進化しています。最新情報のキャッチアップも忘れずに。" },
    { keyword: "デザイン", supplement: "\n\n🎨 補足: 一貫したデザインルールを設けることでブランド認知の向上につながります。" },
    { keyword: "分析", supplement: "\n\n📊 Tip: 定量データと定性フィードバックの両方から分析することで精度が上がります。" },
  ];

  for (const { keyword, supplement } of addendums) {
    if (result.includes(keyword) && !result.includes(supplement.trim())) {
      result += supplement;
      break;
    }
  }

  // 6. 接続詞の適切な使用（文頭の「なので」を「そのため」に）
  result = result.replace(/^なので、/gm, "そのため、");
  result = result.replace(/\nなので、/g, "\nそのため、");

  // 7. 全角・半角の統一（数字は半角に）
  result = result.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));

  return result.trim();
}

// ---------------------------------------------------------------------------
// タグ自動生成
// ---------------------------------------------------------------------------

const TAG_KEYWORDS: { pattern: RegExp; tag: string }[] = [
  { pattern: /instagram|インスタ|リール|ストーリーズ|フィード/i, tag: "Instagram" },
  { pattern: /twitter|ツイート|x\.com/i, tag: "Twitter" },
  { pattern: /line|ライン/i, tag: "LINE" },
  { pattern: /note\.com|note記事/i, tag: "note" },
  { pattern: /tiktok|ティックトック/i, tag: "TikTok" },
  { pattern: /seo|検索エンジン|検索順位/i, tag: "SEO" },
  { pattern: /ai|chatgpt|プロンプト|生成ai/i, tag: "AI" },
  { pattern: /canva|figma|photoshop|デザインツール/i, tag: "デザイン" },
  { pattern: /テンプレート|ひな形/i, tag: "テンプレート" },
  { pattern: /効率化|時短|自動化|ワークフロー/i, tag: "効率化" },
  { pattern: /分析|データ|エンゲージメント|kpi|指標/i, tag: "分析" },
  { pattern: /レビュー|チェック|品質|qa/i, tag: "品質管理" },
  { pattern: /コピーライティング|ライティング|文章/i, tag: "ライティング" },
  { pattern: /写真|撮影|画像|ビジュアル/i, tag: "ビジュアル" },
  { pattern: /動画|映像|編集|リール/i, tag: "動画" },
  { pattern: /ブランド|トーン|ボイス/i, tag: "ブランド" },
  { pattern: /マーケティング|広告|集客/i, tag: "マーケティング" },
  { pattern: /プロジェクト|タスク|進捗/i, tag: "プロジェクト管理" },
];

function suggestTags(text: string, title: string): string[] {
  const combined = `${title} ${text}`.toLowerCase();
  const tags = new Set<string>();

  for (const { pattern, tag } of TAG_KEYWORDS) {
    if (pattern.test(combined)) {
      tags.add(tag);
    }
  }

  return Array.from(tags).slice(0, 5); // 最大5つ
}

// ---------------------------------------------------------------------------
// カテゴリ自動判定
// ---------------------------------------------------------------------------

const CATEGORY_RULES: { pattern: RegExp; category: KnowledgeCategory; weight: number }[] = [
  { pattern: /コツ|tips|ポイント|小技|裏技|テクニック/i, category: "tips", weight: 2 },
  { pattern: /方法|やり方|手順|ステップ|how\s*to|ハウツー|手引き/i, category: "howto", weight: 2 },
  { pattern: /ツール|アプリ|サービス|プラグイン|拡張/i, category: "tool", weight: 2 },
  { pattern: /プロセス|フロー|ワークフロー|効率化|改善|自動化/i, category: "process", weight: 2 },
  { pattern: /分析|データ|結果|数値|レポート|インサイト|気づき/i, category: "insight", weight: 2 },
  { pattern: /テンプレート|資料|リソース|素材|共有ファイル/i, category: "resource", weight: 2 },
  { pattern: /お知らせ|告知|連絡|アナウンス|重要/i, category: "announcement", weight: 2 },
  // 補助ルール（weight低め）
  { pattern: /おすすめ|便利|使える/i, category: "tips", weight: 1 },
  { pattern: /チェックリスト|マニュアル|ガイド/i, category: "howto", weight: 1 },
  { pattern: /canva|figma|slack|notion/i, category: "tool", weight: 1 },
  { pattern: /振り返り|まとめ|レビュー結果/i, category: "insight", weight: 1 },
];

function suggestCategory(text: string, title: string): KnowledgeCategory {
  const combined = `${title} ${text}`;
  const scores: Record<string, number> = {};

  for (const { pattern, category, weight } of CATEGORY_RULES) {
    if (pattern.test(combined)) {
      scores[category] = (scores[category] || 0) + weight;
    }
  }

  const entries = Object.entries(scores);
  if (entries.length === 0) return "other";

  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] as KnowledgeCategory;
}

// ---------------------------------------------------------------------------
// API Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { text, title } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text field is required" },
        { status: 400 }
      );
    }

    const titleStr = typeof title === "string" ? title : "";

    // シミュレーション用の遅延（実際のAI APIの応答時間を模倣）
    await new Promise((resolve) => setTimeout(resolve, 800));

    const proofread = simulateAIProofread(text);
    const suggestedTags = suggestTags(proofread, titleStr);
    const suggestedCategory = suggestCategory(proofread, titleStr);
    const textChanged = text !== proofread;
    const hasTags = suggestedTags.length > 0;
    const categoryMeaningful = suggestedCategory !== "other";

    return NextResponse.json({
      original: text,
      proofread,
      changes_made: textChanged || hasTags || categoryMeaningful,
      suggested_tags: suggestedTags,
      suggested_category: suggestedCategory,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
