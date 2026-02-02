"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
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
  reviewer: string;
  role: string;
  decision: string;
  comment: string;
  labels: string[];
  created_at: string;
}

interface InlineComment {
  id: string;
  selectedText: string;
  fieldKey: string;
  comment: string;
  reviewer: string;
  createdAt: string;
}

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
};

// Field label mapping
const FIELD_LABELS: Record<string, string> = {
  hook: "Hook", problem: "課題", evidence: "エビデンス", evidence_source: "引用元",
  practice: "実践", cta: "CTA", thumbnail_text: "サムネイル", caption: "キャプション",
  hashtags: "ハッシュタグ", disclaimer: "免責文", story_type: "タイプ",
  poll_question: "投票/質問", countdown_title: "カウントダウン",
  slide1_cover: "表紙", slide2_misconception: "誤解", slide3_truth: "正しい理解",
  slide4_practice: "実践", slide5_cta: "CTA",
  title: "タイトル", subtitle: "サブタイトル", event_date: "日時",
  event_location: "場所", event_price: "料金", cta_text: "CTAボタン",
  benefits: "ベネフィット", agenda: "アジェンダ", speaker_name: "登壇者",
  speaker_title: "登壇者肩書き", meta_title: "SEOタイトル",
  meta_description: "SEOディスクリプション",
  title_option1: "タイトル案1", title_option2: "タイトル案2", title_option3: "タイトル案3",
  lead: "リード", body_markdown: "本文", tags: "タグ", og_text: "OGテキスト",
  cta_label: "CTAラベル", cta_url: "CTA URL",
  delivery_type: "配信タイプ", segment: "セグメント", message_text: "メッセージ本文",
  rich_title: "リッチメニュータイトル", rich_cta: "リッチメニューCTA",
};

// Get ordered fields per channel
function getFieldsForChannel(channel: string): string[] {
  if (channel === "instagram_reels") return ["hook", "problem", "evidence", "evidence_source", "practice", "cta", "thumbnail_text", "caption", "hashtags", "disclaimer"];
  if (channel === "instagram_stories") return ["story_type", "poll_question", "countdown_title"];
  if (channel === "instagram_feed") return ["slide1_cover", "slide2_misconception", "slide3_truth", "slide4_practice", "slide5_cta", "caption", "disclaimer"];
  if (channel === "event_lp") return ["title", "subtitle", "event_date", "event_location", "event_price", "cta_text", "benefits", "agenda", "speaker_name", "speaker_title", "meta_title", "meta_description", "disclaimer"];
  if (channel === "note") return ["title_option1", "title_option2", "title_option3", "lead", "body_markdown", "tags", "og_text", "cta_label", "cta_url", "disclaimer"];
  if (channel === "line") return ["delivery_type", "segment", "message_text", "cta_label", "rich_title", "rich_cta"];
  return [];
}

// ---------------------------------------------------------------------------
// Selectable text field with highlight for comments
// ---------------------------------------------------------------------------

function SelectableField({
  fieldKey,
  label,
  value,
  comments,
  onAddComment,
}: {
  fieldKey: string;
  label: string;
  value: string;
  comments: InlineComment[];
  onAddComment: (fieldKey: string, selectedText: string, rect: DOMRect) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fieldComments = comments.filter((c) => c.fieldKey === fieldKey);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !ref.current) return;
    const text = sel.toString().trim();
    if (!text) return;

    // Check selection is within this field
    const range = sel.getRangeAt(0);
    if (!ref.current.contains(range.commonAncestorContainer)) return;

    const rect = range.getBoundingClientRect();
    onAddComment(fieldKey, text, rect);
  }, [fieldKey, onAddComment]);

  // Highlight commented text
  function renderHighlighted() {
    if (fieldComments.length === 0) return value;

    let result = value;
    const parts: { start: number; end: number; comment: InlineComment }[] = [];

    for (const c of fieldComments) {
      const idx = result.indexOf(c.selectedText);
      if (idx >= 0) {
        parts.push({ start: idx, end: idx + c.selectedText.length, comment: c });
      }
    }

    if (parts.length === 0) return value;

    // Sort and render
    parts.sort((a, b) => a.start - b.start);
    const elements: React.ReactNode[] = [];
    let cursor = 0;

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.start > cursor) {
        elements.push(value.slice(cursor, p.start));
      }
      elements.push(
        <span
          key={i}
          className="bg-yellow-200 border-b-2 border-yellow-400 cursor-help relative group/hl"
          title={`${p.comment.reviewer}: ${p.comment.comment}`}
        >
          {value.slice(p.start, p.end)}
          <span className="absolute bottom-full left-0 mb-1 hidden group-hover/hl:block bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 max-w-xs">
            <strong>{p.comment.reviewer}:</strong> {p.comment.comment}
          </span>
        </span>
      );
      cursor = p.end;
    }
    if (cursor < value.length) {
      elements.push(value.slice(cursor));
    }
    return <>{elements}</>;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-blue-600 uppercase">{label}</span>
        {fieldComments.length > 0 && (
          <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
            {fieldComments.length}件のコメント
          </span>
        )}
      </div>
      <div
        ref={ref}
        onMouseUp={handleMouseUp}
        className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed select-text cursor-text p-3 rounded-lg bg-gray-50 hover:bg-blue-50/50 transition-colors"
      >
        {value ? renderHighlighted() : <span className="text-gray-300">-</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comment input popover
// ---------------------------------------------------------------------------

function CommentPopover({
  selectedText,
  position,
  onSubmit,
  onCancel,
}: {
  selectedText: string;
  position: { top: number; left: number };
  onSubmit: (reviewer: string, comment: string) => void;
  onCancel: () => void;
}) {
  const [reviewer, setReviewer] = useState("");
  const [comment, setComment] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onCancel]);

  return (
    <div
      ref={ref}
      className="fixed z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{ top: Math.min(position.top, window.innerHeight - 300), left: Math.min(position.left, window.innerWidth - 340) }}
    >
      <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-100">
        <p className="text-xs text-yellow-700 font-medium truncate">
          「{selectedText.slice(0, 40)}{selectedText.length > 40 ? "..." : ""}」にコメント
        </p>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <input
            ref={inputRef}
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="あなたの名前"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
        </div>
        <div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="コメントを入力..."
            rows={2}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">キャンセル</button>
          <button
            onClick={() => { if (reviewer.trim() && comment.trim()) onSubmit(reviewer.trim(), comment.trim()); }}
            disabled={!reviewer.trim() || !comment.trim()}
            className={`px-4 py-1.5 rounded-md text-xs font-medium ${
              reviewer.trim() && comment.trim() ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400"
            }`}
          >
            コメント追加
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assignee helpers & combobox
// ---------------------------------------------------------------------------

function loadMembers(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("registered_members") ?? "[]"); } catch { return []; }
}

function saveMembers(members: string[]) {
  localStorage.setItem("registered_members", JSON.stringify(members));
}

function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase(), t = target.toLowerCase();
  if (t.includes(q)) return 2;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) { if (t[ti] === q[qi]) qi++; }
  return qi === q.length ? 1 : 0;
}

function AssigneeCombobox({ value, members, onChange, onRemoveMember }: {
  value: string; members: string[];
  onChange: (val: string) => void; onRemoveMember: (name: string) => void;
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
    ? members.map((m) => ({ name: m, score: fuzzyMatch(query, m) })).filter((m) => m.score > 0).sort((a, b) => b.score - a.score).map((m) => m.name)
    : members;
  const showAddNew = query && !members.includes(query) && query.trim().length > 0;

  function select(val: string) { onChange(val); setQuery(""); setOpen(false); }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 0); }}
        className={`text-xs rounded-md border px-3 py-1.5 outline-none cursor-pointer ${
          value ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-400"
        }`}
      >
        {value ? `担当: ${value}` : "担当者を設定"}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-lg shadow-lg w-56 overflow-hidden">
          <div className="p-1.5 border-b border-gray-100">
            <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && showAddNew) select(query.trim()); if (e.key === "Escape") setOpen(false); }}
              placeholder="名前で検索 / 新規入力..." className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded outline-none focus:border-indigo-300" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {value && <button onClick={() => select("")} className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50">担当を解除</button>}
            {filtered.map((m) => (
              <div key={m} className="flex items-center group">
                <button onClick={() => select(m)} className={`flex-1 text-left px-3 py-2 text-xs hover:bg-indigo-50 ${m === value ? "text-indigo-700 font-medium bg-indigo-50/50" : "text-gray-700"}`}>{m}</button>
                <button onClick={(e) => { e.stopPropagation(); onRemoveMember(m); }} className="px-2 py-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title={`${m} を削除`}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            {showAddNew && <button onClick={() => select(query.trim())} className="w-full text-left px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 border-t border-gray-100">+ &quot;{query.trim()}&quot; を追加</button>}
            {filtered.length === 0 && !showAddNew && <div className="px-3 py-3 text-xs text-gray-400 text-center">該当なし</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VariantDetailPage() {
  const { variantId } = useParams<{ variantId: string }>();
  const [variant, setVariant] = useState<Variant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [inlineComments, setInlineComments] = useState<InlineComment[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(`comments_${variantId}`) ?? "[]"); } catch { return []; }
  });
  const [commentPopover, setCommentPopover] = useState<{ fieldKey: string; selectedText: string; position: { top: number; left: number } } | null>(null);

  // Persist inline comments to localStorage
  useEffect(() => {
    localStorage.setItem(`comments_${variantId}`, JSON.stringify(inlineComments));
  }, [inlineComments, variantId]);

  // Overall review
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ reviewer: "", role: "supervisor", decision: "approved", comment: "" });
  const reviewFormRef = useRef(reviewForm);
  reviewFormRef.current = reviewForm;
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [registeredMembers, setRegisteredMembers] = useState<string[]>([]);

  useEffect(() => { setRegisteredMembers(loadMembers()); }, []);

  const allMembers = [...new Set([...registeredMembers, ...(variant?.assignee ? [variant.assignee] : [])])].sort();

  function handleAssigneeChange(newAssignee: string) {
    if (!variant) return;
    setVariant({ ...variant, assignee: newAssignee || undefined });
    const overrides = JSON.parse(localStorage.getItem("assignee_overrides") ?? "{}");
    overrides[variant.id] = newAssignee;
    localStorage.setItem("assignee_overrides", JSON.stringify(overrides));
    if (newAssignee && !registeredMembers.includes(newAssignee)) {
      const next = [...registeredMembers, newAssignee].sort();
      setRegisteredMembers(next);
      saveMembers(next);
    }
  }

  function handleRemoveMember(name: string) {
    const next = registeredMembers.filter((m) => m !== name);
    setRegisteredMembers(next);
    saveMembers(next);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/variants").then((r) => r.json()),
      fetch("/api/reviews").then((r) => r.json()),
    ]).then(([variants, revs]) => {
      const overrides = JSON.parse(localStorage.getItem("assignee_overrides") ?? "{}") as Record<string, string>;
      const withAssignees = (variants as Variant[]).map((x) => overrides[x.id] !== undefined ? { ...x, assignee: overrides[x.id] || undefined } : x);
      const v = withAssignees.find((x) => x.id === variantId) ?? null;
      setVariant(v);
      if (v) setReviews((revs as Review[]).filter((r) => r.content_id === v.content_id));
      setLoading(false);
    });
  }, [variantId]);

  const handleAddComment = useCallback((fieldKey: string, selectedText: string, rect: DOMRect) => {
    setCommentPopover({
      fieldKey,
      selectedText,
      position: { top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX },
    });
  }, []);

  function submitInlineComment(reviewer: string, comment: string) {
    if (!commentPopover) return;
    setInlineComments((prev) => [
      ...prev,
      {
        id: `ic_${Date.now()}`,
        selectedText: commentPopover.selectedText,
        fieldKey: commentPopover.fieldKey,
        comment,
        reviewer,
        createdAt: new Date().toISOString(),
      },
    ]);
    setCommentPopover(null);
    window.getSelection()?.removeAllRanges();
  }

  async function handleSubmitReview() {
    const form = reviewFormRef.current;
    if (!variant || !form.reviewer.trim() || !form.comment.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_id: variant.content_id,
        reviewer: form.reviewer,
        role: form.role,
        decision: form.decision,
        comment: form.comment,
        labels: [],
      }),
    });
    if (res.ok) {
      const review: Review = await res.json();
      setReviews((prev) => [...prev, review]);
      setShowReviewForm(false);
      setToast(form.decision === "approved" ? "承認しました" : form.decision === "rejected" ? "却下しました" : "修正依頼を送信しました");
      setReviewForm({ reviewer: "", role: "supervisor", decision: "approved", comment: "" });
      setTimeout(() => setToast(""), 3000);
    }
    setSubmitting(false);
  }

  if (loading) return <div className="text-center py-16 text-gray-400">読み込み中...</div>;
  if (!variant) return <div className="text-center py-16 text-gray-400">コンテンツが見つかりません</div>;

  const st = STATUS_STYLE[variant.status] ?? STATUS_STYLE.draft;
  const body = variant.body ?? {};
  const fields = getFieldsForChannel(variant.channel);

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      {/* Comment popover */}
      {commentPopover && (
        <CommentPopover
          selectedText={commentPopover.selectedText}
          position={commentPopover.position}
          onSubmit={submitInlineComment}
          onCancel={() => { setCommentPopover(null); window.getSelection()?.removeAllRanges(); }}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <Link href="/contents/list" className="text-sm text-blue-600 hover:underline mb-2 inline-block">&larr; コンテンツ一覧</Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{variant.id}</h2>
            <span className={`${CHANNEL_COLOR[variant.channel] ?? "bg-slate-500"} text-white px-2.5 py-1 text-[10px] font-semibold rounded`}>
              {CHANNEL_LABEL[variant.channel] ?? variant.channel}
            </span>
            <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${st.bg}`}>
              {st.label}
            </span>
            <AssigneeCombobox
              value={variant.assignee ?? ""}
              members={allMembers}
              onChange={handleAssigneeChange}
              onRemoveMember={handleRemoveMember}
            />
          </div>
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
          >
            レビューする
          </button>
        </div>
        {variant.scheduled_at && (
          <p className="text-sm text-gray-400 mt-1">配信予定: {variant.scheduled_at}</p>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left: content fields */}
        <div className="flex-1 min-w-0">
          {/* Instruction */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-xs text-blue-700">
              <strong>レビュー方法:</strong> テキストを範囲選択すると、その箇所にコメントを追加できます。
            </p>
          </div>

          {/* Fields */}
          {fields.map((key) => {
            let val = body[key];
            if (val == null) return null;
            if (Array.isArray(val)) val = (val as string[]).join(", ");
            return (
              <SelectableField
                key={key}
                fieldKey={key}
                label={FIELD_LABELS[key] ?? key}
                value={String(val)}
                comments={inlineComments}
                onAddComment={handleAddComment}
              />
            );
          })}

          {/* Stories slides */}
          {variant.channel === "instagram_stories" && Array.isArray(body.slides) && (
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase mb-2 block">スライド</span>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {(body.slides as { text: string; image_note: string }[]).map((s, i) => (
                  <SelectableField
                    key={`slide_${i}`}
                    fieldKey={`slides.${i}.text`}
                    label={`#${i + 1}`}
                    value={s.text || "-"}
                    comments={inlineComments}
                    onAddComment={handleAddComment}
                  />
                ))}
              </div>
            </div>
          )}

          {/* LINE step messages */}
          {variant.channel === "line" && Array.isArray(body.step_messages) && (
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase mb-2 block">ステップ配信</span>
              {(body.step_messages as { timing: string; content: string }[]).map((s, i) => (
                <div key={i} className="flex gap-3 items-start mb-2">
                  <span className="px-2 py-1 text-xs bg-gray-100 rounded font-medium shrink-0">{s.timing}</span>
                  <SelectableField
                    fieldKey={`step_messages.${i}.content`}
                    label={`ステップ ${i + 1}`}
                    value={s.content}
                    comments={inlineComments}
                    onAddComment={handleAddComment}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar: comments + review */}
        <div className="w-80 shrink-0">
          {/* Inline comments list */}
          <div className="bg-white rounded-lg border border-gray-200 mb-4">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">コメント ({inlineComments.length})</h3>
            </div>
            {inlineComments.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                テキストを選択してコメントを追加
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-96 overflow-auto">
                {inlineComments.map((c) => (
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-800">{c.reviewer}</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(c.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="bg-yellow-50 border-l-2 border-yellow-400 pl-2 py-1 mb-1.5">
                      <p className="text-[11px] text-yellow-700 truncate">&ldquo;{c.selectedText}&rdquo;</p>
                    </div>
                    <p className="text-xs text-gray-600">{c.comment}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{FIELD_LABELS[c.fieldKey] ?? c.fieldKey}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review history */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 mb-4">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800">レビュー履歴</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {reviews.map((r) => (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        r.decision === "approved" ? "bg-green-100 text-green-700" :
                        r.decision === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {r.decision === "approved" ? "承認" : r.decision === "rejected" ? "却下" : "修正依頼"}
                      </span>
                      <span className="text-xs text-gray-600">{r.reviewer}（{r.role}）</span>
                    </div>
                    <p className="text-xs text-gray-600">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall review form */}
          {showReviewForm && (
            <div className="bg-white rounded-lg border border-indigo-200 shadow-sm">
              <div className="px-4 py-3 border-b border-indigo-100 bg-indigo-50">
                <h3 className="text-sm font-bold text-indigo-800">総合レビュー</h3>
              </div>
              <div className="p-4 space-y-3">
                <input
                  value={reviewForm.reviewer}
                  onChange={(e) => { const v = e.target.value; setReviewForm((f) => ({ ...f, reviewer: v })); }}
                  placeholder="あなたの名前"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                />
                <div className="flex gap-1.5">
                  {(["supervisor", "expert", "legal", "brand"] as const).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setReviewForm((f) => ({ ...f, role: val }))}
                      className={`flex-1 py-1.5 rounded text-[10px] font-medium border ${
                        reviewForm.role === val ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300"
                      }`}
                    >
                      {{supervisor: "MGR", expert: "専門家", legal: "法務", brand: "ブランド"}[val]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {([
                    { val: "approved", label: "承認", cls: "bg-green-50 border-green-400 text-green-700", active: "bg-green-500 text-white border-green-500" },
                    { val: "revision_requested", label: "修正依頼", cls: "bg-yellow-50 border-yellow-400 text-yellow-700", active: "bg-yellow-500 text-white border-yellow-500" },
                    { val: "rejected", label: "却下", cls: "bg-red-50 border-red-400 text-red-700", active: "bg-red-500 text-white border-red-500" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setReviewForm((f) => ({ ...f, decision: opt.val }))}
                      className={`flex-1 py-2 rounded-md text-xs font-medium border transition-colors ${
                        reviewForm.decision === opt.val ? opt.active : opt.cls
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => { const v = e.target.value; setReviewForm((f) => ({ ...f, comment: v })); }}
                  placeholder="総合コメント"
                  rows={3}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowReviewForm(false)} className="flex-1 py-2 rounded-md text-xs border border-gray-300 hover:bg-gray-50">キャンセル</button>
                  <button
                    onClick={handleSubmitReview}
                    disabled={submitting || !reviewForm.reviewer.trim() || !reviewForm.comment.trim()}
                    className={`flex-1 py-2 rounded-md text-xs font-medium ${
                      submitting || !reviewForm.reviewer.trim() || !reviewForm.comment.trim()
                        ? "bg-gray-200 text-gray-400"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {submitting ? "送信中..." : "送信"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
