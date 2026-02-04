import { NextResponse } from "next/server";
import { knowledgePostStore } from "@/lib/store";
import type { KnowledgeCategory } from "@/types/content_package";

// AI自動分類のシミュレーション（実際にはOpenAI APIなどを使用）
function simulateAICategorization(title: string, body: string): { category: KnowledgeCategory; tags: string[] } {
  const text = `${title} ${body}`.toLowerCase();

  // カテゴリ判定
  let category: KnowledgeCategory = "other";
  if (text.includes("tips") || text.includes("コツ") || text.includes("ポイント")) {
    category = "tips";
  } else if (text.includes("方法") || text.includes("やり方") || text.includes("手順") || text.includes("ステップ")) {
    category = "howto";
  } else if (text.includes("ツール") || text.includes("アプリ") || text.includes("サービス")) {
    category = "tool";
  } else if (text.includes("プロセス") || text.includes("効率") || text.includes("改善") || text.includes("フロー")) {
    category = "process";
  } else if (text.includes("分析") || text.includes("結果") || text.includes("気づき") || text.includes("わかった")) {
    category = "insight";
  } else if (text.includes("テンプレート") || text.includes("リソース") || text.includes("参考") || text.includes("共有")) {
    category = "resource";
  } else if (text.includes("お知らせ") || text.includes("導入") || text.includes("変更") || text.includes("開始")) {
    category = "announcement";
  }

  // タグ抽出（キーワードベース）
  const keywords = [
    "Instagram", "LINE", "note", "Twitter", "TikTok",
    "リール", "ストーリーズ", "フィード",
    "ChatGPT", "AI", "プロンプト",
    "デザイン", "Canva", "Figma",
    "レビュー", "コンテンツ", "マーケティング",
    "分析", "効率化", "自動化",
    "テンプレート", "チェックリスト",
    "画像", "動画", "ライティング",
  ];

  const tags: string[] = [];
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      tags.push(keyword);
    }
  }

  // 最大5タグに制限
  return { category, tags: tags.slice(0, 5) };
}

// 1時間以内に投稿された未分類の投稿を自動分類
export async function POST() {
  const posts = knowledgePostStore.list();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const uncategorized = posts.filter(
    (p) => !p.ai_categorized && p.created_at > oneHourAgo
  );

  const categorized: string[] = [];

  for (const post of uncategorized) {
    const { category, tags } = simulateAICategorization(post.title, post.body);

    // 既存タグとマージ（重複排除）
    const mergedTags = [...new Set([...post.tags, ...tags])];

    knowledgePostStore.update(post.id, {
      category,
      tags: mergedTags,
      ai_categorized: true,
      ai_categorized_at: new Date().toISOString(),
    });

    categorized.push(post.id);
  }

  return NextResponse.json({
    message: `${categorized.length} posts categorized`,
    categorized_ids: categorized,
  });
}
