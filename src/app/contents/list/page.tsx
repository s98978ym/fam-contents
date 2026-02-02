"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Variant {
  id: string;
  content_id: string;
  channel: string;
  status: string;
  body?: Record<string, unknown>;
  scheduled_at?: string;
  assignee?: string;
}

interface Review {
  id: string;
  content_id: string;
  decision: string;
}

interface TrashedItem {
  variantId: string;
  deletedAt: string; // ISO string
}

type ViewMode = "active" | "archived" | "trash";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHANNEL_LABEL: Record<string, string> = {
  instagram_reels: "IG Reels",
  instagram_stories: "IG Stories",
  instagram_feed: "IG Feed",
  event_lp: "イベントLP",
  note: "note",
  line: "LINE",
};

const CHANNEL_COLOR: Record<string, string> = {
  instagram_reels: "bg-gradient-to-r from-pink-500 to-purple-500",
  instagram_stories: "bg-gradient-to-r from-orange-400 to-pink-500",
  instagram_feed: "bg-gradient-to-r from-purple-500 to-indigo-500",
  event_lp: "bg-emerald-500",
  note: "bg-slate-700",
  line: "bg-green-500",
};

const STATUS_STYLE: Record<string, { bg: string; label: string }> = {
  draft: { bg: "bg-gray-100 text-gray-600", label: "下書き" },
  review: { bg: "bg-yellow-100 text-yellow-700", label: "レビュー待ち" },
  review_requested: { bg: "bg-yellow-100 text-yellow-700", label: "レビュー待ち" },
  approved: { bg: "bg-green-100 text-green-700", label: "承認済み" },
  rejected: { bg: "bg-red-100 text-red-700", label: "差し戻し" },
  published: { bg: "bg-blue-100 text-blue-700", label: "配信済み" },
  overdue: { bg: "bg-orange-100 text-orange-700", label: "期限超過" },
  archived: { bg: "bg-slate-100 text-slate-500", label: "アーカイブ" },
};

function getContentSummary(v: Variant): string {
  if (!v.body) return "";
  const b = v.body as Record<string, unknown>;
  return String(b.hook ?? b.title ?? b.title_option1 ?? b.message_text ?? b.slide1_cover ?? "").slice(0, 60);
}

function getCommentCount(variantId: string): number {
  if (typeof window === "undefined") return 0;
  try { return JSON.parse(localStorage.getItem(`comments_${variantId}`) ?? "[]").length; } catch { return 0; }
}

function loadSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { return new Set(); }
}

function saveSet(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s]));
}

function loadTrashed(): TrashedItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("contents_trash") ?? "[]"); } catch { return []; }
}

function saveTrashed(items: TrashedItem[]) {
  localStorage.setItem("contents_trash", JSON.stringify(items));
}

function isOverdue(v: Variant): boolean {
  if (!v.scheduled_at) return false;
  if (v.status === "published") return false;
  return new Date(v.scheduled_at) < new Date();
}

function daysUntilDeletion(deletedAt: string): number {
  const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function loadMembers(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("registered_members") ?? "[]"); } catch { return []; }
}

function saveMembers(members: string[]) {
  localStorage.setItem("registered_members", JSON.stringify(members));
}

/** Simple fuzzy: check if all chars of query appear in order in target */
function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 2; // exact substring = highest
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length ? 1 : 0;
}

// ---------------------------------------------------------------------------
// AssigneeCombobox
// ---------------------------------------------------------------------------

function AssigneeCombobox({ value, members, onChange, onRemoveMember }: {
  value: string;
  members: string[];
  onChange: (val: string) => void;
  onRemoveMember: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query
    ? members
        .map((m) => ({ name: m, score: fuzzyMatch(query, m) }))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((m) => m.name)
    : members;

  const showAddNew = query && !members.includes(query) && query.trim().length > 0;

  function select(val: string) {
    onChange(val);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 0); }}
        className={`text-xs rounded-md border px-2 py-1.5 outline-none cursor-pointer min-w-[80px] text-left ${
          value ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-400"
        }`}
      >
        {value || "担当者"}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-lg shadow-lg w-56 overflow-hidden">
          <div className="p-1.5 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && showAddNew) { select(query.trim()); }
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="名前で検索 / 新規入力..."
              className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded outline-none focus:border-indigo-300"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {value && (
              <button
                onClick={() => select("")}
                className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50"
              >
                担当を解除
              </button>
            )}
            {filtered.map((m) => (
              <div key={m} className="flex items-center group">
                <button
                  onClick={() => select(m)}
                  className={`flex-1 text-left px-3 py-2 text-xs hover:bg-indigo-50 ${
                    m === value ? "text-indigo-700 font-medium bg-indigo-50/50" : "text-gray-700"
                  }`}
                >
                  {m}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveMember(m); }}
                  className="px-2 py-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title={`${m} を削除`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            {showAddNew && (
              <button
                onClick={() => select(query.trim())}
                className="w-full text-left px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 border-t border-gray-100"
              >
                + &quot;{query.trim()}&quot; を追加
              </button>
            )}
            {filtered.length === 0 && !showAddNew && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">該当なし</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ContentsListPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([]);
  const [toast, setToast] = useState("");
  const [registeredMembers, setRegisteredMembers] = useState<string[]>([]);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setArchivedIds(loadSet("contents_archived"));
    const items = loadTrashed().filter((t) => daysUntilDeletion(t.deletedAt) > 0);
    saveTrashed(items);
    setTrashedItems(items);
    setRegisteredMembers(loadMembers());
  }, []);

  const trashedIds = new Set(trashedItems.map((t) => t.variantId));

  useEffect(() => {
    Promise.all([
      fetch("/api/variants").then((r) => r.json()),
      fetch("/api/reviews").then((r) => r.json()),
    ]).then(([v, r]) => {
      // Apply persisted assignee overrides
      const overrides = JSON.parse(localStorage.getItem("assignee_overrides") ?? "{}") as Record<string, string>;
      const withAssignees = (v as Variant[]).map((x) => overrides[x.id] !== undefined ? { ...x, assignee: overrides[x.id] || undefined } : x);
      setVariants(withAssignees);
      setReviews(r);
      setLoading(false);
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  // --- Actions ---
  function handleArchive(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setArchivedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveSet("contents_archived", next);
      return next;
    });
    showToast("アーカイブしました");
  }

  function handleUnarchive(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setArchivedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      saveSet("contents_archived", next);
      return next;
    });
    showToast("アーカイブを解除しました");
  }

  function handleTrash(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    // Remove from archived if it was there
    setArchivedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      saveSet("contents_archived", next);
      return next;
    });
    setTrashedItems((prev) => {
      const next = [...prev, { variantId: id, deletedAt: new Date().toISOString() }];
      saveTrashed(next);
      return next;
    });
    showToast("ゴミ箱に移動しました");
  }

  function handleRestore(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setTrashedItems((prev) => {
      const next = prev.filter((t) => t.variantId !== id);
      saveTrashed(next);
      return next;
    });
    showToast("復元しました");
  }

  function handlePermanentDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("完全に削除しますか？この操作は取り消せません。")) return;
    setTrashedItems((prev) => {
      const next = prev.filter((t) => t.variantId !== id);
      saveTrashed(next);
      return next;
    });
    // Also remove comments
    localStorage.removeItem(`comments_${id}`);
    showToast("完全に削除しました");
  }

  function handleAssigneeChange(variantId: string, newAssignee: string) {
    setVariants((prev) => prev.map((v) => v.id === variantId ? { ...v, assignee: newAssignee || undefined } : v));
    // Persist overrides
    const overrides = JSON.parse(localStorage.getItem("assignee_overrides") ?? "{}");
    overrides[variantId] = newAssignee;
    localStorage.setItem("assignee_overrides", JSON.stringify(overrides));
    // Auto-register new member
    if (newAssignee && !registeredMembers.includes(newAssignee)) {
      const next = [...registeredMembers, newAssignee].sort();
      setRegisteredMembers(next);
      saveMembers(next);
    }
    showToast(newAssignee ? `担当: ${newAssignee}` : "担当を解除しました");
  }

  function handleRemoveMember(name: string) {
    const next = registeredMembers.filter((m) => m !== name);
    setRegisteredMembers(next);
    saveMembers(next);
    showToast(`${name} をメンバーから削除しました`);
  }

  // --- Compute effective status ---
  function getEffectiveStatus(v: Variant): { bg: string; label: string } {
    if (isOverdue(v)) return STATUS_STYLE.overdue;
    return STATUS_STYLE[v.status] ?? STATUS_STYLE.draft;
  }

  // --- Known assignees (registered + from data) ---
  const allAssignees = [...new Set([...registeredMembers, ...variants.map((v) => v.assignee).filter(Boolean) as string[]])].sort();

  // --- Filter logic ---
  const activeVariants = variants.filter((v) => !archivedIds.has(v.id) && !trashedIds.has(v.id));
  const archivedVariants = variants.filter((v) => archivedIds.has(v.id) && !trashedIds.has(v.id));
  const trashedVariants = variants.filter((v) => trashedIds.has(v.id));

  const displayVariants = viewMode === "active" ? activeVariants : viewMode === "archived" ? archivedVariants : trashedVariants;

  const afterStatusFilter = viewMode === "active"
    ? (filter === "all" ? displayVariants
      : filter === "overdue" ? displayVariants.filter((v) => isOverdue(v))
      : displayVariants.filter((v) => v.status === filter && !isOverdue(v)))
    : displayVariants;

  const filtered = assigneeFilter === "all"
    ? afterStatusFilter
    : assigneeFilter === "unassigned"
      ? afterStatusFilter.filter((v) => !v.assignee)
      : afterStatusFilter.filter((v) => v.assignee === assigneeFilter);

  const overdueCount = activeVariants.filter((v) => isOverdue(v)).length;

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">コンテンツ一覧</h2>
        <a href="/contents" className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
          + 新規生成
        </a>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        生成されたコンテンツの確認・レビュー・承認を行えます。
      </p>

      {/* View mode tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        {([
          { key: "active" as ViewMode, label: "アクティブ", count: activeVariants.length },
          { key: "archived" as ViewMode, label: "アーカイブ", count: archivedVariants.length },
          { key: "trash" as ViewMode, label: "ゴミ箱", count: trashedVariants.length },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setViewMode(tab.key); setFilter("all"); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              viewMode === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs ${viewMode === tab.key ? "text-blue-500" : "text-gray-400"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Trash notice */}
      {viewMode === "trash" && trashedVariants.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs text-orange-700">
            ゴミ箱のアイテムは削除から <strong>30日後</strong> に自動的に完全削除されます。復元するには「元に戻す」をクリックしてください。
          </p>
        </div>
      )}

      {/* Status filters (active view only) */}
      {viewMode === "active" && (
        <div className="flex gap-2 mb-5">
          {([
            ["all", "すべて"],
            ["draft", "下書き"],
            ["review", "レビュー待ち"],
            ["approved", "承認済み"],
            ...(overdueCount > 0 ? [["overdue", "期限超過"]] : []),
          ] as [string, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === key ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              } ${key === "overdue" && filter !== key ? "border-orange-300 text-orange-600" : ""}`}
            >
              {label}
              {key === "overdue" && (
                <span className="ml-1.5 opacity-70">{overdueCount}</span>
              )}
              {key !== "all" && key !== "overdue" && (
                <span className="ml-1.5 opacity-70">
                  {activeVariants.filter((v) =>
                    key === "review" ? (v.status === "review" || v.status === "review_requested") && !isOverdue(v)
                    : v.status === key && !isOverdue(v)
                  ).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Assignee filter */}
      {allAssignees.length > 0 && viewMode !== "trash" && (
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs text-gray-500">担当者:</span>
          <div className="flex gap-1.5">
            {[
              { key: "all", label: "全員" },
              ...allAssignees.map((a) => ({ key: a, label: a })),
              { key: "unassigned", label: "未設定" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setAssigneeFilter(opt.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  assigneeFilter === opt.key
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">
            {viewMode === "trash" ? "ゴミ箱は空です" : viewMode === "archived" ? "アーカイブはありません" : "コンテンツがありません"}
          </p>
          <p className="text-sm">
            {viewMode === "active" ? "「コンテンツ生成」からAIでコンテンツを作成してください。" : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => {
            const st = getEffectiveStatus(v);
            const commentCount = getCommentCount(v.id);
            const variantReviews = reviews.filter((r) => r.content_id === v.content_id);
            const approvedCount = variantReviews.filter((r) => r.decision === "approved").length;
            const revisionCount = variantReviews.filter((r) => r.decision === "revision_requested" || r.decision === "rejected").length;
            const trashInfo = trashedItems.find((t) => t.variantId === v.id);
            const overdue = isOverdue(v);

            return (
              <div
                key={v.id}
                className={`bg-white rounded-lg border transition-all p-5 ${
                  viewMode === "trash" ? "border-gray-200 opacity-60" : overdue ? "border-orange-200" : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <Link href={`/contents/list/${v.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`${CHANNEL_COLOR[v.channel] ?? "bg-slate-500"} text-white px-2 py-0.5 text-[10px] font-semibold rounded`}>
                        {CHANNEL_LABEL[v.channel] ?? v.channel}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${st.bg}`}>
                        {st.label}
                      </span>
                      {viewMode === "archived" && (
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_STYLE.archived.bg}`}>
                          {STATUS_STYLE.archived.label}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 font-mono">{v.id}</span>
                    </div>
                    <p className="text-sm text-gray-800 font-medium truncate">
                      {getContentSummary(v) || "(内容なし)"}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {v.scheduled_at && (
                        <span className={`text-xs ${overdue ? "text-orange-500 font-medium" : "text-gray-400"}`}>
                          {overdue ? "期限超過: " : "配信予定: "}{v.scheduled_at}
                        </span>
                      )}
                      {trashInfo && (
                        <span className="text-xs text-orange-500">
                          あと{daysUntilDeletion(trashInfo.deletedAt)}日で完全削除
                        </span>
                      )}
                      {commentCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-yellow-100 text-yellow-700">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                          {commentCount}
                        </span>
                      )}
                      {approvedCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-700">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          承認 {approvedCount}
                        </span>
                      )}
                      {revisionCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-700">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          修正 {revisionCount}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Assignee + Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {viewMode !== "trash" && (
                      <AssigneeCombobox
                        value={v.assignee ?? ""}
                        members={allAssignees}
                        onChange={(val) => handleAssigneeChange(v.id, val)}
                        onRemoveMember={handleRemoveMember}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {viewMode === "active" && (
                      <>
                        <button
                          onClick={(e) => handleArchive(e, v.id)}
                          title="アーカイブ"
                          className="p-2 rounded-md text-gray-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        </button>
                        <button
                          onClick={(e) => handleTrash(e, v.id)}
                          title="削除"
                          className="p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </>
                    )}
                    {viewMode === "archived" && (
                      <>
                        <button
                          onClick={(e) => handleUnarchive(e, v.id)}
                          title="アーカイブ解除"
                          className="px-3 py-1.5 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          戻す
                        </button>
                        <button
                          onClick={(e) => handleTrash(e, v.id)}
                          title="削除"
                          className="p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </>
                    )}
                    {viewMode === "trash" && (
                      <>
                        <button
                          onClick={(e) => handleRestore(e, v.id)}
                          title="元に戻す"
                          className="px-3 py-1.5 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          元に戻す
                        </button>
                        <button
                          onClick={(e) => handlePermanentDelete(e, v.id)}
                          title="完全削除"
                          className="px-3 py-1.5 rounded-md text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          完全削除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
