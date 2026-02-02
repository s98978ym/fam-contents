"use client";

import { useEffect, useState } from "react";
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
  review: { bg: "bg-yellow-100 text-yellow-700", label: "レビュー待ち" },
  review_requested: { bg: "bg-yellow-100 text-yellow-700", label: "レビュー待ち" },
  approved: { bg: "bg-green-100 text-green-700", label: "承認済み" },
  rejected: { bg: "bg-red-100 text-red-700", label: "差し戻し" },
  published: { bg: "bg-blue-100 text-blue-700", label: "配信済み" },
};

function getContentSummary(v: Variant): string {
  if (!v.body) return "";
  const b = v.body as Record<string, unknown>;
  return String(b.hook ?? b.title ?? b.title_option1 ?? b.message_text ?? b.slide1_cover ?? "").slice(0, 60);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ContentsListPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/variants").then((r) => r.json()).then((v) => {
      setVariants(v);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "all" ? variants : variants.filter((v) => v.status === filter);

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>;

  return (
    <div>
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
          ["review", "レビュー待ち"],
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
        <div className="space-y-2">
          {filtered.map((v) => {
            const st = STATUS_STYLE[v.status] ?? STATUS_STYLE.draft;
            return (
              <Link
                key={v.id}
                href={`/contents/list/${v.id}`}
                className="block bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all p-5"
              >
                <div className="flex items-center justify-between gap-4">
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
                  </div>
                  <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
