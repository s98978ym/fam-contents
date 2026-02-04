import { NextResponse } from "next/server";

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
  const formattedLines = lines.map((line, index) => {
    const trimmed = line.trim();

    // 数字始まりの行を箇条書きとして整形
    if (/^[0-9]+[.．)）]/.test(trimmed) && !trimmed.endsWith("。") && trimmed.length < 100) {
      return line;
    }

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
  ];

  // 最初にマッチしたキーワードの補足のみ追加
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
// API Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text field is required" },
        { status: 400 }
      );
    }

    // シミュレーション用の遅延（実際のAI APIの応答時間を模倣）
    await new Promise((resolve) => setTimeout(resolve, 800));

    const proofread = simulateAIProofread(text);

    return NextResponse.json({
      original: text,
      proofread,
      changes_made: text !== proofread,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
