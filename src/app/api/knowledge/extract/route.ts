import { NextResponse } from "next/server";
import type { KnowledgeCategory } from "@/types/content_package";
import { isGeminiAvailable, generateJSON } from "@/lib/gemini";
import { systemPromptStore } from "@/lib/store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MinutesFile {
  name: string;
  category: "minutes" | "transcript" | "photo" | "other";
}

interface KnowledgeCandidate {
  id: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  category: KnowledgeCategory;
  speakers: string[];
  source_file: string;
}

interface ExtractResult {
  candidates: KnowledgeCandidate[];
}

const VALID_CATEGORIES: KnowledgeCategory[] = [
  "tips", "howto", "tool", "process", "insight", "resource", "announcement", "other",
];

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildExtractPrompt(files: MinutesFile[], folderName: string): string {
  const fileList = files.map((f) => `- ${f.name} (${f.category})`).join("\n");

  return `あなたはチームのナレッジ管理の専門家です。
議事録・トランスクリプトの内容から、チームに共有すべきナレッジを複数抽出します。

## 入力

フォルダ名: ${folderName}
ファイル一覧:
${fileList}

## あなたのタスク

これらの議事録ファイルの内容を分析し、チームに共有すべきナレッジを1〜5件抽出してください。

各ナレッジは以下の基準で抽出する:
- 他のメンバーが知っておくと役立つ知見・気づき・決定事項
- 具体的なアクションや手法が含まれるもの
- 1つのナレッジ = 1つのテーマ（複数のテーマを1つに詰め込まない）

## 各ナレッジの出力内容

1. title: ナレッジのタイトル（簡潔に、20文字以内目安）
2. summary: 1〜2文の概要（何がわかるか）
3. body: ナレッジ本文。議事録の内容を踏まえた実践的な内容。プレーンテキストのみ（Markdown禁止）
4. tags: 関連タグ（1〜3個）
5. category: tips / howto / tool / process / insight / resource / announcement / other から1つ
6. speakers: 発言者名の配列。特定できない場合は参加メンバー名を推定して入れる
7. source_file: 主な情報源のファイル名

## フォーマットルール

- body はプレーンテキストのみ。**太字**、# 見出し、「見出し語: 説明文」形式は禁止
- 箇条書きは「- 」のシンプルな形式で可
- 議事録の文体をそのまま活かす。AI的な抽象表現は使わない

## 出力JSON

{
  "candidates": [
    {
      "title": "...",
      "summary": "...",
      "body": "...",
      "tags": ["..."],
      "category": "...",
      "speakers": ["..."],
      "source_file": "..."
    }
  ]
}`;
}

// ---------------------------------------------------------------------------
// Gemini extraction
// ---------------------------------------------------------------------------

async function extractWithGemini(
  files: MinutesFile[],
  folderName: string
): Promise<ExtractResult> {
  const spConfig = systemPromptStore.getByKey("knowledge_extract");
  const prompt = buildExtractPrompt(files, folderName);
  const result = await generateJSON<ExtractResult>(prompt, {
    model: spConfig?.model,
    temperature: spConfig?.temperature ?? 0.5,
    maxOutputTokens: spConfig?.maxOutputTokens ?? 8192,
  });

  // Validate and clean
  const candidates = (result.candidates || []).map((c, i) => ({
    id: `kc_${Date.now()}_${i}`,
    title: (c.title || "").slice(0, 50),
    summary: c.summary || "",
    body: stripMarkdown(c.body || ""),
    tags: Array.isArray(c.tags) ? c.tags.slice(0, 5) : [],
    category: VALID_CATEGORIES.includes(c.category) ? c.category : "other" as KnowledgeCategory,
    speakers: Array.isArray(c.speakers) ? c.speakers : [],
    source_file: c.source_file || files[0]?.name || "",
  }));

  return { candidates };
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

function mockExtract(files: MinutesFile[], folderName: string): ExtractResult {
  const minutesFiles = files.filter((f) => f.category === "minutes" || f.category === "transcript");
  const baseFiles = minutesFiles.length > 0 ? minutesFiles : files;

  const candidates: KnowledgeCandidate[] = baseFiles.slice(0, 3).map((f, i) => {
    const themes = [
      {
        title: "企画方針の決定事項",
        summary: `${folderName}の企画方針について、主要な決定事項をまとめたナレッジ。`,
        body: `${folderName}に関する企画会議で以下が決定された。\n\n- ターゲット層の明確化と優先順位付け\n- コンテンツの配信チャネルと頻度\n- 制作スケジュールの大枠`,
        tags: ["企画", "方針"],
        category: "process" as KnowledgeCategory,
      },
      {
        title: "ターゲット分析の知見",
        summary: "議事録から得られたターゲット分析に関する知見。",
        body: `会議で共有されたターゲット分析の結果。\n\n- 主要ターゲットの行動パターンと接触チャネル\n- 既存施策の反応率データ\n- 次回施策に向けた改善ポイント`,
        tags: ["分析", "マーケティング"],
        category: "insight" as KnowledgeCategory,
      },
      {
        title: "制作ワークフローの改善案",
        summary: "制作プロセスの改善について議論された内容。",
        body: `制作フローについて以下の改善案が出た。\n\n- テンプレート化による作業時間の短縮\n- レビュープロセスの簡略化\n- ツール活用による効率化`,
        tags: ["効率化", "ワークフロー"],
        category: "process" as KnowledgeCategory,
      },
    ];

    const theme = themes[i % themes.length];
    return {
      id: `kc_${Date.now()}_${i}`,
      title: theme.title,
      summary: theme.summary,
      body: theme.body,
      tags: theme.tags,
      category: theme.category,
      speakers: ["参加メンバー"],
      source_file: f.name,
    };
  });

  return { candidates };
}

// ---------------------------------------------------------------------------
// Safety net
// ---------------------------------------------------------------------------

function stripMarkdown(text: string): string {
  let r = text;
  r = r.replace(/\*\*(.+?)\*\*/g, "$1");
  r = r.replace(/\*(.+?)\*/g, "$1");
  r = r.replace(/~~(.+?)~~/g, "$1");
  r = r.replace(/^#{1,6}\s+/gm, "");
  r = r.replace(/^(-\s+)[^:：\n]{2,20}[:：]\s*/gm, "$1");
  return r;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { files, folderName } = await request.json();

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "files array is required" }, { status: 400 });
    }

    const fileInfos: MinutesFile[] = files.map((f: Record<string, string>) => ({
      name: f.name || "",
      category: (["minutes", "transcript", "photo", "other"].includes(f.category) ? f.category : "other") as MinutesFile["category"],
    }));
    const folder = typeof folderName === "string" ? folderName : "";

    if (isGeminiAvailable) {
      try {
        console.log("[knowledge/extract] Gemini API でナレッジ抽出...");
        const result = await extractWithGemini(fileInfos, folder);
        return NextResponse.json({
          ...result,
          source: "gemini",
        });
      } catch (err) {
        console.error("[knowledge/extract] Gemini error:", err);
        const result = mockExtract(fileInfos, folder);
        return NextResponse.json({
          ...result,
          source: "simulation",
          fallback_reason: `Gemini API 呼び出し失敗: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    console.log("[knowledge/extract] Gemini 未設定 — シミュレーション");
    const result = mockExtract(fileInfos, folder);
    return NextResponse.json({
      ...result,
      source: "simulation",
      fallback_reason: "GEMINI_API_KEY が未設定です",
    });
  } catch (err) {
    console.error("[knowledge/extract] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
