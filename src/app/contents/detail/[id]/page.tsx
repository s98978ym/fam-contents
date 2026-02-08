"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCurrentUser } from "@/lib/user_context";
import { AttachmentUploader } from "@/components/attachment_manager";
import type { Attachment } from "@/types/content_package";

interface ContentPackage {
  content_id: string;
  campaign_id: string;
  version: number;
  status: string;
  info_classification: string;
  objective: string;
  funnel_stage: string;
  persona: string[];
  title: string;
  summary: string;
  key_messages: { claim: string; evidence: { source: string }[]; supervised_by?: string }[];
  disclaimers: string[];
  do_not_say: string[];
  risk_flags: string[];
  cta_set: { label: string; url_template: string; type: string }[];
  utm_plan: { source: string; medium: string; campaign: string };
  asset_plan: { asset_type: string; purpose: string; width: number; height: number }[];
  target_channels: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  review_requested_to?: string;
  review_requested_at?: string;
  attachments?: Attachment[];
}

interface ChannelVariant {
  id: string;
  content_id: string;
  channel: string;
  status: string;
  body: Record<string, unknown>;
  scheduled_at?: string;
  assignee?: string;
}

interface ReviewRecord {
  id: string;
  content_id: string;
  reviewer: string;
  role: string;
  decision: string;
  comment: string;
  labels: string[];
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
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

const CHANNEL_LABELS: Record<string, string> = {
  instagram_reels: "Instagram Reels",
  instagram_stories: "Instagram Stories",
  instagram_feed: "Instagram Feed",
  event_lp: "イベントLP",
  note: "note",
  line: "LINE",
};

const OBJECTIVE_LABELS: Record<string, string> = {
  acquisition: "新規獲得",
  retention: "リテンション",
  trust: "信頼構築",
  recruitment: "採用",
  event: "イベント",
};

const FUNNEL_LABELS: Record<string, string> = {
  awareness: "認知",
  interest: "興味",
  consideration: "検討",
  conversion: "転換",
  loyalty: "ロイヤルティ",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContentDetailPage() {
  const params = useParams();
  const contentId = params.id as string;
  const { currentUser } = useCurrentUser();

  const [content, setContent] = useState<ContentPackage | null>(null);
  const [variants, setVariants] = useState<ChannelVariant[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/contents").then((r) => r.json()),
      fetch("/api/variants").then((r) => r.json()),
      fetch("/api/reviews").then((r) => r.json()),
      fetch("/api/campaigns").then((r) => r.json()),
    ]).then(([contents, vars, revs, camps]) => {
      setContent(contents.find((c: ContentPackage) => c.content_id === contentId) ?? null);
      setVariants(vars.filter((v: ChannelVariant) => v.content_id === contentId));
      setReviews(revs.filter((r: ReviewRecord) => r.content_id === contentId));
      setCampaigns(camps);
      // Extract available users from variants and contents
      const users = new Set<string>();
      for (const v of vars) {
        if (v.assignee) users.add(v.assignee);
      }
      for (const c of contents) {
        if (c.created_by && !c.created_by.startsWith("planner_")) users.add(c.created_by);
      }
      setAvailableUsers(Array.from(users).sort());
      setLoading(false);
    });
  }, [contentId]);

  const handleReviewRequestChange = async (newReviewer: string) => {
    if (!content) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/contents/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_requested_to: newReviewer || null,
          review_requested_at: newReviewer ? new Date().toISOString() : null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setContent(updated);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleAttachmentsChange = async (newAttachments: Attachment[]) => {
    if (!content) return;
    // Optimistic update
    setContent({ ...content, attachments: newAttachments });
    try {
      await fetch(`/api/contents/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachments: newAttachments }),
      });
    } catch {
      // Revert on error
      setContent(content);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-400">読み込み中...</div>;
  }

  if (!content) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">コンテンツが見つかりません</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ダッシュボードに戻る
        </Link>
      </div>
    );
  }

  const campaign = campaigns.find((c) => c.id === content.campaign_id);

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← ダッシュボード
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{content.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{content.summary}</p>
          </div>
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_BADGE[content.status] ?? "bg-gray-100"}`}>
            {content.status}
          </span>
        </div>
      </div>

      {/* Meta info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">キャンペーン</p>
            <p className="text-sm font-medium text-gray-700">{campaign?.name ?? content.campaign_id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">目的</p>
            <p className="text-sm font-medium text-gray-700">{OBJECTIVE_LABELS[content.objective] ?? content.objective}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">ファネル</p>
            <p className="text-sm font-medium text-gray-700">{FUNNEL_LABELS[content.funnel_stage] ?? content.funnel_stage}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">作成者</p>
            <p className="text-sm font-medium text-gray-700">{content.created_by}</p>
          </div>
        </div>
        {/* レビュー依頼者設定 */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">レビュー依頼先</p>
              <div className="flex items-center gap-3">
                <select
                  value={content.review_requested_to ?? ""}
                  onChange={(e) => handleReviewRequestChange(e.target.value)}
                  disabled={updating}
                  className="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">未設定</option>
                  {availableUsers.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
                {content.review_requested_to && content.review_requested_at && (
                  <span className="text-xs text-gray-400">
                    依頼日: {content.review_requested_at.slice(0, 10)}
                  </span>
                )}
                {updating && (
                  <span className="text-xs text-blue-500">更新中...</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">配信チャネル</p>
          <div className="flex flex-wrap gap-2">
            {content.target_channels.map((ch) => (
              <span key={ch} className="inline-block bg-blue-50 text-blue-600 rounded px-2 py-1 text-xs">
                {CHANNEL_LABELS[ch] ?? ch}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">チャネル別バリアント</h2>
        {variants.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
            バリアントがまだありません
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((v) => (
              <div key={v.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{CHANNEL_LABELS[v.channel] ?? v.channel}</span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[v.status] ?? "bg-gray-100"}`}>
                      {v.status}
                    </span>
                  </div>
                  {v.assignee && (
                    <span className="text-xs text-gray-400">担当: {v.assignee}</span>
                  )}
                </div>
                {v.scheduled_at && (
                  <p className="text-xs text-gray-500">配信予定: {v.scheduled_at.slice(0, 16).replace("T", " ")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attachments — 誰でも添付追加可能 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">参考資料</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <AttachmentUploader
            attachments={content.attachments || []}
            onChange={handleAttachmentsChange}
            currentUser={currentUser}
            hideLabel
          />
        </div>
      </div>

      {/* Reviews */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">レビュー履歴</h2>
        {reviews.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
            レビューがまだありません
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => {
              const dec = DECISION_BADGE[r.decision] ?? DECISION_BADGE.approved;
              return (
                <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                        {r.reviewer.slice(-2)}
                      </span>
                      <span className="text-sm font-medium">{r.reviewer}</span>
                      <span className="text-xs text-gray-400">{r.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${dec.cls}`}>
                        {dec.label}
                      </span>
                      <span className="text-xs text-gray-400">{r.created_at.slice(0, 10)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{r.comment}</p>
                  {r.labels.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {r.labels.map((l) => (
                        <span key={l} className="inline-block bg-gray-50 text-gray-500 rounded px-1.5 py-0.5 text-xs">
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Key messages */}
      {content.key_messages.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">キーメッセージ</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            {content.key_messages.map((msg, i) => (
              <div key={i} className="border-l-2 border-blue-400 pl-3">
                <p className="text-sm text-gray-800 font-medium">{msg.claim}</p>
                {msg.evidence.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    出典: {msg.evidence.map((e) => e.source).join(", ")}
                  </p>
                )}
                {msg.supervised_by && (
                  <p className="text-xs text-gray-400 mt-0.5">監修: {msg.supervised_by}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimers & Do not say */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {content.disclaimers.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">免責事項</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <ul className="text-sm text-gray-600 space-y-1">
                {content.disclaimers.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {content.do_not_say.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">NG表現</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap gap-1">
                {content.do_not_say.map((d, i) => (
                  <span key={i} className="inline-block bg-red-50 text-red-600 rounded px-2 py-0.5 text-xs">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Risk flags */}
      {content.risk_flags.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">リスクフラグ</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              {content.risk_flags.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 rounded px-2 py-1 text-xs font-medium">
                  ⚠️ {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="text-xs text-gray-400 text-right">
        作成: {content.created_at.slice(0, 16).replace("T", " ")} /
        更新: {content.updated_at.slice(0, 16).replace("T", " ")}
      </div>
    </div>
  );
}
