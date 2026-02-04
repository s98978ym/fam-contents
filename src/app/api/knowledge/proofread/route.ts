import { NextResponse } from "next/server";
import type { KnowledgeCategory } from "@/types/content_package";
import { isGeminiAvailable, generateJSON } from "@/lib/gemini";

// ---------------------------------------------------------------------------
// Gemini AI 校正
// ---------------------------------------------------------------------------

const VALID_CATEGORIES: KnowledgeCategory[] = [
  "tips", "howto", "tool", "process", "insight", "resource", "announcement", "other",
];

interface ProofreadResult {
  proofread: string;
  suggested_tags: string[];
  suggested_category: KnowledgeCategory;
}

function buildProofreadPrompt(text: string, title: string): string {
  return `あなたはプロの日本語エディターです。マルチチャネル・コンテンツ運用チーム向けのナレッジ共有プラットフォームで使われる文章を校正します。

## タスク

以下の「入力テキスト」を校正し、タグとカテゴリを提案してください。

## 校正ルール

1. **文法・表記の修正**: 誤字脱字、助詞の誤り、句読点の抜けを修正
2. **冗長表現の簡潔化**: 「することができます」→「できます」、「させていただきます」→「します」など
3. **読みやすさの向上**: 一文が長すぎる場合は分割、主語と述語の対応を明確に
4. **Markdown記法の除去**: プレーンテキストとして表示されるため、**太字**や*斜体*などのMarkdown記号は除去し、自然な日本語文にする
5. **接続詞の適正化**: 文頭の「なので」→「そのため」、口語的すぎる表現をビジネス文書向けに調整
6. **全角/半角の統一**: 数字は半角、括弧は全角に統一
7. **意味の保持**: 元の文章の意味や主張を変えない。言い回しの改善のみ行う

## タグ提案ルール

テキストの内容から関連するキーワードタグを1〜5個提案してください。
候補例: Instagram, Twitter, LINE, note, TikTok, SEO, AI, デザイン, テンプレート, 効率化, 分析, 品質管理, ライティング, ビジュアル, 動画, ブランド, マーケティング, プロジェクト管理
上記にない独自のタグも提案可能です。

## カテゴリ提案ルール

以下のカテゴリから最も適切なものを1つ選んでください:
- tips: コツ・小技・テクニック
- howto: 手順・やり方・ガイド
- tool: ツール・アプリ・サービスの紹介
- process: プロセス改善・ワークフロー・効率化
- insight: 分析結果・気づき・データから得た知見
- resource: テンプレート・素材・共有リソース
- announcement: お知らせ・告知・連絡事項
- other: 上記に当てはまらない場合

## 入力

タイトル: ${title || "(なし)"}
テキスト:
${text}

## 出力形式

以下のJSON形式で出力してください。他のテキストは含めないでください。

{
  "proofread": "校正後の全文テキスト",
  "suggested_tags": ["タグ1", "タグ2"],
  "suggested_category": "カテゴリ名"
}`;
}

async function proofreadWithGemini(
  text: string,
  title: string
): Promise<ProofreadResult> {
  const prompt = buildProofreadPrompt(text, title);
  const result = await generateJSON<ProofreadResult>(prompt, {
    temperature: 0.3,
    maxOutputTokens: 2048,
  });

  // カテゴリの正規化
  if (!VALID_CATEGORIES.includes(result.suggested_category)) {
    result.suggested_category = "other";
  }

  // タグ数を制限
  if (result.suggested_tags.length > 5) {
    result.suggested_tags = result.suggested_tags.slice(0, 5);
  }

  return result;
}

// ---------------------------------------------------------------------------
// フォールバック: シミュレーション（APIキー未設定時）
// ---------------------------------------------------------------------------

function simulateAIProofread(text: string): string {
  if (!text.trim()) return text;

  let result = text;

  // 句点・読点の正規化
  result = result.replace(/、、/g, "、");
  result = result.replace(/。。/g, "。");
  result = result.replace(/、\s*。/g, "。");

  // 冗長表現の簡潔化
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

  // 段落の整理
  result = result.replace(/\n{3,}/g, "\n\n");

  // 箇条書きの整形
  const lines = result.split("\n");
  const formattedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (/^[・\-\*]/.test(trimmed)) {
      return line.replace(/^(\s*)[・\-\*]\s*/, "$1・ ");
    }
    return line;
  });
  result = formattedLines.join("\n");

  // Markdown記法の除去
  result = result.replace(/\*\*(.+?)\*\*/g, "$1");
  result = result.replace(/\*(.+?)\*/g, "$1");
  result = result.replace(/~~(.+?)~~/g, "$1");

  // 接続詞の修正
  result = result.replace(/^なので、/gm, "そのため、");
  result = result.replace(/\nなので、/g, "\nそのため、");

  // 全角数字→半角
  result = result.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));

  return result.trim();
}

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
  { pattern: /ファン|スポーツ|スタジアム|チーム/i, tag: "スポーツ" },
  { pattern: /体験|エクスペリエンス|顧客体験|UX/i, tag: "顧客体験" },
  { pattern: /リピーター|ロイヤルティ|リテンション|継続/i, tag: "リテンション" },
];

function suggestTags(text: string, title: string): string[] {
  const combined = `${title} ${text}`.toLowerCase();
  const tags = new Set<string>();
  for (const { pattern, tag } of TAG_KEYWORDS) {
    if (pattern.test(combined)) {
      tags.add(tag);
    }
  }
  return Array.from(tags).slice(0, 5);
}

const CATEGORY_RULES: { pattern: RegExp; category: KnowledgeCategory; weight: number }[] = [
  { pattern: /コツ|tips|ポイント|小技|裏技|テクニック/i, category: "tips", weight: 2 },
  { pattern: /方法|やり方|手順|ステップ|how\s*to|ハウツー|手引き/i, category: "howto", weight: 2 },
  { pattern: /ツール|アプリ|サービス|プラグイン|拡張/i, category: "tool", weight: 2 },
  { pattern: /プロセス|フロー|ワークフロー|効率化|改善|自動化/i, category: "process", weight: 2 },
  { pattern: /分析|データ|結果|数値|レポート|インサイト|気づき/i, category: "insight", weight: 2 },
  { pattern: /テンプレート|資料|リソース|素材|共有ファイル/i, category: "resource", weight: 2 },
  { pattern: /お知らせ|告知|連絡|アナウンス|重要/i, category: "announcement", weight: 2 },
  { pattern: /おすすめ|便利|使える/i, category: "tips", weight: 1 },
  { pattern: /チェックリスト|マニュアル|ガイド/i, category: "howto", weight: 1 },
  { pattern: /canva|figma|slack|notion/i, category: "tool", weight: 1 },
  { pattern: /振り返り|まとめ|レビュー結果/i, category: "insight", weight: 1 },
  { pattern: /戦略|設計|鍵|獲得|体験/i, category: "insight", weight: 1 },
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

    // Gemini API が利用可能なら本物のAI校正、なければシミュレーション
    if (isGeminiAvailable) {
      try {
        const result = await proofreadWithGemini(text, titleStr);
        const textChanged = text !== result.proofread;
        const hasTags = result.suggested_tags.length > 0;
        const categoryMeaningful = result.suggested_category !== "other";

        return NextResponse.json({
          original: text,
          proofread: result.proofread,
          changes_made: textChanged || hasTags || categoryMeaningful,
          suggested_tags: result.suggested_tags,
          suggested_category: result.suggested_category,
        });
      } catch (err) {
        console.error("Gemini API error, falling back to simulation:", err);
        // Gemini がエラーの場合はフォールバック
      }
    }

    // フォールバック: シミュレーション
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
