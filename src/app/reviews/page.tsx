"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/user_context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Review {
  id: string;
  content_id: string;
  reviewer: string;
  role: string;
  decision: string;
  comment: string;
  labels: string[];
  created_at: string;
}

interface Content {
  content_id: string;
  title: string;
  created_by: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DECISION_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
  approved: { label: "承認", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "✓" },
  rejected: { label: "却下", cls: "bg-red-100 text-red-700 border-red-200", icon: "✕" },
  revision_requested: { label: "修正依頼", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: "↻" },
  comment: { label: "コメント", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: "💬" },
};

const ROLE_LABEL: Record<string, string> = {
  supervisor: "監修",
  legal: "法務",
  brand: "ブランド",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  review: "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  published: "bg-blue-100 text-blue-700",
};

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

function isReviewDecision(decision: string) {
  return decision === "approved" || decision === "rejected" || decision === "revision_requested";
}

// ---------------------------------------------------------------------------
// Thread Component
// ---------------------------------------------------------------------------

function Thread({
  content,
  reviews,
  isActive,
  onSelect,
  highlightId,
  msgRefs,
}: {
  content: Content;
  reviews: Review[];
  isActive: boolean;
  onSelect: () => void;
  highlightId: string | null;
  msgRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const latestReview = reviews[reviews.length - 1];
  const reviewCount = reviews.filter((r) => isReviewDecision(r.decision)).length;
  const commentCount = reviews.filter((r) => !isReviewDecision(r.decision)).length;
  const hasApproval = reviews.some((r) => r.decision === "approved");
  const hasRevisionRequest = reviews.some((r) => r.decision === "revision_requested");

  return (
    <div
      className={`border rounded-xl transition-all ${
        isActive
          ? "border-blue-400 bg-white shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300 cursor-pointer"
      }`}
    >
      {/* Thread Header */}
      <div
        onClick={onSelect}
        className={`p-4 ${!isActive ? "cursor-pointer" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{content.title}</h3>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[content.status] ?? "bg-gray-100"}`}>
                {content.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>担当: {content.created_by}</span>
              {reviewCount > 0 && (
                <span className="flex items-center gap-1">
                  {hasApproval ? (
                    <span className="text-emerald-600">✓ 承認済み</span>
                  ) : hasRevisionRequest ? (
                    <span className="text-amber-600">↻ 修正依頼</span>
                  ) : (
                    <span>レビュー {reviewCount}件</span>
                  )}
                </span>
              )}
              {commentCount > 0 && <span>コメント {commentCount}件</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/contents/detail/${content.content_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
            >
              詳細 →
            </Link>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isActive ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Preview of latest message when collapsed */}
        {!isActive && latestReview && (
          <div className="mt-3 flex items-start gap-2 bg-gray-50 rounded-lg p-2">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full ${avatarColor(latestReview.reviewer)} flex items-center justify-center text-white text-[10px] font-bold`}>
              {latestReview.reviewer.slice(-2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 truncate">{latestReview.comment}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{latestReview.reviewer} · {formatTime(latestReview.created_at)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Chat View */}
      {isActive && (
        <div className="border-t border-gray-100">
          {/* Messages */}
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto bg-gray-50/50">
            {reviews.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">まだコメントがありません</p>
            ) : (
              reviews.map((r) => {
                const cfg = DECISION_CONFIG[r.decision] ?? DECISION_CONFIG.comment;
                const isHL = highlightId === r.id;
                return (
                  <div
                    key={r.id}
                    id={r.id}
                    ref={(el) => { msgRefs.current[r.id] = el; }}
                    className={`flex gap-2 transition-all duration-700 ${
                      isHL ? "ring-2 ring-blue-400 rounded-lg bg-blue-50 p-2 -m-2" : ""
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${avatarColor(r.reviewer)} flex items-center justify-center text-white text-xs font-bold`}>
                      {r.reviewer.slice(-2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-800">{r.reviewer}</span>
                        <span className="text-xs text-gray-400">{ROLE_LABEL[r.role] ?? r.role}</span>
                        <span className="text-xs text-gray-300">{formatTime(r.created_at)}</span>
                      </div>
                      <div className="bg-white rounded-xl rounded-tl-sm border border-gray-200 px-3 py-2 shadow-sm">
                        {isReviewDecision(r.decision) && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border mb-1.5 ${cfg.cls}`}>
                            <span>{cfg.icon}</span>
                            {cfg.label}
                          </span>
                        )}
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{r.comment}</p>
                        {r.labels.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {r.labels.map((l) => (
                              <span key={l} className="inline-block px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">
                                {l}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Reply Form
// ---------------------------------------------------------------------------

function ReplyForm({
  contentId,
  contentTitle,
  currentUser,
  onSubmit,
  onCancel,
}: {
  contentId: string;
  contentTitle: string;
  currentUser: string | null;
  onSubmit: (data: { content_id: string; reviewer: string; role: string; decision: string; comment: string; labels: string[] }) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    reviewer: currentUser ?? "",
    role: "supervisor",
    decision: "approved",
    comment: "",
    labels: "",
  });
  const [isReview, setIsReview] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.comment.trim() || !form.reviewer.trim()) return;
    setSubmitting(true);
    await onSubmit({
      content_id: contentId,
      reviewer: form.reviewer,
      role: form.role,
      decision: isReview ? form.decision : "comment",
      comment: form.comment,
      labels: form.labels ? form.labels.split(",").map((s) => s.trim()) : [],
    });
    setSubmitting(false);
    setForm({ ...form, comment: "", labels: "" });
  }

  return (
    <div className="border-t border-gray-200 bg-white p-4 rounded-b-xl">
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        <span className="font-medium text-gray-700">{contentTitle}</span>
        <span>に返信</span>
        <button onClick={onCancel} className="ml-auto text-gray-400 hover:text-gray-600">
          キャンセル
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Mode toggle + user info */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setIsReview(true)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                isReview ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              レビュー
            </button>
            <button
              type="button"
              onClick={() => setIsReview(false)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                !isReview ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              コメント
            </button>
          </div>
          <input
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 w-24 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="名前"
            value={form.reviewer}
            onChange={(e) => setForm({ ...form, reviewer: e.target.value })}
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="supervisor">監修</option>
            <option value="legal">法務</option>
            <option value="brand">ブランド</option>
          </select>
        </div>

        {/* Decision buttons for review mode */}
        {isReview && (
          <div className="flex items-center gap-1.5 mb-2">
            {(["approved", "revision_requested", "rejected"] as const).map((d) => {
              const cfg = DECISION_CONFIG[d];
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm({ ...form, decision: d })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.decision === d ? cfg.cls : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {cfg.icon} {cfg.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Text input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-gray-400"
              placeholder={isReview ? "レビューコメントを入力..." : "コメントを入力..."}
              rows={2}
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              required
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <input
              className="mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="ラベル（カンマ区切り）"
              value={form.labels}
              onChange={(e) => setForm({ ...form, labels: e.target.value })}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !form.comment.trim()}
            className="self-start bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300"
          >
            {submitting ? "..." : "送信"}
          </button>
        </div>
        <p className="text-[10px] text-gray-300 mt-1">Ctrl+Enter で送信</p>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ReviewsPage() {
  const { currentUser, isLoaded } = useCurrentUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // UI state
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [showEmpty, setShowEmpty] = useState(false);

  useEffect(() => {
    fetch("/api/reviews").then((r) => r.json()).then(setReviews);
    fetch("/api/contents").then((r) => r.json()).then(setContents);
  }, []);

  // Default to current user's content
  useEffect(() => {
    if (isLoaded && currentUser && filterAssignee === "all") {
      setFilterAssignee(currentUser);
    }
  }, [isLoaded, currentUser, filterAssignee]);

  // Handle hash navigation
  useEffect(() => {
    if (reviews.length === 0 || contents.length === 0) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    // Find which content this review belongs to
    const review = reviews.find((r) => r.id === hash);
    if (review) {
      setActiveThread(review.content_id);
      setHighlightId(hash);
      setTimeout(() => {
        const el = msgRefs.current[hash];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      setTimeout(() => setHighlightId(null), 3000);
    }
  }, [reviews, contents]);

  // Group reviews by content
  const reviewsByContent = useMemo(() => {
    const map: Record<string, Review[]> = {};
    for (const r of reviews) {
      if (!map[r.content_id]) map[r.content_id] = [];
      map[r.content_id].push(r);
    }
    // Sort each group by created_at
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
    }
    return map;
  }, [reviews]);

  // Filter contents
  const filteredContents = useMemo(() => {
    let list = contents;
    if (filterAssignee !== "all") {
      list = list.filter((c) => c.created_by === filterAssignee);
    }
    if (!showEmpty) {
      list = list.filter((c) => (reviewsByContent[c.content_id]?.length ?? 0) > 0);
    }
    // Sort by latest activity
    return list.sort((a, b) => {
      const aRevs = reviewsByContent[a.content_id] ?? [];
      const bRevs = reviewsByContent[b.content_id] ?? [];
      const aLatest = aRevs[aRevs.length - 1]?.created_at ?? "";
      const bLatest = bRevs[bRevs.length - 1]?.created_at ?? "";
      return bLatest.localeCompare(aLatest);
    });
  }, [contents, filterAssignee, showEmpty, reviewsByContent]);

  const assignees = useMemo(() => {
    const s = new Set(contents.map((c) => c.created_by).filter(Boolean));
    return Array.from(s).sort();
  }, [contents]);

  async function handleReply(data: { content_id: string; reviewer: string; role: string; decision: string; comment: string; labels: string[] }) {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const review = await res.json();
      setReviews((prev) => [...prev, review]);
      setReplyingTo(null);
    }
  }

  // Stats
  const totalThreads = filteredContents.length;
  const totalReviews = reviews.filter((r) => isReviewDecision(r.decision)).length;
  const totalComments = reviews.filter((r) => !isReviewDecision(r.decision)).length;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">レビュー管理</h2>
        <p className="text-sm text-gray-500">
          コンテンツごとのスレッドでレビュー・コメントを管理
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          {currentUser && (
            <button
              onClick={() => setFilterAssignee(filterAssignee === currentUser ? "all" : currentUser)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterAssignee === currentUser
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 text-gray-500 hover:border-blue-400"
              }`}
            >
              自分の担当
            </button>
          )}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="all">全担当者</option>
            {assignees.map((name) => (
              <option key={name} value={name}>
                {name === currentUser ? `${name} (自分)` : name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showEmpty}
            onChange={(e) => setShowEmpty(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          コメントのないコンテンツも表示
        </label>

        <div className="ml-auto text-xs text-gray-400">
          {totalThreads}スレッド · {totalReviews}レビュー · {totalComments}コメント
        </div>
      </div>

      {/* Thread List */}
      {filteredContents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">該当するスレッドがありません</p>
          {!showEmpty && (
            <button
              onClick={() => setShowEmpty(true)}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              コメントのないコンテンツも表示する
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContents.map((content) => {
            const isActive = activeThread === content.content_id;
            const contentReviews = reviewsByContent[content.content_id] ?? [];
            return (
              <div key={content.content_id}>
                <Thread
                  content={content}
                  reviews={contentReviews}
                  isActive={isActive}
                  onSelect={() => {
                    if (isActive) {
                      setActiveThread(null);
                      setReplyingTo(null);
                    } else {
                      setActiveThread(content.content_id);
                    }
                  }}
                  highlightId={highlightId}
                  msgRefs={msgRefs}
                />

                {/* Reply form or Reply button */}
                {isActive && (
                  replyingTo === content.content_id ? (
                    <ReplyForm
                      contentId={content.content_id}
                      contentTitle={content.title}
                      currentUser={currentUser}
                      onSubmit={handleReply}
                      onCancel={() => setReplyingTo(null)}
                    />
                  ) : (
                    <div className="flex justify-center -mt-2">
                      <button
                        onClick={() => setReplyingTo(content.content_id)}
                        className="bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                      >
                        + 返信する
                      </button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
