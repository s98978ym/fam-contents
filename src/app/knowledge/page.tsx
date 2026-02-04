"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useCurrentUser } from "@/lib/user_context";
import type { KnowledgePost, KnowledgeComment, KnowledgeCategory } from "@/types/content_package";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<KnowledgeCategory, { label: string; color: string; icon: string }> = {
  tips: { label: "Tips", color: "bg-blue-100 text-blue-700", icon: "💡" },
  howto: { label: "ハウツー", color: "bg-green-100 text-green-700", icon: "📖" },
  tool: { label: "ツール", color: "bg-purple-100 text-purple-700", icon: "🔧" },
  process: { label: "プロセス", color: "bg-orange-100 text-orange-700", icon: "⚙️" },
  insight: { label: "インサイト", color: "bg-pink-100 text-pink-700", icon: "📊" },
  resource: { label: "リソース", color: "bg-teal-100 text-teal-700", icon: "📁" },
  announcement: { label: "お知らせ", color: "bg-yellow-100 text-yellow-700", icon: "📢" },
  other: { label: "その他", color: "bg-gray-100 text-gray-700", icon: "📌" },
};

const AVATAR_COLORS: Record<string, string> = {
  田中: "bg-blue-500",
  佐藤: "bg-green-500",
  鈴木: "bg-purple-500",
  山田: "bg-orange-500",
  高橋: "bg-pink-500",
};

type SortOption = "newest" | "oldest" | "popular" | "comments";
type ViewMode = "all" | "category";

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

function CategoryBadge({ category }: { category: KnowledgeCategory }) {
  const { label, color, icon } = CATEGORY_LABELS[category];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
        >
          #{tag}
        </span>
      ))}
    </div>
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
}: {
  post: KnowledgePost;
  comments: KnowledgeComment[];
  currentUser: string | null;
  onLike: (postId: string) => void;
  onComment: (postId: string, body: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLiked = currentUser ? post.likes.includes(currentUser) : false;
  const postComments = comments.filter((c) => c.post_id === post.id);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    await onComment(post.id, newComment.trim());
    setNewComment("");
    setSubmitting(false);
  };

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
          <CategoryBadge category={post.category} />
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>
        <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
          {post.body}
        </div>
        <TagList tags={post.tags} />

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

      {/* AI Badge */}
      {post.ai_categorized && (
        <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
          <span className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" />
          AI自動分類
        </div>
      )}

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

          {/* New Comment Input */}
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
}: {
  currentUser: string;
  onSubmit: (data: { title: string; body: string; tags: string[]; category: KnowledgeCategory; images: string[] }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory>("other");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim() || submitting) return;
    setSubmitting(true);
    const tags = tagsInput
      .split(/[,、\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    await onSubmit({ title: title.trim(), body: body.trim(), tags, category, images: [] });
    setSubmitting(false);
    onClose();
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
              <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="ナレッジやTipsを共有..."
                rows={8}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
                  <option key={key} value={key}>
                    {icon} {label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                ※ 1時間後にAIが自動でタグとカテゴリを最適化します
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タグ（任意）</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="カンマ区切りでタグを入力..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">画像（任意）</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                <div className="text-gray-400">
                  <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">クリックまたはドラッグで画像をアップロード</p>
                  <p className="text-xs mt-1">PNG, JPG, GIF（最大5MB）</p>
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
              disabled={!title.trim() || !body.trim() || submitting}
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
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("all");

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

  // Get unique authors and teams
  const authors = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => set.add(p.author));
    return Array.from(set).sort();
  }, [posts]);

  const teams = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (p.team_id) set.add(p.team_id);
    });
    return Array.from(set).sort();
  }, [posts]);

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Author filter
    if (selectedAuthor !== "all") {
      result = result.filter((p) => p.author === selectedAuthor);
    }

    // Team filter
    if (selectedTeam !== "all") {
      result = result.filter((p) => p.team_id === selectedTeam);
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      case "oldest":
        result.sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case "popular":
        result.sort((a, b) => b.likes.length - a.likes.length);
        break;
      case "comments":
        result.sort((a, b) => {
          const aComments = comments.filter((c) => c.post_id === a.id).length;
          const bComments = comments.filter((c) => c.post_id === b.id).length;
          return bComments - aComments;
        });
        break;
    }

    return result;
  }, [posts, comments, searchQuery, selectedAuthor, selectedTeam, selectedCategory, sortBy]);

  // Group by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<KnowledgeCategory, KnowledgePost[]> = {
      tips: [],
      howto: [],
      tool: [],
      process: [],
      insight: [],
      resource: [],
      announcement: [],
      other: [],
    };
    filteredPosts.forEach((p) => {
      groups[p.category].push(p);
    });
    return groups;
  }, [filteredPosts]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ナレッジ共有</h1>
          <p className="text-sm text-gray-500 mt-0.5">チーム横断でノウハウやTipsを共有</p>
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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワードで検索..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Author Filter */}
          <select
            value={selectedAuthor}
            onChange={(e) => setSelectedAuthor(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全員</option>
            {authors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Team Filter */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全チーム</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t === "team_001" ? "マーケティング" : t === "team_002" ? "コンテンツ" : t}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as KnowledgeCategory | "all")}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全カテゴリ</option>
            {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
              <option key={key} value={key}>
                {icon} {label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">新着順</option>
            <option value="oldest">古い順</option>
            <option value="popular">人気順</option>
            <option value="comments">コメント数</option>
          </select>

          {/* View Mode */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("all")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              一覧
            </button>
            <button
              onClick={() => setViewMode("category")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "category" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              カテゴリ別
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">総投稿数</p>
          <p className="text-2xl font-bold text-gray-800">{posts.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">総コメント</p>
          <p className="text-2xl font-bold text-gray-800">{comments.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">投稿者数</p>
          <p className="text-2xl font-bold text-gray-800">{authors.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">AI分類済み</p>
          <p className="text-2xl font-bold text-gray-800">{posts.filter((p) => p.ai_categorized).length}</p>
        </div>
      </div>

      {/* Posts */}
      {viewMode === "all" ? (
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-gray-400 text-lg mb-2">投稿がありません</div>
              <p className="text-sm text-gray-400">最初の投稿をしてみましょう</p>
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
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByCategory).map(([cat, catPosts]) => {
            if (catPosts.length === 0) return null;
            const { label, icon, color } = CATEGORY_LABELS[cat as KnowledgeCategory];
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
                    {icon} {label}
                  </span>
                  <span className="text-sm text-gray-400">{catPosts.length}件</span>
                </div>
                <div className="space-y-4">
                  {catPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      comments={comments}
                      currentUser={currentUser}
                      onLike={handleLike}
                      onComment={handleComment}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Post Modal */}
      {showNewPost && currentUser && (
        <NewPostForm
          currentUser={currentUser}
          onSubmit={handleNewPost}
          onClose={() => setShowNewPost(false)}
        />
      )}
    </div>
  );
}
