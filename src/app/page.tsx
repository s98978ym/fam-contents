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
import type { Campaign, ReviewRecord, ContentPackage } from "@/types/content_package";

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

function getAssignees(): string[] {
  const set = new Set<string>();
  for (const v of sampleVariants) {
    if (v.assignee) set.add(v.assignee);
  }
  for (const c of sampleContents) {
    if (c.created_by && !c.created_by.startsWith("planner_")) {
      set.add(c.created_by);
    }
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

function isRecent(dateStr: string, daysAgo: number = 3): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff < daysAgo * 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { currentUser, isLoaded } = useCurrentUser();
  const assignees = useMemo(getAssignees, []);
  const [selectedUser, setSelectedUser] = useState<string>("all");

  useEffect(() => {
    if (isLoaded && currentUser) {
      setSelectedUser(currentUser);
    }
  }, [isLoaded, currentUser]);

  // --- filtered data ---
  const activeCampaigns = useMemo(() => {
    const camps = sampleCampaigns.filter((c) => c.status === "active");
    if (selectedUser === "all") return camps;
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
    const userContentIds = new Set([
      ...sampleContents.filter((c) => c.created_by === selectedUser).map((c) => c.content_id),
      ...sampleVariants.filter((v) => v.assignee === selectedUser).map((v) => v.content_id),
    ]);
    return sampleReviews.filter(
      (r) => r.reviewer.includes(selectedUser) || userContentIds.has(r.content_id)
    );
  }, [selectedUser]);

  // レビュー依頼されたコンテンツ（自分宛て）
  const reviewRequestsForMe = useMemo(() => {
    if (!currentUser) return [];
    return sampleContents.filter(
      (c) => c.review_requested_to === currentUser && c.status !== "approved" && c.status !== "published"
    );
  }, [currentUser]);

  // 新着レビュー依頼数（3日以内）
  const newReviewRequestCount = useMemo(() => {
    return reviewRequestsForMe.filter(
      (c) => c.review_requested_at && isRecent(c.review_requested_at)
    ).length;
  }, [reviewRequestsForMe]);

  function getVariantsFor(contentId: string) {
    return sampleVariants.filter((v) => v.content_id === contentId);
  }

  function getCampaignName(campaignId: string) {
    return sampleCampaigns.find((c) => c.id === campaignId)?.name ?? campaignId;
  }

  // Stats
  const stats = [
    { label: "キャンペーン", value: activeCampaigns.length, icon: "📊", href: "/campaigns", color: "blue" },
    { label: "コンテンツ", value: activeContents.length, icon: "📝", href: "/contents/list", color: "purple" },
    { label: "レビュー依頼", value: reviewRequestsForMe.length, icon: "📩", href: "#review-requests", color: "pink", badge: newReviewRequestCount > 0 ? newReviewRequestCount : undefined },
    { label: "レビュー待ち", value: filteredReviews.filter((r) => r.decision === "revision_requested").length, icon: "👀", href: "/reviews", color: "orange" },
    { label: "承認済み", value: filteredReviews.filter((r) => r.decision === "approved").length, icon: "✅", href: "/reviews", color: "green" },
  ];

  const colorMap: Record<string, string> = {
    blue: "hover:border-blue-300 hover:bg-blue-50/50",
    purple: "hover:border-purple-300 hover:bg-purple-50/50",
    pink: "hover:border-pink-300 hover:bg-pink-50/50",
    orange: "hover:border-orange-300 hover:bg-orange-50/50",
    green: "hover:border-green-300 hover:bg-green-50/50",
  };

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

      {/* Stats - clickable cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`bg-white rounded-lg border border-gray-200 p-4 transition-all ${colorMap[s.color]}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{s.label}</p>
              <div className="flex items-center gap-1">
                {s.badge && (
                  <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                    {s.badge}
                  </span>
                )}
                <span className="text-lg">{s.icon}</span>
              </div>
            </div>
            <p className="text-2xl font-semibold mt-1">{s.value}</p>
          </Link>
        ))}
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column: Campaigns */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 h-full">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">アクティブキャンペーン</h3>
              <Link href="/campaigns" className="text-xs text-blue-600 hover:underline">すべて見る</Link>
            </div>
            <div className="p-2 max-h-[500px] overflow-y-auto">
              {activeCampaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  該当するキャンペーンがありません
                </div>
              ) : (
                <div className="space-y-2">
                  {activeCampaigns.slice(0, 8).map((c) => (
                    <Link
                      key={c.id}
                      href="/campaigns"
                      className="block rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Badge text={c.status} />
                        <span>{OBJECTIVE_LABELS[c.objective]}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Column: Contents */}
        <div className="col-span-5">
          <div className="bg-white rounded-lg border border-gray-200 h-full">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">アクティブコンテンツ</h3>
              <Link href="/contents/list" className="text-xs text-blue-600 hover:underline">すべて見る</Link>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {activeContents.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  該当するコンテンツがありません
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-medium text-gray-600">タイトル</th>
                      <th className="px-3 py-2 font-medium text-gray-600 w-20">ステータス</th>
                      <th className="px-3 py-2 font-medium text-gray-600 w-20">担当</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeContents.slice(0, 12).map((c) => {
                      const variants = getVariantsFor(c.content_id);
                      const assigneeNames = [
                        ...new Set(variants.map((v) => v.assignee).filter(Boolean)),
                      ];
                      return (
                        <tr key={c.content_id} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <Link
                              href={`/contents/detail/${c.content_id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline text-sm truncate block max-w-[200px]"
                              title={c.title}
                            >
                              {c.title}
                            </Link>
                            <span className="text-xs text-gray-400">{getCampaignName(c.campaign_id)}</span>
                          </td>
                          <td className="px-3 py-2">
                            <Badge text={c.status} />
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {assigneeNames.length > 0 ? assigneeNames[0] : c.created_by}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Review Requests + Recent Reviews */}
        <div className="col-span-4 space-y-4">
          {/* Review Requests for Me */}
          <div id="review-requests" className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800">レビュー依頼</h3>
                {newReviewRequestCount > 0 && (
                  <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {newReviewRequestCount}件の新着
                  </span>
                )}
              </div>
              <Link href="/reviews" className="text-xs text-blue-600 hover:underline">すべて見る</Link>
            </div>
            <div className="p-2 max-h-[220px] overflow-y-auto">
              {reviewRequestsForMe.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  {currentUser ? "レビュー依頼はありません" : "ユーザーを選択してください"}
                </div>
              ) : (
                <div className="space-y-2">
                  {reviewRequestsForMe.map((c) => {
                    const isNew = c.review_requested_at && isRecent(c.review_requested_at);
                    return (
                      <Link
                        key={c.content_id}
                        href={`/contents/detail/${c.content_id}`}
                        className={`block rounded-lg p-3 transition-colors ${isNew ? "bg-pink-50 hover:bg-pink-100" : "hover:bg-gray-50"}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isNew && (
                                <span className="w-2 h-2 bg-pink-500 rounded-full shrink-0" />
                              )}
                              <span className="font-medium text-sm truncate">{c.title}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {c.created_by}さんから依頼
                              {c.review_requested_at && ` (${formatDate(c.review_requested_at)})`}
                            </p>
                          </div>
                          <Badge text={c.status} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Reviews/Comments */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">最新レビュー</h3>
              <Link href="/reviews" className="text-xs text-blue-600 hover:underline">すべて見る</Link>
            </div>
            <div className="p-2 max-h-[220px] overflow-y-auto">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  該当するレビューがありません
                </div>
              ) : (
                <div className="space-y-2">
                  {[...filteredReviews]
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                    .slice(0, 5)
                    .map((r) => {
                      const dec = DECISION_BADGE[r.decision] ?? DECISION_BADGE.approved;
                      const content = sampleContents.find((c) => c.content_id === r.content_id);
                      return (
                        <Link
                          key={r.id}
                          href={`/reviews#${r.id}`}
                          className="block rounded-lg p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-[10px] font-bold text-gray-600 shrink-0">
                              {r.reviewer.slice(-2)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{r.reviewer}</span>
                                <Badge text={dec.label} cls={dec.cls} />
                              </div>
                              <p className="text-xs text-gray-500 truncate mt-0.5">{r.comment}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {content?.title ?? r.content_id} - {formatDate(r.created_at)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
