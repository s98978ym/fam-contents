"use client";

import { useState } from "react";
import Link from "next/link";
import { sampleCampaigns, sampleContents, sampleMetrics, samplePublishJobs } from "@/lib/sample_data";
import type { Campaign } from "@/types/content_package";

const OBJECTIVE_OPTIONS: { value: Campaign["objective"]; label: string }[] = [
  { value: "acquisition", label: "新規獲得" },
  { value: "retention", label: "リテンション" },
  { value: "trust", label: "信頼構築" },
  { value: "recruitment", label: "採用" },
  { value: "event", label: "イベント" },
];

const STATUS_OPTIONS: { value: Campaign["status"]; label: string; cls: string }[] = [
  { value: "planning", label: "planning", cls: "bg-yellow-100 text-yellow-700" },
  { value: "active", label: "active", cls: "bg-green-100 text-green-700" },
  { value: "completed", label: "completed", cls: "bg-blue-100 text-blue-700" },
];

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => [...sampleCampaigns]);

  const stats = [
    { label: "キャンペーン", value: campaigns.length },
    { label: "コンテンツ", value: sampleContents.length },
    { label: "配信待ち", value: samplePublishJobs.filter((j) => j.status === "queued").length },
    { label: "今日のインプレッション", value: sampleMetrics.reduce((a, m) => a + m.impressions, 0).toLocaleString() },
  ];

  function updateCampaign(id: string, patch: Partial<Campaign>) {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">ダッシュボード</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">アクティブキャンペーン</h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">名前</th>
                <th className="px-4 py-2">目的</th>
                <th className="px-4 py-2">期間</th>
                <th className="px-4 py-2">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const st = STATUS_OPTIONS.find((s) => s.value === c.status) ?? STATUS_OPTIONS[0];
                return (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-mono text-xs">{c.id}</td>
                    <td className="px-4 py-2">
                      <Link
                        href="/campaigns"
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={c.objective}
                        onChange={(e) => updateCampaign(c.id, { objective: e.target.value as Campaign["objective"] })}
                        className="border border-gray-200 rounded px-2 py-1 text-sm bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                      >
                        {OBJECTIVE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={c.start_date}
                          onChange={(e) => updateCampaign(c.id, { start_date: e.target.value })}
                          className="border border-gray-200 rounded px-2 py-1 text-sm bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                        />
                        <span className="text-gray-400">~</span>
                        <input
                          type="date"
                          value={c.end_date}
                          onChange={(e) => updateCampaign(c.id, { end_date: e.target.value })}
                          className="border border-gray-200 rounded px-2 py-1 text-sm bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={c.status}
                        onChange={(e) => updateCampaign(c.id, { status: e.target.value as Campaign["status"] })}
                        className={`rounded-full px-3 py-1 text-xs font-medium border-0 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer ${st.cls}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">最新メトリクス</h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2">コンテンツ</th>
                <th className="px-4 py-2">チャネル</th>
                <th className="px-4 py-2">インプレッション</th>
                <th className="px-4 py-2">エンゲージメント</th>
                <th className="px-4 py-2">クリック</th>
                <th className="px-4 py-2">CV</th>
              </tr>
            </thead>
            <tbody>
              {sampleMetrics.map((m) => (
                <tr key={m.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono text-xs">{m.content_id}</td>
                  <td className="px-4 py-2">{m.channel}</td>
                  <td className="px-4 py-2">{m.impressions.toLocaleString()}</td>
                  <td className="px-4 py-2">{m.engagements.toLocaleString()}</td>
                  <td className="px-4 py-2">{m.clicks.toLocaleString()}</td>
                  <td className="px-4 py-2">{m.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
