import { NextResponse } from "next/server";
import { isGeminiAvailable, generateJSON } from "@/lib/gemini";
import { systemPromptStore } from "@/lib/store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileInfo {
  name: string;
  category: "minutes" | "transcript" | "photo" | "other";
}

interface AnalysisStep {
  label: string;
  icon: string;
  status: "done" | "skipped";
  detail: string;
}

interface AnalysisResult {
  steps: AnalysisStep[];
  direction: string;
}

// ---------------------------------------------------------------------------
// Gemini による素材分析
// ---------------------------------------------------------------------------

function buildAnalysisPrompt(files: FileInfo[], folderName: string, fileContents?: { name: string; content: string }[]): string {
  const fileList = files.map((f) => `- ${f.name}（${f.category}）`).join("\n");
  const minutes = files.filter((f) => f.category === "minutes");
  const transcripts = files.filter((f) => f.category === "transcript");
  const photos = files.filter((f) => f.category === "photo");

  let prompt = `あなたはマルチチャネル・コンテンツ運用チームのシニアディレクターです。
アップロードされた素材ファイルを分析し、コンテンツ生成の方向性を判断してください。

## 素材情報

フォルダ名: ${folderName}
ファイル一覧:
${fileList}

議事録: ${minutes.length}件
トランスクリプト: ${transcripts.length}件
写真: ${photos.length}件
`;

  // ファイル内容がある場合、プロンプトに追加
  if (fileContents && fileContents.length > 0) {
    prompt += `\n## アップロードされたファイルの内容\n\n以下のファイル内容を踏まえて分析してください。ファイル名だけでなく実際の内容に基づいた分析を行うこと。\n\n`;
    for (const fc of fileContents) {
      // 長すぎるファイルは先頭3000文字に制限
      const truncated = fc.content.length > 3000 ? fc.content.slice(0, 3000) + "\n...（以下省略）" : fc.content;
      prompt += `### ${fc.name}\n\`\`\`\n${truncated}\n\`\`\`\n\n`;
    }
  }

  prompt += `## 分析の思考プロセス

以下の3ステップで分析してください:

Step 1: 議事録で全体把握
- 議事録があれば、${fileContents && fileContents.length > 0 ? "ファイル内容から" : "ファイル名から"}企画の方向性やテーマを推定する
- なければ「議事録なし」としてスキップ

Step 2: トランスクリプトで詳細把握
- トランスクリプトがあれば、${fileContents && fileContents.length > 0 ? "ファイル内容から" : "ファイル名から"}専門的な内容やキーフレーズを推定する
- なければスキップ

Step 3: 写真の活用判断
- 写真があれば、ファイル名からどのチャネルに活用できるか判断する
- なければスキップ

## 文体ルール

端的に書く。1文は短く。先輩が後輩に説明するような自然な文体で。
×「多角的なアプローチ」「包括的な戦略」のような抽象語は使わない。
×「**見出し語:** 説明文」の形式は使わない。
Markdown記号（** * # など）は一切使わない。

## 出力JSON形式

{
  "steps": [
    {
      "label": "議事録で全体把握",
      "icon": "doc",
      "status": "done または skipped",
      "detail": "分析内容を端的に記述（100文字以内）"
    },
    {
      "label": "トランスクリプトで詳細把握",
      "icon": "mic",
      "status": "done または skipped",
      "detail": "分析内容を端的に記述（100文字以内）"
    },
    {
      "label": "写真の素材・文脈強化判断",
      "icon": "image",
      "status": "done または skipped",
      "detail": "分析内容を端的に記述（100文字以内）"
    }
  ],
  "direction": "総合判断。どのチャネルの組み合わせが効果的かを端的に提案（150文字以内）"
}`;

  return prompt;
}

const ICON_MAP: Record<string, string> = {
  doc: "\u{1F4C4}",
  mic: "\u{1F3A4}",
  image: "\u{1F5BC}",
};

function stripMarkdownFromAnalysis(result: AnalysisResult): AnalysisResult {
  const strip = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/^#{1,6}\s+/gm, "");
  return {
    steps: result.steps.map((s) => ({
      ...s,
      icon: ICON_MAP[s.icon] || s.icon,
      detail: strip(s.detail),
    })),
    direction: strip(result.direction),
  };
}

// ---------------------------------------------------------------------------
// フォールバック: モック分析
// ---------------------------------------------------------------------------

function mockAnalysis(files: FileInfo[]): AnalysisResult {
  const minutes = files.filter((f) => f.category === "minutes");
  const transcripts = files.filter((f) => f.category === "transcript");
  const photos = files.filter((f) => f.category === "photo");

  const steps: AnalysisStep[] = [];

  if (minutes.length > 0) {
    steps.push({
      label: "議事録で全体把握",
      icon: "\u{1F4C4}",
      status: "done",
      detail: `議事録 ${minutes.length}件（${minutes.map((f) => f.name).join("、")}）を分析。企画の方向性とテーマを把握しました。`,
    });
  } else {
    steps.push({ label: "議事録で全体把握", icon: "\u{1F4C4}", status: "skipped", detail: "議事録が見つかりませんでした。他の素材から方向性を推定します。" });
  }

  if (transcripts.length > 0) {
    steps.push({
      label: "トランスクリプトで詳細把握",
      icon: "\u{1F3A4}",
      status: "done",
      detail: `トランスクリプト ${transcripts.length}件を精読。キーフレーズと専門的な知見を抽出しました。`,
    });
  } else {
    steps.push({ label: "トランスクリプトで詳細把握", icon: "\u{1F3A4}", status: "skipped", detail: "トランスクリプトなし。議事録の情報をベースに進めます。" });
  }

  if (photos.length > 0) {
    steps.push({
      label: "写真の素材・文脈強化判断",
      icon: "\u{1F5BC}",
      status: "done",
      detail: `写真 ${photos.length}件を確認。サムネイル・カルーセル・背景素材として活用できます。`,
    });
  } else {
    steps.push({ label: "写真の素材・文脈強化判断", icon: "\u{1F5BC}", status: "skipped", detail: "写真素材なし。テキストベースのビジュアル指示で代替します。" });
  }

  const hasMinutes = minutes.length > 0;
  const hasTranscripts = transcripts.length > 0;
  const hasPhotos = photos.length > 0;

  let direction: string;
  if (hasMinutes && hasTranscripts && hasPhotos) {
    direction = "議事録の企画意図・トランスクリプトの専門知見・写真素材を組み合わせ、信頼性と視覚的訴求力の高いコンテンツを生成します。Instagram Reels、note記事、LINE配信の組み合わせが効果的です。";
  } else if (hasMinutes && hasTranscripts) {
    direction = "議事録とトランスクリプトから得た知見をベースに、テキスト重視のコンテンツを生成します。note記事、LINE配信が効果的です。";
  } else if (hasMinutes && hasPhotos) {
    direction = "議事録の方針に写真素材を組み合わせ、ビジュアル訴求力のあるコンテンツを生成します。Instagram Reels・Feed、イベントLPが効果的です。";
  } else if (hasMinutes) {
    direction = "議事録の企画内容をベースにコンテンツの方向性を決定します。全チャネルでの展開が可能です。";
  } else {
    direction = "利用可能な素材から方向性を推定します。より精度の高い生成のために議事録の追加をおすすめします。";
  }

  return { steps, direction };
}

// ---------------------------------------------------------------------------
// API Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { files, folderName, fileContents } = await request.json();

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "files array is required" }, { status: 400 });
    }

    const validCategories = ["minutes", "transcript", "photo", "other"] as const;
    type Cat = typeof validCategories[number];
    const fileInfos: FileInfo[] = files.map((f: Record<string, string>) => ({
      name: f.name || "",
      category: (validCategories.includes(f.category as Cat) ? f.category : "other") as FileInfo["category"],
    }));

    // Validate fileContents if provided
    const validFileContents: { name: string; content: string }[] | undefined =
      Array.isArray(fileContents) && fileContents.length > 0
        ? fileContents.filter((fc: { name?: string; content?: string }) => fc.name && fc.content)
        : undefined;

    if (validFileContents) {
      console.log(`[analyze] ファイル内容 ${validFileContents.length}件を含むリクエスト`);
    }

    if (isGeminiAvailable) {
      try {
        console.log("[analyze] Gemini API を使用して素材分析を実行...");
        const spConfig = systemPromptStore.getByKey("content_analyze");
        const prompt = buildAnalysisPrompt(fileInfos, folderName || "", validFileContents);
        const raw = await generateJSON<AnalysisResult>(prompt, {
          model: spConfig?.model,
          temperature: spConfig?.temperature ?? 0.3,
          maxOutputTokens: spConfig?.maxOutputTokens ?? 2048,
        });
        const result = stripMarkdownFromAnalysis(raw);
        console.log("[analyze] Gemini API 成功");
        return NextResponse.json({ ...result, source: "gemini" });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[analyze] Gemini API エラー、フォールバック:", errMsg);
        const result = mockAnalysis(fileInfos);
        return NextResponse.json({ ...result, source: "simulation", fallback_reason: `Gemini APIエラー: ${errMsg}` });
      }
    }

    console.log("[analyze] GEMINI_API_KEY 未設定のためシミュレーションモードで動作");
    const result = mockAnalysis(fileInfos);
    return NextResponse.json({ ...result, source: "simulation", fallback_reason: "GEMINI_API_KEY が未設定です" });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
