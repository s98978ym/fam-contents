"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGoogleAuth } from "@/lib/use_google_auth";
import { useGooglePicker, type PickedFolder } from "@/lib/use_google_picker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  category: string;
  webViewLink?: string;
}

interface DriveFilesResponse {
  files: DriveFile[];
  source: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categorizeLocalFile(name: string, mimeType: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("議事録") || lower.includes("mtg") || lower.includes("meeting") || lower.includes("minutes")) return "minutes";
  if (lower.includes("transcript") || lower.includes("文字起こし") || lower.includes("書き起こし")) return "transcript";
  if (lower.includes("台本") || lower.includes("script") || lower.includes("原稿")) return "minutes";
  if (lower.includes("企画") || lower.includes("plan") || lower.includes("proposal")) return "other";
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType === "application/pdf" || mimeType.includes("document") || mimeType.includes("wordprocessing")) return "minutes";
  return "other";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextFile(file: File): boolean {
  const textMimes = ["text/", "application/json", "application/xml", "application/javascript"];
  const textExts = [".txt", ".md", ".csv", ".tsv", ".json", ".xml", ".html", ".css", ".js", ".ts", ".py", ".rb", ".sh", ".yaml", ".yml", ".toml", ".ini", ".log", ".doc", ".docx"];
  if (textMimes.some((m) => file.type.startsWith(m))) return true;
  if (textExts.some((ext) => file.name.toLowerCase().endsWith(ext))) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ContentsPage() {
  const router = useRouter();

  // Mode: "drive" or "local"
  const [mode, setMode] = useState<"drive" | "local">("local");

  // Google OAuth
  const googleAuth = useGoogleAuth();
  const googlePicker = useGooglePicker(googleAuth.accessToken);

  // Selected folder state (Drive mode)
  const [selectedFolder, setSelectedFolder] = useState<PickedFolder | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesSource, setFilesSource] = useState<string | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);

  // Local upload state
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [localDragOver, setLocalDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle folder selection from Picker
  const handleOpenPicker = useCallback(() => {
    googlePicker.openPicker(
      (folder: PickedFolder) => {
        setSelectedFolder(folder);
        setDriveFiles([]);
        setFilesError(null);
      },
      () => {
        console.log("Picker cancelled");
      }
    );
  }, [googlePicker]);

  // Fetch files when folder is selected
  useEffect(() => {
    if (!selectedFolder || !googleAuth.accessToken) return;

    const fetchFiles = async () => {
      setLoadingFiles(true);
      setFilesError(null);
      try {
        const resp = await fetch(
          `/api/drive/oauth/files?folderId=${encodeURIComponent(selectedFolder.id)}`,
          {
            headers: { Authorization: `Bearer ${googleAuth.accessToken}` },
          }
        );
        const data: DriveFilesResponse = await resp.json();
        if (data.error) {
          setFilesError(data.error);
          setFilesSource("error");
        } else {
          setDriveFiles(data.files || []);
          setFilesSource(data.source);
        }
      } catch (err) {
        setFilesError(err instanceof Error ? err.message : "ファイルの取得に失敗しました");
        setFilesSource("error");
      } finally {
        setLoadingFiles(false);
      }
    };

    fetchFiles();
  }, [selectedFolder, googleAuth.accessToken]);

  // Navigate to content generation with Drive folder
  const handleProceed = useCallback(() => {
    if (selectedFolder) {
      sessionStorage.setItem("contentFolder", JSON.stringify({
        id: selectedFolder.id,
        name: selectedFolder.name,
        files: driveFiles,
      }));
      router.push(`/contents/${selectedFolder.id}`);
    }
  }, [selectedFolder, driveFiles, router]);

  // Local file handlers
  const handleLocalFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setLocalDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      setLocalFiles((prev) => [...prev, ...dropped]);
    }
  }, []);

  const handleLocalFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setLocalFiles((prev) => [...prev, ...selected]);
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeLocalFile = useCallback((index: number) => {
    setLocalFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Convert local File[] to DriveFile-like entries for display
  const localFileEntries: DriveFile[] = localFiles.map((f, i) => ({
    id: `local_${i}_${f.name}`,
    name: f.name,
    mimeType: f.type || "application/octet-stream",
    category: categorizeLocalFile(f.name, f.type),
  }));

  // Navigate to content generation with local files
  const handleLocalProceed = useCallback(async () => {
    // Read text file contents
    const fileContents: { name: string; content: string }[] = [];
    for (const f of localFiles) {
      if (isTextFile(f)) {
        try {
          const content = await f.text();
          fileContents.push({ name: f.name, content });
        } catch {
          // Skip files that can't be read as text
        }
      }
    }

    const id = `local_${Date.now()}`;
    sessionStorage.setItem("contentFolder", JSON.stringify({
      id,
      name: "ローカルアップロード",
      files: localFileEntries,
      fileContents,
    }));
    router.push(`/contents/${id}`);
  }, [localFiles, localFileEntries, router]);

  // Category helpers
  const categorizeFiles = (files: DriveFile[]) => ({
    minutes: files.filter((f) => f.category === "minutes"),
    transcripts: files.filter((f) => f.category === "transcript"),
    photos: files.filter((f) => f.category === "photo"),
    others: files.filter((f) => f.category === "other"),
  });

  const cats = categorizeFiles(driveFiles);
  const localCats = categorizeFiles(localFileEntries);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">コンテンツ生成</h2>
      </div>

      {/* Guide text */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 font-medium mb-1">使い方</p>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-0.5">
          <li>素材ファイルをアップロード（ローカル or Google Drive）</li>
          <li>ファイルを確認し、AIで分析</li>
          <li>チャネルとトーンを選んで「生成」</li>
          <li>プレビューを確認して保存</li>
        </ol>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-gray-200 mb-0">
        <button
          onClick={() => setMode("local")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            mode === "local"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          ローカルファイル
        </button>
        <button
          onClick={() => setMode("drive")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            mode === "drive"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Google Drive
        </button>
      </div>

      {/* Main content area */}
      <div className="bg-white border border-gray-200 border-t-0 rounded-b-lg p-6 space-y-6">

        {/* ================================================================= */}
        {/* Local upload mode                                                  */}
        {/* ================================================================= */}
        {mode === "local" && (
          <div className="space-y-6">
            {/* Drag & drop area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setLocalDragOver(true); }}
              onDragLeave={() => setLocalDragOver(false)}
              onDrop={handleLocalFileDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                localDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-gray-400"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-3">📁</div>
              <p className="text-sm text-gray-700 font-medium">ファイルをドラッグ＆ドロップ</p>
              <p className="text-xs text-gray-400 mt-1">またはクリックしてファイルを選択</p>
              <p className="text-xs text-gray-400 mt-2">議事録・台本・写真・企画書などの素材ファイルをアップロード</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleLocalFileSelect}
                className="hidden"
                accept=".txt,.md,.doc,.docx,.pdf,.csv,.json,.xml,.html,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mp3,.wav"
              />
            </div>

            {/* Uploaded files */}
            {localFiles.length > 0 && (
              <div className="space-y-4">
                {/* Category summary */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: "minutes", label: "議事録 / テキスト", icon: "📄", items: localCats.minutes, color: "blue" },
                    { key: "transcripts", label: "トランスクリプト", icon: "🎤", items: localCats.transcripts, color: "purple" },
                    { key: "photos", label: "写真", icon: "🖼", items: localCats.photos, color: "green" },
                    { key: "others", label: "その他", icon: "📁", items: localCats.others, color: "gray" },
                  ].map((cat) => (
                    <div
                      key={cat.key}
                      className={`p-3 rounded-lg border ${
                        cat.items.length > 0 ? `bg-${cat.color}-50 border-${cat.color}-200` : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{cat.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                      </div>
                      <p className={`text-lg font-bold ${cat.items.length > 0 ? `text-${cat.color}-600` : "text-gray-400"}`}>
                        {cat.items.length}件
                      </p>
                    </div>
                  ))}
                </div>

                {/* File list */}
                <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-2">ファイル一覧 ({localFiles.length}件)</p>
                  <ul className="space-y-1">
                    {localFiles.map((f, i) => (
                      <li key={`${i}_${f.name}`} className="flex items-center gap-2 text-sm text-gray-700 group">
                        <span className="text-gray-400">
                          {localFileEntries[i]?.category === "minutes" ? "📄" :
                           localFileEntries[i]?.category === "transcript" ? "🎤" :
                           localFileEntries[i]?.category === "photo" ? "🖼" : "📁"}
                        </span>
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="text-xs text-gray-400 shrink-0">{formatFileSize(f.size)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeLocalFile(i); }}
                          className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Add more files button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + ファイルを追加
                </button>

                {/* Proceed button */}
                <button
                  onClick={handleLocalProceed}
                  className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  アップロードしたファイルで生成を開始
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* Google Drive mode                                                  */}
        {/* ================================================================= */}
        {mode === "drive" && (
          <>
            {/* OAuth not configured warning */}
            {!googleAuth.isLoading && !googleAuth.oauthConfigured && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">Google Drive連携が未設定です</p>
                <p className="text-xs text-amber-600 mt-1">
                  管理者がVercelで <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code> と <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> を設定すると利用できます。
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Google Driveを使わない場合は「ローカルファイル」タブからファイルをアップロードできます。
                </p>
              </div>
            )}

            {/* Loading state */}
            {googleAuth.isLoading && (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}

            {/* Not logged in - show login button */}
            {!googleAuth.isLoading && googleAuth.oauthConfigured && !googleAuth.isAuthenticated && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Google Driveに接続</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Googleアカウントでログインして、<br />
                  Driveのフォルダから素材を選択できます
                </p>
                <button
                  onClick={googleAuth.login}
                  disabled={!googleAuth.gsiLoaded}
                  className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Googleでログイン</span>
                </button>
                {googleAuth.error && (
                  <p className="text-xs text-red-600 mt-3">{googleAuth.error}</p>
                )}
              </div>
            )}

            {/* Logged in - show user info and folder picker */}
            {!googleAuth.isLoading && googleAuth.isAuthenticated && googleAuth.user && (
              <>
                {/* User info bar */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {googleAuth.user.picture && (
                      <img src={googleAuth.user.picture} alt="" className="w-8 h-8 rounded-full" />
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-800">{googleAuth.user.name || googleAuth.user.email}</span>
                      {googleAuth.user.name && (
                        <p className="text-xs text-gray-500">{googleAuth.user.email}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={googleAuth.logout}
                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 border border-gray-300 rounded-md hover:bg-white transition-colors"
                  >
                    ログアウト
                  </button>
                </div>

                {/* Folder picker button */}
                {!selectedFolder && (
                  <button
                    onClick={handleOpenPicker}
                    disabled={!googlePicker.pickerLoaded}
                    className="w-full flex flex-col items-center justify-center gap-3 px-6 py-8 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="font-semibold text-lg">Google Driveからフォルダを選択</span>
                    <span className="text-sm text-gray-500 font-normal">共有フォルダも選択できます</span>
                  </button>
                )}

                {/* Selected folder */}
                {selectedFolder && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Folder header */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <div>
                          <span className="font-semibold text-gray-800">{selectedFolder.name}</span>
                          {filesSource && filesSource !== "error" && (
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                              filesSource === "google_drive"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {filesSource === "google_drive" ? "Google Drive" : "シミュレーション"}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleOpenPicker}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        フォルダを変更
                      </button>
                    </div>

                    {/* Loading files */}
                    {loadingFiles && (
                      <div className="flex items-center gap-3 p-6 justify-center">
                        <svg className="animate-spin w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-sm text-gray-600">ファイルを読み込み中...</span>
                      </div>
                    )}

                    {/* Files error */}
                    {filesError && (
                      <div className="p-4 bg-red-50">
                        <p className="text-sm text-red-700">{filesError}</p>
                      </div>
                    )}

                    {/* Files loaded */}
                    {!loadingFiles && !filesError && (
                      <div className="p-4">
                        {driveFiles.length === 0 ? (
                          <div className="text-center py-6">
                            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500">フォルダ内にファイルがありません</p>
                            <p className="text-sm text-gray-400 mt-1">Google Driveにファイルをアップロードしてください</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* File categories */}
                            <div className="grid grid-cols-4 gap-3">
                              {[
                                { key: "minutes", label: "議事録", icon: "📄", items: cats.minutes, color: "blue" },
                                { key: "transcripts", label: "トランスクリプト", icon: "🎤", items: cats.transcripts, color: "purple" },
                                { key: "photos", label: "写真", icon: "🖼", items: cats.photos, color: "green" },
                                { key: "others", label: "その他", icon: "📁", items: cats.others, color: "gray" },
                              ].map((cat) => (
                                <div
                                  key={cat.key}
                                  className={`p-3 rounded-lg border ${
                                    cat.items.length > 0 ? `bg-${cat.color}-50 border-${cat.color}-200` : "bg-gray-50 border-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span>{cat.icon}</span>
                                    <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                                  </div>
                                  <p className={`text-lg font-bold ${cat.items.length > 0 ? `text-${cat.color}-600` : "text-gray-400"}`}>
                                    {cat.items.length}件
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* File list */}
                            <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                              <p className="text-xs text-gray-500 mb-2">ファイル一覧 ({driveFiles.length}件)</p>
                              <ul className="space-y-1">
                                {driveFiles.map((f) => (
                                  <li key={f.id} className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-gray-400">
                                      {f.category === "minutes" ? "📄" :
                                       f.category === "transcript" ? "🎤" :
                                       f.category === "photo" ? "🖼" : "📁"}
                                    </span>
                                    <span className="truncate">{f.name}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Proceed button */}
                            <button
                              onClick={handleProceed}
                              disabled={driveFiles.length === 0}
                              className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              このフォルダで生成を開始
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
