"use client";

import { useEffect, useState } from "react";

interface DriveFolder {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export default function ContentsPage() {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/drive/folders")
      .then((r) => r.json())
      .then((data) => { setFolders(data.folders || []); setLoading(false); });
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/drive/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const folder = await res.json();
      setFolders((prev) => [folder, ...prev]);
      setNewName("");
      setShowCreate(false);
    }
    setCreating(false);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">コンテンツ生成</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          + 新規フォルダ作成
        </button>
      </div>

      {/* Guide text */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 font-medium mb-1">使い方</p>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-0.5">
          <li>下のフォルダを選択（または新規作成）</li>
          <li>フォルダ内のファイルを確認</li>
          <li>チャネルとトーンを選んで「生成」</li>
          <li>プレビューを確認して保存</li>
        </ol>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-1">新規フォルダ作成</h3>
            <p className="text-sm text-gray-500 mb-4">Google Driveに新しいフォルダを作成し、素材をアップロードしましょう。</p>
            <label className="block text-xs font-medium text-gray-600 mb-1">フォルダ名</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: 2026春アカデミー企画"
              className="border border-gray-300 rounded-md px-3 py-2.5 text-sm w-full mb-4 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowCreate(false); setNewName(""); }}
                className="px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className={`px-4 py-2 rounded-md text-sm font-medium ${!newName.trim() || creating ? "bg-gray-200 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                {creating ? "作成中..." : "作成する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
      ) : folders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 text-gray-300">
            <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-1">フォルダがありません</p>
          <p className="text-sm text-gray-400">「+ 新規フォルダ作成」からはじめましょう</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {folders.map((f) => (
            <a
              key={f.id}
              href={`/contents/${f.id}`}
              className="group block border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-md transition-all bg-white"
            >
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 text-orange-400 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
                <span className="font-semibold text-sm group-hover:text-blue-600 transition-colors">{f.name}</span>
              </div>
              <p className="text-xs text-gray-400 ml-9">
                更新: {formatDate(f.updatedAt)}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
