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
  volume: number;
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

// Slider-based volume config per channel: min, max, step, default, unit
export const VOLUME_SLIDER_CONFIG: Record<string, { min: number; max: number; step: number; default: number; unit: string; format: (v: number) => string }> = {
  instagram_reels:    { min: 100, max: 500,  step: 50,  default: 300, unit: "文字", format: (v) => `${v}文字（約${Math.round(v / 5)}秒）` },
  instagram_stories:  { min: 3,   max: 10,   step: 1,   default: 5,   unit: "枚",   format: (v) => `${v}枚構成` },
  instagram_feed:     { min: 3,   max: 10,   step: 1,   default: 5,   unit: "枚",   format: (v) => `${v}枚カルーセル` },
  event_lp:           { min: 500, max: 4000, step: 250, default: 2000, unit: "文字", format: (v) => `約${v.toLocaleString()}文字` },
  note:               { min: 1000,max: 8000, step: 500, default: 4000, unit: "文字", format: (v) => `約${v.toLocaleString()}文字` },
  line:               { min: 30,  max: 200,  step: 10,  default: 80,  unit: "文字", format: (v) => `約${v}文字` },
};

// Prompt descriptions for intuitive display
export const PROMPT_DESCRIPTIONS: Record<string, { icon: string; description: string; tags: string[] }> = {
  planner:   { icon: "🧠", description: "コンテンツの方向性・構成を企画するAIプランナー。ファイル分析結果をもとに最適な構成を提案します。", tags: ["企画", "構成", "全チャネル共通"] },
  instagram: { icon: "📸", description: "Instagram向けのフック・キャプション・ハッシュタグを最適化。エンゲージメント率を考慮した投稿文を生成します。", tags: ["Reels", "Stories", "Feed"] },
  lp:        { icon: "🌐", description: "イベントLP向けのヘッドライン・ベネフィット・FAQ・SEOメタ情報を一括生成。CVR最適化を考慮します。", tags: ["LP", "SEO", "CTA"] },
  note:      { icon: "✍️", description: "note向けの長文記事を生成。読者の離脱を防ぐ導入・本文構成・まとめを最適化します。", tags: ["記事", "SEO", "リード文"] },
  line:      { icon: "💬", description: "LINE公式向けの配信メッセージ・ステップ配信・リッチメニューテキストを生成します。", tags: ["配信", "ステップ", "リッチメニュー"] },
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

          {/* Volume slider */}
          <div>
            <Label>ボリューム</Label>
            {(() => {
              const sliderCfg = VOLUME_SLIDER_CONFIG[settings.channel];
              if (!sliderCfg) return null;
              const currentVolume = settings.volume || sliderCfg.default;
              const pct = ((currentVolume - sliderCfg.min) / (sliderCfg.max - sliderCfg.min)) * 100;
              return (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{sliderCfg.min}{sliderCfg.unit}</span>
                    <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {sliderCfg.format(currentVolume)}
                    </span>
                    <span className="text-xs text-gray-400">{sliderCfg.max.toLocaleString()}{sliderCfg.unit}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={sliderCfg.min}
                      max={sliderCfg.max}
                      step={sliderCfg.step}
                      value={currentVolume}
                      onChange={(e) => setSettings({ ...settings, volume: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                      style={{ background: `linear-gradient(to right, #2563eb 0%, #2563eb ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-400">コンパクト</span>
                    <span className="text-[10px] text-gray-400">標準</span>
                    <span className="text-[10px] text-gray-400">詳細</span>
                  </div>
                </div>
              );
            })()}
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

          {/* Advanced settings (collapsible) */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3">
              <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              詳細設定（任意）
            </summary>
            <div className="space-y-5 pl-1">
              {/* Custom instructions */}
              <div>
                <Label hint="AIへの追加指示があれば入力（例: 初心者向けに、免責文を入れて）">カスタム指示</Label>
                <Textarea
                  value={settings.customInstructions}
                  onChange={(e) => setSettings({ ...settings, customInstructions: e.target.value })}
                  rows={3}
                  placeholder="AIへの追加指示があれば入力（例: 初心者向けに、免責文を入れて）"
                />
              </div>

              {/* Prompt Version */}
              <div>
                <Label>プロンプトバージョン</Label>
                <select
                  value={settings.promptVersionId}
                  onChange={(e) => setSettings({ ...settings, promptVersionId: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2.5 text-sm w-full max-w-md mb-2"
                >
                  <option value="">デフォルト（推奨）</option>
                  {relevantPrompts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} v{p.version}</option>
                  ))}
                </select>
                {/* Prompt detail card */}
                {(() => {
                  const selectedPrompt = settings.promptVersionId
                    ? relevantPrompts.find((p) => p.id === settings.promptVersionId)
                    : null;
                  const promptType = selectedPrompt?.type ?? getPromptType(settings.channel);
                  const desc = PROMPT_DESCRIPTIONS[promptType];
                  if (!desc) return null;
                  return (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-1">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">{desc.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-800">
                              {selectedPrompt ? `${selectedPrompt.name} v${selectedPrompt.version}` : "デフォルトプロンプト"}
                            </span>
                            {!settings.promptVersionId && (
                              <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">推奨</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed mb-2">{desc.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {desc.tags.map((tag) => (
                              <span key={tag} className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <p className="text-xs text-gray-400 mt-2">
                  <a href="/prompt-versions" className="text-blue-500 underline">プロンプト管理</a> で設定したカスタムプロンプトを使用できます。
                </p>
              </div>
            </div>
          </details>
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

// ---------------------------------------------------------------------------
// Device frames for realistic previews
// ---------------------------------------------------------------------------

function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-[320px] ${className ?? ""}`}>
      <div className="bg-black rounded-[2.5rem] p-2 shadow-2xl">
        <div className="bg-black rounded-[2rem] overflow-hidden relative">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-20" />
          {/* Screen */}
          <div className="bg-white rounded-[2rem] overflow-hidden min-h-[560px] relative">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowserFrame({ children, url }: { children: React.ReactNode; url?: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="bg-slate-200 rounded-t-xl px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-slate-400 truncate ml-2">
          {url ?? "https://example.com"}
        </div>
      </div>
      <div className="bg-white border border-t-0 border-slate-200 rounded-b-xl overflow-hidden min-h-[400px]">
        {children}
      </div>
    </div>
  );
}

function LineChatFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[320px]">
      <div className="bg-black rounded-[2.5rem] p-2 shadow-2xl">
        <div className="bg-black rounded-[2rem] overflow-hidden relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-20" />
          <div className="bg-[#7494C0] rounded-[2rem] overflow-hidden min-h-[560px] flex flex-col">
            {/* LINE header */}
            <div className="bg-[#4A6E8A] px-4 pt-8 pb-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <div className="flex-1 text-center">
                <span className="text-white text-sm font-bold">FAM公式</span>
              </div>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </div>
            {/* Chat area */}
            <div className="flex-1 px-3 py-4 space-y-3">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
    <div className="flex gap-8 items-start">
      {/* Phone mockup */}
      <PhoneFrame>
        <div className="relative min-h-[560px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
          {/* Placeholder video area */}
          <div className="flex-1 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
            <div className="text-center px-6 z-10">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
              <p className="text-white/60 text-xs">動画プレビュー</p>
            </div>
          </div>
          {/* Bottom overlay - caption area */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">F</div>
                  <span className="text-white text-xs font-bold">fam_official</span>
                </div>
                <EditableText text={content.caption} fieldKey="caption" onUpdate={onUpdate} className="!text-white !text-xs leading-relaxed" />
                {Array.isArray(content.hashtags) && (
                  <p className="text-blue-300 text-[10px] mt-1">{(content.hashtags as string[]).map(t => `#${t}`).join(" ")}</p>
                )}
              </div>
              {/* Side icons */}
              <div className="flex flex-col items-center gap-4 shrink-0">
                {[{icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", n: "1.2K"},
                  {icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", n: "84"},
                  {icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z", n: "67"}
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                    <span className="text-white text-[9px] mt-0.5">{item.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PhoneFrame>

      {/* Script / editable fields */}
      <div className="flex-1 min-w-0 space-y-3">
        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">台本構成</h5>
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-3">
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {["Hook (3秒)", "課題 (10秒)", "エビデンス (20秒)", "実践 (15秒)", "CTA (7秒)"].map((s, i) => (
              <div key={i} className={`py-1.5 rounded text-[10px] font-medium ${i === 0 ? "bg-pink-200 text-pink-800" : "bg-white text-slate-600"}`}>{s}</div>
            ))}
          </div>
        </div>
        <Section title="Hook"><EditableText text={content.hook} fieldKey="hook" onUpdate={onUpdate} /></Section>
        <Section title="課題"><EditableText text={content.problem} fieldKey="problem" onUpdate={onUpdate} /></Section>
        <Section title="エビデンス"><EditableText text={content.evidence} fieldKey="evidence" onUpdate={onUpdate} /></Section>
        <Section title="引用元"><EditableText text={content.evidence_source} fieldKey="evidence_source" onUpdate={onUpdate} /></Section>
        <Section title="実践"><EditableText text={content.practice} fieldKey="practice" onUpdate={onUpdate} /></Section>
        <Section title="CTA"><EditableText text={content.cta} fieldKey="cta" onUpdate={onUpdate} /></Section>
        <Section title="サムネイル"><EditableText text={content.thumbnail_text} fieldKey="thumbnail_text" onUpdate={onUpdate} /></Section>
        <Section title="キャプション"><EditableText text={content.caption} fieldKey="caption" onUpdate={onUpdate} /></Section>
        {Array.isArray(content.hashtags) && <Section title="ハッシュタグ"><EditableTags tags={(content.hashtags as string[])} fieldKey="hashtags" onUpdate={onUpdate} /></Section>}
        <Section title="免責文"><EditableText text={content.disclaimer} fieldKey="disclaimer" onUpdate={onUpdate} className="text-xs text-yellow-700 bg-yellow-50 rounded p-3" /></Section>
      </div>
    </div>
  );
}

function StoriesPreview({ content, onUpdate }: { content: Record<string, unknown>; onUpdate?: (key: string, value: string) => void }) {
  const slides = content.slides as { text: string; image_note: string }[] | undefined;
  const [activeSlide, setActiveSlide] = useState(0);
  return (
    <div className="flex gap-8 items-start">
      <PhoneFrame>
        <div className="relative min-h-[560px] bg-gradient-to-b from-orange-400 via-pink-400 to-purple-500 flex flex-col">
          {/* Progress bars */}
          <div className="absolute top-8 left-3 right-3 z-20 flex gap-1">
            {(slides ?? [{ text: "", image_note: "" }]).map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden cursor-pointer" onClick={() => setActiveSlide(i)}>
                <div className={`h-full rounded-full transition-all ${i <= activeSlide ? "bg-white w-full" : "w-0"}`} />
              </div>
            ))}
          </div>
          {/* Story content */}
          <div className="flex-1 flex items-center justify-center px-6 pt-16">
            {!!content.countdown_title ? (
              <div className="text-center">
                <EditableText text={content.countdown_title} fieldKey="countdown_title" onUpdate={onUpdate} className="!text-white text-xl font-bold" />
                <div className="mt-4 flex gap-3 justify-center">
                  {["日", "時", "分", "秒"].map((u, i) => (
                    <div key={i} className="bg-white/20 backdrop-blur rounded-lg px-3 py-2 text-center">
                      <span className="text-white text-2xl font-bold">{[7, 14, 30, 0][i]}</span>
                      <span className="text-white/70 text-[10px] block">{u}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : content.poll_question ? (
              <div className="w-full text-center">
                <EditableText text={content.poll_question} fieldKey="poll_question" onUpdate={onUpdate} className="!text-white text-lg font-bold mb-4" />
                <div className="space-y-2 px-4">
                  <div className="bg-white/20 backdrop-blur rounded-full py-2.5 text-white text-sm">はい</div>
                  <div className="bg-white/20 backdrop-blur rounded-full py-2.5 text-white text-sm">いいえ</div>
                </div>
              </div>
            ) : slides && slides[activeSlide] ? (
              <div className="text-center">
                <EditableText text={slides[activeSlide].text} fieldKey={`slides.${activeSlide}.text`} onUpdate={onUpdate} className="!text-white text-lg font-bold" />
                <p className="text-white/50 text-xs mt-3">{slides[activeSlide].image_note}</p>
              </div>
            ) : (
              <p className="text-white/60 text-sm">ストーリーコンテンツ</p>
            )}
          </div>
          {/* Swipe up area */}
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <svg className="w-6 h-6 text-white mx-auto animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            <span className="text-white text-xs">もっと見る</span>
          </div>
        </div>
      </PhoneFrame>

      <div className="flex-1 min-w-0 space-y-3">
        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ストーリー構成</h5>
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
              <div key={i} className={`rounded-lg p-3 text-center cursor-pointer transition-all ${i === activeSlide ? "bg-pink-100 ring-2 ring-pink-300" : "bg-gray-100 hover:bg-gray-200"}`} onClick={() => setActiveSlide(i)}>
                <span className="text-xs font-bold text-gray-500">#{i + 1}</span>
                <EditableText text={s.text} fieldKey={`slides.${i}.text`} onUpdate={onUpdate} className="text-xs mt-1" />
                <EditableText text={s.image_note} fieldKey={`slides.${i}.image_note`} onUpdate={onUpdate} className="text-xs text-gray-400 mt-1" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedPreview({ content, onUpdate }: { content: Record<string, unknown>; onUpdate?: (key: string, value: string) => void }) {
  const slides = [
    { label: "表紙", key: "slide1_cover", text: content.slide1_cover, bg: "from-indigo-500 to-purple-600" },
    { label: "誤解", key: "slide2_misconception", text: content.slide2_misconception, bg: "from-red-400 to-pink-500" },
    { label: "正しい理解", key: "slide3_truth", text: content.slide3_truth, bg: "from-emerald-400 to-teal-500" },
    { label: "実践", key: "slide4_practice", text: content.slide4_practice, bg: "from-blue-400 to-indigo-500" },
    { label: "CTA", key: "slide5_cta", text: content.slide5_cta, bg: "from-amber-400 to-orange-500" },
  ];
  const [activeSlide, setActiveSlide] = useState(0);
  return (
    <div className="flex gap-8 items-start">
      <PhoneFrame>
        <div className="min-h-[560px] bg-white flex flex-col">
          {/* IG header */}
          <div className="px-3 pt-8 pb-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">F</div>
            <span className="text-xs font-bold">fam_official</span>
          </div>
          {/* Carousel image area */}
          <div className={`aspect-square bg-gradient-to-br ${slides[activeSlide].bg} flex items-center justify-center px-6 relative`}>
            <div className="text-center">
              <span className="text-white/50 text-[10px] uppercase tracking-wider">{slides[activeSlide].label}</span>
              <EditableText text={slides[activeSlide].text} fieldKey={slides[activeSlide].key} onUpdate={onUpdate} className="!text-white text-base font-bold mt-2 leading-relaxed" />
            </div>
            {/* Carousel dots */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
              {slides.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full cursor-pointer ${i === activeSlide ? "bg-blue-500" : "bg-white/50"}`} onClick={() => setActiveSlide(i)} />
              ))}
            </div>
            {/* Nav arrows */}
            {activeSlide > 0 && (
              <button className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center" onClick={() => setActiveSlide(activeSlide - 1)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            {activeSlide < slides.length - 1 && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center" onClick={() => setActiveSlide(activeSlide + 1)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
          {/* Actions */}
          <div className="px-3 py-2 flex items-center gap-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            <div className="flex-1" />
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          </div>
          {/* Caption */}
          <div className="px-3 pb-3">
            <span className="text-xs font-bold">fam_official </span>
            <EditableText text={content.caption} fieldKey="caption" onUpdate={onUpdate} className="!text-xs inline" />
          </div>
        </div>
      </PhoneFrame>

      <div className="flex-1 min-w-0 space-y-3">
        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">カルーセル構成</h5>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {slides.map((s, i) => (
            <div key={i} className={`border rounded-lg p-3 cursor-pointer transition-all ${i === activeSlide ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200" : "bg-gray-50 hover:bg-gray-100"}`} onClick={() => setActiveSlide(i)}>
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
    </div>
  );
}

function LPPreview({ content, onUpdate }: { content: Record<string, unknown>; onUpdate?: (key: string, value: string) => void }) {
  const faqs = content.faqs as { q: string; a: string }[] | undefined;
  return (
    <BrowserFrame url="https://fam.example.com/event/seminar-2026">
      <div className="max-w-lg mx-auto">
        {/* Hero */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-8 py-12 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <EditableText text={content.title} fieldKey="title" onUpdate={onUpdate} className="!text-white text-2xl font-bold" />
          <EditableText text={content.subtitle} fieldKey="subtitle" onUpdate={onUpdate} className="!text-white/80 mt-2" />
          <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
            <div className="bg-white/10 rounded-lg px-3 py-2">
              <span className="text-white/60 text-[10px] block">日時</span>
              <EditableText text={content.event_date} fieldKey="event_date" onUpdate={onUpdate} className="!text-white !text-xs font-medium" />
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2">
              <span className="text-white/60 text-[10px] block">場所</span>
              <EditableText text={content.event_location} fieldKey="event_location" onUpdate={onUpdate} className="!text-white !text-xs font-medium" />
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2">
              <span className="text-white/60 text-[10px] block">料金</span>
              <EditableText text={content.event_price} fieldKey="event_price" onUpdate={onUpdate} className="!text-white !text-xs font-medium" />
            </div>
          </div>
          <div className="mt-6">
            <div className="inline-block bg-white text-emerald-600 font-bold px-8 py-3 rounded-full shadow-lg">
              <EditableText text={content.cta_text} fieldKey="cta_text" onUpdate={onUpdate} className="!text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="px-8 py-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">参加メリット</h3>
          <EditableText text={Array.isArray(content.benefits) ? (content.benefits as string[]).join("\n") : content.benefits} fieldKey="benefits" onUpdate={onUpdate} />
        </div>

        {/* Speaker */}
        {!!(content.speaker_name || content.speaker_title) && (
          <div className="px-8 py-6 bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">登壇者</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shrink-0">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div>
                <EditableText text={content.speaker_name} fieldKey="speaker_name" onUpdate={onUpdate} className="font-bold text-slate-800" />
                <EditableText text={content.speaker_title} fieldKey="speaker_title" onUpdate={onUpdate} className="text-slate-500 !text-xs" />
              </div>
            </div>
          </div>
        )}

        {/* Agenda */}
        {!!content.agenda && (
          <div className="px-8 py-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">アジェンダ</h3>
            <EditableText text={content.agenda} fieldKey="agenda" onUpdate={onUpdate} />
          </div>
        )}

        {/* FAQ */}
        {faqs && (
          <div className="px-8 py-6 bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">よくある質問</h3>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex gap-2 items-start">
                    <span className="text-emerald-600 font-bold text-sm shrink-0">Q.</span>
                    <EditableText text={f.q} fieldKey={`faqs.${i}.q`} onUpdate={onUpdate} className="font-medium" />
                  </div>
                  <div className="flex gap-2 items-start mt-2">
                    <span className="text-slate-400 font-bold text-sm shrink-0">A.</span>
                    <EditableText text={f.a} fieldKey={`faqs.${i}.a`} onUpdate={onUpdate} className="text-slate-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEO & disclaimer */}
        <div className="px-8 py-4 border-t border-slate-100 space-y-2">
          <div className="text-[10px] text-slate-400 uppercase">SEO</div>
          <EditableText text={content.meta_title} fieldKey="meta_title" onUpdate={onUpdate} className="text-xs font-medium" />
          <EditableText text={content.meta_description} fieldKey="meta_description" onUpdate={onUpdate} className="text-xs text-slate-500" />
          <EditableText text={content.disclaimer} fieldKey="disclaimer" onUpdate={onUpdate} className="text-xs text-yellow-700 bg-yellow-50 rounded p-3 mt-2" />
        </div>
      </div>
    </BrowserFrame>
  );
}

function NotePreview({ content, onUpdate }: { content: Record<string, unknown>; onUpdate?: (key: string, value: string) => void }) {
  return (
    <div className="flex gap-8 items-start">
      <BrowserFrame url="https://note.com/fam_official/n/xxx">
        <div className="max-w-lg mx-auto px-6 py-8">
          {/* OG image placeholder */}
          <div className="aspect-video bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg mb-6 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 text-white/30 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="text-white/40 text-xs">OG画像</p>
            </div>
          </div>
          {/* Title */}
          <EditableText text={content.title_option1} fieldKey="title_option1" onUpdate={onUpdate} className="text-2xl font-bold text-slate-900 leading-tight" />
          {/* Author */}
          <div className="flex items-center gap-3 mt-4 mb-6 pb-6 border-b border-slate-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">F</div>
            <div>
              <span className="text-sm font-bold text-slate-800">FAM公式</span>
              <span className="text-xs text-slate-400 block">管理栄養士監修</span>
            </div>
          </div>
          {/* Lead */}
          <EditableText text={content.lead} fieldKey="lead" onUpdate={onUpdate} className="text-slate-600 leading-relaxed mb-6" />
          {/* Body */}
          <div
            className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap outline-none focus:bg-yellow-50 focus:ring-2 focus:ring-yellow-200 hover:bg-yellow-50/50 cursor-text min-h-[200px]"
            contentEditable={!!onUpdate}
            suppressContentEditableWarning
            onBlur={(e) => onUpdate?.("body_markdown", e.currentTarget.textContent ?? "")}
          >
            {String(content.body_markdown ?? "")}
          </div>
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-100">
            {((content.tags as string[]) ?? []).map((t, i) => (
              <span key={i} className="px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">#{t}</span>
            ))}
          </div>
          {/* CTA */}
          {!!content.cta_label && (
            <div className="mt-6 text-center">
              <div className="inline-block bg-green-500 text-white font-bold px-8 py-3 rounded-full">
                <EditableText text={content.cta_label} fieldKey="cta_label" onUpdate={onUpdate} className="!text-white" />
              </div>
            </div>
          )}
          {/* Disclaimer */}
          <EditableText text={content.disclaimer} fieldKey="disclaimer" onUpdate={onUpdate} className="text-xs text-yellow-700 bg-yellow-50 rounded p-3 mt-6" />
        </div>
      </BrowserFrame>

      <div className="flex-1 min-w-0 space-y-3 shrink-0 w-64">
        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">記事設定</h5>
        <Section title="タイトル案1"><EditableText text={content.title_option1} fieldKey="title_option1" onUpdate={onUpdate} className="font-medium" /></Section>
        <Section title="タイトル案2"><EditableText text={content.title_option2} fieldKey="title_option2" onUpdate={onUpdate} className="font-medium" /></Section>
        {!!content.title_option3 && <Section title="タイトル案3"><EditableText text={content.title_option3} fieldKey="title_option3" onUpdate={onUpdate} className="font-medium" /></Section>}
        <Section title="タグ"><EditableTags tags={(content.tags as string[]) ?? []} fieldKey="tags" onUpdate={onUpdate} /></Section>
        <Section title="OGテキスト"><EditableText text={content.og_text} fieldKey="og_text" onUpdate={onUpdate} /></Section>
        <Section title="CTA URL"><EditableText text={content.cta_url} fieldKey="cta_url" onUpdate={onUpdate} /></Section>
      </div>
    </div>
  );
}

function LinePreview({ content, onUpdate }: { content: Record<string, unknown>; onUpdate?: (key: string, value: string) => void }) {
  const steps = content.step_messages as { timing: string; content: string }[] | undefined;
  return (
    <div className="flex gap-8 items-start">
      <LineChatFrame>
        {/* Message bubble */}
        <div className="flex gap-2 items-end">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">F</div>
          <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 max-w-[220px] shadow-sm">
            <EditableText text={content.message_text} fieldKey="message_text" onUpdate={onUpdate} className="!text-xs text-slate-800 leading-relaxed" />
            {!!content.cta_label && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <div className="bg-green-500 text-white text-xs font-bold py-2 px-4 rounded-full text-center">
                  <EditableText text={content.cta_label} fieldKey="cta_label" onUpdate={onUpdate} className="!text-white !text-xs" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="text-[9px] text-white/50 ml-10">14:00</div>

        {/* Step messages */}
        {steps && steps.map((s, i) => (
          <div key={i}>
            <div className="text-center">
              <span className="bg-white/20 backdrop-blur text-white text-[9px] px-3 py-0.5 rounded-full">{s.timing}</span>
            </div>
            <div className="flex gap-2 items-end mt-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">F</div>
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 max-w-[220px] shadow-sm">
                <EditableText text={s.content} fieldKey={`step_messages.${i}.content`} onUpdate={onUpdate} className="!text-xs text-slate-800 leading-relaxed" />
              </div>
            </div>
          </div>
        ))}

        {/* Rich menu mock */}
        {!!content.rich_title && (
          <div className="mt-auto">
            <div className="bg-white rounded-xl overflow-hidden shadow-md">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-center">
                <EditableText text={content.rich_title} fieldKey="rich_title" onUpdate={onUpdate} className="!text-white !text-xs font-bold" />
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="py-3 text-center">
                  <EditableText text={content.rich_cta} fieldKey="rich_cta" onUpdate={onUpdate} className="!text-xs text-green-600 font-medium" />
                </div>
                <div className="py-3 text-center text-xs text-slate-400">メニュー</div>
              </div>
            </div>
          </div>
        )}
      </LineChatFrame>

      <div className="flex-1 min-w-0 space-y-3">
        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">LINE配信設定</h5>
        <Section title="配信タイプ"><EditableText text={content.delivery_type} fieldKey="delivery_type" onUpdate={onUpdate} /></Section>
        <Section title="セグメント"><EditableText text={content.segment} fieldKey="segment" onUpdate={onUpdate} /></Section>
        <Section title="メッセージ本文"><EditableText text={content.message_text} fieldKey="message_text" onUpdate={onUpdate} /></Section>
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
