"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileEntry {
  id: string;
  name: string;
  type: "photo" | "minutes" | "script" | "plan" | "other";
  driveUrl: string;
  addedAt: string;
  selected?: boolean;
  isEyecatch?: boolean;
}

export interface DriveFolder {
  name: string;
  url: string;
}

export interface GenerationSettings {
  channel: string;
  customInstructions: string;
  taste: string;
  wordCount: string;
  imageHandling: string;
  promptVersionId: string;
}

export interface PreviewData {
  channel: string;
  channelLabel: string;
  generatedContent: Record<string, unknown>;
  files: FileEntry[];
  settings: GenerationSettings;
  aiAnalysis: string;
}

export interface CategorizedFiles {
  minutes: FileEntry[];
  scripts: FileEntry[];
  photos: FileEntry[];
  plans: FileEntry[];
  others: FileEntry[];
}

// ---------------------------------------------------------------------------
// Channel config
// ---------------------------------------------------------------------------

export const CHANNEL_OPTIONS = [
  { group: "Instagram", items: [
    { value: "instagram_reels", label: "Reels（縦型動画）" },
    { value: "instagram_stories", label: "Stories（短尺・投票・告知）" },
    { value: "instagram_feed", label: "Feed カルーセル（5枚構成）" },
  ]},
  { group: "イベントページ", items: [
    { value: "event_lp", label: "LP（告知/申込/FAQ/SEO/OG）" },
  ]},
  { group: "note", items: [
    { value: "note", label: "長文記事（サマリー・OG画像）" },
  ]},
  { group: "LINE公式", items: [
    { value: "line", label: "配信メッセージ / ステップ配信 / リッチメニュー" },
  ]},
  { group: "将来拡張", items: [
    { value: "_email", label: "メール", disabled: true },
    { value: "_web", label: "Web記事", disabled: true },
    { value: "_press", label: "プレスリリース", disabled: true },
    { value: "_youtube", label: "YouTube概要欄", disabled: true },
    { value: "_notion", label: "Notion / 社内報", disabled: true },
  ]},
];

export const CHANNEL_LABELS: Record<string, string> = {
  instagram_reels: "Instagram Reels",
  instagram_stories: "Instagram Stories",
  instagram_feed: "Instagram Feed",
  event_lp: "イベントLP",
  note: "note",
  line: "LINE",
};

export const TASTE_OPTIONS = [
  { value: "scientific", label: "科学的・エビデンス重視" },
  { value: "friendly", label: "親しみやすい・カジュアル" },
  { value: "professional", label: "ビジネス・フォーマル" },
  { value: "motivational", label: "モチベーション・鼓舞" },
  { value: "educational", label: "教育的・わかりやすい" },
];

export const WORD_COUNT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  instagram_reels: [
    { value: "short", label: "30秒台本（〜150文字）" },
    { value: "medium", label: "60秒台本（〜300文字）" },
    { value: "long", label: "90秒台本（〜450文字）" },
  ],
  instagram_stories: [
    { value: "short", label: "3枚構成" },
    { value: "medium", label: "4枚構成" },
    { value: "long", label: "5枚構成" },
  ],
  instagram_feed: [
    { value: "standard", label: "5枚カルーセル（標準）" },
    { value: "extended", label: "10枚カルーセル（拡張）" },
  ],
  event_lp: [
    { value: "compact", label: "コンパクト（〜1000文字）" },
    { value: "standard", label: "標準（〜2000文字）" },
    { value: "detailed", label: "詳細（〜3000文字）" },
  ],
  note: [
    { value: "short", label: "短め（〜2000文字）" },
    { value: "medium", label: "標準（〜4000文字）" },
    { value: "long", label: "長め（〜6000文字）" },
  ],
  line: [
    { value: "short", label: "短文（〜50文字）" },
    { value: "medium", label: "標準（〜100文字）" },
    { value: "step", label: "ステップ配信（5通セット）" },
  ],
};

export const IMAGE_OPTIONS = [
  { value: "none", label: "画像なし" },
  { value: "uploaded", label: "アップロード画像を使用" },
  { value: "generate", label: "AI画像生成（Design Manifest出力）" },
  { value: "template", label: "テンプレート差し込み（Canva/Figma）" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function categorizeFiles(files: FileEntry[]): CategorizedFiles {
  return {
    minutes: files.filter((f) => f.type === "minutes"),
    scripts: files.filter((f) => f.type === "script"),
    photos: files.filter((f) => f.type === "photo"),
    plans: files.filter((f) => f.type === "plan"),
    others: files.filter((f) => f.type === "other"),
  };
}

function getPromptType(channel: string): string {
  if (channel.startsWith("instagram")) return "instagram";
  if (channel === "event_lp") return "lp";
  return channel;
}

// ---------------------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------------------

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block mb-1">
      <span className="text-sm font-medium text-gray-700">{children}</span>
      {hint && <span className="block text-xs text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none ${props.className ?? ""}`} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none ${props.className ?? ""}`} />;
}

// ---------------------------------------------------------------------------
// Step 1: File Registration (blog-cms style with categorized view)
// ---------------------------------------------------------------------------

export function StepFiles({
  folder,
  setFolder,
  files,
  setFiles,
}: {
  folder: DriveFolder;
  setFolder: (f: DriveFolder) => void;
  files: FileEntry[];
  setFiles: (f: FileEntry[]) => void;
}) {
  const [newFile, setNewFile] = useState<Omit<FileEntry, "id" | "addedAt" | "selected" | "isEyecatch">>({ name: "", type: "photo", driveUrl: "" });
  const [dragOver, setDragOver] = useState(false);

  function addFile() {
    if (!newFile.name || !newFile.driveUrl) return;
    setFiles([...files, { ...newFile, id: `file_${Date.now()}`, addedAt: new Date().toISOString(), selected: true, isEyecatch: false }]);
    setNewFile({ name: "", type: "photo", driveUrl: "" });
  }

  function removeFile(id: string) {
    setFiles(files.filter((f) => f.id !== id));
  }

  const categorized = categorizeFiles(files);

  const categoryConfig = [
    { key: "minutes", label: "議事録 / トランスクリプト", icon: "📝", color: "blue", items: categorized.minutes },
    { key: "scripts", label: "台本 / 原稿", icon: "📄", color: "purple", items: categorized.scripts },
    { key: "photos", label: "写真素材", icon: "📷", color: "green", items: categorized.photos },
    { key: "plans", label: "企画書", icon: "📋", color: "yellow", items: categorized.plans },
    { key: "others", label: "その他", icon: "📎", color: "gray", items: categorized.others },
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
    purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-700" },
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", badge: "bg-green-100 text-green-700" },
    yellow: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700" },
    gray: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", badge: "bg-gray-100 text-gray-600" },
  };

  return (
    <div className="space-y-6">
      {/* Drive Folder */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 border-b pb-1 mb-3">Google Drive フォルダ登録</h4>
        <p className="text-xs text-gray-500 mb-3">コンテンツ素材を管理するDriveフォルダを指定してください。フォルダ内のファイルが自動的に分類されます。</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>フォルダ名</Label>
            <Input value={folder.name} onChange={(e) => setFolder({ ...folder, name: e.target.value })} placeholder="例: camp_001_spring_academy" />
          </div>
          <div>
            <Label hint="Google DriveのフォルダURL">フォルダURL</Label>
            <Input value={folder.url} onChange={(e) => setFolder({ ...folder, url: e.target.value })} placeholder="https://drive.google.com/drive/folders/..." />
          </div>
        </div>
      </div>

      {/* File Registration with drag-and-drop area */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 border-b pb-1 mb-3">ファイル登録</h4>

        {/* Drag & drop area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
          className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"}`}
        >
          <div className="text-3xl mb-2">📁</div>
          <p className="text-sm text-gray-600 font-medium">ファイルをドラッグ＆ドロップ</p>
          <p className="text-xs text-gray-400 mt-1">または下のフォームから手動で追加</p>
        </div>

        {/* Manual add form */}
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-3">
              <Label>ファイル名</Label>
              <Input value={newFile.name} onChange={(e) => setNewFile({ ...newFile, name: e.target.value })} placeholder="例: mtg_20260301.mp4" />
            </div>
            <div className="col-span-2">
              <Label>種別</Label>
              <select value={newFile.type} onChange={(e) => setNewFile({ ...newFile, type: e.target.value as FileEntry["type"] })} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
                <option value="photo">写真</option>
                <option value="minutes">議事録/スクリプト</option>
                <option value="script">台本/原稿</option>
                <option value="plan">企画書</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div className="col-span-5">
              <Label hint="Google DriveのファイルURL、またはローカルパス">ファイルURL</Label>
              <Input value={newFile.driveUrl} onChange={(e) => setNewFile({ ...newFile, driveUrl: e.target.value })} placeholder="https://drive.google.com/file/d/..." />
            </div>
            <div className="col-span-2">
              <button type="button" onClick={addFile} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 w-full">追加</button>
            </div>
          </div>
        </div>

        {/* Categorized file list (blog-cms style) */}
        {files.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
            ファイルが登録されていません。上のフォームからファイルを追加してください。
          </div>
        ) : (
          <div className="space-y-4">
            {categoryConfig.map((cat) => {
              if (cat.items.length === 0) return null;
              const colors = colorMap[cat.color];
              return (
                <div key={cat.key} className={`${colors.bg} ${colors.border} border rounded-lg p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{cat.icon}</span>
                    <span className={`text-sm font-bold ${colors.text}`}>{cat.label}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colors.badge}`}>{cat.items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {cat.items.map((f) => (
                      <div key={f.id} className="flex items-center justify-between bg-white rounded-md px-3 py-2 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{f.name}</span>
                          <span className="text-xs text-gray-400 truncate max-w-xs">{f.driveUrl}</span>
                        </div>
                        <button type="button" onClick={() => removeFile(f.id)} className="text-xs text-red-500 hover:text-red-700">削除</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Requirements (blog-cms style with photo grid + eyecatch)
// ---------------------------------------------------------------------------

export function StepRequirements({
  files,
  settings,
  setSettings,
  promptVersions,
  aiAnalysis,
  setAiAnalysis,
  onAnalyze,
  analyzing,
  onTogglePhotoSelect,
  onSetEyecatch,
}: {
  files: FileEntry[];
  settings: GenerationSettings;
  setSettings: (s: GenerationSettings) => void;
  promptVersions: { id: string; name: string; type: string; version: number }[];
  aiAnalysis: string;
  setAiAnalysis: (a: string) => void;
  onAnalyze: () => void;
  analyzing: boolean;
  onTogglePhotoSelect?: (fileId: string) => void;
  onSetEyecatch?: (fileId: string) => void;
}) {
  const wordCountOpts = WORD_COUNT_OPTIONS[settings.channel] ?? WORD_COUNT_OPTIONS["note"];
  const relevantPrompts = promptVersions.filter(
    (p) => p.type === getPromptType(settings.channel) || p.type === "planner"
  );
  const photos = files.filter((f) => f.type === "photo");

  return (
    <div className="space-y-6">
      {/* AI Analysis */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 border-b pb-1 mb-3">AI分析結果</h4>
        <p className="text-xs text-gray-500 mb-3">登録したファイル（{files.length}件）をAIが分析し、コンテンツの方向性を提案します。</p>
        <div className="flex gap-3 mb-3">
          <button type="button" onClick={onAnalyze} disabled={analyzing || files.length === 0} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${analyzing ? "bg-gray-300 text-gray-500" : files.length === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
            {analyzing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                分析中...
              </span>
            ) : "ファイルを分析する"}
          </button>
          {files.length === 0 && <span className="text-xs text-orange-500 self-center">先にStep 1でファイルを登録してください</span>}
        </div>
        {aiAnalysis && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <Textarea
              value={aiAnalysis}
              onChange={(e) => setAiAnalysis(e.target.value)}
              rows={6}
              className="bg-white border-indigo-200"
            />
            <p className="text-xs text-indigo-400 mt-2">分析結果を手動で編集できます。</p>
          </div>
        )}
        {!aiAnalysis && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
            「ファイルを分析する」ボタンを押すと、AI分析結果がここに表示されます。
          </div>
        )}
      </div>

      {/* Channel selection */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 border-b pb-1 mb-3">生成設定</h4>
        <Label>チャネル（カテゴリ）</Label>
        <select
          value={settings.channel}
          onChange={(e) => setSettings({ ...settings, channel: e.target.value, wordCount: "" })}
          className="border border-gray-300 rounded-md px-3 py-2.5 text-sm w-full max-w-md mb-4"
        >
          <option value="">-- チャネルを選択 --</option>
          {CHANNEL_OPTIONS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((item) => (
                <option key={item.value} value={item.value} disabled={"disabled" in item && item.disabled}>{item.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {settings.channel && (
        <>
          {/* Prompt Version */}
          <div>
            <Label hint="プロンプト管理で登録したカスタムプロンプトを選択できます">使用プロンプト</Label>
            <select
              value={settings.promptVersionId}
              onChange={(e) => setSettings({ ...settings, promptVersionId: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full max-w-md mb-2"
            >
              <option value="">デフォルト</option>
              {relevantPrompts.map((p) => (
                <option key={p.id} value={p.id}>{p.name} v{p.version}（{p.type}）</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mb-4">
              カスタムプロンプトは <a href="/prompt-versions" className="text-blue-500 underline">プロンプト管理</a> ページで追加・編集できます。
            </p>
          </div>

          {/* Taste - button grid (blog-cms style) */}
          <div>
            <Label>テイスト（トーン＆マナー）</Label>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {TASTE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSettings({ ...settings, taste: t.value })}
                  className={`px-3 py-2.5 rounded-md text-sm border transition-all ${settings.taste === t.value ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white border-gray-300 hover:bg-gray-50"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Word count - button grid */}
          <div>
            <Label>文字数 / ボリューム</Label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {wordCountOpts.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setSettings({ ...settings, wordCount: w.value })}
                  className={`px-3 py-2.5 rounded-md text-sm border transition-all ${settings.wordCount === w.value ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white border-gray-300 hover:bg-gray-50"}`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photo selection grid (blog-cms style) */}
          {photos.length > 0 && (
            <div>
              <Label hint="使用する写真を選択し、アイキャッチにしたい写真には★をクリック">写真選択</Label>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all ${photo.selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                    onClick={() => onTogglePhotoSelect?.(photo.id)}
                  >
                    {/* Photo placeholder */}
                    <div className="aspect-square bg-gray-100 rounded-md flex items-center justify-center mb-2">
                      <span className="text-2xl">📷</span>
                    </div>
                    <p className="text-xs truncate font-medium">{photo.name}</p>
                    {/* Eyecatch star */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSetEyecatch?.(photo.id); }}
                      className={`absolute top-2 right-2 text-lg transition-all ${photo.isEyecatch ? "text-yellow-400 drop-shadow-md" : "text-gray-300 hover:text-yellow-300"}`}
                      title={photo.isEyecatch ? "アイキャッチ設定済み" : "アイキャッチに設定"}
                    >
                      ★
                    </button>
                    {/* Selected check */}
                    {photo.selected && (
                      <div className="absolute top-2 left-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image handling */}
          <div>
            <Label>画像（解像度処理）/ 生成画像</Label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {IMAGE_OPTIONS.map((img) => (
                <button
                  key={img.value}
                  type="button"
                  onClick={() => setSettings({ ...settings, imageHandling: img.value })}
                  className={`px-3 py-2.5 rounded-md text-sm border transition-all ${settings.imageHandling === img.value ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white border-gray-300 hover:bg-gray-50"}`}
                >
                  {img.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom instructions */}
          <div>
            <Label hint="任意。AIへの追加指示があれば入力してください">カスタム指示</Label>
            <Textarea
              value={settings.customInstructions}
              onChange={(e) => setSettings({ ...settings, customInstructions: e.target.value })}
              rows={3}
              placeholder="例: FAMのアカデミー向けに、初心者にもわかりやすいトーンで。免責文は必ず入れてください。"
            />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generating Step (blog-cms style loading animation)
// ---------------------------------------------------------------------------

export function StepGenerating({ channel }: { channel: string }) {
  const label = CHANNEL_LABELS[channel] ?? channel;
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative mb-8">
        <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">✨</span>
        </div>
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">コンテンツを生成中...</h3>
      <p className="text-sm text-gray-500 mb-1">{label} 向けのコンテンツを生成しています。</p>
      <p className="text-xs text-gray-400">AI がファイルを分析し、最適なコンテンツを作成しています。</p>
      <div className="flex gap-1 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Preview (blog-cms style with contentEditable)
// ---------------------------------------------------------------------------

export function StepPreview({
  preview,
  onRegenerate,
  generating,
  onUpdateContent,
}: {
  preview: PreviewData | null;
  onRegenerate: () => void;
  generating: boolean;
  onUpdateContent?: (key: string, value: string) => void;
}) {
  if (!preview) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg mb-2">プレビューデータがありません</p>
        <p className="text-sm">Step 2 で要件を設定し、「生成」ボタンを押してください。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-800">
          プレビュー: <span className="text-blue-600">{preview.channelLabel}</span>
        </h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={generating}
            className="px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50"
          >
            {generating ? "再生成中..." : "再生成する"}
          </button>
        </div>
      </div>

      {/* Inline editing hint */}
      <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-2 text-xs text-amber-700">
        テキスト部分をクリックすると直接編集できます。編集した内容はそのまま保存されます。
      </div>

      {/* AI Analysis summary */}
      {preview.aiAnalysis && (
        <div className="bg-indigo-50 rounded-md p-4">
          <span className="text-xs font-bold text-indigo-600 uppercase">AI分析サマリー</span>
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{preview.aiAnalysis}</p>
        </div>
      )}

      {/* Source files */}
      <div className="bg-gray-50 rounded-md p-4">
        <span className="text-xs font-bold text-gray-500 uppercase">参照ファイル（{preview.files.length}件）</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {preview.files.map((f) => (
            <span key={f.id} className="px-2 py-1 text-xs bg-white border border-gray-200 rounded">{f.name}</span>
          ))}
        </div>
      </div>

      {/* Settings summary card */}
      <div className="bg-gray-50 rounded-md p-4">
        <span className="text-xs font-bold text-gray-500 uppercase">生成設定</span>
        <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
          <div><span className="text-xs text-gray-400">テイスト</span><br />{TASTE_OPTIONS.find((t) => t.value === preview.settings.taste)?.label ?? "-"}</div>
          <div><span className="text-xs text-gray-400">ボリューム</span><br />{preview.settings.wordCount || "-"}</div>
          <div><span className="text-xs text-gray-400">画像</span><br />{IMAGE_OPTIONS.find((i) => i.value === preview.settings.imageHandling)?.label ?? "-"}</div>
          <div><span className="text-xs text-gray-400">プロンプト</span><br />{preview.settings.promptVersionId || "デフォルト"}</div>
        </div>
      </div>

      {/* Generated content with contentEditable */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <span className="text-xs font-bold text-gray-500 uppercase mb-3 block">生成コンテンツ</span>
        <ChannelPreviewRenderer channel={preview.channel} content={preview.generatedContent} onUpdate={onUpdateContent} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel-specific preview renderers with contentEditable
// ---------------------------------------------------------------------------

function ChannelPreviewRenderer({ channel, content, onUpdate }: { channel: string; content: Record<string, unknown>; onUpdate?: (key: string, value: string) => void }) {
  if (channel.startsWith("instagram_reels")) return <ReelsPreview content={content} onUpdate={onUpdate} />;
  if (channel.startsWith("instagram_stories")) return <StoriesPreview content={content} onUpdate={onUpdate} />;
  if (channel.startsWith("instagram_feed")) return <FeedPreview content={content} onUpdate={onUpdate} />;
  if (channel === "event_lp") return <LPPreview content={content} onUpdate={onUpdate} />;
  if (channel === "note") return <NotePreview content={content} onUpdate={onUpdate} />;
  if (channel === "line") return <LinePreview content={content} onUpdate={onUpdate} />;
  return <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <span className="text-xs font-bold text-blue-600 uppercase">{title}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function EditableText({ text, fieldKey, onUpdate, className: extra }: { text: unknown; fieldKey?: string; onUpdate?: (key: string, value: string) => void; className?: string }) {
  if (!text && !onUpdate) return <span className="text-gray-300 text-sm">-</span>;
  return (
    <p
      className={`text-sm whitespace-pre-wrap outline-none rounded px-1 -mx-1 transition-colors ${onUpdate ? "focus:bg-yellow-50 focus:ring-2 focus:ring-yellow-200 hover:bg-yellow-50/50 cursor-text" : ""} ${extra ?? ""}`}
      contentEditable={!!onUpdate}
      suppressContentEditableWarning
      onBlur={(e) => {
        if (onUpdate && fieldKey) onUpdate(fieldKey, e.currentTarget.textContent ?? "");
      }}
    >
      {String(text ?? "")}
    </p>
  );
}

function EditableTags({ tags, fieldKey, onUpdate }: { tags: string[]; fieldKey: string; onUpdate?: (key: string, value: string) => void }) {
  if (!onUpdate) {
    return <div className="flex flex-wrap gap-1">{tags.map((t, i) => <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 rounded">{t}</span>)}</div>;
  }
  return (
    <div>
      <div
        className="text-sm outline-none rounded px-1 -mx-1 transition-colors focus:bg-yellow-50 focus:ring-2 focus:ring-yellow-200 hover:bg-yellow-50/50 cursor-text"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onUpdate(fieldKey, e.currentTarget.textContent ?? "")}
      >
        {tags.join(", ")}
      </div>
      <p className="text-xs text-gray-400 mt-1">カンマ区切りで編集できます</p>
    </div>
  );
}

function ReelsPreview({ content, onUpdate }: { content: Record<string, unknown>; onUpdate?: (key: string, value: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4">
        <div className="grid grid-cols-5 gap-2 text-center">
          {["Hook (3秒)", "課題 (10秒)", "エビデンス (20秒)", "実践 (15秒)", "CTA (7秒)"].map((s, i) => (
            <div key={i} className={`p-2 rounded text-xs ${i === 0 ? "bg-pink-200" : "bg-white"}`}>{s}</div>
          ))}
        </div>
      </div>
      <Section title="Hook"><EditableText text={content.hook} fieldKey="hook" onUpdate={onUpdate} /></Section>
      <Section title="課題"><EditableText text={content.problem} fieldKey="problem" onUpdate={onUpdate} /></Section>
      <Section title="エビデンス"><EditableText text={content.evidence} fieldKey="evidence" onUpdate={onUpdate} /></Section>
      <Section title="引用元"><EditableText text={content.evidence_source} fieldKey="evidence_source" onUpdate={onUpdate} /></Section>
      <Section title="実践"><EditableText text={content.practice} fieldKey="practice" onUpdate={onUpdate} /></Section>
      <Section title="CTA"><EditableText text={content.cta} fieldKey="cta" onUpdate={onUpdate} /></Section>
      <div className="border-t pt-3">
        <Section title="サムネイル"><EditableText text={content.thumbnail_text} fieldKey="thumbnail_text" onUpdate={onUpdate} /></Section>
        <Section title="キャプション"><EditableText text={content.caption} fieldKey="caption" onUpdate={onUpdate} /></Section>
        {Array.isArray(content.hashtags) && <Section title="ハッシュタグ"><EditableTags tags={(content.hashtags as string[])} fieldKey="hashtags" onUpdate={onUpdate} /></Section>}
      </div>
      <Section title="免責文"><EditableText text={content.disclaimer} fieldKey="disclaimer" onUpdate={onUpdate} className="text-xs text-yellow-700 bg-yellow-50 rounded p-3" /></Section>
    </div>
  );
}

function StoriesPreview({ content, onUpdate }: { content: Record<string, unknown>; onUpdate?: (key: string, value: string) => void }) {
  const slides = content.slides as { text: string; image_note: string }[] | undefined;
  return (
    <div>
      <Section title="タイプ"><EditableText text={content.story_type} fieldKey="story_type" onUpdate={onUpdate} /></Section>
      <Section title="投票/質問"><EditableText text={content.poll_question} fieldKey="poll_question" onUpdate={onUpdate} /></Section>
      {!!content.countdown_title && (
        <>
          <Section title="カウントダウンタイトル"><EditableText text={content.countdown_title} fieldKey="countdown_title" onUpdate={onUpdate} /></Section>
          <Section title="カウントダウン日付"><EditableText text={content.countdown_date} fieldKey="countdown_date" onUpdate={onUpdate} /></Section>
        </>
      )}
      {slides && (
        <div className="grid grid-cols-5 gap-2 mt-3">
          {slides.map((s, i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-3 text-center">
              <span className="text-xs font-bold text-gray-500">#{i + 1}</span>
              <EditableText text={s.text} fieldKey={`slides.${i}.text`} onUpdate={onUpdate} className="text-xs mt-1" />
              <EditableText text={s.image_note} fieldKey={`slides.${i}.image_note`} onUpdate={onUpdate} className="text-xs text-gray-400 mt-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedPreview({ content, onUpdate }: { content: Record<string, unknown>; onUpdate?: (key: string, value: string) => void }) {
  const slides = [
    { label: "表紙", key: "slide1_cover", text: content.slide1_cover },
    { label: "誤解", key: "slide2_misconception", text: content.slide2_misconception },
    { label: "正しい理解", key: "slide3_truth", text: content.slide3_truth },
    { label: "実践", key: "slide4_practice", text: content.slide4_practice },
    { label: "CTA", key: "slide5_cta", text: content.slide5_cta },
  ];
  return (
    <div>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {slides.map((s, i) => (
          <div key={i} className="bg-gray-50 border rounded-lg p-3">
            <span className="text-xs font-bold text-gray-500">{i + 1}. {s.label}</span>
            <div className="mt-2">
              <EditableText text={s.text} fieldKey={s.key} onUpdate={onUpdate} />
            </div>
          </div>
        ))}
      </div>
      <Section title="キャプション"><EditableText text={content.caption} fieldKey="caption" onUpdate={onUpdate} /></Section>
      <Section title="免責文"><EditableText text={content.disclaimer} fieldKey="disclaimer" onUpdate={onUpdate} className="text-xs text-yellow-700 bg-yellow-50 rounded p-3" /></Section>
    </div>
  );
}

function LPPreview({ content, onUpdate }: { content: Record<string, unknown>; onUpdate?: (key: string, value: string) => void }) {
  const faqs = content.faqs as { q: string; a: string }[] | undefined;
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-5 text-center">
        <h3 className="text-lg font-bold"><EditableText text={content.title} fieldKey="title" onUpdate={onUpdate} /></h3>
        <EditableText text={content.subtitle} fieldKey="subtitle" onUpdate={onUpdate} />
        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
          <div><span className="text-gray-400 block">日時</span><EditableText text={content.event_date} fieldKey="event_date" onUpdate={onUpdate} /></div>
          <div><span className="text-gray-400 block">場所</span><EditableText text={content.event_location} fieldKey="event_location" onUpdate={onUpdate} /></div>
          <div><span className="text-gray-400 block">料金</span><EditableText text={content.event_price} fieldKey="event_price" onUpdate={onUpdate} /></div>
        </div>
        <Section title="CTAボタン"><EditableText text={content.cta_text} fieldKey="cta_text" onUpdate={onUpdate} /></Section>
      </div>
      <Section title="ベネフィット"><EditableText text={Array.isArray(content.benefits) ? (content.benefits as string[]).join("\n") : content.benefits} fieldKey="benefits" onUpdate={onUpdate} /></Section>
      <Section title="アジェンダ"><EditableText text={content.agenda} fieldKey="agenda" onUpdate={onUpdate} /></Section>
      <Section title="登壇者名"><EditableText text={content.speaker_name} fieldKey="speaker_name" onUpdate={onUpdate} /></Section>
      <Section title="登壇者肩書き"><EditableText text={content.speaker_title} fieldKey="speaker_title" onUpdate={onUpdate} /></Section>
      {faqs && <Section title="FAQ">{faqs.map((f, i) => <div key={i} className="mb-2"><div className="text-sm font-medium">Q: <EditableText text={f.q} fieldKey={`faqs.${i}.q`} onUpdate={onUpdate} className="inline" /></div><div className="text-sm text-gray-600">A: <EditableText text={f.a} fieldKey={`faqs.${i}.a`} onUpdate={onUpdate} className="inline" /></div></div>)}</Section>}
      <Section title="SEO タイトル"><EditableText text={content.meta_title} fieldKey="meta_title" onUpdate={onUpdate} className="text-xs" /></Section>
      <Section title="SEO ディスクリプション"><EditableText text={content.meta_description} fieldKey="meta_description" onUpdate={onUpdate} className="text-xs" /></Section>
      <Section title="免責文"><EditableText text={content.disclaimer} fieldKey="disclaimer" onUpdate={onUpdate} className="text-xs text-yellow-700 bg-yellow-50 rounded p-3" /></Section>
    </div>
  );
}

function NotePreview({ content, onUpdate }: { content: Record<string, unknown>; onUpdate?: (key: string, value: string) => void }) {
  return (
    <div className="space-y-3">
      <Section title="タイトル案1"><EditableText text={content.title_option1} fieldKey="title_option1" onUpdate={onUpdate} className="font-medium" /></Section>
      <Section title="タイトル案2"><EditableText text={content.title_option2} fieldKey="title_option2" onUpdate={onUpdate} className="font-medium" /></Section>
      {!!content.title_option3 && <Section title="タイトル案3"><EditableText text={content.title_option3} fieldKey="title_option3" onUpdate={onUpdate} className="font-medium" /></Section>}
      <Section title="リード"><EditableText text={content.lead} fieldKey="lead" onUpdate={onUpdate} /></Section>
      <Section title="本文">
        <div
          className="bg-gray-50 rounded p-4 font-mono text-xs whitespace-pre-wrap max-h-80 overflow-auto outline-none focus:bg-yellow-50 focus:ring-2 focus:ring-yellow-200 hover:bg-yellow-50/50 cursor-text"
          contentEditable={!!onUpdate}
          suppressContentEditableWarning
          onBlur={(e) => onUpdate?.("body_markdown", e.currentTarget.textContent ?? "")}
        >
          {String(content.body_markdown ?? "")}
        </div>
      </Section>
      <Section title="タグ"><EditableTags tags={(content.tags as string[]) ?? []} fieldKey="tags" onUpdate={onUpdate} /></Section>
      <Section title="OGテキスト"><EditableText text={content.og_text} fieldKey="og_text" onUpdate={onUpdate} /></Section>
      <Section title="CTAラベル"><EditableText text={content.cta_label} fieldKey="cta_label" onUpdate={onUpdate} /></Section>
      <Section title="CTA URL"><EditableText text={content.cta_url} fieldKey="cta_url" onUpdate={onUpdate} /></Section>
      <Section title="免責文"><EditableText text={content.disclaimer} fieldKey="disclaimer" onUpdate={onUpdate} className="text-xs text-yellow-700 bg-yellow-50 rounded p-3" /></Section>
    </div>
  );
}

function LinePreview({ content, onUpdate }: { content: Record<string, unknown>; onUpdate?: (key: string, value: string) => void }) {
  const steps = content.step_messages as { timing: string; content: string }[] | undefined;
  return (
    <div className="space-y-3">
      <Section title="配信タイプ"><EditableText text={content.delivery_type} fieldKey="delivery_type" onUpdate={onUpdate} /></Section>
      <Section title="セグメント"><EditableText text={content.segment} fieldKey="segment" onUpdate={onUpdate} /></Section>
      <Section title="メッセージ本文">
        <div className="bg-green-50 rounded-lg p-4 max-w-sm">
          <EditableText text={content.message_text} fieldKey="message_text" onUpdate={onUpdate} />
        </div>
      </Section>
      <Section title="CTAラベル"><EditableText text={content.cta_label} fieldKey="cta_label" onUpdate={onUpdate} /></Section>
      {steps && (
        <Section title="ステップ配信">
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-3 items-start">
                <EditableText text={s.timing} fieldKey={`step_messages.${i}.timing`} onUpdate={onUpdate} className="px-2 py-1 text-xs bg-gray-100 rounded font-medium shrink-0" />
                <EditableText text={s.content} fieldKey={`step_messages.${i}.content`} onUpdate={onUpdate} />
              </div>
            ))}
          </div>
        </Section>
      )}
      <Section title="リッチメニュータイトル"><EditableText text={content.rich_title} fieldKey="rich_title" onUpdate={onUpdate} /></Section>
      <Section title="リッチメニューCTA"><EditableText text={content.rich_cta} fieldKey="rich_cta" onUpdate={onUpdate} /></Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Save & Publish
// ---------------------------------------------------------------------------

export function StepSavePublish({
  preview,
  onSave,
  onPublish,
  saving,
  saved,
}: {
  preview: PreviewData | null;
  onSave: () => void;
  onPublish: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const [scheduledAt, setScheduledAt] = useState("");

  if (!preview) {
    return <div className="text-center py-12 text-gray-400 text-sm">プレビューがありません。先にStep 3でプレビューを確認してください。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-5">
        <h4 className="font-bold text-green-800 mb-2">コンテンツの保存・配信</h4>
        <p className="text-sm text-green-700">プレビューを確認し、問題なければ保存または配信予約を行ってください。</p>
      </div>

      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-xs text-gray-400">チャネル</span><br /><span className="font-medium">{preview.channelLabel}</span></div>
          <div><span className="text-xs text-gray-400">参照ファイル</span><br /><span className="font-medium">{preview.files.length}件</span></div>
          <div><span className="text-xs text-gray-400">テイスト</span><br /><span className="font-medium">{TASTE_OPTIONS.find((t) => t.value === preview.settings.taste)?.label ?? "-"}</span></div>
          <div><span className="text-xs text-gray-400">ボリューム</span><br /><span className="font-medium">{preview.settings.wordCount || "-"}</span></div>
        </div>
      </div>

      {/* Schedule */}
      <div>
        <Label hint="配信予約する場合は日時を指定。空欄の場合は下書き保存のみ">配信予定日時（任意）</Label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full max-w-md"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || saved}
          className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${saved ? "bg-green-100 text-green-700" : "bg-gray-800 text-white hover:bg-gray-900"}`}
        >
          {saved ? "保存済み ✓" : saving ? "保存中..." : "下書き保存"}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={saving || !saved}
          className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${!saved ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
        >
          {scheduledAt ? "配信予約する" : "レビュー依頼へ送る"}
        </button>
      </div>

      {saved && (
        <p className="text-sm text-green-600">保存が完了しました。「レビュー依頼へ送る」で承認フローに回すか、配信予約ができます。</p>
      )}
    </div>
  );
}
