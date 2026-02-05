import { NextResponse } from "next/server";
import type { KnowledgeCategory } from "@/types/content_package";
import { isGeminiAvailable, generateJSON } from "@/lib/gemini";

// ---------------------------------------------------------------------------
// Gemini AI ナレッジ発展
// ---------------------------------------------------------------------------

const VALID_CATEGORIES: KnowledgeCategory[] = [
  "tips", "howto", "tool", "process", "insight", "resource", "announcement", "other",
];

interface ProofreadResult {
  proofread: string;
  suggested_tags: string[];
  suggested_category: KnowledgeCategory;
}

type OutputLength = "short" | "normal" | "long";

const LENGTH_INSTRUCTIONS: Record<OutputLength, string> = {
  short: "元テキストの約1.5倍の文字数を目安にする。要点を絞り、端的にまとめる。補強は最小限で核心だけ。",
  normal: "元テキストの約2倍の文字数を目安にする。バランスよく補強を入れる。",
  long: "元テキストの3〜5倍の文字数を目安にする。背景・事例・実践ステップを丁寧に展開する。",
};

function buildProofreadPrompt(text: string, title: string, length: OutputLength = "short"): string {
  return `あなたはマルチチャネル・コンテンツ運用チームのシニアナレッジエディターです。
チームメンバーが投稿した短いメモや気づきを、チーム全体で活用できる実践的なナレッジに発展させます。

## あなたの思考プロセス

以下のステップで思考し、最終的な発展テキストを生成してください。

### Step 1: 趣旨と文体の把握
入力テキストを読み、以下の2つを特定する。
(a) 筆者が伝えたい核心的な主張・気づき。元の趣旨や主張は絶対に変えない。
(b) 筆者の文体・トーン・テンション。具体的には:
  - 語尾の癖（「〜だ」「〜です」「〜だよね」「〜じゃん」等）
  - 文の長さ・リズム（短文の連続か、長文か）
  - 言葉遣いのカジュアル度合い（砕けた口語 or 丁寧語 or 書き言葉）
  - テンション（淡々、熱い、ユーモア混じり等）
  - 口癖・特徴的なフレーズ
発展テキストは、この文体・トーンを完全に引き継いで書くこと。
ゴールは「その人自身が書いたように読める」テキストを生成すること。

### Step 2: 必要な観点の特定
その趣旨をナレッジとして機能させるために不足している観点を洗い出す。
例: 「なぜそうなのか」の根拠、「具体的にどうするか」の実践手順、「どんな効果があるか」の成果指標、類似事例・業界動向など。

### Step 3: 補強コンテンツの検討
Step 2で特定した観点を補強するために、以下のような要素を追加できないか検討する。
- 具体的な数値・データ・事例
- 実践ステップ（すぐに試せるアクション）
- 注意点・よくある失敗パターン
- チームで応用するためのヒント

### Step 4: 発展テキストの生成
元の趣旨を核に、Step 3の補強を自然に組み込んだテキストを生成する。

## 発展ルール

- 元の主張・趣旨を変えない。あくまで「補強・発展」であり「書き換え」ではない
- 筆者の言葉遣い・テンション・語尾を完全に引き継ぐ。AIの文体に置き換えない
  - 筆者がカジュアルなら追加部分もカジュアルに。丁寧語なら追加部分も丁寧語で
  - 筆者が「〜だよね」「〜じゃん」と書いていたら、追加部分も同じ語尾を使う
  - 筆者が「！」を多用していたら追加部分でも使う。使っていなければ使わない
- 投稿者の気づきに対して「なぜ」「具体的には」「チームでどう活かすか」を補う
- 補強内容は事実ベースで、推測は筆者の文体に合わせた表現で明示する（「〜っぽい」「〜らしい」「〜と考えられます」等、元の文体に合わせる）
- 分量の目安: ${LENGTH_INSTRUCTIONS[length]}

## 絶対に守るフォーマットルール

出力テキスト（proofreadフィールド）は完全なプレーンテキストにすること。

絶対に使ってはいけない:
- ** や * などのMarkdown記号。1文字たりとも入れない
- 「見出し語: 説明文」の形式。例: ×「選手の個性を見つける: 選手の得意なことを〜」
- # や ## などの見出し記号
- 箇条書きの「- 」の先頭に太字見出しをつける形式。例: ×「- ストーリーを紡ぐ: ドキュメンタリー動画で〜」

箇条書きは使ってよいが、形式は以下のようにシンプルにすること:
○「- インタビューやアンケートで選手の個性を掘り下げる」
○「- ドキュメンタリー動画やインタビュー記事でストーリーを伝える」
×「- **選手の個性を見つける**: インタビューやアンケートで〜」

## 文体ルール

最優先: 筆者の文体を再現すること。以下は筆者の文体が読み取れない場合のフォールバック。
- 筆者の文体が明確な場合 → それをそのまま引き継ぐ（カジュアルでもOK、丁寧でもOK）
- 筆者の文体が短すぎて判断困難な場合 → 自然で端的な言い回しにする

絶対に使わない（筆者がどんな文体でも禁止）:
- ×「感情的な繋がり」「多角的なアプローチ」「包括的な戦略」のようなAI特有の抽象語
- ×「これは非常に重要な観点です。なぜなら〜」のような冗長な前置き
- × 筆者が使っていない硬い表現への言い換え（「実施する」「活用する」「推進する」等、元テキストにない堅い言葉を足さない）

## タグ提案ルール

発展後のテキスト内容から、チーム内で検索・分類に役立つタグを1〜5個提案。
候補例: Instagram, LINE, note, SEO, AI, デザイン, テンプレート, 効率化, 分析, ライティング, 動画, ブランド, マーケティング, 顧客体験, スポーツ, イベント
上記にない独自のタグも提案可能。

## カテゴリ提案ルール

以下から最も適切なものを1つ:
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
  "proofread": "発展後の全文テキスト",
  "suggested_tags": ["タグ1", "タグ2"],
  "suggested_category": "カテゴリ名"
}`;
}

/** Gemini が指示を無視してMarkdownを出力した場合のセーフティネット */
function stripMarkdown(text: string): string {
  let r = text;
  // **太字** → 太字
  r = r.replace(/\*\*(.+?)\*\*/g, "$1");
  // *斜体* → 斜体
  r = r.replace(/\*(.+?)\*/g, "$1");
  // ~~取消線~~ → 取消線
  r = r.replace(/~~(.+?)~~/g, "$1");
  // # 見出し → 見出し
  r = r.replace(/^#{1,6}\s+/gm, "");
  // 「見出し語: 説明文」形式の箇条書きを平坦化
  // 例: "- 選手の個性を見つける: 選手の得意な…" → "- 選手の得意な…"
  r = r.replace(/^(-\s+)[^:：\n]{2,20}[:：]\s*/gm, "$1");
  return r;
}

async function proofreadWithGemini(
  text: string,
  title: string,
  length: OutputLength = "short"
): Promise<ProofreadResult> {
  const prompt = buildProofreadPrompt(text, title, length);
  const result = await generateJSON<ProofreadResult>(prompt, {
    temperature: 0.7,
    maxOutputTokens: 4096,
  });

  // Markdown記号を強制除去（セーフティネット）
  result.proofread = stripMarkdown(result.proofread);

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
    const { text, title, length } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text field is required" },
        { status: 400 }
      );
    }

    const titleStr = typeof title === "string" ? title : "";
    const validLengths: OutputLength[] = ["short", "normal", "long"];
    const outputLength: OutputLength = validLengths.includes(length) ? length : "short";

    // Gemini API が利用可能なら本物のAI発展、なければシミュレーション
    let fallbackReason = "";

    if (isGeminiAvailable) {
      try {
        console.log(`[proofread] Gemini API を使用してナレッジ発展を実行 (length=${outputLength})...`);
        const result = await proofreadWithGemini(text, titleStr, outputLength);
        const textChanged = text !== result.proofread;
        const hasTags = result.suggested_tags.length > 0;
        const categoryMeaningful = result.suggested_category !== "other";

        console.log("[proofread] Gemini API 成功");
        return NextResponse.json({
          original: text,
          proofread: result.proofread,
          changes_made: textChanged || hasTags || categoryMeaningful,
          suggested_tags: result.suggested_tags,
          suggested_category: result.suggested_category,
          source: "gemini",
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[proofread] Gemini API エラー、シミュレーションにフォールバック:", errMsg);
        fallbackReason = `Gemini APIエラー: ${errMsg}`;
      }
    } else {
      console.log("[proofread] GEMINI_API_KEY 未設定のためシミュレーションモードで動作");
      fallbackReason = "GEMINI_API_KEY が未設定です";
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
      source: "simulation",
      fallback_reason: fallbackReason,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
