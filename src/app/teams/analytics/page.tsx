"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  sampleContents,
  sampleVariants,
  sampleReviews,
} from "@/lib/sample_data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemberStats {
  name: string;
  contentsCreated: number;
  variantsAssigned: number;
  reviewsGiven: number;
  reviewsApproved: number;
  reviewsRevisionRequested: number;
  reviewsRejected: number;
  commentsGiven: number;
  reviewRequestsReceived: number;
  totalActivity: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMembers(): string[] {
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

function calculateMemberStats(): MemberStats[] {
  const members = getMembers();

  return members.map((name) => {
    // コンテンツ作成数
    const contentsCreated = sampleContents.filter(
      (c) => c.created_by === name
    ).length;

    // 担当バリアント数
    const variantsAssigned = sampleVariants.filter(
      (v) => v.assignee === name
    ).length;

    // レビュー数（決定ありのもの）
    const memberReviews = sampleReviews.filter(
      (r) => r.reviewer.includes(name) && !r.reply_to
    );
    const reviewsApproved = memberReviews.filter(
      (r) => r.decision === "approved"
    ).length;
    const reviewsRevisionRequested = memberReviews.filter(
      (r) => r.decision === "revision_requested"
    ).length;
    const reviewsRejected = memberReviews.filter(
      (r) => r.decision === "rejected"
    ).length;

    // コメント数（reply_toがあるもの）
    const commentsGiven = sampleReviews.filter(
      (r) => r.reviewer.includes(name) && r.reply_to
    ).length;

    // レビュー依頼受信数
    const reviewRequestsReceived = sampleContents.filter(
      (c) => c.review_requested_to === name
    ).length;

    const reviewsGiven = reviewsApproved + reviewsRevisionRequested + reviewsRejected;
    const totalActivity = contentsCreated + variantsAssigned + reviewsGiven + commentsGiven;

    return {
      name,
      contentsCreated,
      variantsAssigned,
      reviewsGiven,
      reviewsApproved,
      reviewsRevisionRequested,
      reviewsRejected,
      commentsGiven,
      reviewRequestsReceived,
      totalActivity,
    };
  });
}

// ---------------------------------------------------------------------------
// Bar Chart Component (CSS-based)
// ---------------------------------------------------------------------------

function BarChart({ data, maxValue, color }: { data: { label: string; value: number }[]; maxValue: number; color: string }) {
  return (
    <div className="space-y-2">
      {data.map((item) => {
        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-16 shrink-0 truncate">{item.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-8 text-right">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pie Chart Component (CSS-based)
// ---------------------------------------------------------------------------

function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center">
        <span className="text-xs text-gray-400">データなし</span>
      </div>
    );
  }

  // Calculate conic gradient
  let accumulated = 0;
  const gradientParts = data.map((d) => {
    const start = accumulated;
    const end = accumulated + (d.value / total) * 100;
    accumulated = end;
    return `${d.color} ${start}% ${end}%`;
  }).join(", ");

  return (
    <div className="flex items-center gap-4">
      <div
        className="w-28 h-28 rounded-full shadow-inner"
        style={{ background: `conic-gradient(${gradientParts})` }}
      />
      <div className="space-y-1">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-gray-600">{d.label}</span>
            <span className="text-xs font-semibold text-gray-800">{d.value}</span>
            <span className="text-[10px] text-gray-400">({Math.round((d.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card Component
// ---------------------------------------------------------------------------

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${color}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-2xl font-bold text-gray-800">{value}</span>
      </div>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TeamAnalyticsPage() {
  const stats = useMemo(calculateMemberStats, []);

  // Total stats
  const totals = useMemo(() => {
    return {
      contents: stats.reduce((sum, s) => sum + s.contentsCreated, 0),
      variants: stats.reduce((sum, s) => sum + s.variantsAssigned, 0),
      reviews: stats.reduce((sum, s) => sum + s.reviewsGiven, 0),
      comments: stats.reduce((sum, s) => sum + s.commentsGiven, 0),
      approved: stats.reduce((sum, s) => sum + s.reviewsApproved, 0),
      revisionRequested: stats.reduce((sum, s) => sum + s.reviewsRevisionRequested, 0),
      rejected: stats.reduce((sum, s) => sum + s.reviewsRejected, 0),
    };
  }, [stats]);

  // Max values for bar charts
  const maxContents = Math.max(...stats.map((s) => s.contentsCreated), 1);
  const maxReviews = Math.max(...stats.map((s) => s.reviewsGiven), 1);
  const maxComments = Math.max(...stats.map((s) => s.commentsGiven), 1);
  const maxActivity = Math.max(...stats.map((s) => s.totalActivity), 1);

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/teams" className="text-sm text-blue-600 hover:underline">
            ← チーム管理
          </Link>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">チーム利用状況</h2>
        <p className="text-sm text-gray-500 mt-1">メンバーごとのアクティビティを数値とグラフで確認</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard icon="📝" label="コンテンツ作成数" value={totals.contents} color="hover:border-blue-300" />
        <StatCard icon="👀" label="レビュー実施数" value={totals.reviews} color="hover:border-purple-300" />
        <StatCard icon="💬" label="コメント数" value={totals.comments} color="hover:border-green-300" />
        <StatCard icon="✅" label="承認数" value={totals.approved} color="hover:border-emerald-300" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Activity by Member */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-lg">📊</span>
            総アクティビティ
          </h3>
          <BarChart
            data={stats.map((s) => ({ label: s.name, value: s.totalActivity }))}
            maxValue={maxActivity}
            color="bg-gradient-to-r from-indigo-500 to-purple-500"
          />
        </div>

        {/* Review Results Pie */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-lg">🎯</span>
            レビュー結果の内訳
          </h3>
          <div className="flex justify-center">
            <PieChart
              data={[
                { label: "承認", value: totals.approved, color: "#10b981" },
                { label: "修正依頼", value: totals.revisionRequested, color: "#f59e0b" },
                { label: "却下", value: totals.rejected, color: "#ef4444" },
              ]}
            />
          </div>
        </div>

        {/* Contents Created */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-lg">📝</span>
            コンテンツ作成数
          </h3>
          <BarChart
            data={stats.map((s) => ({ label: s.name, value: s.contentsCreated }))}
            maxValue={maxContents}
            color="bg-gradient-to-r from-blue-500 to-cyan-500"
          />
        </div>

        {/* Reviews Given */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-lg">👀</span>
            レビュー実施数
          </h3>
          <BarChart
            data={stats.map((s) => ({ label: s.name, value: s.reviewsGiven }))}
            maxValue={maxReviews}
            color="bg-gradient-to-r from-purple-500 to-pink-500"
          />
        </div>

        {/* Comments Given */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-lg">💬</span>
            コメント数
          </h3>
          <BarChart
            data={stats.map((s) => ({ label: s.name, value: s.commentsGiven }))}
            maxValue={maxComments}
            color="bg-gradient-to-r from-green-500 to-emerald-500"
          />
        </div>

        {/* Review Requests Received */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-lg">📩</span>
            レビュー依頼受信数
          </h3>
          <BarChart
            data={stats.map((s) => ({ label: s.name, value: s.reviewRequestsReceived }))}
            maxValue={Math.max(...stats.map((s) => s.reviewRequestsReceived), 1)}
            color="bg-gradient-to-r from-pink-500 to-rose-500"
          />
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-lg">📋</span>
            メンバー別詳細データ
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">メンバー</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  <div className="flex flex-col items-center">
                    <span>📝</span>
                    <span className="text-[10px]">作成</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  <div className="flex flex-col items-center">
                    <span>📋</span>
                    <span className="text-[10px]">担当</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  <div className="flex flex-col items-center">
                    <span>✅</span>
                    <span className="text-[10px]">承認</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  <div className="flex flex-col items-center">
                    <span>🔄</span>
                    <span className="text-[10px]">修正依頼</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  <div className="flex flex-col items-center">
                    <span>❌</span>
                    <span className="text-[10px]">却下</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  <div className="flex flex-col items-center">
                    <span>💬</span>
                    <span className="text-[10px]">コメント</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  <div className="flex flex-col items-center">
                    <span>📩</span>
                    <span className="text-[10px]">依頼受信</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  <div className="flex flex-col items-center">
                    <span>⚡</span>
                    <span className="text-[10px]">総合</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.name} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {s.name.slice(0, 1)}
                      </span>
                      <span className="font-medium text-gray-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                      {s.contentsCreated}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                      {s.variantsAssigned}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                      {s.reviewsApproved}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
                      {s.reviewsRevisionRequested}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-red-50 text-red-700 px-2 py-0.5 rounded font-medium">
                      {s.reviewsRejected}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">
                      {s.commentsGiven}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-pink-50 text-pink-700 px-2 py-0.5 rounded font-medium">
                      {s.reviewRequestsReceived}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
                      {s.totalActivity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-3 font-semibold text-gray-700">合計</td>
                <td className="px-4 py-3 text-center font-bold text-gray-800">{totals.contents}</td>
                <td className="px-4 py-3 text-center font-bold text-gray-800">{totals.variants}</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-700">{totals.approved}</td>
                <td className="px-4 py-3 text-center font-bold text-amber-700">{totals.revisionRequested}</td>
                <td className="px-4 py-3 text-center font-bold text-red-700">{totals.rejected}</td>
                <td className="px-4 py-3 text-center font-bold text-green-700">{totals.comments}</td>
                <td className="px-4 py-3 text-center font-bold text-pink-700">
                  {stats.reduce((sum, s) => sum + s.reviewRequestsReceived, 0)}
                </td>
                <td className="px-4 py-3 text-center font-bold text-indigo-800">
                  {stats.reduce((sum, s) => sum + s.totalActivity, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
