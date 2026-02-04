"use client";

import { useState, useEffect, useMemo } from "react";
import { useCurrentUser } from "@/lib/user_context";
import type { KnowledgePost, KnowledgeComment, KnowledgeCategory } from "@/types/content_package";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<KnowledgeCategory, { label: string; color: string; bgColor: string; icon: string; description: string }> = {
  tips: { label: "Tips", color: "text-blue-600", bgColor: "bg-blue-50 hover:bg-blue-100 border-blue-200", icon: "💡", description: "すぐに使える小技・コツ" },
  howto: { label: "ハウツー", color: "text-green-600", bgColor: "bg-green-50 hover:bg-green-100 border-green-200", icon: "📖", description: "手順・やり方の解説" },
  tool: { label: "ツール", color: "text-purple-600", bgColor: "bg-purple-50 hover:bg-purple-100 border-purple-200", icon: "🔧", description: "便利なツール紹介" },
  process: { label: "プロセス", color: "text-orange-600", bgColor: "bg-orange-50 hover:bg-orange-100 border-orange-200", icon: "⚙️", description: "業務改善・効率化" },
  insight: { label: "インサイト", color: "text-pink-600", bgColor: "bg-pink-50 hover:bg-pink-100 border-pink-200", icon: "📊", description: "分析結果・気づき" },
  resource: { label: "リソース", color: "text-teal-600", bgColor: "bg-teal-50 hover:bg-teal-100 border-teal-200", icon: "📁", description: "テンプレート・資料" },
  announcement: { label: "お知らせ", color: "text-yellow-600", bgColor: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200", icon: "📢", description: "重要なお知らせ" },
  other: { label: "その他", color: "text-gray-600", bgColor: "bg-gray-50 hover:bg-gray-100 border-gray-200", icon: "📌", description: "その他のナレッジ" },
};

const AVATAR_COLORS: Record<string, string> = {
  田中: "bg-blue-500",
  佐藤: "bg-green-500",
  鈴木: "bg-purple-500",
  山田: "bg-orange-500",
  高橋: "bg-pink-500",
};

type TimePeriod = "all" | "today" | "week" | "month";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;
  return date.toLocaleDateString("ja-JP");
}

function isWithinPeriod(dateStr: string, period: TimePeriod): boolean {
  if (period === "all") return true;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = diff / (1000 * 60 * 60 * 24);

  switch (period) {
    case "today": return days < 1;
    case "week": return days < 7;
    case "month": return days < 30;
    default: return true;
  }
}

function getInitials(name: string) {
  return name.slice(0, 2);
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-12 h-12 text-sm",
  };
  const color = AVATAR_COLORS[name] || "bg-gray-500";

  return (
    <div
      className={`${sizeClasses[size]} ${color} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category Card Component
// ---------------------------------------------------------------------------

function CategoryCard({
  category,
  count,
  recentPost,
  isSelected,
  onClick,
}: {
  category: KnowledgeCategory;
  count: number;
  recentPost?: KnowledgePost;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = CATEGORY_CONFIG[category];

  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all ${config.bgColor} ${
        isSelected ? "ring-2 ring-offset-2 ring-blue-500 border-blue-400" : "border-transparent"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{config.icon}</span>
        <span className={`text-lg font-bold ${config.color}`}>{count}</span>
      </div>
      <h3 className={`font-bold ${config.color}`}>{config.label}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
      {recentPost && (
        <div className="mt-3 pt-3 border-t border-gray-200/50">
          <p className="text-xs text-gray-600 truncate">{recentPost.title}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{recentPost.author} • {formatDate(recentPost.created_at)}</p>
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Post Card Component
// ---------------------------------------------------------------------------

function PostCard({
  post,
  comments,
  currentUser,
  onLike,
  onComment,
  onTagClick,
  compact = false,
}: {
  post: KnowledgePost;
  comments: KnowledgeComment[];
  currentUser: string | null;
  onLike: (postId: string) => void;
  onComment: (postId: string, body: string) => void;
  onTagClick: (tag: string) => void;
  compact?: boolean;
}) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLiked = currentUser ? post.likes.includes(currentUser) : false;
  const postComments = comments.filter((c) => c.post_id === post.id);
  const config = CATEGORY_CONFIG[post.category];

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    await onComment(post.id, newComment.trim());
    setNewComment("");
    setSubmitting(false);
  };

  if (compact) {
    return (
      <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-start gap-3">
          <Avatar name={post.author} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{post.title}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <span>{post.author}</span>
              <span>•</span>
              <span>{formatDate(post.created_at)}</span>
              <span>•</span>
              <span>❤️ {post.likes.length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar name={post.author} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800">{post.author}</span>
            {post.team_id && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {post.team_id === "team_001" ? "マーケティング" : post.team_id === "team_002" ? "コンテンツ" : post.team_id}
              </span>
            )}
            <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
          </div>
          <button
            onClick={() => onTagClick(`category:${post.category}`)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${config.bgColor} ${config.color}`}
          >
            <span>{config.icon}</span>
            {config.label}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>
        <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed line-clamp-4">
          {post.body}
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Images */}
        {post.images.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {post.images.map((img, idx) => (
              <div key={idx} className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  [画像]
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-4">
        <button
          onClick={() => onLike(post.id)}
          disabled={!currentUser}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isLiked
              ? "bg-pink-100 text-pink-600"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          } disabled:opacity-50`}
        >
          <span>{isLiked ? "❤️" : "🤍"}</span>
          <span>{post.likes.length}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <span>💬</span>
          <span>{postComments.length}</span>
        </button>
        {post.likes.length > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            <div className="flex -space-x-2">
              {post.likes.slice(0, 3).map((user) => (
                <Avatar key={user} name={user} size="sm" />
              ))}
            </div>
            {post.likes.length > 3 && (
              <span className="text-xs text-gray-400">+{post.likes.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {postComments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar name={c.author} size="sm" />
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">{c.author}</span>
                  <span className="text-[10px] text-gray-400">{formatDate(c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{c.body}</p>
              </div>
            </div>
          ))}

          {currentUser && (
            <div className="flex gap-2 pt-2">
              <Avatar name={currentUser} size="sm" />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
                  placeholder="コメントを入力..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submitting}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  送信
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Post Form
// ---------------------------------------------------------------------------

function NewPostForm({
  currentUser,
  onSubmit,
  onClose,
  initialCategory,
}: {
  currentUser: string;
  onSubmit: (data: { title: string; body: string; tags: string[]; category: KnowledgeCategory; images: string[] }) => void;
  onClose: () => void;
  initialCategory?: KnowledgeCategory;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory>(initialCategory || "tips");
  const [submitting, setSubmitting] = useState(false);

  // AI校正関連のstate
  const [proofreadText, setProofreadText] = useState<string | null>(null);
  const [isProofreading, setIsProofreading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim() || submitting) return;
    setSubmitting(true);
    const tags = tagsInput.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean);
    await onSubmit({ title: title.trim(), body: body.trim(), tags, category, images: [] });
    setSubmitting(false);
    onClose();
  };

  // AI校正を実行
  const handleProofread = async () => {
    if (!body.trim() || isProofreading) return;
    setIsProofreading(true);
    try {
      const res = await fetch("/api/knowledge/proofread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.changes_made) {
          setProofreadText(data.proofread);
          setShowComparison(true);
        } else {
          setProofreadText(null);
          setShowComparison(false);
        }
      }
    } catch (e) {
      console.error("Proofreading failed:", e);
    } finally {
      setIsProofreading(false);
    }
  };

  // 校正後のテキストを適用
  const applyProofreadText = () => {
    if (proofreadText) {
      setBody(proofreadText);
      setProofreadText(null);
      setShowComparison(false);
    }
  };

  // 比較表示を閉じる
  const closeComparison = () => {
    setShowComparison(false);
    setProofreadText(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">新しい投稿</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Category Selection as Cards */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリを選択</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key as KnowledgeCategory)}
                    className={`p-2 rounded-lg border-2 text-center transition-all ${config.bgColor} ${
                      category === key ? "ring-2 ring-blue-500 border-blue-400" : "border-transparent"
                    }`}
                  >
                    <span className="text-xl block">{config.icon}</span>
                    <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タイトルを入力..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">内容</label>
                <button
                  type="button"
                  onClick={handleProofread}
                  disabled={!body.trim() || isProofreading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProofreading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      校正中...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AIで校正
                    </>
                  )}
                </button>
              </div>

              {/* 比較表示モード */}
              {showComparison && proofreadText ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* 元の文章 */}
                    <div
                      onClick={closeComparison}
                      className="cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-gray-500">元の文章</span>
                      </div>
                      <div className="h-48 p-3 border border-gray-200 rounded-lg bg-gray-50 overflow-y-auto text-sm text-gray-600 whitespace-pre-wrap group-hover:border-gray-300 transition-colors">
                        {body}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 text-center group-hover:text-gray-500">クリックで元のまま編集を続ける</p>
                    </div>

                    {/* 校正後の文章 */}
                    <div
                      onClick={applyProofreadText}
                      className="cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-purple-600">校正後</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">おすすめ</span>
                      </div>
                      <div className="h-48 p-3 border-2 border-purple-300 rounded-lg bg-purple-50 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap group-hover:border-purple-400 group-hover:bg-purple-100 transition-colors">
                        {proofreadText}
                      </div>
                      <p className="text-[10px] text-purple-500 mt-1 text-center group-hover:text-purple-600">クリックで適用</p>
                    </div>
                  </div>
                </div>
              ) : (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="ナレッジやTipsを共有..."
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タグ（任意・カンマ区切り）</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Instagram, 効率化, デザイン..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">画像（任意）</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-sm">
                  クリックまたはドラッグで画像をアップロード
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !body.trim() || submitting || showComparison}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "投稿中..." : "投稿する"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function KnowledgePage() {
  const { currentUser } = useCurrentUser();
  const [posts, setPosts] = useState<KnowledgePost[]>([]);
  const [comments, setComments] = useState<KnowledgeComment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");

  // New post form
  const [showNewPost, setShowNewPost] = useState(false);

  // Fetch data
  useEffect(() => {
    fetch("/api/knowledge")
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts || []);
        setComments(data.comments || []);
        setLoading(false);
      });
  }, []);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<KnowledgeCategory, number> = {
      tips: 0, howto: 0, tool: 0, process: 0,
      insight: 0, resource: 0, announcement: 0, other: 0,
    };
    posts.forEach((p) => {
      if (isWithinPeriod(p.created_at, timePeriod)) {
        counts[p.category]++;
      }
    });
    return counts;
  }, [posts, timePeriod]);

  // Get most recent post per category
  const recentByCategory = useMemo(() => {
    const recent: Partial<Record<KnowledgeCategory, KnowledgePost>> = {};
    const sorted = [...posts].sort((a, b) => b.created_at.localeCompare(a.created_at));
    sorted.forEach((p) => {
      if (!recent[p.category]) {
        recent[p.category] = p;
      }
    });
    return recent;
  }, [posts]);

  // Get trending tags
  const trendingTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    posts.forEach((p) => {
      if (isWithinPeriod(p.created_at, timePeriod)) {
        p.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));
  }, [posts, timePeriod]);

  // Get popular posts (by likes)
  const popularPosts = useMemo(() => {
    return [...posts]
      .filter((p) => isWithinPeriod(p.created_at, timePeriod))
      .sort((a, b) => b.likes.length - a.likes.length)
      .slice(0, 5);
  }, [posts, timePeriod]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Time period
    result = result.filter((p) => isWithinPeriod(p.created_at, timePeriod));

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Category
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Tag
    if (selectedTag) {
      result = result.filter((p) => p.tags.includes(selectedTag));
    }

    // Sort by newest
    result.sort((a, b) => b.created_at.localeCompare(a.created_at));

    return result;
  }, [posts, searchQuery, selectedCategory, selectedTag, timePeriod]);

  // Handlers
  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/knowledge/${postId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: currentUser }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    }
  };

  const handleComment = async (postId: string, body: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/knowledge/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: currentUser, body }),
    });
    if (res.ok) {
      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
    }
  };

  const handleNewPost = async (data: { title: string; body: string; tags: string[]; category: KnowledgeCategory; images: string[] }) => {
    if (!currentUser) return;
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, author: currentUser }),
    });
    if (res.ok) {
      const newPost = await res.json();
      setPosts((prev) => [newPost, ...prev]);
    }
  };

  const handleTagClick = (tag: string) => {
    if (tag.startsWith("category:")) {
      setSelectedCategory(tag.replace("category:", "") as KnowledgeCategory);
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
      setSelectedCategory(null);
    }
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedTag(null);
    setSearchQuery("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  const hasActiveFilter = selectedCategory || selectedTag || searchQuery;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ナレッジ共有</h1>
          <p className="text-sm text-gray-500 mt-0.5">チーム横断でノウハウやTipsを発見・共有</p>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          disabled={!currentUser}
          className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          投稿する
        </button>
      </div>

      {/* Search & Time Period */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワード、タグ、投稿者で検索..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { value: "all", label: "すべて" },
              { value: "today", label: "今日" },
              { value: "week", label: "今週" },
              { value: "month", label: "今月" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimePeriod(opt.value as TimePeriod)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  timePeriod === opt.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">カテゴリから探す</h2>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-sm text-blue-600 hover:underline"
            >
              すべて表示
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <CategoryCard
              key={key}
              category={key as KnowledgeCategory}
              count={categoryCounts[key as KnowledgeCategory]}
              recentPost={recentByCategory[key as KnowledgeCategory]}
              isSelected={selectedCategory === key}
              onClick={() => setSelectedCategory(selectedCategory === key ? null : key as KnowledgeCategory)}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main Feed */}
        <div className="col-span-8">
          {/* Active Filters */}
          {hasActiveFilter && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-600">フィルター:</span>
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-sm">
                  {CATEGORY_CONFIG[selectedCategory].icon} {CATEGORY_CONFIG[selectedCategory].label}
                  <button onClick={() => setSelectedCategory(null)} className="ml-1 text-gray-400 hover:text-gray-600">×</button>
                </span>
              )}
              {selectedTag && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-sm">
                  #{selectedTag}
                  <button onClick={() => setSelectedTag(null)} className="ml-1 text-gray-400 hover:text-gray-600">×</button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-sm">
                  「{searchQuery}」
                  <button onClick={() => setSearchQuery("")} className="ml-1 text-gray-400 hover:text-gray-600">×</button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="ml-auto text-sm text-blue-600 hover:underline"
              >
                クリア
              </button>
            </div>
          )}

          {/* Posts */}
          <div className="space-y-4">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <div className="text-4xl mb-3">🔍</div>
                <div className="text-gray-500 text-lg mb-2">投稿が見つかりません</div>
                <p className="text-sm text-gray-400">フィルターを変更するか、新しく投稿してみましょう</p>
                {hasActiveFilter && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    フィルターをクリア
                  </button>
                )}
              </div>
            ) : (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  comments={comments}
                  currentUser={currentUser}
                  onLike={handleLike}
                  onComment={handleComment}
                  onTagClick={handleTagClick}
                />
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Trending Tags */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-3">トレンドタグ</h3>
            <div className="flex flex-wrap gap-2">
              {trendingTags.length === 0 ? (
                <p className="text-sm text-gray-400">タグがありません</p>
              ) : (
                trendingTags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedTag === tag
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    #{tag}
                    <span className="ml-1 text-xs text-gray-400">{count}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Popular Posts */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-3">人気の投稿</h3>
            <div className="space-y-1">
              {popularPosts.length === 0 ? (
                <p className="text-sm text-gray-400">投稿がありません</p>
              ) : (
                popularPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    comments={comments}
                    currentUser={currentUser}
                    onLike={handleLike}
                    onComment={handleComment}
                    onTagClick={handleTagClick}
                    compact
                  />
                ))
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
            <h3 className="font-bold text-gray-800 mb-3">統計</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/70 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{posts.length}</p>
                <p className="text-xs text-gray-500">総投稿数</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-pink-600">{posts.reduce((sum, p) => sum + p.likes.length, 0)}</p>
                <p className="text-xs text-gray-500">総いいね</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{comments.length}</p>
                <p className="text-xs text-gray-500">総コメント</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{new Set(posts.map(p => p.author)).size}</p>
                <p className="text-xs text-gray-500">投稿者数</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Post Modal */}
      {showNewPost && currentUser && (
        <NewPostForm
          currentUser={currentUser}
          onSubmit={handleNewPost}
          onClose={() => setShowNewPost(false)}
          initialCategory={selectedCategory || undefined}
        />
      )}
    </div>
  );
}
