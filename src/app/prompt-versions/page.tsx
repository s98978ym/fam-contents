"use client";

import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SystemPromptConfig {
  id: string;
  key: string;
  name: string;
  description: string;
  category: "contents" | "knowledge";
  prompt: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  updated_at: string;
  updated_by: string;
}

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  contents: "コンテンツ生成",
  knowledge: "ナレッジ共有",
};

const MODEL_OPTIONS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>;
}

// ---------------------------------------------------------------------------
// SystemPromptCard
// ---------------------------------------------------------------------------

function SystemPromptCard({
  config,
  isExpanded,
  isEditing,
  onToggleExpand,
  onEdit,
  onSave,
  onCancel,
}: {
  config: SystemPromptConfig;
  isExpanded: boolean;
  isEditing: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onSave: (patch: Partial<SystemPromptConfig>) => void;
  onCancel: () => void;
}) {
  const [editForm, setEditForm] = useState({
    prompt: config.prompt,
    model: config.model,
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
  });

  useEffect(() => {
    if (isEditing) {
      setEditForm({
        prompt: config.prompt,
        model: config.model,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
      });
    }
  }, [isEditing, config]);

  const placeholderCount = (config.prompt.match(/\{\{[^}]+\}\}/g) || []).length;

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg border-2 border-blue-300 p-5 shadow-sm">
        <h4 className="font-semibold text-lg mb-4">{config.name} を編集</h4>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <Label>モデル</Label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={editForm.model}
              onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Temperature</Label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                className="flex-1"
                value={editForm.temperature}
                onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })}
              />
              <span className="text-sm font-mono w-8 text-right">{editForm.temperature}</span>
            </div>
          </div>
          <div>
            <Label>最大トークン数</Label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2 text-sm"
              value={editForm.maxOutputTokens}
              onChange={(e) => setEditForm({ ...editForm, maxOutputTokens: parseInt(e.target.value) || 0 })}
              min={256}
              max={65536}
              step={256}
            />
          </div>
        </div>

        <div className="mb-4">
          <Label>プロンプト</Label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm font-mono leading-relaxed"
            rows={20}
            value={editForm.prompt}
            onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-1">
            {"{{変数名}}"} はAPI実行時に動的データに自動置換されます
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSave(editForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            保存
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold">{config.name}</h4>
            <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 font-mono">
              {config.model}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-2">{config.description}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>温度: {config.temperature}</span>
            <span>最大トークン: {config.maxOutputTokens.toLocaleString()}</span>
            {placeholderCount > 0 && (
              <span>動的変数: {placeholderCount}個</span>
            )}
            <span>更新: {config.updated_at.slice(0, 10)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
          >
            編集
          </button>
          <button
            onClick={onToggleExpand}
            className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
          >
            {isExpanded ? "プロンプトを隠す" : "プロンプトを表示"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 border-t pt-3">
          <pre className="p-3 bg-gray-50 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96 leading-relaxed">
            {config.prompt}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PromptVersionsPage() {
  const [tab, setTab] = useState<"system" | "custom">("system");
  const [systemPrompts, setSystemPrompts] = useState<SystemPromptConfig[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState("");

  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [form, setForm] = useState({ name: "", type: "planner", prompt: "", changelog: "", created_by: "" });
  const [customMsg, setCustomMsg] = useState("");
  const [customExpanded, setCustomExpanded] = useState<string | null>(null);

  const fetchSystemPrompts = useCallback(async () => {
    const res = await fetch("/api/system-prompts");
    if (res.ok) {
      const data = await res.json();
      setSystemPrompts(data);
    }
  }, []);

  useEffect(() => {
    fetchSystemPrompts();
    fetch("/api/prompt-versions").then((r) => r.json()).then(setVersions);
  }, [fetchSystemPrompts]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async (key: string, patch: Partial<SystemPromptConfig>) => {
    const res = await fetch("/api/system-prompts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, ...patch, updated_by: "admin" }),
    });
    if (res.ok) {
      await fetchSystemPrompts();
      setEditing(null);
      setSaveMsg(`${key} を保存しました`);
      setTimeout(() => setSaveMsg(""), 3000);
    } else {
      const err = await res.json();
      setSaveMsg(`エラー: ${err.error}`);
    }
  };

  async function handleCustomSubmit(e: React.FormEvent) {
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
      setCustomMsg("プロンプトを保存しました");
    } else {
      const err = await res.json();
      setCustomMsg(`エラー: ${err.error}`);
    }
  }

  const typeLabel: Record<string, string> = {
    planner: "企画",
    instagram: "Instagram",
    lp: "LP",
    note: "note",
    line: "LINE",
  };

  const contentPrompts = systemPrompts.filter((p) => p.category === "contents");
  const knowledgePrompts = systemPrompts.filter((p) => p.category === "knowledge");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">プロンプト管理</h2>
      <p className="text-sm text-gray-500 mb-6">
        AIが使用するシステムプロンプトの確認・編集と、カスタムプロンプトバージョンの管理
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        <button
          onClick={() => setTab("system")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "system"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          システムプロンプト
        </button>
        <button
          onClick={() => setTab("custom")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "custom"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          カスタムバージョン
        </button>
      </div>

      {saveMsg && (
        <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          {saveMsg}
        </div>
      )}

      {/* System Prompts Tab */}
      {tab === "system" && (
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {CATEGORY_LABELS.contents}
            </h3>
            <div className="space-y-3">
              {contentPrompts.map((config) => (
                <SystemPromptCard
                  key={config.key}
                  config={config}
                  isExpanded={expanded.has(config.key)}
                  isEditing={editing === config.key}
                  onToggleExpand={() => toggleExpand(config.key)}
                  onEdit={() => setEditing(config.key)}
                  onSave={(patch) => handleSave(config.key, patch)}
                  onCancel={() => setEditing(null)}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {CATEGORY_LABELS.knowledge}
            </h3>
            <div className="space-y-3">
              {knowledgePrompts.map((config) => (
                <SystemPromptCard
                  key={config.key}
                  config={config}
                  isExpanded={expanded.has(config.key)}
                  isEditing={editing === config.key}
                  onToggleExpand={() => toggleExpand(config.key)}
                  onEdit={() => setEditing(config.key)}
                  onSave={(patch) => handleSave(config.key, patch)}
                  onCancel={() => setEditing(null)}
                />
              ))}
            </div>
          </div>

          {systemPrompts.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">読み込み中...</p>
          )}
        </div>
      )}

      {/* Custom Versions Tab */}
      {tab === "custom" && (
        <div>
          <form onSubmit={handleCustomSubmit} className="bg-white rounded-lg border border-gray-200 p-5 mb-6 space-y-3">
            <h3 className="font-semibold mb-2">新規バージョン登録</h3>
            <div className="grid grid-cols-3 gap-3">
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="プロンプト名"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <select
                className="border rounded px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="planner">企画 (Planner)</option>
                <option value="instagram">Instagram</option>
                <option value="lp">LP</option>
                <option value="note">note</option>
                <option value="line">LINE</option>
              </select>
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="作成者"
                value={form.created_by}
                onChange={(e) => setForm({ ...form, created_by: e.target.value })}
                required
              />
            </div>
            <textarea
              className="border rounded px-3 py-2 text-sm w-full font-mono"
              placeholder="プロンプト本文"
              rows={6}
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              required
            />
            <input
              className="border rounded px-3 py-2 text-sm w-full"
              placeholder="変更内容（changelog）"
              value={form.changelog}
              onChange={(e) => setForm({ ...form, changelog: e.target.value })}
              required
            />
            <div className="flex items-center gap-3">
              <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700">
                保存
              </button>
              {customMsg && <span className="text-sm text-gray-500">{customMsg}</span>}
            </div>
          </form>

          <div className="space-y-3">
            {versions.map((pv) => (
              <div key={pv.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setCustomExpanded(customExpanded === pv.id ? null : pv.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
                      {typeLabel[pv.type] ?? pv.type}
                    </span>
                    <span className="font-semibold">{pv.name}</span>
                    <span className="text-xs text-gray-400">v{pv.version}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{pv.created_by}</span>
                    <span>{pv.created_at?.slice(0, 10)}</span>
                    <span>{customExpanded === pv.id ? "\u25B2" : "\u25BC"}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{pv.changelog}</p>
                {customExpanded === pv.id && (
                  <pre className="mt-3 p-3 bg-gray-50 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64">
                    {pv.prompt}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
