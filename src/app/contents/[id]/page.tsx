"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGoogleAuth } from "@/lib/use_google_auth";
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

interface AnalysisStep {
  label: string;
  icon: string;
  status: "done" | "skipped";
  detail: string;
}

interface AnalysisResult {
  steps: AnalysisStep[];
  direction: string;
  source?: "gemini" | "simulation";
  fallback_reason?: string;
}

function generateMockAnalysis(files: DriveFile[]): AnalysisResult {
  const cats = categorize(files);
  const steps: AnalysisStep[] = [];

  // Step 1: 議事録で全体把握
  if (cats.minutes.length > 0) {
    steps.push({
      label: "議事録で全体把握",
      icon: "📄",
      status: "done",
      detail: `議事録 ${cats.minutes.length}件（${cats.minutes.map(f => f.name).join("、")}）を分析。スポーツ栄養に関する企画会議の内容を把握しました。主なテーマ: 試合前の栄養戦略、ターゲット層は学生アスリート・保護者、信頼性のある情報発信を重視。`,
    });
  } else {
    steps.push({
      label: "議事録で全体把握",
      icon: "📄",
      status: "skipped",
      detail: "議事録が見つかりませんでした。他の素材から方向性を推定します。",
    });
  }

  // Step 2: トランスクリプトで詳細把握
  if (cats.transcripts.length > 0) {
    steps.push({
      label: "トランスクリプトで詳細把握",
      icon: "🎤",
      status: "done",
      detail: `トランスクリプト ${cats.transcripts.length}件を精読。具体的な発言内容から、「カーボローディング」「試合72時間前」などのキーフレーズを抽出。専門家の口調やニュアンスを把握し、コンテンツのトーンに反映します。`,
    });
  } else {
    steps.push({
      label: "トランスクリプトで詳細把握",
      icon: "🎤",
      status: "skipped",
      detail: "トランスクリプトなし。議事録の情報をベースに進めます。",
    });
  }

  // Step 3: 写真の活用判断
  if (cats.photos.length > 0) {
    const photoNames = cats.photos.map(f => f.name).join("、");
    steps.push({
      label: "写真の素材・文脈強化判断",
      icon: "🖼",
      status: "done",
      detail: `写真 ${cats.photos.length}件（${photoNames}）を確認。素材としてサムネイル・カルーセルに使用可能。また、現場の雰囲気を伝える文脈強化素材としてIG Stories・Reelsの背景にも活用できます。`,
    });
  } else {
    steps.push({
      label: "写真の素材・文脈強化判断",
      icon: "🖼",
      status: "skipped",
      detail: "写真素材なし。AIが生成するテキストベースのビジュアル指示で代替します。",
    });
  }

  // Direction
  const hasMinutes = cats.minutes.length > 0;
  const hasTranscripts = cats.transcripts.length > 0;
  const hasPhotos = cats.photos.length > 0;
  let direction: string;
  if (hasMinutes && hasTranscripts && hasPhotos) {
    direction = "議事録の企画意図 × トランスクリプトの専門的知見 × 写真素材を組み合わせ、信頼性と視覚的訴求力の高いコンテンツを生成します。おすすめ: Instagram Reels、note記事、LINE配信の組み合わせが効果的です。";
  } else if (hasMinutes && hasTranscripts) {
    direction = "議事録とトランスクリプトから得た深い知見をベースに、テキスト重視のコンテンツを生成します。おすすめ: note記事、LINE配信が特に効果的です。";
  } else if (hasMinutes && hasPhotos) {
    direction = "議事録の企画方針に写真素材を組み合わせ、ビジュアル訴求力のあるコンテンツを生成します。おすすめ: Instagram Reels・Feed、イベントLPが効果的です。";
  } else if (hasMinutes) {
    direction = "議事録の企画内容をベースにコンテンツの方向性を決定します。おすすめ: 全チャネルでの展開が可能です。";
  } else {
    direction = "利用可能な素材からコンテンツの方向性を推定します。より精度の高い生成のために議事録の追加をおすすめします。";
  }

  return { steps, direction };
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
  const router = useRouter();
  const folderId = params.id as string;
  const googleAuth = useGoogleAuth();

  const [folder, setFolder] = useState<DriveFolder | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
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
  const [aiAnalysis, setAiAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [generateSource, setGenerateSource] = useState<{ source: "gemini" | "simulation"; fallback_reason?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [promptVersions, setPromptVersions] = useState<{ id: string; name: string; type: string; version: number }[]>([]);

  useEffect(() => {
    // First, try to load from sessionStorage (set by contents page after folder selection)
    const storedFolder = sessionStorage.getItem("contentFolder");
    if (storedFolder) {
      try {
        const parsed = JSON.parse(storedFolder);
        if (parsed.id === folderId) {
          // Found matching folder data in sessionStorage
          setFolder({
            id: parsed.id,
            name: parsed.name,
            url: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          const files = parsed.files || [];
          setDriveFiles(files);
          setWizardFiles(driveToWizardFiles(files));
          // Fetch prompt versions
          fetch("/api/prompt-versions").then((r) => r.json()).then(setPromptVersions);
          setLoading(false);
          return;
        }
      } catch {
        // Invalid stored data, continue with other methods
      }
    }

    // If no sessionStorage data, check if we have Google Auth
    if (googleAuth.isLoading) {
      // Wait for auth to load
      return;
    }

    if (googleAuth.isAuthenticated && googleAuth.accessToken) {
      // Fetch files using OAuth
      Promise.all([
        fetch(`/api/drive/oauth/files?folderId=${folderId}`, {
          headers: { Authorization: `Bearer ${googleAuth.accessToken}` },
        }).then((r) => r.json()),
        fetch("/api/prompt-versions").then((r) => r.json()),
      ]).then(([filesData, prompts]) => {
        const files = filesData.files || [];
        setFolder({
          id: folderId,
          name: filesData.folderName || "Google Drive フォルダ",
          url: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setDriveFiles(files);
        setWizardFiles(driveToWizardFiles(files));
        setPromptVersions(prompts);
        setLoading(false);
      }).catch(() => {
        setNeedsAuth(true);
        setLoading(false);
      });
    } else {
      // No stored data and not authenticated - need to go back to folder selection
      setNeedsAuth(true);
      setLoading(false);
    }
  }, [folderId, googleAuth.isLoading, googleAuth.isAuthenticated, googleAuth.accessToken]);

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/contents/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: driveFiles.map((f) => ({ name: f.name, category: f.category })),
          folderName: folder?.name || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis({ steps: data.steps, direction: data.direction, source: data.source, fallback_reason: data.fallback_reason });
      } else {
        setAiAnalysis({ ...generateMockAnalysis(driveFiles), source: "simulation", fallback_reason: "API呼び出し失敗" });
      }
    } catch {
      setAiAnalysis({ ...generateMockAnalysis(driveFiles), source: "simulation", fallback_reason: "ネットワークエラー" });
    } finally {
      setAnalyzing(false);
    }
  }, [driveFiles, folder]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setStep(3);
    try {
      const res = await fetch("/api/contents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: settings.channel,
          title: folder?.name || "コンテンツ",
          summary: aiAnalysis?.direction || folder?.name || "",
          files: driveFiles.map((f) => ({ name: f.name, category: f.category })),
          analysisDirection: aiAnalysis?.direction,
          taste: settings.taste,
          customInstructions: settings.customInstructions,
        }),
      });
      let generatedContent: Record<string, unknown>;
      if (res.ok) {
        const data = await res.json();
        generatedContent = data.content;
        setGenerateSource({ source: data.source, fallback_reason: data.fallback_reason });
      } else {
        generatedContent = generateMockContent(settings.channel);
        setGenerateSource({ source: "simulation", fallback_reason: "API呼び出し失敗" });
      }
      setPreview({
        channel: settings.channel,
        channelLabel: CHANNEL_LABELS[settings.channel] ?? settings.channel,
        generatedContent,
        files: wizardFiles,
        settings,
        aiAnalysis,
      });
    } catch {
      setGenerateSource({ source: "simulation", fallback_reason: "ネットワークエラー" });
      setPreview({
        channel: settings.channel,
        channelLabel: CHANNEL_LABELS[settings.channel] ?? settings.channel,
        generatedContent: generateMockContent(settings.channel),
        files: wizardFiles,
        settings,
        aiAnalysis,
      });
    } finally {
      setGenerating(false);
    }
  }, [settings, wizardFiles, aiAnalysis, driveFiles, folder]);

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

  if (needsAuth) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">認証が必要です</h3>
        <p className="text-sm text-gray-600 mb-6">
          このフォルダにアクセスするには、<br />
          Googleアカウントでログインしてください。
        </p>
        <button
          onClick={() => router.push("/contents")}
          className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          フォルダ選択に戻る
        </button>
      </div>
    );
  }

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
                    <div className="mt-4 space-y-3">
                      {aiAnalysis.source === "simulation" && (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-700">シミュレーションモードで動作しています。Gemini APIが有効な場合、素材に基づいたAI分析を行います。</p>
                          {aiAnalysis.fallback_reason && <p className="text-[10px] text-amber-600 mt-1">詳細: {aiAnalysis.fallback_reason}</p>}
                        </div>
                      )}
                      {aiAnalysis.source === "gemini" && (
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Gemini</span>
                          <span className="text-[10px] text-gray-400">素材を分析しました</span>
                        </div>
                      )}
                      {aiAnalysis.steps.map((s, i) => (
                        <div key={i} className={`rounded-lg border p-3 ${s.status === "done" ? "border-green-200 bg-green-50/50" : "border-gray-200 bg-gray-50"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{s.icon}</span>
                            <span className="text-sm font-semibold text-gray-800">Step {i + 1}: {s.label}</span>
                            {s.status === "done" ? (
                              <span className="ml-auto text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">完了</span>
                            ) : (
                              <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">スキップ</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{s.detail}</p>
                        </div>
                      ))}
                      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                        <p className="text-xs font-semibold text-amber-800 mb-1">📌 コンテンツ方向性</p>
                        <p className="text-xs text-amber-900 leading-relaxed">{aiAnalysis.direction}</p>
                      </div>
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
                <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1">📌 コンテンツ方向性</p>
                  <p className="text-xs text-amber-900 leading-relaxed">{aiAnalysis.direction}</p>
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
          {step === 3 && !generating && (
            <div>
              {generateSource?.source === "simulation" && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <p className="text-xs text-amber-700">シミュレーションモードで生成されました。Gemini APIが有効な場合、素材に基づいたAI生成を行います。</p>
                  {generateSource.fallback_reason && <p className="text-[10px] text-amber-600 mt-1">詳細: {generateSource.fallback_reason}</p>}
                </div>
              )}
              {generateSource?.source === "gemini" && (
                <div className="flex items-center gap-1 mb-3">
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Gemini</span>
                  <span className="text-[10px] text-gray-400">AIがコンテンツを生成しました</span>
                </div>
              )}
              <StepPreview preview={preview} onRegenerate={handleGenerate} generating={generating} onUpdateContent={handleUpdateContent} />
            </div>
          )}

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
