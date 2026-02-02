"use client";

import { useEffect, useState } from "react";

interface PublishJob {
  id: string;
  content_id: string;
  channel: string;
  status: string;
  scheduled_at: string;
  published_at?: string;
  error?: string;
}

export default function PublishJobsPage() {
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [form, setForm] = useState({ content_id: "", channel: "instagram_reels", scheduled_at: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/publish-jobs").then((r) => r.json()).then(setJobs);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/publish-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const job = await res.json();
      setJobs((prev) => [...prev, job]);
      setForm({ content_id: "", channel: "instagram_reels", scheduled_at: "" });
      setMsg("配信ジョブを作成しました");
    } else {
      const err = await res.json();
      setMsg(`エラー: ${err.error}`);
    }
  }

  const statusColor: Record<string, string> = {
    queued: "bg-blue-100 text-blue-700",
    publishing: "bg-yellow-100 text-yellow-700",
    published: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">配信ジョブ</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-5 mb-6 space-y-3">
        <h3 className="font-semibold mb-2">新規配信ジョブ</h3>
        <div className="grid grid-cols-3 gap-3">
          <input className="border rounded px-3 py-2 text-sm" placeholder="content_id" value={form.content_id} onChange={(e) => setForm({ ...form, content_id: e.target.value })} required />
          <select className="border rounded px-3 py-2 text-sm" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
            <option value="instagram_reels">Instagram Reels</option>
            <option value="instagram_stories">Instagram Stories</option>
            <option value="instagram_feed">Instagram Feed</option>
            <option value="event_lp">イベントLP</option>
            <option value="note">note</option>
            <option value="line">LINE</option>
          </select>
          <input className="border rounded px-3 py-2 text-sm" type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} required />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">作成</button>
          {msg && <span className="text-sm text-gray-500">{msg}</span>}
        </div>
      </form>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">コンテンツ</th>
              <th className="px-4 py-2">チャネル</th>
              <th className="px-4 py-2">ステータス</th>
              <th className="px-4 py-2">配信予定</th>
              <th className="px-4 py-2">配信済</th>
              <th className="px-4 py-2">エラー</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-mono text-xs">{j.id}</td>
                <td className="px-4 py-2 font-mono text-xs">{j.content_id}</td>
                <td className="px-4 py-2">{j.channel}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${statusColor[j.status] ?? "bg-gray-100"}`}>
                    {j.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs">{j.scheduled_at?.slice(0, 16)}</td>
                <td className="px-4 py-2 text-xs">{j.published_at?.slice(0, 16) ?? "-"}</td>
                <td className="px-4 py-2 text-xs text-red-500">{j.error ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
