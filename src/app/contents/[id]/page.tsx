"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  CHANNEL_LABELS,
  CHANNEL_OPTIONS,
  TASTE_OPTIONS,
  VOLUME_SLIDER_CONFIG,
  PROMPT_DESCRIPTIONS,
  StepGenerating,
  StepPreview,
  StepSavePublish,
} from "@/components/content_wizard";
import type {
  FileEntry,
  GenerationSettings,
  PreviewData,
} from "@/components/content_wizard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DriveFolder {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

interface DriveFile {
  id: string;
  folderId: string;
  name: string;
  mimeType: string;
  category: "minutes" | "transcript" | "photo" | "other";
  url: string;
  createdAt: string;
}

interface CategorizedFiles {
  minutes: DriveFile[];
  transcripts: DriveFile[];
  photos: DriveFile[];
  others: DriveFile[];
}

// ---------------------------------------------------------------------------
// Steps - simplified labels
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, label: "ファイル確認" },
  { id: 2, label: "要件設定" },
  { id: 3, label: "生成中" },
  { id: 4, label: "プレビュー" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categorize(files: DriveFile[]): CategorizedFiles {
  return {
    minutes: files.filter((f) => f.category === "minutes"),
    transcripts: files.filter((f) => f.category === "transcript"),
    photos: files.filter((f) => f.category === "photo"),
    others: files.filter((f) => f.category === "other"),
  };
}

function driveToWizardFiles(files: DriveFile[]): FileEntry[] {
  return files.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.category === "transcript" ? "minutes" as const : f.category === "minutes" ? "minutes" as const : f.category === "photo" ? "photo" as const : "other" as const,
    driveUrl: f.url,
    addedAt: f.createdAt,
    selected: true,
    isEyecatch: false,
  }));
}

function generateMockAnalysis(files: DriveFile[]): string {
  const cats = categorize(files);
  const lines: string[] = [];
  lines.push(`${files.length}件のファイルを分析しました。\n`);
  if (cats.minutes.length > 0) lines.push(`議事録 ${cats.minutes.length}件から、スポーツ栄養に関する企画内容を検出しました。`);
  if (cats.transcripts.length > 0) lines.push(`トランスクリプト ${cats.transcripts.length}件の文字起こしデータを確認しました。`);
  if (cats.photos.length > 0) lines.push(`写真 ${cats.photos.length}件をビジュアル素材として使用できます。`);
  if (cats.others.length > 0) lines.push(`その他 ${cats.others.length}件を参考資料として使用します。`);
  lines.push("\nおすすめ: Instagram Reels、note記事、LINE配信の組み合わせが効果的です。");
  return lines.join("\n");
}

function generateMockContent(channel: string): Record<string, unknown> {
  if (channel === "instagram_reels") {
    return {
      hook: "試合前の食事、なんとなくで決めてませんか？",
      problem: "多くの選手が試合直前の食事だけを意識しがち。しかし、パフォーマンスに影響するのは試合前72時間の栄養戦略だと言われています。",
      evidence: "Hawleyらの研究(1997)では、計画的な炭水化物ローディングにより筋グリコーゲンが最大2倍になる可能性が示されています。",
      evidence_source: "Hawley et al., Sports Med, 1997",
      practice: "試合3日前からごはんの量を1.5倍に。パスタやうどんもOK。脂質は控えめに。",
      cta: "もっと詳しく知りたい方はプロフィールのリンクから！",
      thumbnail_text: "試合前72時間で差がつく",
      caption: "試合前の食事、なんとなく決めてませんか？\n\n実は72時間前からの栄養戦略がパフォーマンスに影響する可能性があります。",
      hashtags: ["スポーツ栄養", "カーボローディング", "試合前食事", "アスリートフード", "管理栄養士監修"],
      disclaimer: "※個人差があります。具体的な食事計画は専門家にご相談ください。",
    };
  }
  if (channel === "instagram_feed") {
    return { slide1_cover: "知らないと損する\n試合前食事の3つのNG", slide2_misconception: "「試合直前にがっつり食べればOK」と思っていませんか？", slide3_truth: "研究では、試合3日前からの段階的な炭水化物摂取が効果的とされています", slide4_practice: "3日前から白米を1.5倍に\nパスタ・うどんもOK", slide5_cta: "無料体験はプロフィールのリンクから", caption: "試合前の食事戦略、正しく知っていますか？", disclaimer: "※個人差があります。" };
  }
  if (channel === "note") {
    return { title_option1: "試合前72時間で差がつく3つの栄養戦略", title_option2: "あなたの試合前の食事、本当に正しい？", lead: "科学的根拠に基づいた栄養戦略を解説します。", body_markdown: "## はじめに\n\nスポーツの世界では「試合前に何を食べるか」が議論されてきました。\n\n## カーボローディングとは\n\n試合前に計画的に炭水化物を摂取し、筋グリコーゲンを最大化する手法です。\n\n## まとめ\n\n科学的根拠に基づいて計画的に行うことが重要です。", tags: ["スポーツ栄養", "カーボローディング"], og_text: "試合前72時間の栄養戦略", cta_label: "無料体験に申し込む", cta_url: "https://fam.example.com/academy/trial", disclaimer: "※一般的な情報提供です。" };
  }
  if (channel === "event_lp") {
    return { title: "スポーツ栄養アカデミー 無料体験セミナー", subtitle: "科学に基づく栄養戦略で、パフォーマンスを次のレベルへ", event_date: "2026-03-15T14:00", event_location: "オンライン（Zoom）", event_price: "無料", cta_text: "今すぐ申し込む", benefits: ["最新のスポーツ栄養学を基礎から学べる", "現役管理栄養士に直接質問できる"], faqs: [{ q: "知識がなくても参加できますか？", a: "はい、初心者向けです。" }], meta_title: "スポーツ栄養アカデミー 無料体験 | FAM", meta_description: "科学に基づくスポーツ栄養戦略を学べる無料セミナー。", disclaimer: "※内容は予告なく変更になる場合があります。" };
  }
  if (channel === "line") {
    return { delivery_type: "broadcast", segment: "academy_student", message_text: "【NEW】試合前の食事、なんとなくで決めてませんか？\n\n科学的な栄養戦略を学べる無料体験、受付中！", cta_label: "詳細はこちら", step_messages: [{ timing: "7日前", content: "無料体験まであと1週間！" }, { timing: "前日", content: "明日14:00からスタート！" }, { timing: "翌日", content: "ご参加ありがとうございました！" }] };
  }
  if (channel === "instagram_stories") {
    return { story_type: "poll", poll_question: "試合前に炭水化物、意識してる？", slides: [{ text: "試合前の食事で\nパフォーマンスが変わる？", image_note: "食事写真" }, { text: "72時間前からの\n栄養戦略がカギ", image_note: "タイムライン" }, { text: "詳しくはReelsで！", image_note: "Reelsサムネ" }] };
  }
  return { message: "生成コンテンツ" };
}

// ---------------------------------------------------------------------------
// Category card config
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG = [
  { key: "minutes" as const, label: "議事録", icon: "\u{1F4C4}" },
  { key: "transcripts" as const, label: "トランスクリプト", icon: "\u{1F3A4}" },
  { key: "photos" as const, label: "写真", icon: "\u{1F5BC}" },
  { key: "others" as const, label: "その他", icon: "\u{1F4C1}" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FolderDetailPage() {
  const params = useParams();
  const folderId = params.id as string;

  const [folder, setFolder] = useState<DriveFolder | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  // File add
  const [showAddFile, setShowAddFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileCategory, setNewFileCategory] = useState<DriveFile["category"]>("other");

  // Wizard
  const [wizardFiles, setWizardFiles] = useState<FileEntry[]>([]);
  const [settings, setSettings] = useState<GenerationSettings>({
    channel: "", customInstructions: "", taste: "scientific", wordCount: "", volume: 0, imageHandling: "none", promptVersionId: "",
  });
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [promptVersions, setPromptVersions] = useState<{ id: string; name: string; type: string; version: number }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/drive/folders").then((r) => r.json()),
      fetch(`/api/drive/files?folderId=${folderId}`).then((r) => r.json()),
      fetch("/api/prompt-versions").then((r) => r.json()),
    ]).then(([folders, files, prompts]) => {
      setFolder((folders as DriveFolder[]).find((fd) => fd.id === folderId) ?? null);
      setDriveFiles(files);
      setPromptVersions(prompts);
      setWizardFiles(driveToWizardFiles(files));
      setLoading(false);
    });
  }, [folderId]);

  const handleAnalyze = useCallback(() => {
    setAnalyzing(true);
    setTimeout(() => { setAiAnalysis(generateMockAnalysis(driveFiles)); setAnalyzing(false); }, 1500);
  }, [driveFiles]);

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    setStep(3);
    setTimeout(() => {
      setPreview({
        channel: settings.channel,
        channelLabel: CHANNEL_LABELS[settings.channel] ?? settings.channel,
        generatedContent: generateMockContent(settings.channel),
        files: wizardFiles,
        settings,
        aiAnalysis,
      });
      setGenerating(false);
    }, 2500);
  }, [settings, wizardFiles, aiAnalysis]);

  const handleUpdateContent = useCallback((key: string, value: string) => {
    setPreview((prev) => {
      if (!prev) return prev;
      const content = { ...prev.generatedContent };
      // Support nested keys like "slides.0.text" or "faqs.1.q"
      const parts = key.split(".");
      if (parts.length === 3) {
        const [arrKey, idxStr, field] = parts;
        const arr = Array.isArray(content[arrKey]) ? [...(content[arrKey] as Record<string, unknown>[])] : [];
        const idx = parseInt(idxStr);
        if (arr[idx]) {
          arr[idx] = { ...arr[idx], [field]: value };
          content[arrKey] = arr;
        }
      } else {
        content[key] = value;
      }
      return { ...prev, generatedContent: content };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!preview) return;
    setSaving(true);
    const res = await fetch("/api/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: preview.channel, content_id: `folder_${folderId}`, ...preview.generatedContent }),
    });
    if (res.ok) setSaved(true);
    setSaving(false);
  }, [preview, folderId]);

  const handlePublish = useCallback(() => { window.location.href = "/contents/list"; }, []);

  async function handleAddFile() {
    if (!newFileName.trim()) return;
    const res = await fetch("/api/drive/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId, name: newFileName.trim(), category: newFileCategory }),
    });
    if (res.ok) {
      const file: DriveFile = await res.json();
      setDriveFiles((prev) => [...prev, file]);
      setWizardFiles((prev) => [...prev, ...driveToWizardFiles([file])]);
      setNewFileName("");
      setShowAddFile(false);
    }
  }

  const canProceed = (s: number) => {
    if (s === 1) return driveFiles.length > 0;
    if (s === 2) return !!settings.channel;
    if (s === 3) return !!preview;
    return true;
  };

  if (loading) return <div className="text-center py-16 text-gray-400">読み込み中...</div>;
  if (!folder) return <div className="text-center py-16 text-gray-400">フォルダが見つかりません</div>;

  const categorized = categorize(driveFiles);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <a href="/contents" className="text-sm text-blue-600 hover:underline mb-2 inline-block">&larr; フォルダ一覧</a>
        <h2 className="text-2xl font-bold">{folder.name}</h2>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => { if (!generating && (s.id <= step || canProceed(s.id - 1))) setStep(s.id); }}
              disabled={generating}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                step === s.id ? "border-blue-600 text-blue-600 bg-blue-50"
                  : s.id < step ? "border-green-500 text-green-600 bg-green-50"
                  : "border-transparent text-gray-400"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s.id ? "bg-blue-600 text-white" : s.id < step ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>{s.id < step ? "\u2713" : s.id}</span>
              {s.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ----------------------------------------------------------- */}
          {/* Step 1: Files                                                */}
          {/* ----------------------------------------------------------- */}
          {step === 1 && (
            <div>
              <h3 className="font-bold text-lg text-gray-800">フォルダ内のファイル</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">Google Driveから読み込まれたファイルです。内容を確認して「AIで分析する」を押してください。</p>

              {driveFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  ファイルがありません。
                  <button onClick={() => setShowAddFile(true)} className="text-blue-600 hover:underline ml-1">ファイルを追加</button>
                </div>
              ) : (
                <>
                  {/* Compact horizontal category columns */}
                  <div className="grid grid-cols-4 gap-6 mb-6">
                    {CATEGORY_CONFIG.map((cat) => {
                      const items = categorized[cat.key];
                      if (items.length === 0) return <div key={cat.key} />;
                      return (
                        <div key={cat.key}>
                          <div className="flex items-center gap-1.5 mb-2 text-gray-500">
                            <span className="text-sm">{cat.icon}</span>
                            <span className="text-sm font-medium">{cat.label}</span>
                            <span className="text-sm text-gray-400">（{items.length}件）</span>
                          </div>
                          <div className="space-y-0.5">
                            {items.map((f) => (
                              <p key={f.id} className="text-sm text-gray-800 truncate" title={f.name}>{f.name}</p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI analyze button */}
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className={`w-full py-3 rounded-lg text-sm font-medium transition-colors ${
                      analyzing
                        ? "bg-gray-200 text-gray-500"
                        : "bg-amber-200/70 text-amber-900 hover:bg-amber-200"
                    }`}
                  >
                    {analyzing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                        分析中...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span>✧</span> AIで分析する
                      </span>
                    )}
                  </button>

                  {aiAnalysis && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 text-sm text-gray-700 whitespace-pre-wrap">
                      {aiAnalysis}
                    </div>
                  )}
                </>
              )}

              {/* Add file inline */}
              {showAddFile && (
                <div className="border border-gray-200 rounded-lg p-4 mt-4">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">ファイル名</label>
                      <input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="例: meeting_notes.docx" className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full" onKeyDown={(e) => { if (e.key === "Enter") handleAddFile(); }} autoFocus />
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-medium text-gray-600 mb-1">種類</label>
                      <select value={newFileCategory} onChange={(e) => setNewFileCategory(e.target.value as DriveFile["category"])} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
                        <option value="minutes">議事録</option>
                        <option value="transcript">トランスクリプト</option>
                        <option value="photo">写真</option>
                        <option value="other">その他</option>
                      </select>
                    </div>
                    <button onClick={handleAddFile} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 shrink-0">追加</button>
                    <button onClick={() => setShowAddFile(false)} className="text-gray-400 hover:text-gray-600 text-sm shrink-0">キャンセル</button>
                  </div>
                </div>
              )}

              {!showAddFile && driveFiles.length > 0 && (
                <button onClick={() => setShowAddFile(true)} className="text-xs text-blue-600 hover:underline mt-3">
                  + ファイルを追加
                </button>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* Step 2: Simplified settings                                  */}
          {/* ----------------------------------------------------------- */}
          {step === 2 && (
            <div className="space-y-6">
              {/* AI analysis summary (read-only, from step 1) */}
              {aiAnalysis && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-wrap">
                  {aiAnalysis}
                </div>
              )}

              {/* Channel - large visual buttons */}
              <div>
                <h3 className="font-bold text-gray-800 mb-1">どのチャネルで配信しますか？</h3>
                <p className="text-sm text-gray-500 mb-3">配信先を1つ選んでください。</p>
                <div className="grid grid-cols-3 gap-3">
                  {CHANNEL_OPTIONS.filter((g) => g.group !== "将来拡張").flatMap((g) =>
                    g.items.filter((item) => !("disabled" in item && item.disabled)).map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setSettings({ ...settings, channel: item.value, wordCount: "" })}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          settings.channel === item.value
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className="text-sm font-medium block">{item.label.split("（")[0]}</span>
                        {item.label.includes("（") && (
                          <span className="text-xs text-gray-400 block mt-0.5">
                            {item.label.match(/（(.+)）/)?.[1]}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {settings.channel && (
                <>
                  {/* Taste - simple pills */}
                  <div>
                    <h3 className="font-bold text-gray-800 mb-1">トーン（雰囲気）</h3>
                    <div className="flex flex-wrap gap-2">
                      {TASTE_OPTIONS.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setSettings({ ...settings, taste: t.value })}
                          className={`px-4 py-2 rounded-full text-sm border transition-all ${
                            settings.taste === t.value ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Volume slider */}
                  {(() => {
                    const sliderCfg = VOLUME_SLIDER_CONFIG[settings.channel];
                    if (!sliderCfg) return null;
                    const currentVolume = settings.volume || sliderCfg.default;
                    const pct = ((currentVolume - sliderCfg.min) / (sliderCfg.max - sliderCfg.min)) * 100;
                    return (
                      <div>
                        <h3 className="font-bold text-gray-800 mb-1">ボリューム</h3>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">{sliderCfg.min}{sliderCfg.unit}</span>
                          <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            {sliderCfg.format(currentVolume)}
                          </span>
                          <span className="text-xs text-gray-400">{sliderCfg.max.toLocaleString()}{sliderCfg.unit}</span>
                        </div>
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
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-gray-400">コンパクト</span>
                          <span className="text-[10px] text-gray-400">標準</span>
                          <span className="text-[10px] text-gray-400">詳細</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Advanced settings - collapsible */}
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      詳細設定（任意）
                    </summary>
                    <div className="mt-3 bg-gray-50 rounded-lg p-4 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">カスタム指示</label>
                        <textarea
                          value={settings.customInstructions}
                          onChange={(e) => setSettings({ ...settings, customInstructions: e.target.value })}
                          rows={2}
                          placeholder="AIへの追加指示があれば入力（例: 初心者向けに、免責文を入れて）"
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">プロンプトバージョン</label>
                        <select
                          value={settings.promptVersionId}
                          onChange={(e) => setSettings({ ...settings, promptVersionId: e.target.value })}
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full mb-2"
                        >
                          <option value="">デフォルト（推奨）</option>
                          {promptVersions.filter((p) => p.type === (settings.channel.startsWith("instagram") ? "instagram" : settings.channel === "event_lp" ? "lp" : settings.channel) || p.type === "planner").map((p) => (
                            <option key={p.id} value={p.id}>{p.name} v{p.version}</option>
                          ))}
                        </select>
                        {(() => {
                          const pType = settings.channel.startsWith("instagram") ? "instagram" : settings.channel === "event_lp" ? "lp" : settings.channel;
                          const desc = PROMPT_DESCRIPTIONS[pType];
                          if (!desc) return null;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <span className="text-xl shrink-0">{desc.icon}</span>
                                <div>
                                  <p className="text-xs text-gray-500 leading-relaxed">{desc.description}</p>
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {desc.tags.map((tag) => (
                                      <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{tag}</span>
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
          )}

          {/* Step 3: Preview */}
          {step === 3 && generating && <StepGenerating channel={settings.channel} />}
          {step === 3 && !generating && <StepPreview preview={preview} onRegenerate={handleGenerate} generating={generating} onUpdateContent={handleUpdateContent} />}

          {/* Step 4: Save */}
          {step === 4 && <StepSavePublish preview={preview} onSave={handleSave} onPublish={handlePublish} saving={saving} saved={saved} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || generating}
            className={`px-4 py-2 rounded-md text-sm ${step === 1 || generating ? "text-gray-300" : "text-gray-700 hover:bg-gray-200"}`}
          >
            &larr; 戻る
          </button>
          <span className="text-xs text-gray-400">ステップ {step} / {STEPS.length}</span>
          {step === 1 && (
            <button onClick={() => setStep(2)} disabled={!canProceed(1)} className={`px-5 py-2 rounded-md text-sm font-medium ${!canProceed(1) ? "bg-gray-200 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
              次へ &rarr;
            </button>
          )}
          {step === 2 && (
            <button onClick={handleGenerate} disabled={generating || !canProceed(2)} className={`px-6 py-2 rounded-md text-sm font-medium ${generating || !canProceed(2) ? "bg-gray-200 text-gray-400" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
              AIで生成する &rarr;
            </button>
          )}
          {step === 3 && !generating && (
            <button onClick={() => setStep(4)} disabled={!preview} className={`px-5 py-2 rounded-md text-sm font-medium ${!preview ? "bg-gray-200 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
              保存へ &rarr;
            </button>
          )}
          {(step === 3 && generating) && <div />}
          {step === 4 && <div />}
        </div>
      </div>
    </div>
  );
}
