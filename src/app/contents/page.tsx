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
      .then((data) => { setFolders(data); setLoading(false); });
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
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">コンテンツフォルダ</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          + 新規作成
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Google Drive内のフォルダを選択すると、中の議事録・トランスクリプト・写真からAIがコンテンツを自動生成します。
      </p>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">新規フォルダ作成</h3>
            <p className="text-sm text-gray-500 mb-3">Google Driveに新しいフォルダを作成します。</p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="フォルダ名を入力"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full mb-4 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
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
                {creating ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
      ) : folders.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          フォルダがありません。「+ 新規作成」から作成してください。
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {folders.map((f) => (
            <a
              key={f.id}
              href={`/contents/${f.id}`}
              className="block border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-md transition-all bg-white"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl text-orange-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </span>
                <span className="font-semibold text-sm">{f.name}</span>
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
