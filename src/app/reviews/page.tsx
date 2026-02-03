"use client";

import { useEffect, useState, useRef } from "react";

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

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [form, setForm] = useState({
    content_id: "",
    reviewer: "",
    role: "supervisor",
    decision: "approved",
    comment: "",
    labels: "",
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/reviews").then((r) => r.json()).then(setReviews);
  }, []);

  // Scroll to hash target once reviews are loaded
  useEffect(() => {
    if (reviews.length === 0) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    setHighlightId(hash);
    const el = rowRefs.current[hash];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const timer = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(timer);
  }, [reviews]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        labels: form.labels ? form.labels.split(",").map((s) => s.trim()) : [],
      }),
    });
    if (res.ok) {
      const review = await res.json();
      setReviews((prev) => [...prev, review]);
      setForm({ content_id: "", reviewer: "", role: "supervisor", decision: "approved", comment: "", labels: "" });
      setMsg("レビューを記録しました");
    } else {
      const err = await res.json();
      setMsg(`エラー: ${err.error}`);
    }
  }

  const decisionColor: Record<string, string> = {
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    revision_requested: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">レビュー管理</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-5 mb-6 space-y-3">
        <h3 className="font-semibold mb-2">新規レビュー</h3>
        <div className="grid grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2 text-sm" placeholder="content_id" value={form.content_id} onChange={(e) => setForm({ ...form, content_id: e.target.value })} required />
          <input className="border rounded px-3 py-2 text-sm" placeholder="レビュアー名" value={form.reviewer} onChange={(e) => setForm({ ...form, reviewer: e.target.value })} required />
          <select className="border rounded px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="supervisor">監修</option>
            <option value="legal">法務</option>
            <option value="brand">ブランド</option>
          </select>
          <select className="border rounded px-3 py-2 text-sm" value={form.decision} onChange={(e) => setForm({ ...form, decision: e.target.value })}>
            <option value="approved">承認</option>
            <option value="rejected">却下</option>
            <option value="revision_requested">差し戻し</option>
          </select>
        </div>
        <textarea className="border rounded px-3 py-2 text-sm w-full" placeholder="コメント" rows={2} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} required />
        <input className="border rounded px-3 py-2 text-sm w-full" placeholder="ラベル（カンマ区切り: tone_mismatch, evidence_weak等）" value={form.labels} onChange={(e) => setForm({ ...form, labels: e.target.value })} />
        <div className="flex items-center gap-3">
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">送信</button>
          {msg && <span className="text-sm text-gray-500">{msg}</span>}
        </div>
      </form>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">コンテンツ</th>
              <th className="px-4 py-2">レビュアー</th>
              <th className="px-4 py-2">ロール</th>
              <th className="px-4 py-2">判定</th>
              <th className="px-4 py-2">コメント</th>
              <th className="px-4 py-2">ラベル</th>
              <th className="px-4 py-2">日時</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr
                key={r.id}
                id={r.id}
                ref={(el) => { rowRefs.current[r.id] = el; }}
                className={`border-t border-gray-100 transition-colors duration-700 ${
                  highlightId === r.id ? "bg-blue-50 ring-2 ring-blue-300 ring-inset" : ""
                }`}
              >
                <td className="px-4 py-2 font-mono text-xs">{r.id}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.content_id}</td>
                <td className="px-4 py-2">{r.reviewer}</td>
                <td className="px-4 py-2">{r.role}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${decisionColor[r.decision] ?? "bg-gray-100"}`}>
                    {r.decision}
                  </span>
                </td>
                <td className="px-4 py-2 max-w-xs">{r.comment}</td>
                <td className="px-4 py-2">
                  {r.labels.map((l) => (
                    <span key={l} className="inline-block mr-1 px-1.5 py-0.5 text-xs rounded bg-gray-100">{l}</span>
                  ))}
                </td>
                <td className="px-4 py-2 text-xs text-gray-400">{r.created_at?.slice(0, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
