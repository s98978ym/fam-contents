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
// Step 1: File Registration
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
  const [newFile, setNewFile] = useState<Omit<FileEntry, "id" | "addedAt">>({ name: "", type: "photo", driveUrl: "" });

  function addFile() {
    if (!newFile.name || !newFile.driveUrl) return;
    setFiles([...files, { ...newFile, id: `file_${Date.now()}`, addedAt: new Date().toISOString() }]);
    setNewFile({ name: "", type: "photo", driveUrl: "" });
  }

  function removeFile(id: string) {
    setFiles(files.filter((f) => f.id !== id));
  }

  const typeLabel: Record<string, string> = {
    photo: "写真",
    minutes: "議事録/スクリプト",
    script: "台本/原稿",
    plan: "企画書",
    other: "その他",
  };

  const typeColor: Record<string, string> = {
    photo: "bg-green-100 text-green-700",
    minutes: "bg-blue-100 text-blue-700",
    script: "bg-purple-100 text-purple-700",
    plan: "bg-yellow-100 text-yellow-700",
    other: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      {/* Drive Folder */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 border-b pb-1 mb-3">Google Drive フォルダ登録</h4>
        <p className="text-xs text-gray-500 mb-3">コンテンツ素材を管理するDriveフォルダを指定してください。</p>
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

      {/* File Registration */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 border-b pb-1 mb-3">ファイル登録</h4>
        <p className="text-xs text-gray-500 mb-3">写真、議事録/スクリプト、企画書などのファイルを登録してください。AI分析の入力ソースになります。</p>

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

        {/* File list */}
        {files.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
            ファイルが登録されていません。上のフォームからファイルを追加してください。
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${typeColor[f.type]}`}>{typeLabel[f.type]}</span>
                  <span className="text-sm font-medium">{f.name}</span>
                  <span className="text-xs text-gray-400 truncate max-w-xs">{f.driveUrl}</span>
                </div>
                <button type="button" onClick={() => removeFile(f.id)} className="text-xs text-red-500 hover:text-red-700">削除</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Requirements
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
}: {
  files: FileEntry[];
  settings: GenerationSettings;
  setSettings: (s: GenerationSettings) => void;
  promptVersions: { id: string; name: string; type: string; version: number }[];
  aiAnalysis: string;
  setAiAnalysis: (a: string) => void;
  onAnalyze: () => void;
  analyzing: boolean;
}) {
  const wordCountOpts = WORD_COUNT_OPTIONS[settings.channel] ?? WORD_COUNT_OPTIONS["note"];
  const relevantPrompts = promptVersions.filter(
    (p) => p.type === getPromptType(settings.channel) || p.type === "planner"
  );

  return (
    <div className="space-y-6">
      {/* AI Analysis */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 border-b pb-1 mb-3">AI分析結果</h4>
        <p className="text-xs text-gray-500 mb-3">登録したファイル（{files.length}件）をAIが分析し、コンテンツの方向性を提案します。</p>
        <div className="flex gap-3 mb-3">
          <button type="button" onClick={onAnalyze} disabled={analyzing || files.length === 0} className={`px-4 py-2 rounded-md text-sm font-medium ${analyzing ? "bg-gray-300 text-gray-500" : files.length === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
            {analyzing ? "分析中..." : "ファイルを分析する"}
          </button>
          {files.length === 0 && <span className="text-xs text-orange-500 self-center">先にStep 1でファイルを登録してください</span>}
        </div>
        <Textarea
          value={aiAnalysis}
          onChange={(e) => setAiAnalysis(e.target.value)}
          rows={4}
          placeholder="ファイルを分析すると、AI分析結果がここに表示されます。手動で編集も可能です。"
          className="bg-indigo-50 border-indigo-200"
        />
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
              カスタムプロンプトは「プロンプト管理」ページで追加・編集できます。
            </p>
          </div>

          {/* Taste */}
          <div>
            <Label>テイスト（トーン＆マナー）</Label>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {TASTE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSettings({ ...settings, taste: t.value })}
                  className={`px-3 py-2.5 rounded-md text-sm border transition-colors ${settings.taste === t.value ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300 hover:bg-gray-50"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Word count */}
          <div>
            <Label>文字数 / ボリューム</Label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {wordCountOpts.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setSettings({ ...settings, wordCount: w.value })}
                  className={`px-3 py-2.5 rounded-md text-sm border transition-colors ${settings.wordCount === w.value ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300 hover:bg-gray-50"}`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image */}
          <div>
            <Label>画像（解像度処理）/ 生成画像</Label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {IMAGE_OPTIONS.map((img) => (
                <button
                  key={img.value}
                  type="button"
                  onClick={() => setSettings({ ...settings, imageHandling: img.value })}
                  className={`px-3 py-2.5 rounded-md text-sm border transition-colors ${settings.imageHandling === img.value ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300 hover:bg-gray-50"}`}
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
// Step 3: Preview
// ---------------------------------------------------------------------------

export function StepPreview({
  preview,
  onRegenerate,
  generating,
}: {
  preview: PreviewData | null;
  onRegenerate: () => void;
  generating: boolean;
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
        <button
          type="button"
          onClick={onRegenerate}
          disabled={generating}
          className="px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50"
        >
          {generating ? "再生成中..." : "再生成する"}
        </button>
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

      {/* Settings summary */}
      <div className="bg-gray-50 rounded-md p-4">
        <span className="text-xs font-bold text-gray-500 uppercase">生成設定</span>
        <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
          <div><span className="text-xs text-gray-400">テイスト</span><br />{TASTE_OPTIONS.find((t) => t.value === preview.settings.taste)?.label ?? "-"}</div>
          <div><span className="text-xs text-gray-400">ボリューム</span><br />{preview.settings.wordCount || "-"}</div>
          <div><span className="text-xs text-gray-400">画像</span><br />{IMAGE_OPTIONS.find((i) => i.value === preview.settings.imageHandling)?.label ?? "-"}</div>
          <div><span className="text-xs text-gray-400">プロンプト</span><br />{preview.settings.promptVersionId || "デフォルト"}</div>
        </div>
      </div>

      {/* Generated content - channel-specific rendering */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <span className="text-xs font-bold text-gray-500 uppercase mb-3 block">生成コンテンツ</span>
        <ChannelPreviewRenderer channel={preview.channel} content={preview.generatedContent} />
      </div>
    </div>
  );
}

function ChannelPreviewRenderer({ channel, content }: { channel: string; content: Record<string, unknown> }) {
  if (channel.startsWith("instagram_reels")) {
    return <ReelsPreview content={content} />;
  }
  if (channel.startsWith("instagram_stories")) {
    return <StoriesPreview content={content} />;
  }
  if (channel.startsWith("instagram_feed")) {
    return <FeedPreview content={content} />;
  }
  if (channel === "event_lp") {
    return <LPPreview content={content} />;
  }
  if (channel === "note") {
    return <NotePreview content={content} />;
  }
  if (channel === "line") {
    return <LinePreview content={content} />;
  }
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

function PreviewText({ text }: { text: unknown }) {
  if (!text) return <span className="text-gray-300 text-sm">-</span>;
  return <p className="text-sm whitespace-pre-wrap">{String(text)}</p>;
}

function ReelsPreview({ content }: { content: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4">
        <div className="grid grid-cols-5 gap-2 text-center">
          {["Hook (3秒)", "課題 (10秒)", "エビデンス (20秒)", "実践 (15秒)", "CTA (7秒)"].map((s, i) => (
            <div key={i} className={`p-2 rounded text-xs ${i === 0 ? "bg-pink-200" : "bg-white"}`}>{s}</div>
          ))}
        </div>
      </div>
      <Section title="Hook"><PreviewText text={content.hook} /></Section>
      <Section title="課題"><PreviewText text={content.problem} /></Section>
      <Section title="エビデンス"><PreviewText text={content.evidence} /></Section>
      <Section title="引用元"><PreviewText text={content.evidence_source} /></Section>
      <Section title="実践"><PreviewText text={content.practice} /></Section>
      <Section title="CTA"><PreviewText text={content.cta} /></Section>
      <div className="border-t pt-3">
        <Section title="サムネイル"><PreviewText text={content.thumbnail_text} /></Section>
        <Section title="キャプション"><PreviewText text={content.caption} /></Section>
        {Array.isArray(content.hashtags) && <Section title="ハッシュタグ"><div className="flex flex-wrap gap-1">{(content.hashtags as string[]).map((h, i) => <span key={i} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">#{h}</span>)}</div></Section>}
      </div>
      <div className="bg-yellow-50 rounded p-3 text-xs text-yellow-700"><PreviewText text={content.disclaimer} /></div>
    </div>
  );
}

function StoriesPreview({ content }: { content: Record<string, unknown> }) {
  const slides = content.slides as { text: string; image_note: string }[] | undefined;
  return (
    <div>
      <Section title="タイプ"><span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">{String(content.story_type ?? "-")}</span></Section>
      {!!content.poll_question && <Section title="投票/質問"><PreviewText text={content.poll_question} /></Section>}
      {!!content.countdown_title && <Section title="カウントダウン"><PreviewText text={`${content.countdown_title} / ${content.countdown_date}`} /></Section>}
      {slides && (
        <div className="grid grid-cols-5 gap-2 mt-3">
          {slides.map((s, i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-3 text-center">
              <span className="text-xs font-bold text-gray-500">#{i + 1}</span>
              <p className="text-xs mt-1">{s.text || "-"}</p>
              {s.image_note && <p className="text-xs text-gray-400 mt-1">{s.image_note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedPreview({ content }: { content: Record<string, unknown> }) {
  const slides = [
    { label: "表紙", text: content.slide1_cover },
    { label: "誤解", text: content.slide2_misconception },
    { label: "正しい理解", text: content.slide3_truth },
    { label: "実践", text: content.slide4_practice },
    { label: "CTA", text: content.slide5_cta },
  ];
  return (
    <div>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {slides.map((s, i) => (
          <div key={i} className="bg-gray-50 border rounded-lg p-3">
            <span className="text-xs font-bold text-gray-500">{i + 1}. {s.label}</span>
            <p className="text-xs mt-2">{String(s.text ?? "-")}</p>
          </div>
        ))}
      </div>
      <Section title="キャプション"><PreviewText text={content.caption} /></Section>
      <div className="bg-yellow-50 rounded p-3 text-xs text-yellow-700"><PreviewText text={content.disclaimer} /></div>
    </div>
  );
}

function LPPreview({ content }: { content: Record<string, unknown> }) {
  const faqs = content.faqs as { q: string; a: string }[] | undefined;
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-5 text-center">
        <h3 className="text-lg font-bold">{String(content.title ?? "")}</h3>
        <p className="text-sm text-gray-600 mt-1">{String(content.subtitle ?? "")}</p>
        <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
          {!!content.event_date && <span>{String(content.event_date)}</span>}
          {!!content.event_location && <span>{String(content.event_location)}</span>}
          {!!content.event_price && <span>{String(content.event_price)}</span>}
        </div>
        {!!content.cta_text &&<button className="mt-3 bg-green-600 text-white px-6 py-2 rounded-md text-sm">{String(content.cta_text)}</button>}
      </div>
      {!!content.benefits &&<Section title="ベネフィット">{(content.benefits as string[]).map((b, i) => <p key={i} className="text-sm">✅ {b}</p>)}</Section>}
      {!!content.agenda &&<Section title="アジェンダ"><PreviewText text={content.agenda} /></Section>}
      {!!content.speaker_name &&<Section title="登壇者"><PreviewText text={`${content.speaker_name} / ${content.speaker_title}`} /></Section>}
      {faqs && <Section title="FAQ">{faqs.map((f, i) => <div key={i} className="mb-2"><p className="text-sm font-medium">Q: {f.q}</p><p className="text-sm text-gray-600">A: {f.a}</p></div>)}</Section>}
      <Section title="SEO">
        <p className="text-xs text-gray-400">title: {String(content.meta_title ?? "")}</p>
        <p className="text-xs text-gray-400">description: {String(content.meta_description ?? "")}</p>
      </Section>
    </div>
  );
}

function NotePreview({ content }: { content: Record<string, unknown> }) {
  const titles = [content.title_option1, content.title_option2, content.title_option3].filter(Boolean);
  return (
    <div className="space-y-3">
      {titles.length > 0 && (
        <Section title="タイトル案">
          {titles.map((t, i) => <p key={i} className="text-sm font-medium">{i + 1}. {String(t)}</p>)}
        </Section>
      )}
      <Section title="リード"><PreviewText text={content.lead} /></Section>
      <Section title="本文">
        <div className="bg-gray-50 rounded p-4 font-mono text-xs whitespace-pre-wrap max-h-80 overflow-auto">{String(content.body_markdown ?? "")}</div>
      </Section>
      <Section title="タグ">
        <div className="flex flex-wrap gap-1">
          {((content.tags as string[]) ?? []).map((t, i) => <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 rounded">{t}</span>)}
        </div>
      </Section>
      <Section title="OGテキスト"><PreviewText text={content.og_text} /></Section>
      <Section title="CTA"><PreviewText text={`${content.cta_label} → ${content.cta_url}`} /></Section>
      <div className="bg-yellow-50 rounded p-3 text-xs text-yellow-700"><PreviewText text={content.disclaimer} /></div>
    </div>
  );
}

function LinePreview({ content }: { content: Record<string, unknown> }) {
  const steps = content.step_messages as { timing: string; content: string }[] | undefined;
  return (
    <div className="space-y-3">
      <Section title="配信タイプ"><span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">{String(content.delivery_type ?? "-")}</span></Section>
      <Section title="セグメント"><span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">{String(content.segment ?? "all")}</span></Section>
      {!!content.message_text && (
        <div className="bg-green-50 rounded-lg p-4 max-w-sm">
          <p className="text-sm whitespace-pre-wrap">{String(content.message_text)}</p>
          {!!content.cta_label &&<p className="text-xs text-green-700 mt-2 font-medium">{String(content.cta_label)}</p>}
        </div>
      )}
      {steps && (
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="px-2 py-1 text-xs bg-gray-100 rounded font-medium shrink-0">{s.timing}</span>
              <p className="text-sm">{s.content || "-"}</p>
            </div>
          ))}
        </div>
      )}
      {!!content.rich_title && (
        <div className="bg-green-50 rounded-lg p-4 text-center max-w-sm">
          <p className="font-bold text-sm">{String(content.rich_title)}</p>
          <p className="text-xs text-green-700 mt-2">{String(content.rich_cta ?? "")}</p>
        </div>
      )}
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
          className={`px-6 py-3 rounded-md text-sm font-medium ${saved ? "bg-green-100 text-green-700" : "bg-gray-800 text-white hover:bg-gray-900"}`}
        >
          {saved ? "保存済み" : saving ? "保存中..." : "下書き保存"}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={saving || !saved}
          className={`px-6 py-3 rounded-md text-sm font-medium ${!saved ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPromptType(channel: string): string {
  if (channel.startsWith("instagram")) return "instagram";
  if (channel === "event_lp") return "lp";
  return channel;
}
