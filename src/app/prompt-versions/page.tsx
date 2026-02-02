"use client";

import { useEffect, useState } from "react";

interface PromptVersion {
  id: string;
  name: string;
  type: string;
  version: number;
  prompt: string;
  changelog: string;
  created_at: string;
  created_by: string;
}

export default function PromptVersionsPage() {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [form, setForm] = useState({ name: "", type: "planner", prompt: "", changelog: "", created_by: "" });
  const [msg, setMsg] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/prompt-versions").then((r) => r.json()).then(setVersions);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/prompt-versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const pv = await res.json();
      setVersions((prev) => [...prev, pv]);
      setForm({ name: "", type: "planner", prompt: "", changelog: "", created_by: "" });
      setMsg("プロンプトを保存しました");
    } else {
      const err = await res.json();
      setMsg(`エラー: ${err.error}`);
    }
  }

  const typeLabel: Record<string, string> = {
    planner: "企画",
    instagram: "Instagram",
    lp: "LP",
    note: "note",
    line: "LINE",
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">プロンプト管理</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-5 mb-6 space-y-3">
        <h3 className="font-semibold mb-2">新規バージョン登録</h3>
        <div className="grid grid-cols-3 gap-3">
          <input className="border rounded px-3 py-2 text-sm" placeholder="プロンプト名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="border rounded px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="planner">企画 (Planner)</option>
            <option value="instagram">Instagram</option>
            <option value="lp">LP</option>
            <option value="note">note</option>
            <option value="line">LINE</option>
          </select>
          <input className="border rounded px-3 py-2 text-sm" placeholder="作成者" value={form.created_by} onChange={(e) => setForm({ ...form, created_by: e.target.value })} required />
        </div>
        <textarea className="border rounded px-3 py-2 text-sm w-full font-mono" placeholder="プロンプト本文" rows={6} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} required />
        <input className="border rounded px-3 py-2 text-sm w-full" placeholder="変更内容（changelog）" value={form.changelog} onChange={(e) => setForm({ ...form, changelog: e.target.value })} required />
        <div className="flex items-center gap-3">
          <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700">保存</button>
          {msg && <span className="text-sm text-gray-500">{msg}</span>}
        </div>
      </form>

      <div className="space-y-3">
        {versions.map((pv) => (
          <div key={pv.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === pv.id ? null : pv.id)}>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700">{typeLabel[pv.type] ?? pv.type}</span>
                <span className="font-semibold">{pv.name}</span>
                <span className="text-xs text-gray-400">v{pv.version}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{pv.created_by}</span>
                <span>{pv.created_at?.slice(0, 10)}</span>
                <span>{expanded === pv.id ? "▲" : "▼"}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{pv.changelog}</p>
            {expanded === pv.id && (
              <pre className="mt-3 p-3 bg-gray-50 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64">
                {pv.prompt}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
