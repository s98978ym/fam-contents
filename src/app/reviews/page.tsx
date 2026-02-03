"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
}

type TabType = "all" | "review" | "comment";

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
// Component
// ---------------------------------------------------------------------------

export default function ReviewsPage() {
  const { currentUser, isLoaded } = useCurrentUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Filters
  const [tab, setTab] = useState<TabType>("all");
  const [filterReviewer, setFilterReviewer] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  // New message form
  const [form, setForm] = useState({
    content_id: "",
    reviewer: "",
    role: "supervisor",
    decision: "approved",
    comment: "",
    labels: "",
  });
  const [isReview, setIsReview] = useState(true);

  useEffect(() => {
    fetch("/api/reviews").then((r) => r.json()).then(setReviews);
    fetch("/api/contents").then((r) => r.json()).then(setContents);
  }, []);

  // Apply defaults based on current user
  useEffect(() => {
    if (isLoaded && currentUser && !defaultsApplied) {
      // Default to showing reviews for the user's assigned content
      setFilterAssignee(currentUser);
      // Pre-fill the reviewer name in the form
      setForm((prev) => ({ ...prev, reviewer: currentUser }));
      setDefaultsApplied(true);
    }
  }, [isLoaded, currentUser, defaultsApplied]);

  // Scroll to hash on load
  useEffect(() => {
    if (reviews.length === 0) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    setHighlightId(hash);
    const el = msgRefs.current[hash];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(timer);
  }, [reviews]);

  // Derived data
  const reviewers = useMemo(() => {
    const s = new Set(reviews.map((r) => r.reviewer));
    return Array.from(s).sort();
  }, [reviews]);

  const assignees = useMemo(() => {
    const s = new Set(contents.map((c) => c.created_by).filter(Boolean));
    return Array.from(s).sort();
  }, [contents]);

  const contentMap = useMemo(() => {
    const m: Record<string, Content> = {};
    for (const c of contents) m[c.content_id] = c;
    return m;
  }, [contents]);

  const filtered = useMemo(() => {
    let list = reviews;
    if (tab === "review") list = list.filter((r) => isReviewDecision(r.decision));
    if (tab === "comment") list = list.filter((r) => !isReviewDecision(r.decision));
    if (filterReviewer !== "all") list = list.filter((r) => r.reviewer === filterReviewer);
    if (filterAssignee !== "all") {
      const contentIds = new Set(
        contents.filter((c) => c.created_by === filterAssignee).map((c) => c.content_id)
      );
      list = list.filter((r) => contentIds.has(r.content_id));
    }
    return list.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  }, [reviews, contents, tab, filterReviewer, filterAssignee]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { date: string; items: Review[] }[] = [];
    let current = "";
    for (const r of filtered) {
      const d = (r.created_at ?? "").slice(0, 10);
      if (d !== current) {
        current = d;
        groups.push({ date: d, items: [] });
      }
      groups[groups.length - 1].items.push(r);
    }
    return groups;
  }, [filtered]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        decision: isReview ? form.decision : "comment",
        labels: form.labels ? form.labels.split(",").map((s) => s.trim()) : [],
      }),
    });
    if (res.ok) {
      const review = await res.json();
      setReviews((prev) => [...prev, review]);
      setForm({ content_id: form.content_id, reviewer: form.reviewer, role: form.role, decision: "approved", comment: "", labels: "" });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  // Tab counts
  const countAll = reviews.length;
  const countReview = reviews.filter((r) => isReviewDecision(r.decision)).length;
  const countComment = reviews.filter((r) => !isReviewDecision(r.decision)).length;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex-shrink-0 pb-4">
        <h2 className="text-2xl font-bold mb-4">レビュー管理</h2>

        {/* Tab bar */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {([
              ["all", "すべて", countAll],
              ["review", "レビュー", countReview],
              ["comment", "コメント", countComment],
            ] as [TabType, string, number][]).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
                <span className={`ml-1.5 text-xs ${tab === key ? "text-gray-500" : "text-gray-400"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick filter: My tasks */}
          {currentUser && (
            <button
              onClick={() => {
                if (filterAssignee === currentUser) {
                  setFilterAssignee("all");
                } else {
                  setFilterAssignee(currentUser);
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterAssignee === currentUser
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              自分の担当
            </button>
          )}

          {/* Reviewer filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">送信者:</span>
            <select
              value={filterReviewer}
              onChange={(e) => setFilterReviewer(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="all">全員</option>
              {reviewers.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Assignee filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">担当者:</span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className={`text-sm border rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                filterAssignee === currentUser ? "border-blue-400 bg-blue-50" : "border-gray-200"
              }`}
            >
              <option value="all">全員</option>
              {currentUser && <option value={currentUser}>自分 ({currentUser})</option>}
              {assignees.filter(n => n !== currentUser).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl border border-gray-200 px-4 py-4">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            該当するレビュー・コメントがありません
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">{group.date}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {group.items.map((r) => {
                const cfg = DECISION_CONFIG[r.decision] ?? DECISION_CONFIG.comment;
                const content = contentMap[r.content_id];
                const isHL = highlightId === r.id;
                return (
                  <div
                    key={r.id}
                    id={r.id}
                    ref={(el) => { msgRefs.current[r.id] = el; }}
                    className={`flex gap-3 mb-4 transition-all duration-700 ${
                      isHL ? "ring-2 ring-blue-400 rounded-xl bg-blue-50/50" : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full ${avatarColor(r.reviewer)} flex items-center justify-center text-white text-xs font-bold mt-0.5`}>
                      {r.reviewer.slice(-2)}
                    </div>

                    {/* Bubble */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800">{r.reviewer}</span>
                        <span className="text-xs text-gray-400">{ROLE_LABEL[r.role] ?? r.role}</span>
                        <span className="text-xs text-gray-300">{formatTime(r.created_at)}</span>
                      </div>

                      <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-200 px-4 py-3 shadow-sm">
                        {/* Decision badge */}
                        {isReviewDecision(r.decision) && (
                          <div className="mb-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
                              <span>{cfg.icon}</span>
                              {cfg.label}
                            </span>
                          </div>
                        )}

                        {/* Comment text */}
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{r.comment}</p>

                        {/* Content reference */}
                        {content && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{content.title}</span>
                          </div>
                        )}

                        {/* Labels */}
                        {r.labels.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {r.labels.map((l) => (
                              <span key={l} className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
                                {l}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 pt-3">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          {/* Top row: context selectors */}
          <div className="flex items-center gap-2 mb-3">
            <select
              value={form.content_id}
              onChange={(e) => setForm({ ...form, content_id: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
              required
            >
              <option value="">コンテンツを選択...</option>
              {contents.map((c) => (
                <option key={c.content_id} value={c.content_id}>
                  {c.title}
                </option>
              ))}
            </select>
            <input
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 w-28 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="名前"
              value={form.reviewer}
              onChange={(e) => setForm({ ...form, reviewer: e.target.value })}
              required
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="supervisor">監修</option>
              <option value="legal">法務</option>
              <option value="brand">ブランド</option>
            </select>

            {/* Review / Comment toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 ml-auto">
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
          </div>

          {/* Decision selector (review mode only) */}
          {isReview && (
            <div className="flex items-center gap-1.5 mb-3">
              {(["approved", "revision_requested", "rejected"] as const).map((d) => {
                const cfg = DECISION_CONFIG[d];
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm({ ...form, decision: d })}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.decision === d
                        ? cfg.cls
                        : "border-gray-200 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Message input + send */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
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
              <div className="flex items-center gap-2 mt-1">
                <input
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 flex-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="ラベル（カンマ区切り）"
                  value={form.labels}
                  onChange={(e) => setForm({ ...form, labels: e.target.value })}
                />
              </div>
            </div>
            <button
              type="submit"
              className="flex-shrink-0 bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors mb-6"
            >
              送信
            </button>
          </div>
          <p className="text-xs text-gray-300 mt-1">Ctrl+Enter で送信</p>
        </form>
      </div>
    </div>
  );
}
