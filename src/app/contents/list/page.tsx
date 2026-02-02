"use client";

import { useEffect, useState, useCallback } from "react";
import { StepPreview, type PreviewData, TASTE_OPTIONS, CHANNEL_LABELS } from "@/components/content_wizard";

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

const STATUS_STYLE: Record<string, { bg: string; label: string }> = {
  draft: { bg: "bg-gray-100 text-gray-600", label: "下書き" },
  review_requested: { bg: "bg-yellow-100 text-yellow-700", label: "レビュー待ち" },
  approved: { bg: "bg-green-100 text-green-700", label: "承認済み" },
  rejected: { bg: "bg-red-100 text-red-700", label: "差し戻し" },
  published: { bg: "bg-blue-100 text-blue-700", label: "配信済み" },
};

// ---------------------------------------------------------------------------
// Content Detail (channel-specific preview)
// ---------------------------------------------------------------------------

function ContentDetail({ variant }: { variant: Variant }) {
  const body = variant.body ?? {};
  const channel = variant.channel;

  // Section helper
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-3">
      <span className="text-xs font-bold text-blue-600 uppercase">{title}</span>
      <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{children}</div>
    </div>
  );

  const Text = ({ value }: { value: unknown }) => {
    if (!value) return <span className="text-gray-300">-</span>;
    return <>{String(value)}</>;
  };

  const Tags = ({ tags }: { tags: unknown }) => {
    if (!Array.isArray(tags) || tags.length === 0) return <span className="text-gray-300">-</span>;
    return <div className="flex flex-wrap gap-1">{tags.map((t: string, i: number) => <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 rounded">{t}</span>)}</div>;
  };

  // Reels
  if (channel === "instagram_reels") {
    return (
      <div className="space-y-2">
        <Section title="Hook"><Text value={body.hook} /></Section>
        <Section title="課題"><Text value={body.problem} /></Section>
        <Section title="エビデンス"><Text value={body.evidence} /></Section>
        <Section title="引用元"><Text value={body.evidence_source} /></Section>
        <Section title="実践"><Text value={body.practice} /></Section>
        <Section title="CTA"><Text value={body.cta} /></Section>
        <Section title="サムネイル"><Text value={body.thumbnail_text} /></Section>
        <Section title="キャプション"><Text value={body.caption} /></Section>
        <Section title="ハッシュタグ"><Tags tags={body.hashtags} /></Section>
        <Section title="免責文"><Text value={body.disclaimer} /></Section>
      </div>
    );
  }

  // Stories
  if (channel === "instagram_stories") {
    const slides = body.slides as { text: string; image_note: string }[] | undefined;
    return (
      <div className="space-y-2">
        <Section title="タイプ"><Text value={body.story_type} /></Section>
        <Section title="投票/質問"><Text value={body.poll_question} /></Section>
        {slides && (
          <div className="grid grid-cols-5 gap-2">
            {slides.map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                <span className="text-xs font-bold text-gray-500">#{i + 1}</span>
                <p className="text-xs mt-1">{s.text || "-"}</p>
                {s.image_note && <p className="text-xs text-gray-400 mt-1">{s.image_note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Feed
  if (channel === "instagram_feed") {
    const slides = [
      { label: "表紙", val: body.slide1_cover },
      { label: "誤解", val: body.slide2_misconception },
      { label: "正しい理解", val: body.slide3_truth },
      { label: "実践", val: body.slide4_practice },
      { label: "CTA", val: body.slide5_cta },
    ];
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-2 mb-3">
          {slides.map((s, i) => (
            <div key={i} className="bg-gray-50 border rounded-lg p-3">
              <span className="text-xs font-bold text-gray-500">{i + 1}. {s.label}</span>
              <p className="text-xs mt-1">{String(s.val ?? "-")}</p>
            </div>
          ))}
        </div>
        <Section title="キャプション"><Text value={body.caption} /></Section>
        <Section title="免責文"><Text value={body.disclaimer} /></Section>
      </div>
    );
  }

  // LP
  if (channel === "event_lp") {
    return (
      <div className="space-y-2">
        <Section title="タイトル"><Text value={body.title} /></Section>
        <Section title="サブタイトル"><Text value={body.subtitle} /></Section>
        <Section title="日時"><Text value={body.event_date} /></Section>
        <Section title="場所"><Text value={body.event_location} /></Section>
        <Section title="料金"><Text value={body.event_price} /></Section>
        <Section title="CTAボタン"><Text value={body.cta_text} /></Section>
        <Section title="ベネフィット"><Text value={Array.isArray(body.benefits) ? (body.benefits as string[]).join("\n") : body.benefits} /></Section>
        <Section title="アジェンダ"><Text value={body.agenda} /></Section>
        <Section title="登壇者"><Text value={`${body.speaker_name ?? ""} / ${body.speaker_title ?? ""}`} /></Section>
        <Section title="SEOタイトル"><Text value={body.meta_title} /></Section>
        <Section title="SEOディスクリプション"><Text value={body.meta_description} /></Section>
      </div>
    );
  }

  // note
  if (channel === "note") {
    return (
      <div className="space-y-2">
        <Section title="タイトル案1"><Text value={body.title_option1} /></Section>
        <Section title="タイトル案2"><Text value={body.title_option2} /></Section>
        {!!body.title_option3 && <Section title="タイトル案3"><Text value={body.title_option3} /></Section>}
        <Section title="リード"><Text value={body.lead} /></Section>
        <Section title="本文">
          <div className="bg-gray-50 rounded p-3 font-mono text-xs max-h-60 overflow-auto whitespace-pre-wrap">
            {String(body.body_markdown ?? "-")}
          </div>
        </Section>
        <Section title="タグ"><Tags tags={body.tags} /></Section>
        <Section title="OGテキスト"><Text value={body.og_text} /></Section>
        <Section title="CTA"><Text value={`${body.cta_label ?? ""} → ${body.cta_url ?? ""}`} /></Section>
        <Section title="免責文"><Text value={body.disclaimer} /></Section>
      </div>
    );
  }

  // LINE
  if (channel === "line") {
    const steps = body.step_messages as { timing: string; content: string }[] | undefined;
    return (
      <div className="space-y-2">
        <Section title="配信タイプ"><Text value={body.delivery_type} /></Section>
        <Section title="セグメント"><Text value={body.segment} /></Section>
        <Section title="メッセージ本文"><Text value={body.message_text} /></Section>
        <Section title="CTAラベル"><Text value={body.cta_label} /></Section>
        {steps && (
          <Section title="ステップ配信">
            <div className="space-y-1">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-gray-100 rounded font-medium shrink-0">{s.timing}</span>
                  <span>{s.content}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
        <Section title="リッチメニュータイトル"><Text value={body.rich_title} /></Section>
        <Section title="リッチメニューCTA"><Text value={body.rich_cta} /></Section>
      </div>
    );
  }

  // Fallback: show raw JSON
  return <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-50 rounded p-3">{JSON.stringify(body, null, 2)}</pre>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ContentsListPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "review_requested" | "approved" | "draft">("all");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Review panel state
  const [reviewTarget, setReviewTarget] = useState<Variant | null>(null);
  const [reviewForm, setReviewForm] = useState({ reviewer: "", role: "supervisor", decision: "approved", comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/variants").then((r) => r.json()),
      fetch("/api/reviews").then((r) => r.json()),
    ]).then(([v, r]) => {
      setVariants(v);
      setReviews(r);
      setLoading(false);
    });
  }, []);

  async function handleSubmitReview() {
    if (!reviewTarget || !reviewForm.reviewer.trim() || !reviewForm.comment.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_id: reviewTarget.content_id,
        reviewer: reviewForm.reviewer,
        role: reviewForm.role,
        decision: reviewForm.decision,
        comment: reviewForm.comment,
        labels: [],
      }),
    });
    if (res.ok) {
      const review: Review = await res.json();
      setReviews((prev) => [...prev, review]);
      setReviewTarget(null);
      setReviewForm({ reviewer: "", role: "supervisor", decision: "approved", comment: "" });
      setToast(reviewForm.decision === "approved" ? "承認しました" : "差し戻しました");
      setTimeout(() => setToast(""), 3000);
    }
    setSubmitting(false);
  }

  const filtered = filter === "all" ? variants : variants.filter((v) => v.status === filter);

  function getReviewsFor(contentId: string) {
    return reviews.filter((r) => r.content_id === contentId);
  }

  function getContentSummary(v: Variant): string {
    if (!v.body) return "";
    const b = v.body as Record<string, unknown>;
    return String(b.hook ?? b.title ?? b.title_option1 ?? b.message_text ?? b.slide1_cover ?? "").slice(0, 60);
  }

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-pulse">
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

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {([
          ["all", "すべて"],
          ["draft", "下書き"],
          ["review_requested", "レビュー待ち"],
          ["approved", "承認済み"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === key ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
            {key !== "all" && (
              <span className="ml-1.5 opacity-70">
                {variants.filter((v) => v.status === key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">コンテンツがありません</p>
          <p className="text-sm">「コンテンツ生成」からAIでコンテンツを作成してください。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const rs = getReviewsFor(v.content_id);
            const st = STATUS_STYLE[v.status] ?? STATUS_STYLE.draft;
            const isExpanded = expandedId === v.id;
            return (
              <div key={v.id} className={`bg-white rounded-lg border transition-colors ${isExpanded ? "border-blue-300 shadow-md" : "border-gray-200 hover:border-gray-300"}`}>
                {/* Clickable header */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : v.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-blue-50 text-blue-700">
                          {CHANNEL_LABEL[v.channel] ?? v.channel}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${st.bg}`}>
                          {st.label}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{v.id}</span>
                      </div>
                      <p className="text-sm text-gray-800 font-medium truncate">
                        {getContentSummary(v) || "(内容なし)"}
                      </p>
                      {v.scheduled_at && (
                        <p className="text-xs text-gray-400 mt-1">配信予定: {v.scheduled_at}</p>
                      )}

                      {/* Review history */}
                      {rs.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {rs.map((r) => (
                            <div key={r.id} className="flex items-start gap-2 text-xs">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                                r.decision === "approved" ? "bg-green-100 text-green-700" :
                                r.decision === "rejected" ? "bg-red-100 text-red-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>
                                {r.decision === "approved" ? "承認" : r.decision === "rejected" ? "却下" : "差し戻し"}
                              </span>
                              <span className="text-gray-500 shrink-0">{r.reviewer}（{r.role}）</span>
                              <span className="text-gray-600 truncate">{r.comment}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: expand arrow + actions */}
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      <button
                        onClick={(e) => { e.stopPropagation(); setReviewTarget(v); }}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        レビューする
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && v.body && (
                  <div className="border-t border-gray-100 px-5 pb-5">
                    <div className="pt-4">
                      <ContentDetail variant={v} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review modal */}
      {reviewTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold mb-1">レビュー</h3>
            <p className="text-sm text-gray-500 mb-4">
              {CHANNEL_LABEL[reviewTarget.channel] ?? reviewTarget.channel} - {reviewTarget.id}
            </p>

            {/* Content summary */}
            <div className="bg-gray-50 rounded-md p-3 mb-4 text-sm text-gray-700">
              {getContentSummary(reviewTarget) || "(内容なし)"}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">あなたの名前</label>
                <input
                  value={reviewForm.reviewer}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewer: e.target.value })}
                  placeholder="例: 田中太郎"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">役割</label>
                <div className="flex gap-2">
                  {([
                    ["supervisor", "マネージャー"],
                    ["expert", "専門家（監修）"],
                    ["legal", "法務・コンプライアンス"],
                    ["brand", "ブランド"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, role: val })}
                      className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                        reviewForm.role === val ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">判定</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, decision: "approved" })}
                    className={`flex-1 py-2.5 rounded-md text-sm font-medium border-2 transition-colors ${
                      reviewForm.decision === "approved"
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    承認する
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, decision: "revision_requested" })}
                    className={`flex-1 py-2.5 rounded-md text-sm font-medium border-2 transition-colors ${
                      reviewForm.decision === "revision_requested"
                        ? "bg-yellow-50 border-yellow-500 text-yellow-700"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    修正を依頼
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, decision: "rejected" })}
                    className={`flex-1 py-2.5 rounded-md text-sm font-medium border-2 transition-colors ${
                      reviewForm.decision === "rejected"
                        ? "bg-red-50 border-red-500 text-red-700"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    却下
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">コメント</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="フィードバックを入力してください"
                  rows={3}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setReviewTarget(null)}
                className="px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submitting || !reviewForm.reviewer.trim() || !reviewForm.comment.trim()}
                className={`px-5 py-2 rounded-md text-sm font-medium ${
                  submitting || !reviewForm.reviewer.trim() || !reviewForm.comment.trim()
                    ? "bg-gray-200 text-gray-400"
                    : reviewForm.decision === "approved"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : reviewForm.decision === "rejected"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-yellow-600 text-white hover:bg-yellow-700"
                }`}
              >
                {submitting ? "送信中..." : "送信"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
