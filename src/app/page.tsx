"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  sampleCampaigns,
  sampleContents,
  sampleVariants,
  sampleReviews,
} from "@/lib/sample_data";
import { useCurrentUser } from "@/lib/user_context";
import type { Campaign, ReviewRecord } from "@/types/content_package";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OBJECTIVE_LABELS: Record<Campaign["objective"], string> = {
  acquisition: "新規獲得",
  retention: "リテンション",
  trust: "信頼構築",
  recruitment: "採用",
  event: "イベント",
};

const STATUS_BADGE: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-600",
  review: "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  published: "bg-blue-100 text-blue-700",
  archived: "bg-gray-100 text-gray-500",
};

const DECISION_BADGE: Record<string, { cls: string; label: string }> = {
  approved: { cls: "bg-emerald-100 text-emerald-700", label: "承認" },
  rejected: { cls: "bg-red-100 text-red-700", label: "却下" },
  revision_requested: { cls: "bg-orange-100 text-orange-700", label: "修正依頼" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract unique assignees from variants */
function getAssignees(): string[] {
  const set = new Set<string>();
  for (const v of sampleVariants) {
    if (v.assignee) set.add(v.assignee);
  }
  for (const c of sampleContents) {
    if (c.created_by) set.add(c.created_by);
  }
  for (const r of sampleReviews) {
    if (r.reviewer) set.add(r.reviewer);
  }
  return Array.from(set).sort();
}

function Badge({ text, cls }: { text: string; cls?: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls ?? STATUS_BADGE[text] ?? "bg-gray-100 text-gray-600"}`}
    >
      {text}
    </span>
  );
}

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { currentUser, isLoaded } = useCurrentUser();
  const assignees = useMemo(getAssignees, []);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [reviewSort, setReviewSort] = useState<{ key: keyof ReviewRecord; dir: "asc" | "desc" }>({ key: "created_at", dir: "desc" });

  // Default to current user's view when loaded
  useEffect(() => {
    if (isLoaded && currentUser) {
      setSelectedUser(currentUser);
    }
  }, [isLoaded, currentUser]);

  // --- filtered data ---
  const activeCampaigns = useMemo(() => {
    const camps = sampleCampaigns.filter((c) => c.status === "active");
    if (selectedUser === "all") return camps;
    // Show campaigns that have at least one variant assigned to user or content created by user
    const userContentIds = new Set([
      ...sampleContents.filter((c) => c.created_by === selectedUser).map((c) => c.content_id),
      ...sampleVariants.filter((v) => v.assignee === selectedUser).map((v) => v.content_id),
    ]);
    return camps.filter((c) => c.content_ids.some((id) => userContentIds.has(id)));
  }, [selectedUser]);

  const activeContents = useMemo(() => {
    const contents = sampleContents.filter((c) => c.status !== "archived");
    if (selectedUser === "all") return contents;
    const userContentIds = new Set(
      sampleVariants.filter((v) => v.assignee === selectedUser).map((v) => v.content_id)
    );
    return contents.filter(
      (c) => c.created_by === selectedUser || userContentIds.has(c.content_id)
    );
  }, [selectedUser]);

  const filteredReviews = useMemo(() => {
    if (selectedUser === "all") return sampleReviews;
    // Reviews where the user is the reviewer, or reviews on content assigned to the user
    const userContentIds = new Set([
      ...sampleContents.filter((c) => c.created_by === selectedUser).map((c) => c.content_id),
      ...sampleVariants.filter((v) => v.assignee === selectedUser).map((v) => v.content_id),
    ]);
    return sampleReviews.filter(
      (r) => r.reviewer.includes(selectedUser) || userContentIds.has(r.content_id)
    );
  }, [selectedUser]);

  const sortedReviews = useMemo(() => {
    const { key, dir } = reviewSort;
    return [...filteredReviews].sort((a, b) => {
      const va = String(a[key] ?? "");
      const vb = String(b[key] ?? "");
      return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [filteredReviews, reviewSort]);

  function toggleReviewSort(key: keyof ReviewRecord) {
    setReviewSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );
  }

  function sortIcon(key: keyof ReviewRecord) {
    if (reviewSort.key !== key) return "↕";
    return reviewSort.dir === "asc" ? "↑" : "↓";
  }

  // Stats
  const stats = [
    { label: "キャンペーン", value: activeCampaigns.length, icon: "📊" },
    { label: "コンテンツ", value: activeContents.length, icon: "📝" },
    { label: "レビュー待ち", value: filteredReviews.filter((r) => r.decision === "revision_requested").length, icon: "👀" },
    { label: "承認済み", value: filteredReviews.filter((r) => r.decision === "approved").length, icon: "✅" },
  ];

  // helper: get variant info for a content
  function getVariantsFor(contentId: string) {
    return sampleVariants.filter((v) => v.content_id === contentId);
  }

  function getCampaignName(campaignId: string) {
    return sampleCampaigns.find((c) => c.id === campaignId)?.name ?? campaignId;
  }

  return (
    <div>
      {/* Header with user filter */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">ダッシュボード</h2>
          {currentUser && selectedUser === currentUser && (
            <p className="text-sm text-gray-500 mt-0.5">{currentUser}さんの担当</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {currentUser && (
              <button
                onClick={() => setSelectedUser(currentUser)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedUser === currentUser
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                自分
              </button>
            )}
            <button
              onClick={() => setSelectedUser("all")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedUser === "all"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              全員
            </button>
            {assignees.filter(name => name !== currentUser).map((name) => (
              <button
                key={name}
                onClick={() => setSelectedUser(name)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedUser === name
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{s.label}</p>
              <span className="text-lg">{s.icon}</span>
            </div>
            <p className="text-2xl font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Active Campaigns */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">アクティブキャンペーン</h3>
        {activeCampaigns.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
            該当するキャンペーンがありません
          </div>
        ) : (
          <div className="grid gap-3">
            {activeCampaigns.map((c) => (
              <Link
                key={c.id}
                href="/campaigns"
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <Badge text={c.status} />
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{c.id}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{OBJECTIVE_LABELS[c.objective]}</span>
                  <span>
                    {c.start_date} ~ {c.end_date}
                  </span>
                  <span>コンテンツ: {c.content_ids.length}件</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Active Contents */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">アクティブコンテンツ</h3>
        {activeContents.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
            該当するコンテンツがありません
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-gray-600">タイトル</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">キャンペーン</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">ステータス</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">チャネル</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">担当</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">更新日</th>
                </tr>
              </thead>
              <tbody>
                {activeContents.map((c) => {
                  const variants = getVariantsFor(c.content_id);
                  const assigneeNames = [
                    ...new Set(variants.map((v) => v.assignee).filter(Boolean)),
                  ];
                  return (
                    <tr key={c.content_id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/contents/${c.content_id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {c.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {getCampaignName(c.campaign_id)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge text={c.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {c.target_channels.map((ch) => (
                            <span
                              key={ch}
                              className="inline-block bg-blue-50 text-blue-600 rounded px-1.5 py-0.5 text-xs"
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">
                        {assigneeNames.length > 0 ? assigneeNames.join(", ") : c.created_by}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">
                        {formatDate(c.updated_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Reviews */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">レビュー / コメント</h3>
          <div className="flex items-center gap-1 text-xs">
            {([
              ["created_at", "日付"],
              ["decision", "判定"],
              ["reviewer", "レビュアー"],
            ] as [keyof ReviewRecord, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => toggleReviewSort(key)}
                className={`px-2 py-1 rounded transition-colors ${
                  reviewSort.key === key
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {label} {sortIcon(key)}
              </button>
            ))}
          </div>
        </div>
        {sortedReviews.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
            該当するレビューがありません
          </div>
        ) : (
          <div className="space-y-3">
            {sortedReviews.map((r) => {
              const dec = DECISION_BADGE[r.decision] ?? DECISION_BADGE.approved;
              const content = sampleContents.find((c) => c.content_id === r.content_id);
              return (
                <Link
                  key={r.id}
                  href={`/reviews#${r.id}`}
                  className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                        {r.reviewer.slice(-2)}
                      </span>
                      <div>
                        <span className="text-sm font-medium">{r.reviewer}</span>
                        <span className="text-xs text-gray-400 ml-2">{r.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge text={dec.label} cls={dec.cls} />
                      <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{r.comment}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">対象:</span>
                    <span className="text-xs text-blue-600 font-medium">
                      {content?.title ?? r.content_id}
                    </span>
                    {r.labels.map((l) => (
                      <span
                        key={l}
                        className="inline-block bg-gray-50 text-gray-500 rounded px-1.5 py-0.5 text-xs"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
