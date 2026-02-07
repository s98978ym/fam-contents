"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useCurrentUser } from "@/lib/user_context";
import { useGoogleAuth } from "@/lib/use_google_auth";
import { useGooglePicker, type PickedFolder } from "@/lib/use_google_picker";
import type { KnowledgePost, KnowledgeComment, KnowledgeCategory, Attachment } from "@/types/content_package";
import { AttachmentUploader } from "@/components/attachment_manager";

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

// ---------------------------------------------------------------------------
// Diff highlighting helper
// ---------------------------------------------------------------------------

/** Split text into meaningful segments (sentences / line breaks) */
function splitSegments(text: string): string[] {
  // Split by line breaks first, then by sentence-ending punctuation
  const parts: string[] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "") {
      parts.push("\n");
      continue;
    }
    // Split by Japanese/English sentence endings, keeping the delimiter
    const sentences = line.split(/((?:[。．！？!?])+)/);
    for (let i = 0; i < sentences.length; i += 2) {
      const seg = sentences[i] + (sentences[i + 1] || "");
      if (seg) parts.push(seg);
    }
    parts.push("\n");
  }
  // Remove trailing newline
  if (parts.length > 0 && parts[parts.length - 1] === "\n") parts.pop();
  return parts;
}

/** Compute LCS table for two arrays */
function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1].trim() === b[j - 1].trim()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

/** Produce diff segments: each has text, type (kept/added) */
interface DiffSegment {
  text: string;
  type: "kept" | "added";
}

function computeDiff(original: string, modified: string): DiffSegment[] {
  const a = splitSegments(original);
  const b = splitSegments(modified);
  const dp = lcsTable(a, b);

  // Backtrack to find which segments in `b` are new vs kept
  const result: DiffSegment[] = [];
  let i = a.length, j = b.length;
  const segments: { text: string; type: "kept" | "added" }[] = [];

  while (i > 0 && j > 0) {
    if (a[i - 1].trim() === b[j - 1].trim()) {
      segments.push({ text: b[j - 1], type: "kept" });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--; // skip original-only segment
    } else {
      segments.push({ text: b[j - 1], type: "added" });
      j--;
    }
  }
  while (j > 0) {
    segments.push({ text: b[j - 1], type: "added" });
    j--;
  }

  segments.reverse();

  // Merge consecutive segments of the same type
  for (const seg of segments) {
    if (result.length > 0 && result[result.length - 1].type === seg.type) {
      result[result.length - 1].text += seg.text;
    } else {
      result.push({ ...seg });
    }
  }

  return result;
}

/** Render diff-highlighted text as React elements */
function DiffHighlight({ original, modified }: { original: string; modified: string }) {
  const segments = useMemo(() => computeDiff(original, modified), [original, modified]);
  return (
    <>
      {segments.map((seg, i) =>
        seg.text === "\n" ? (
          <br key={i} />
        ) : seg.type === "added" ? (
          <span key={i} className="bg-green-100 text-green-800 rounded-sm px-0.5">{seg.text}</span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

type TimePeriod = "all" | "today" | "week" | "month";
type ViewScope = "all" | "team" | "personal";

// ユーザーとチームのマッピング（実際にはAPIから取得）
const USER_TEAM_MAP: Record<string, string> = {
  田中: "team_001",
  佐藤: "team_001",
  鈴木: "team_002",
  山田: "team_002",
  高橋: "team_001",
};

const TEAM_NAMES: Record<string, string> = {
  team_001: "マーケティング",
  team_002: "コンテンツ",
};

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
      className={`text-left p-3 rounded-xl border-2 transition-all flex flex-col h-full ${config.bgColor} ${
        isSelected ? "ring-2 ring-offset-2 ring-blue-500 border-blue-400" : "border-transparent"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className={`text-sm font-bold ${config.color}`}>{config.label}</h3>
        <span className={`text-sm font-bold ${config.color}`}>{count}</span>
      </div>
      <p className="text-[11px] text-gray-500 leading-snug">{config.description}</p>
      <div className="mt-auto pt-2">
        {recentPost ? (
          <div className="pt-2 border-t border-gray-200/50">
            <p className="text-[11px] text-gray-600 truncate">{recentPost.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{recentPost.author} · {formatDate(recentPost.created_at)}</p>
          </div>
        ) : (
          <div className="pt-2 border-t border-gray-200/30">
            <p className="text-[11px] text-gray-400">投稿なし</p>
          </div>
        )}
      </div>
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
  onArchive,
  onDelete,
  compact = false,
}: {
  post: KnowledgePost;
  comments: KnowledgeComment[];
  currentUser: string | null;
  onLike: (postId: string) => void;
  onComment: (postId: string, body: string) => void;
  onTagClick: (tag: string) => void;
  onArchive?: (postId: string, archived: boolean) => void;
  onDelete?: (postId: string) => void;
  compact?: boolean;
}) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isLiked = currentUser ? post.likes.includes(currentUser) : false;
  const postComments = comments.filter((c) => c.post_id === post.id);
  const config = CATEGORY_CONFIG[post.category];

  // 権限チェック
  const isAuthor = currentUser === post.author;
  const currentUserTeam = currentUser ? USER_TEAM_MAP[currentUser] : null;
  const postTeam = post.team_id || USER_TEAM_MAP[post.author];
  const isSameTeam = currentUserTeam && postTeam && currentUserTeam === postTeam;
  const canArchive = isAuthor || isSameTeam; // 投稿主 or 同じチーム
  const canDelete = isAuthor; // 投稿主のみ

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
    <div className={`bg-white rounded-xl border p-5 hover:shadow-md transition-shadow ${
      post.archived ? "border-amber-200 bg-amber-50/30" : "border-gray-200"
    }`}>
      {/* Archived badge */}
      {post.archived && (
        <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          アーカイブ済み{post.archived_by && ` (by ${post.archived_by})`}
        </div>
      )}

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

        {/* Menu button */}
        {(canArchive || canDelete) && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-20 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                  {canArchive && onArchive && (
                    <button
                      onClick={() => {
                        onArchive(post.id, !post.archived);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      {post.archived ? "アーカイブ解除" : "アーカイブ"}
                    </button>
                  )}
                  {canDelete && onDelete && (
                    <button
                      onClick={() => {
                        setConfirmDelete(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      削除
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 mb-2">この投稿を削除しますか？この操作は取り消せません。</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDelete?.(post.id);
                setConfirmDelete(false);
              }}
              className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
            >
              削除する
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mt-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>
        <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
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

        {/* Attachments (参考資料) */}
        {post.attachments && post.attachments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 mb-1.5">参考資料</p>
            <div className="space-y-1">
              {post.attachments.map((att: Attachment) => (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate">{att.name}</span>
                  <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
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
// Minutes Knowledge Panel (議事録からナレッジ自動投稿)
// ---------------------------------------------------------------------------

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  category: "minutes" | "transcript" | "photo" | "other";
  webViewLink?: string;
  createdTime?: string;
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

type InputTab = "drive" | "upload";

function MinutesKnowledgePanel({
  onCopyToEditor,
}: {
  onCopyToEditor: (data: { body: string; tags: string[]; category: KnowledgeCategory; sourceInfo: string }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<InputTab>("drive");

  // Google OAuth
  const googleAuth = useGoogleAuth();
  const googlePicker = useGooglePicker(googleAuth.accessToken);

  // Drive state
  const [selectedFolder, setSelectedFolder] = useState<PickedFolder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Extraction state
  const [extracting, setExtracting] = useState(false);
  const [candidates, setCandidates] = useState<KnowledgeCandidate[]>([]);
  const [extractSource, setExtractSource] = useState<"gemini" | "simulation" | null>(null);
  const [extractFallbackReason, setExtractFallbackReason] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Copied state（どの候補を記入枠にコピーしたか）
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  // Fetch files when folder is selected
  useEffect(() => {
    if (!selectedFolder || !googleAuth.accessToken) return;

    const fetchFiles = async () => {
      setLoadingFiles(true);
      setDriveError(null);
      setFiles([]);

      try {
        const res = await fetch(`/api/drive/oauth/files?folderId=${selectedFolder.id}`, {
          headers: { Authorization: `Bearer ${googleAuth.accessToken}` },
        });
        const data = await res.json();

        if (data.error) {
          setDriveError(data.error);
          setFiles([]);
        } else {
          setFiles(data.files || []);
          setFolderName(selectedFolder.name);
        }
      } catch (err) {
        setDriveError("ファイル一覧の取得に失敗しました");
        console.error("[MinutesKnowledgePanel] fetch error:", err);
      } finally {
        setLoadingFiles(false);
      }
    };

    fetchFiles();
  }, [selectedFolder, googleAuth.accessToken]);

  // Reset state when switching tabs
  const handleTabChange = (tab: InputTab) => {
    setActiveTab(tab);
    setFiles([]);
    setUploadedFiles([]);
    setSelectedFolder(null);
    setDriveError(null);
    setCandidates([]);
    setSelectedCandidateId(null);
  };

  // Open folder picker
  const handleOpenPicker = () => {
    googlePicker.openPicker(
      (folder) => {
        setSelectedFolder(folder);
        setCandidates([]);
        setSelectedCandidateId(null);
      },
      () => {
        // Cancel - do nothing
      }
    );
  };

  // File upload handlers
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.includes("text") || f.name.endsWith(".txt") || f.name.endsWith(".md") ||
             f.type.includes("document") || f.name.endsWith(".docx") || f.name.endsWith(".doc")
    );
    if (droppedFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Get files for extraction (from either source)
  const getFilesForExtraction = (): DriveFile[] => {
    if (activeTab === "drive") {
      return files;
    } else {
      return uploadedFiles.map((f, i) => ({
        id: `upload-${i}`,
        name: f.name,
        mimeType: f.type || "text/plain",
        category: f.name.includes("議事録") || f.name.includes("mtg") ? "minutes" as const : "other" as const,
      }));
    }
  };

  const currentFiles = getFilesForExtraction();
  const hasFiles = activeTab === "drive" ? files.length > 0 : uploadedFiles.length > 0;

  const handleExtract = async () => {
    const filesToExtract = getFilesForExtraction();
    if (filesToExtract.length === 0) return;

    setExtracting(true);
    setCandidates([]);
    setSelectedCandidateId(null);
    setExtractSource(null);
    setExtractFallbackReason(null);

    try {
      // For uploaded files, read content locally
      // For Drive files, fetch content from API
      let fileContents: { name: string; content: string }[] = [];

      if (activeTab === "upload") {
        fileContents = await Promise.all(
          uploadedFiles.map(async (f) => ({
            name: f.name,
            content: await f.text(),
          }))
        );
      } else if (googleAuth.accessToken) {
        // Fetch content for Drive files (only text-based)
        const textFiles = filesToExtract.filter(
          (f) => f.category === "minutes" || f.category === "transcript"
        );
        fileContents = await Promise.all(
          textFiles.map(async (f) => {
            try {
              const res = await fetch(`/api/drive/oauth/content?fileId=${f.id}`, {
                headers: { Authorization: `Bearer ${googleAuth.accessToken}` },
              });
              const data = await res.json();
              return { name: f.name, content: data.content || "" };
            } catch {
              return { name: f.name, content: "" };
            }
          })
        );
      }

      const res = await fetch("/api/knowledge/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: filesToExtract.map((f) => ({ name: f.name, category: f.category })),
          folderName: folderName || "アップロード",
          fileContents: fileContents.length > 0 ? fileContents : undefined,
        }),
      });
      const data = await res.json();
      setCandidates(data.candidates || []);
      setExtractSource(data.source || "simulation");
      if (data.fallback_reason) setExtractFallbackReason(data.fallback_reason);
    } catch (err) {
      console.error("[MinutesKnowledgePanel] extract error:", err);
      setExtractSource("simulation");
      setExtractFallbackReason(`ネットワークエラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExtracting(false);
    }
  };

  const handleCopyToEditor = (candidate: KnowledgeCandidate) => {
    const speakers = candidate.speakers.length > 0 ? candidate.speakers.join("、") : "参加メンバー";
    const sourceInfo = `出典: ${candidate.source_file}\n発言者: ${speakers}`;

    onCopyToEditor({
      body: candidate.body,
      tags: candidate.tags,
      category: candidate.category,
      sourceInfo,
    });

    setCopiedIds((prev) => new Set([...prev, candidate.id]));
  };

  const handleReset = () => {
    setCandidates([]);
    setSelectedCandidateId(null);
    setExtractSource(null);
    setExtractFallbackReason(null);
  };

  return (
    <div className="mb-4">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 border border-indigo-200 rounded-xl hover:shadow-sm transition-all text-left"
      >
        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm font-medium text-indigo-700">議事録からナレッジを自動投稿</span>
        <svg
          className={`w-4 h-4 text-indigo-400 ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Panel content */}
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pt-3 space-y-3">
            {/* Tab selector */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => handleTabChange("drive")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "drive"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.71 3.5L1.15 15l3.43 6h13.71l3.56-6L15.29 3.5H7.71zm.79 1.5h7l4.79 8h-2.79l-4.79-8h-2.21l-4.79 8H3.42l4.08-8z"/>
                </svg>
                Google Drive
              </button>
              <button
                onClick={() => handleTabChange("upload")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "upload"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                ファイルアップロード
              </button>
            </div>

            {/* Google Drive tab content */}
            {activeTab === "drive" && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                {/* OAuth not configured warning */}
                {!googleAuth.isLoading && !googleAuth.oauthConfigured && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">Google Drive連携が未設定です</p>
                    <p className="text-xs text-amber-600 mt-1">
                      管理者がVercelで <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code> と <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> を設定すると利用できます。
                    </p>
                    <p className="text-xs text-gray-600 mt-2">今は「ファイルアップロード」タブをお試しください。</p>
                  </div>
                )}

                {/* Loading state */}
                {googleAuth.isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <svg className="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}

                {/* Not logged in - show login button */}
                {!googleAuth.isLoading && googleAuth.oauthConfigured && !googleAuth.isAuthenticated && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-4">Googleアカウントでログインして、Driveのフォルダを選択できます</p>
                    <button
                      onClick={googleAuth.login}
                      disabled={!googleAuth.gsiLoaded}
                      className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Googleでログイン</span>
                    </button>
                    {googleAuth.error && (
                      <p className="text-xs text-red-600 mt-2">{googleAuth.error}</p>
                    )}
                  </div>
                )}

                {/* Logged in - show user info and folder picker */}
                {!googleAuth.isLoading && googleAuth.isAuthenticated && googleAuth.user && (
                  <>
                    {/* User info bar */}
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {googleAuth.user.picture && (
                          <img src={googleAuth.user.picture} alt="" className="w-6 h-6 rounded-full" />
                        )}
                        <span className="text-sm text-gray-700">{googleAuth.user.email}</span>
                      </div>
                      <button
                        onClick={googleAuth.logout}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        ログアウト
                      </button>
                    </div>

                    {/* Folder picker button */}
                    {!selectedFolder && (
                      <button
                        onClick={handleOpenPicker}
                        disabled={!googlePicker.pickerLoaded}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="font-medium">フォルダを選択</span>
                      </button>
                    )}

                    {/* Selected folder */}
                    {selectedFolder && (
                      <div className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-800">{selectedFolder.name}</span>
                          </div>
                          <button
                            onClick={handleOpenPicker}
                            className="text-xs text-indigo-600 hover:text-indigo-700"
                          >
                            変更
                          </button>
                        </div>

                        {/* Loading files */}
                        {loadingFiles && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            ファイルを読み込み中...
                          </div>
                        )}

                        {/* Error */}
                        {driveError && (
                          <p className="text-xs text-red-600 mt-2">{driveError}</p>
                        )}

                        {/* Files list */}
                        {!loadingFiles && files.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {files.map((file) => (
                              <div key={file.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded text-sm">
                                <span className="flex-1 truncate">{file.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
                                  {file.category === "minutes" ? "議事録" : file.category === "transcript" ? "文字起こし" : "その他"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* No files */}
                        {!loadingFiles && files.length === 0 && !driveError && (
                          <p className="text-sm text-gray-500 mt-3">フォルダ内にファイルがありません</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Upload tab content */}
            {activeTab === "upload" && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600 mb-2">ファイルをドラッグ&ドロップ</p>
                  <p className="text-xs text-gray-400 mb-3">または</p>
                  <label className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md cursor-pointer hover:bg-indigo-700 transition-colors">
                    ファイルを選択
                    <input
                      type="file"
                      multiple
                      accept=".txt,.md,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-2">.txt, .md, .doc, .docx に対応</p>
                </div>

                {/* Uploaded files list */}
                {uploadedFiles.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      アップロードしたファイル ({uploadedFiles.length}件)
                    </div>
                    <div className="space-y-1">
                      {uploadedFiles.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md text-sm">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="flex-1 truncate">{file.name}</span>
                          <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)}KB</span>
                          <button
                            onClick={() => removeUploadedFile(i)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Extract button (shown when files are ready) */}
            {hasFiles && candidates.length === 0 && (
              <button
                onClick={handleExtract}
                disabled={extracting}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {extracting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    ナレッジを抽出中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AIでナレッジを抽出（{currentFiles.length}件のファイルから）
                  </>
                )}
              </button>
            )}

            {/* Step 3: Extraction results */}
            {candidates.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    抽出されたナレッジ（{candidates.length}件）
                  </h4>
                  <div className="flex items-center gap-2">
                    {/* Source badge */}
                    {extractSource === "gemini" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Gemini
                      </span>
                    ) : extractSource === "simulation" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        シミュレーション
                      </span>
                    ) : null}
                    <button
                      onClick={handleReset}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      やり直す
                    </button>
                  </div>
                </div>

                {/* Fallback warning */}
                {extractSource === "simulation" && extractFallbackReason && (
                  <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    {extractFallbackReason}
                  </div>
                )}

                {/* Candidate cards */}
                <div className="space-y-2">
                  {candidates.map((candidate) => {
                    const isSelected = selectedCandidateId === candidate.id;
                    const isCopied = copiedIds.has(candidate.id);
                    const config = CATEGORY_CONFIG[candidate.category];

                    return (
                      <div
                        key={candidate.id}
                        className={`border rounded-lg transition-all ${
                          isCopied
                            ? "border-blue-200 bg-blue-50/50"
                            : isSelected
                            ? "border-indigo-300 bg-indigo-50/30 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer"
                        }`}
                      >
                        {/* Summary row (always visible) */}
                        <button
                          onClick={() => setSelectedCandidateId(isSelected ? null : candidate.id)}
                          className="w-full text-left px-4 py-3 flex items-start gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-gray-800">{candidate.title}</span>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config.bgColor} ${config.color}`}>
                                {config.icon} {config.label}
                              </span>
                              {isCopied && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                                  コピー済み
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{candidate.summary}</p>
                          </div>
                          <svg
                            className={`w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform ${isSelected ? "rotate-180" : ""}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Detail (expanded) */}
                        <div
                          className="grid transition-all duration-300 ease-in-out"
                          style={{ gridTemplateRows: isSelected ? "1fr" : "0fr" }}
                        >
                          <div className="overflow-hidden">
                            <div className="px-4 pb-4 border-t border-gray-100">
                              {/* Body */}
                              <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3">
                                {candidate.body}
                              </div>

                              {/* Meta: source file + speakers */}
                              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  {candidate.source_file}
                                </div>
                                <div className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {candidate.speakers.length > 0 ? candidate.speakers.join("、") : "参加メンバー"}
                                </div>
                              </div>

                              {/* Tags */}
                              {candidate.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {candidate.tags.map((tag) => (
                                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Copy to editor button */}
                              <button
                                onClick={() => handleCopyToEditor(candidate)}
                                className={`mt-3 w-full py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                  isCopied
                                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                {isCopied ? "もう一度コピー" : "記入枠にコピー"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Post Box (フィードトップのカジュアルな投稿エリア)
// ---------------------------------------------------------------------------

interface QuickPostPrefillData {
  body: string;
  tags: string[];
  category: KnowledgeCategory;
  sourceInfo?: string; // 出典情報（議事録ファイル名など）
}

function QuickPostBox({
  currentUser,
  onSubmit,
  prefillData,
  onPrefillConsumed,
}: {
  currentUser: string;
  onSubmit: (data: { title: string; body: string; tags: string[]; category: KnowledgeCategory; images: string[]; attachments?: Attachment[] }) => void;
  prefillData?: QuickPostPrefillData | null;
  onPrefillConsumed?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory>("tips");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI校正関連のstate
  const [proofreadText, setProofreadText] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [suggestedCategory, setSuggestedCategory] = useState<KnowledgeCategory | null>(null);
  const [isProofreading, setIsProofreading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [proofreadSource, setProofreadSource] = useState<"gemini" | "simulation" | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [aiLength, setAiLength] = useState<"short" | "normal" | "long">("short");

  const placeholders = [
    "今日学んだことや気づきをシェアしよう",
    "うまくいったコツを共有しよう",
    "ちょっとしたTipsを残しておこう",
    "便利な方法を見つけた？みんなに教えよう",
    "試してよかったことをメモしよう",
  ];
  const [placeholder] = useState(() => placeholders[Math.floor(Math.random() * placeholders.length)]);

  // テキストエリアの高さをピクセルで明示管理（CSSトランジション対応）
  const COLLAPSED_H = 44;
  const EXPANDED_MIN = 128;
  const EXPANDED_MAX = 240;
  const [textareaH, setTextareaH] = useState(COLLAPSED_H);

  // テキストエリア自動リサイズ — scrollHeight から目標高さを計算
  const recalcHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta || !isExpanded) return;
    // 一旦autoにしてscrollHeightを取得
    const prev = ta.style.height;
    ta.style.height = "auto";
    const desired = Math.max(EXPANDED_MIN, Math.min(ta.scrollHeight, EXPANDED_MAX));
    ta.style.height = prev; // 戻す（React管理のstyleで再描画される）
    setTextareaH(desired);
  }, [isExpanded]);

  // body変更時にリサイズ
  useEffect(() => {
    if (isExpanded && !showComparison) recalcHeight();
  }, [body, isExpanded, showComparison, recalcHeight]);

  // 展開時にフォーカス＋リサイズ
  useEffect(() => {
    if (isExpanded && textareaRef.current && !showComparison) {
      textareaRef.current.focus();
      // 次フレームで高さセット（transition発火のため）
      requestAnimationFrame(() => {
        recalcHeight();
      });
    }
  }, [isExpanded, showComparison, recalcHeight]);

  // 外部からのprefillデータを受け取った時に展開＆入力
  useEffect(() => {
    if (prefillData) {
      // 出典情報があれば本文に追加
      const bodyWithSource = prefillData.sourceInfo
        ? `${prefillData.body}\n\n---\n${prefillData.sourceInfo}`
        : prefillData.body;

      setBody(bodyWithSource);
      setCategory(prefillData.category);
      setSuggestedTags(prefillData.tags);
      setIsExpanded(true);
      setTextareaH(EXPANDED_MIN);

      // 次フレームでフォーカス
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        recalcHeight();
      });

      // 消費を通知
      onPrefillConsumed?.();
    }
  }, [prefillData, onPrefillConsumed, recalcHeight]);

  const handleExpand = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      // 展開直後はまだCOLLAPSED_H → 次フレームでEXPANDED_MINにトランジション
      setTextareaH(COLLAPSED_H);
    }
  };

  const handleCollapse = () => {
    setTextareaH(COLLAPSED_H);
    // トランジション完了後にstateリセット
    setTimeout(() => {
      setIsExpanded(false);
      setBody("");
      setProofreadText(null);
      setSuggestedTags([]);
      setSuggestedCategory(null);
      setShowComparison(false);
    }, 320);
  };

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);

    const lines = body.trim().split("\n");
    const firstLine = lines[0].slice(0, 30);
    const title = firstLine + (lines[0].length > 30 ? "..." : "");

    await onSubmit({
      title,
      body: body.trim(),
      tags: suggestedTags,
      category,
      images: attachments.map(a => a.url),
      attachments,
    });

    setBody("");
    setTextareaH(COLLAPSED_H);
    setIsExpanded(false);
    setSubmitting(false);
    setProofreadText(null);
    setSuggestedTags([]);
    setSuggestedCategory(null);
    setShowComparison(false);
    setAttachments([]);
  };

  // AI校正を実行
  const handleProofread = async () => {
    if (!body.trim() || isProofreading) return;
    setIsProofreading(true);
    try {
      const lines = body.trim().split("\n");
      const autoTitle = lines[0].slice(0, 30);
      const res = await fetch("/api/knowledge/proofread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, title: autoTitle, length: aiLength }),
      });
      if (res.ok) {
        const data = await res.json();
        setProofreadText(data.proofread ?? body);
        setSuggestedTags(data.suggested_tags || []);
        setSuggestedCategory(data.suggested_category || null);
        setProofreadSource(data.source || null);
        setFallbackReason(data.fallback_reason || null);
        setShowComparison(true);
      }
    } catch (e) {
      console.error("Proofreading failed:", e);
    } finally {
      setIsProofreading(false);
    }
  };

  // 校正後のテキスト・タグ・カテゴリを適用
  const applyProofreadResult = () => {
    if (proofreadText) {
      setBody(proofreadText);
    }
    if (suggestedCategory) {
      setCategory(suggestedCategory);
    }
    setProofreadText(null);
    setSuggestedCategory(null);
    setShowComparison(false);
  };

  // 比較表示を閉じる
  const closeComparison = () => {
    setShowComparison(false);
    setProofreadText(null);
    setSuggestedTags([]);
    setSuggestedCategory(null);
  };

  const color = AVATAR_COLORS[currentUser] || "bg-gray-500";
  const charCount = body.length;

  return (
    <div
      className={`relative mb-5 rounded-2xl border transition-all duration-300 ease-out ${
        isExpanded
          ? "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-lg ring-1 ring-blue-100"
          : "bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 border-blue-100 shadow-sm hover:shadow-md hover:border-blue-200"
      }`}
    >
      {/* 背景装飾 — 展開時にフェードイン */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-bl-full pointer-events-none transition-opacity duration-500 ${
          isExpanded ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-100/50 to-transparent rounded-tr-full pointer-events-none transition-opacity duration-500 ${
          isExpanded ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className={`relative transition-all duration-300 ease-out ${isExpanded ? "p-5" : "px-4 py-3"}`}>
        {/* メイン入力エリア: アバター + テキストエリア */}
        <div className="flex gap-3 items-start">
          <div
            className={`${color} rounded-full flex items-center justify-center text-white font-bold shrink-0 ring-2 ring-white shadow-sm transition-all duration-300 ${
              isExpanded ? "w-11 h-11 mt-0.5" : "w-10 h-10"
            }`}
          >
            {currentUser.slice(0, 2)}
          </div>

          <div className="flex-1 min-w-0">
            {/* 比較表示モード */}
            {showComparison && proofreadText ? (
              <div className="space-y-3">
                {proofreadSource === "simulation" && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700">Gemini API未接続のためシミュレーションモードです。環境変数 GEMINI_API_KEY を設定し、再デプロイしてください。</p>
                    {fallbackReason && <p className="text-[10px] text-amber-600 mt-1">詳細: {fallbackReason}</p>}
                  </div>
                )}
                {proofreadText !== body ? (
                  <div className="space-y-2">
                    {/* 元の文章 */}
                    <div onClick={closeComparison} className="cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">元の文章</span>
                        <span className="text-[10px] text-gray-400 group-hover:text-gray-500">クリックで元のまま編集を続ける</span>
                      </div>
                      <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500 whitespace-pre-wrap group-hover:border-gray-300 transition-colors leading-relaxed line-through decoration-gray-300">
                        {body}
                      </div>
                    </div>
                    {/* 校正後の文章 */}
                    <div onClick={applyProofreadResult} className="cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-purple-600">AIが発展</span>
                        {proofreadSource === "gemini" && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Gemini</span>}
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">おすすめ</span>
                      </div>
                      <div className="p-3 border-2 border-purple-300 rounded-lg bg-purple-50 text-sm text-gray-700 group-hover:border-purple-400 group-hover:bg-purple-100/80 transition-colors leading-relaxed">
                        <DiffHighlight original={body} modified={proofreadText} />
                      </div>
                      <p className="text-[10px] text-purple-500 mt-1 text-right group-hover:text-purple-600">クリックですべて適用</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-500">文章の修正はありません。以下のタグ・カテゴリ提案を確認してください。</p>
                  </div>
                )}

                {(suggestedTags.length > 0 || suggestedCategory) && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-xs font-medium text-purple-700 mb-2">AIが提案する設定</p>
                    {suggestedCategory && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] text-purple-600">カテゴリ:</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_CONFIG[suggestedCategory].bgColor} ${CATEGORY_CONFIG[suggestedCategory].color}`}>
                          {CATEGORY_CONFIG[suggestedCategory].icon} {CATEGORY_CONFIG[suggestedCategory].label}
                        </span>
                        {suggestedCategory !== category && (
                          <span className="text-[10px] text-purple-400">← {CATEGORY_CONFIG[category].label} から変更</span>
                        )}
                      </div>
                    )}
                    {suggestedTags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-purple-600">タグ:</span>
                        {suggestedTags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-white text-purple-700 rounded text-xs border border-purple-200">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-purple-200">
                      <button
                        type="button"
                        onClick={applyProofreadResult}
                        className="px-4 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        すべて適用
                      </button>
                      <button
                        type="button"
                        onClick={closeComparison}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        適用しない
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* テキストエリア — 明示ピクセル高さでスムーズにトランジション */
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={handleExpand}
                placeholder={isExpanded ? "気軽にナレッジを共有しよう！\n\n例: 「Canvaのバッチ作成機能を使うと画像が一括で作れて便利」" : placeholder}
                className={`w-full bg-white border resize-none outline-none transition-all duration-300 ease-out ${
                  isExpanded
                    ? "px-4 py-3 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm text-gray-700"
                    : "px-4 py-2.5 rounded-xl border-white/80 shadow-sm hover:shadow hover:bg-white/80 cursor-pointer text-gray-400"
                }`}
                rows={1}
                style={{
                  height: `${textareaH}px`,
                  overflowY: textareaH >= EXPANDED_MAX ? "auto" : "hidden",
                }}
              />
            )}
          </div>
        </div>

        {/* 展開コンテンツ — CSS Grid で高さアニメーション */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="pt-3 ml-[52px]">
              {/* 文字数カウント + ヒント */}
              {!showComparison && (
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-[11px] transition-colors duration-300 ${charCount > 0 ? "text-gray-400" : "text-transparent"}`}>
                    {charCount > 0 && `${charCount}文字`}
                  </p>
                  {charCount > 20 && (
                    <p className="text-[11px] text-purple-400">
                      「AIで発展」でナレッジに仕上げます
                    </p>
                  )}
                </div>
              )}

              {/* 適用済みタグ表示 */}
              {!showComparison && suggestedTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-[11px] text-purple-500">タグ:</span>
                  {suggestedTags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs border border-purple-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* カテゴリ選択 */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-xs text-gray-400">カテゴリ:</span>
                {Object.entries(CATEGORY_CONFIG).slice(0, 5).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key as KnowledgeCategory)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      category === key
                        ? `bg-white ${config.color} ring-1 ring-current shadow-sm`
                        : "bg-white/60 text-gray-500 hover:bg-white hover:shadow-sm"
                    }`}
                  >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="text-xs text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    const cats: KnowledgeCategory[] = ["resource", "announcement", "other"];
                    const current = cats.indexOf(category as KnowledgeCategory);
                    setCategory(cats[(current + 1) % cats.length] as KnowledgeCategory);
                  }}
                >
                  +他
                </button>
              </div>

              {/* 参考資料 */}
              <div className="mb-3">
                <AttachmentUploader attachments={attachments} onChange={setAttachments} compact />
              </div>

              {/* ツールバー */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200/60">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCollapse}
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-lg transition-all"
                  >
                    キャンセル
                  </button>
                  {!showComparison && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center bg-white/60 rounded-lg border border-gray-200 p-0.5">
                        {([["short", "ショート(1.5倍)"], ["normal", "ノーマル(2倍)"], ["long", "ロング(3-5倍)"]] as const).map(([val, label]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAiLength(val)}
                            className={`px-2 py-1 text-[10px] rounded-md transition-all ${
                              aiLength === val
                                ? "bg-purple-100 text-purple-700 font-medium shadow-sm"
                                : "text-gray-400 hover:text-gray-600"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleProofread}
                        disabled={!body.trim() || isProofreading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-white/70 hover:bg-purple-50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-purple-200 hover:border-purple-300 hover:shadow-sm"
                      >
                        {isProofreading ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            発展中...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AIで発展
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!body.trim() || submitting || showComparison}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 text-white text-sm font-semibold rounded-full transition-all shadow-md active:scale-[0.97] ${
                    !body.trim() || submitting || showComparison
                      ? "bg-gray-300 cursor-not-allowed shadow-none"
                      : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg"
                  }`}
                >
                  {submitting ? (
                    "共有中..."
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      シェアする
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 折りたたみ時のカテゴリショートカット — CSS Grid で滑らか */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: !isExpanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="flex items-center gap-2 ml-[52px] pt-2">
              {[
                { key: "tips" as KnowledgeCategory, icon: "💡", label: "Tips" },
                { key: "howto" as KnowledgeCategory, icon: "📖", label: "ハウツー" },
                { key: "tool" as KnowledgeCategory, icon: "🔧", label: "ツール" },
                { key: "insight" as KnowledgeCategory, icon: "📊", label: "気づき" },
                { key: "process" as KnowledgeCategory, icon: "⚙️", label: "プロセス" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setCategory(item.key); setIsExpanded(true); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all border border-transparent hover:border-blue-200"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Post Form (詳細投稿モーダル)
// ---------------------------------------------------------------------------

function NewPostForm({
  currentUser,
  onSubmit,
  onClose,
  initialCategory,
}: {
  currentUser: string;
  onSubmit: (data: { title: string; body: string; tags: string[]; category: KnowledgeCategory; images: string[]; attachments?: Attachment[] }) => void;
  onClose: () => void;
  initialCategory?: KnowledgeCategory;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory>(initialCategory || "tips");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // AI校正関連のstate
  const [proofreadText, setProofreadText] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [suggestedCategory, setSuggestedCategory] = useState<KnowledgeCategory | null>(null);
  const [isProofreading, setIsProofreading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [proofreadSource, setProofreadSource] = useState<"gemini" | "simulation" | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [aiLength, setAiLength] = useState<"short" | "normal" | "long">("short");

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim() || submitting) return;
    setSubmitting(true);
    const tags = tagsInput.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean);
    await onSubmit({ title: title.trim(), body: body.trim(), tags, category, images: [], attachments });
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
        body: JSON.stringify({ text: body, title, length: aiLength }),
      });
      if (res.ok) {
        const data = await res.json();
        setProofreadText(data.proofread ?? body);
        setSuggestedTags(data.suggested_tags || []);
        setSuggestedCategory(data.suggested_category || null);
        setProofreadSource(data.source || null);
        setFallbackReason(data.fallback_reason || null);
        setShowComparison(true);
      }
    } catch (e) {
      console.error("Proofreading failed:", e);
    } finally {
      setIsProofreading(false);
    }
  };

  // 校正後のテキスト・タグ・カテゴリを適用
  const applyProofreadResult = () => {
    if (proofreadText) {
      setBody(proofreadText);
    }
    if (suggestedTags.length > 0) {
      // 既存タグとマージ（重複排除）
      const existing = tagsInput.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean);
      const merged = Array.from(new Set([...existing, ...suggestedTags]));
      setTagsInput(merged.join(", "));
    }
    if (suggestedCategory) {
      setCategory(suggestedCategory);
    }
    setProofreadText(null);
    setSuggestedTags([]);
    setSuggestedCategory(null);
    setShowComparison(false);
  };

  // 比較表示を閉じる
  const closeComparison = () => {
    setShowComparison(false);
    setProofreadText(null);
    setSuggestedTags([]);
    setSuggestedCategory(null);
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
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-0.5">
                    {([["short", "ショート(1.5倍)"], ["normal", "ノーマル(2倍)"], ["long", "ロング(3-5倍)"]] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAiLength(val)}
                        className={`px-2 py-1 text-[10px] rounded-md transition-all ${
                          aiLength === val
                            ? "bg-purple-100 text-purple-700 font-medium shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
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
                        発展中...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AIで発展
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 比較表示モード */}
              {showComparison && proofreadText ? (
                <div className="space-y-3">
                  {proofreadSource === "simulation" && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700">Gemini API未接続のためシミュレーションモードです。環境変数 GEMINI_API_KEY を設定し、再デプロイしてください。</p>
                      {fallbackReason && <p className="text-[10px] text-amber-600 mt-1">詳細: {fallbackReason}</p>}
                    </div>
                  )}
                  {/* 文章比較 */}
                  {proofreadText !== body ? (
                    <div className="space-y-2">
                      {/* 元の文章 */}
                      <div
                        onClick={closeComparison}
                        className="cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">元の文章</span>
                          <span className="text-[10px] text-gray-400 group-hover:text-gray-500">クリックで元のまま編集を続ける</span>
                        </div>
                        <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500 whitespace-pre-wrap group-hover:border-gray-300 transition-colors leading-relaxed line-through decoration-gray-300">
                          {body}
                        </div>
                      </div>

                      {/* 校正後の文章 */}
                      <div
                        onClick={applyProofreadResult}
                        className="cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-purple-600">AIが発展</span>
                          {proofreadSource === "gemini" && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Gemini</span>}
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">おすすめ</span>
                        </div>
                        <div className="p-3 border-2 border-purple-300 rounded-lg bg-purple-50 text-sm text-gray-700 group-hover:border-purple-400 group-hover:bg-purple-100/80 transition-colors leading-relaxed">
                          <DiffHighlight original={body} modified={proofreadText} />
                        </div>
                        <p className="text-[10px] text-purple-500 mt-1 text-right group-hover:text-purple-600">クリックですべて適用</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-500">文章の修正はありません。以下のタグ・カテゴリ提案を確認してください。</p>
                    </div>
                  )}

                  {/* 自動付与されるタグ・カテゴリ */}
                  {(suggestedTags.length > 0 || suggestedCategory) && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-xs font-medium text-purple-700 mb-2">AIが提案する設定</p>
                      {suggestedCategory && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] text-purple-600">カテゴリ:</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_CONFIG[suggestedCategory].bgColor} ${CATEGORY_CONFIG[suggestedCategory].color}`}>
                            {CATEGORY_CONFIG[suggestedCategory].icon} {CATEGORY_CONFIG[suggestedCategory].label}
                          </span>
                          {suggestedCategory !== category && (
                            <span className="text-[10px] text-purple-400">← {CATEGORY_CONFIG[category].label} から変更</span>
                          )}
                        </div>
                      )}
                      {suggestedTags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-purple-600">タグ:</span>
                          {suggestedTags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-white text-purple-700 rounded text-xs border border-purple-200">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-purple-200">
                        <button
                          type="button"
                          onClick={applyProofreadResult}
                          className="px-4 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          すべて適用
                        </button>
                        <button
                          type="button"
                          onClick={closeComparison}
                          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          適用しない
                        </button>
                      </div>
                    </div>
                  )}
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

            <AttachmentUploader attachments={attachments} onChange={setAttachments} />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              やめる
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !body.trim() || submitting || showComparison}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium rounded-full hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
            >
              {submitting ? (
                "共有中..."
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  シェアする
                </>
              )}
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
  const [viewScope, setViewScope] = useState<ViewScope>("all");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Current user's team
  const currentUserTeam = currentUser ? USER_TEAM_MAP[currentUser] : null;

  // Prefill data for QuickPostBox (from MinutesKnowledgePanel)
  const [prefillData, setPrefillData] = useState<QuickPostPrefillData | null>(null);

  // チームタブ切り替え時に自チームをデフォルト選択
  const handleScopeChange = (scope: ViewScope) => {
    setViewScope(scope);
    if (scope === "team" && !selectedTeamId) {
      setSelectedTeamId(currentUserTeam || Object.keys(TEAM_NAMES)[0] || null);
    }
  };

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

    // View scope filter
    if (viewScope === "personal" && currentUser) {
      result = result.filter((p) => p.author === currentUser);
    } else if (viewScope === "team" && selectedTeamId) {
      result = result.filter((p) => {
        const authorTeam = USER_TEAM_MAP[p.author];
        return authorTeam === selectedTeamId || p.team_id === selectedTeamId;
      });
    }

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
  }, [posts, searchQuery, selectedCategory, selectedTag, timePeriod, viewScope, currentUser, selectedTeamId]);

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

  const handleArchive = async (postId: string, archived: boolean) => {
    if (!currentUser) return;
    const res = await fetch(`/api/knowledge/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archived,
        archived_by: archived ? currentUser : undefined,
        archived_at: archived ? new Date().toISOString() : undefined,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    }
  };

  const handleDelete = async (postId: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/knowledge/${postId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const handleNewPost = async (data: { title: string; body: string; tags: string[]; category: KnowledgeCategory; images: string[]; attachments?: Attachment[] }) => {
    if (!currentUser) return;
    try {
      const teamId = USER_TEAM_MAP[currentUser] || undefined;
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, author: currentUser, team_id: teamId }),
      });
      if (res.ok) {
        const newPost = await res.json();
        // サンプルデータが未来のタイムスタンプを持つ場合、新規投稿が最新になるよう調整
        const latest = posts.reduce((max, p) => (p.created_at > max ? p.created_at : max), "");
        if (newPost.created_at <= latest) {
          newPost.created_at = new Date(new Date(latest).getTime() + 1000).toISOString();
        }
        setPosts((prev) => [newPost, ...prev]);
      }
    } catch (e) {
      console.error("Failed to create post:", e);
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
    setViewScope("all");
    setSelectedTeamId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  const hasActiveFilter = selectedCategory || selectedTag || searchQuery || viewScope !== "all";

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ナレッジ共有</h1>
          <p className="text-sm text-gray-500 mt-0.5">チーム横断でノウハウやTipsを発見・共有</p>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          disabled={!currentUser}
          className="px-4 py-2 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          詳細に書く
        </button>
      </div>

      {/* Quick Post Box (top-level, full width) */}
      {currentUser && (
        <QuickPostBox
          currentUser={currentUser}
          onSubmit={handleNewPost}
          prefillData={prefillData}
          onPrefillConsumed={() => setPrefillData(null)}
        />
      )}

      {/* Minutes Knowledge Panel (議事録からナレッジ自動投稿) */}
      {currentUser && (
        <MinutesKnowledgePanel onCopyToEditor={setPrefillData} />
      )}

      {/* Scope Tabs + Compact Search */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-200">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleScopeChange("all")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              viewScope === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <span>🌐</span>
              全体
            </span>
          </button>
          <button
            onClick={() => handleScopeChange("team")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              viewScope === "team"
                ? "border-green-500 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <span>👥</span>
              チーム
            </span>
          </button>
          <button
            onClick={() => handleScopeChange("personal")}
            disabled={!currentUser}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              viewScope === "personal"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <span>👤</span>
              自分の投稿
            </span>
          </button>
        </div>

        {/* Compact Search & Time Period */}
        <div className="flex items-center gap-2 pb-1">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="検索..."
              className="w-44 pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:w-64 transition-all bg-gray-50"
            />
          </div>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[
              { value: "all", label: "全期間" },
              { value: "today", label: "今日" },
              { value: "week", label: "今週" },
              { value: "month", label: "今月" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimePeriod(opt.value as TimePeriod)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
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

      {/* Team Selector */}
      {viewScope === "team" && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-sm text-green-700 shrink-0">チーム:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(TEAM_NAMES).map(([teamId, teamName]) => {
              const isMyTeam = teamId === currentUserTeam;
              const isSelected = teamId === selectedTeamId;
              return (
                <button
                  key={teamId}
                  onClick={() => setSelectedTeamId(teamId)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-green-600 text-white shadow-sm"
                      : "bg-white text-green-700 hover:bg-green-100 border border-green-300"
                  }`}
                >
                  {teamName}
                  {isMyTeam && (
                    <span className={`text-[10px] px-1 py-0.5 rounded ${
                      isSelected ? "bg-green-500 text-green-100" : "bg-green-100 text-green-600"
                    }`}>
                      自分
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Personal Scope Banner */}
      {viewScope === "personal" && currentUser && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg">
          <span className="text-lg leading-none">👤</span>
          <span className="text-sm font-medium text-purple-700">
            {currentUser}さんの投稿を表示中
          </span>
        </div>
      )}

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
                  onArchive={handleArchive}
                  onDelete={handleDelete}
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
                    onArchive={handleArchive}
                    onDelete={handleDelete}
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
