"use client";

import { useEffect, useState, useCallback } from "react";
import type { Channel } from "@/types/content_package";
import {
  CHANNEL_LABELS,
  TASTE_OPTIONS,
  StepFiles,
  StepRequirements,
  StepPreview,
  StepSavePublish,
} from "@/components/content_wizard";
import type {
  FileEntry,
  DriveFolder,
  GenerationSettings,
  PreviewData,
} from "@/components/content_wizard";

// ---------------------------------------------------------------------------
// Wizard step definitions
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, label: "ファイル確認", icon: "1" },
  { id: 2, label: "要件設定", icon: "2" },
  { id: 3, label: "プレビュー", icon: "3" },
  { id: 4, label: "保存・配信", icon: "4" },
];

// ---------------------------------------------------------------------------
// Content list types
// ---------------------------------------------------------------------------

interface ContentItem {
  content_id: string;
  title: string;
  summary: string;
  version: number;
  objective: string;
  funnel_stage: string;
  target_channels: Channel[];
  key_messages: { claim: string; evidence: { source: string }[] }[];
}

interface VariantItem {
  id: string;
  content_id: string;
  channel: string;
  status: string;
  body?: Record<string, unknown>;
  scheduled_at?: string;
}

// ---------------------------------------------------------------------------
// Mock AI analysis generator
// ---------------------------------------------------------------------------

function generateMockAnalysis(files: FileEntry[]): string {
  const types = files.map((f) => f.type);
  const lines: string[] = [];
  lines.push(`【AI分析結果】${files.length}件のファイルを分析しました。\n`);
  if (types.includes("minutes")) lines.push("- MTG議事録を検出: スポーツ栄養に関する企画議論が含まれています。主要トピックは「試合前栄養戦略」「カーボローディング」です。");
  if (types.includes("photo")) lines.push("- 写真素材を検出: 食事/栄養関連の画像が含まれています。Instagram向けビジュアルに適しています。");
  if (types.includes("plan")) lines.push("- 企画書を検出: キャンペーン計画が含まれています。目的は「アカデミー受講獲得」、ターゲットは「アスリート・指導者」です。");
  if (types.includes("script")) lines.push("- 台本/原稿を検出: 動画または記事の原稿が含まれています。");
  lines.push("\n【推奨チャネル】");
  lines.push("Instagram Reels（動画訴求）、note（詳細解説）、LINE（告知配信）が効果的です。");
  lines.push("\n【キーメッセージ候補】");
  lines.push("「試合前72時間の栄養摂取がパフォーマンスに影響する可能性がある」（根拠: カーボローディング研究）");
  return lines.join("\n");
}

function generateMockContent(channel: string, settings: GenerationSettings, analysis: string): Record<string, unknown> {
  if (channel === "instagram_reels") {
    return {
      hook: "試合前の食事、なんとなくで決めてませんか？",
      problem: "多くの選手が試合直前の食事だけを意識しがち。しかし、パフォーマンスに影響するのは試合前72時間の栄養戦略だと言われています。",
      evidence: "Hawleyらの研究(1997)では、計画的な炭水化物ローディングにより筋グリコーゲンが最大2倍になる可能性が示されています。",
      evidence_source: "Hawley et al., Sports Med, 1997",
      practice: "試合3日前からごはんの量を1.5倍に。パスタやうどんもOK。脂質は控えめに。",
      cta: "もっと詳しく知りたい方はプロフィールのリンクから！",
      thumbnail_text: "試合前72時間で差がつく",
      caption: "試合前の食事、なんとなく決めてませんか？🍙\n\n実は、試合直前だけでなく72時間前からの栄養戦略がパフォーマンスに影響する可能性があります。\n\n今回は科学的な根拠に基づいた「カーボローディング」について解説します。\n\n詳しくはプロフィールのリンクから👆",
      hashtags: ["スポーツ栄養", "カーボローディング", "試合前食事", "アスリートフード", "パフォーマンスアップ", "管理栄養士監修"],
      bgm_note: settings.taste === "motivational" ? "アップテンポ、やる気が出る系" : "落ち着いたBGM、知的な雰囲気",
      disclaimer: "※個人差があります。具体的な食事計画は専門家にご相談ください。",
    };
  }
  if (channel === "instagram_stories") {
    return {
      story_type: "poll",
      poll_question: "試合前に炭水化物、意識してる？",
      poll_option1: "してる！💪",
      poll_option2: "してない…😅",
      slides: [
        { text: "試合前の食事で\nパフォーマンスが変わる？", image_note: "食事写真の背景" },
        { text: "実は72時間前からの\n栄養戦略がカギ🔑", image_note: "タイムライン図" },
        { text: "詳しくはReelsで解説中！\nプロフィールから見てね👆", image_note: "Reelsサムネ" },
      ],
    };
  }
  if (channel === "instagram_feed") {
    return {
      slide1_cover: "知らないと損する\n試合前食事の3つのNG",
      slide2_misconception: "「試合直前にがっつり食べればOK」\nと思っていませんか？\n\n実は逆効果になることも…",
      slide3_truth: "研究では、試合3日前からの\n段階的な炭水化物摂取が\n筋グリコーゲンを最大2倍にする\n可能性が示されています\n\n(Hawley et al., 1997)",
      slide3_evidence_source: "Hawley et al., Sports Med, 1997",
      slide4_practice: "✅ 3日前から白米を1.5倍に\n✅ パスタ・うどんもOK\n✅ 脂質は控えめに\n✅ 前日は消化の良いものを",
      slide5_cta: "無料体験はプロフィールのリンクから",
      slide5_supervisor: "監修: 管理栄養士 田中",
      caption: "試合前の食事戦略、正しく知っていますか？\n\nスワイプして学びましょう👉\n\n#スポーツ栄養 #アスリート食事 #カーボローディング",
      hashtags: ["スポーツ栄養", "アスリート", "試合前食事", "カーボローディング", "管理栄養士監修"],
      disclaimer: "※個人差があります。具体的な食事計画は専門家にご相談ください。",
    };
  }
  if (channel === "event_lp") {
    return {
      title: "スポーツ栄養アカデミー 無料体験セミナー",
      subtitle: "科学に基づく栄養戦略で、パフォーマンスを次のレベルへ",
      event_date: "2026-03-15T14:00",
      event_location: "オンライン（Zoom）",
      event_audience: "アスリート、指導者、栄養に興味のある方",
      event_price: "無料",
      cta_text: "今すぐ申し込む",
      benefits: ["最新のスポーツ栄養学を基礎から学べる", "現役管理栄養士に直接質問できる", "すぐ使える食事プランシートがもらえる"],
      agenda: "14:00 開会・ご挨拶\n14:10 講義「試合前の栄養戦略」\n14:40 ケーススタディ\n15:00 質疑応答\n15:20 アカデミー案内\n15:30 閉会",
      speaker_name: "田中 太郎",
      speaker_title: "管理栄養士 / FAMアカデミー講師",
      speaker_bio: "Jリーグ所属チームの栄養サポート10年。スポーツ栄養学の博士号を持ち、年間100件以上の個別カウンセリングを実施。",
      faqs: [
        { q: "栄養の知識がなくても参加できますか？", a: "はい、初心者の方にもわかりやすい内容になっています。" },
        { q: "アーカイブ配信はありますか？", a: "はい、参加者には1週間のアーカイブ視聴URLをお送りします。" },
        { q: "途中参加・退室は可能ですか？", a: "可能です。お気軽にご参加ください。" },
      ],
      meta_title: "スポーツ栄養アカデミー 無料体験セミナー | FAM",
      meta_description: "科学に基づくスポーツ栄養戦略を学べる無料オンラインセミナー。管理栄養士が直接解説。",
      og_text: "無料体験セミナー開催！科学に基づくスポーツ栄養戦略を学ぼう",
      disclaimer: "※内容は予告なく変更になる場合があります。",
    };
  }
  if (channel === "note") {
    return {
      title_option1: "試合前72時間で差がつく3つの栄養戦略",
      title_option2: "あなたの試合前の食事、本当に正しい？",
      title_option3: "カーボローディングの科学が教えるパフォーマンス最大化",
      lead: "試合前の食事が結果を左右する。科学的根拠に基づいた栄養戦略を、管理栄養士が解説します。",
      body_markdown: "## はじめに\n\nスポーツの世界では「試合前に何を食べるか」が長年議論されてきました。\n\n## カーボローディングとは\n\n試合前に計画的に炭水化物を摂取し、筋グリコーゲンを最大化する手法です。\n\n> Hawleyらの研究(1997)では、計画的な炭水化物ローディングにより筋グリコーゲンが最大2倍になる可能性が示されています。\n\n## 実践方法\n\n### 3日前から始める\n\nごはんの量を通常の1.5倍に増やしましょう。パスタやうどんも効果的です。\n\n### 前日の注意点\n\n消化の良い食事を心がけ、脂質は控えめにしましょう。\n\n## まとめ\n\n試合前の栄養戦略は、科学的根拠に基づいて計画的に行うことが重要です。",
      citations: [{ text: "計画的な炭水化物ローディングにより筋グリコーゲンが最大2倍になる可能性", source: "Hawley et al., Sports Med, 1997" }],
      tags: ["スポーツ栄養", "カーボローディング", "試合前食事", "アスリート", "管理栄養士", "エビデンス"],
      og_text: "試合前72時間の栄養戦略",
      cta_label: "無料体験に申し込む",
      cta_url: "https://fam.example.com/academy/trial",
      sns_summary: "試合前72時間の栄養戦略で、パフォーマンスが変わる可能性がある。科学的根拠に基づく「カーボローディング」の実践法を管理栄養士が解説。",
      disclaimer: "※本記事の内容は一般的な情報提供を目的としており、個別の医療的アドバイスではありません。",
    };
  }
  if (channel === "line") {
    return {
      delivery_type: "broadcast",
      segment: "academy_student",
      message_text: "【NEW】試合前の食事、なんとなくで決めてませんか？\n\n科学的な栄養戦略を学べる無料体験、受付中！",
      cta_label: "詳細・お申し込みはこちら",
      cta_url: "https://fam.example.com/academy/trial",
      step_messages: [
        { timing: "7日前", content: "🎓 スポーツ栄養アカデミー無料体験まであと1週間！早期申込で特典あり" },
        { timing: "3日前", content: "登壇者は管理栄養士の田中先生。Jリーグでの栄養サポート実績10年のベテランです💪" },
        { timing: "前日", content: "明日14:00からスタート！Zoomの接続テストをお忘れなく📱" },
        { timing: "当日", content: "本日14:00〜！参加URLはこちら👇" },
        { timing: "翌日", content: "ご参加ありがとうございました！アンケートにご協力ください📝 次回は4月開催予定です" },
      ],
    };
  }
  return { message: "生成コンテンツ", analysis };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ContentsPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [promptVersions, setPromptVersions] = useState<{ id: string; name: string; type: string; version: number }[]>([]);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [folder, setFolder] = useState<DriveFolder>({ name: "", url: "" });
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [settings, setSettings] = useState<GenerationSettings>({
    channel: "",
    customInstructions: "",
    taste: "scientific",
    wordCount: "",
    imageHandling: "none",
    promptVersionId: "",
  });
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetch("/api/contents").then((r) => r.json()),
      fetch("/api/variants").then((r) => r.json()),
      fetch("/api/prompt-versions").then((r) => r.json()),
    ]).then(([c, v, p]) => {
      setContents(c);
      setVariants(v);
      setPromptVersions(p);
    });
  }, []);

  // Wizard actions
  const handleAnalyze = useCallback(() => {
    setAnalyzing(true);
    setTimeout(() => {
      setAiAnalysis(generateMockAnalysis(files));
      setAnalyzing(false);
    }, 1500);
  }, [files]);

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    setTimeout(() => {
      const content = generateMockContent(settings.channel, settings, aiAnalysis);
      setPreview({
        channel: settings.channel,
        channelLabel: CHANNEL_LABELS[settings.channel] ?? settings.channel,
        generatedContent: content,
        files,
        settings,
        aiAnalysis,
      });
      setGenerating(false);
      setStep(3);
    }, 2000);
  }, [settings, files, aiAnalysis]);

  const handleSave = useCallback(async () => {
    if (!preview) return;
    setSaving(true);
    const res = await fetch("/api/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: preview.channel,
        content_id: "cnt_unlinked",
        ...preview.generatedContent,
        _meta: { files: preview.files, settings: preview.settings, ai_analysis: preview.aiAnalysis },
      }),
    });
    if (res.ok) {
      const newVariant = await res.json();
      setVariants((prev) => [...prev, newVariant]);
      setSaved(true);
    }
    setSaving(false);
  }, [preview]);

  const handlePublish = useCallback(async () => {
    // Move to review status
    setWizardOpen(false);
    resetWizard();
  }, []);

  function resetWizard() {
    setStep(1);
    setFolder({ name: "", url: "" });
    setFiles([]);
    setSettings({ channel: "", customInstructions: "", taste: "scientific", wordCount: "", imageHandling: "none", promptVersionId: "" });
    setAiAnalysis("");
    setPreview(null);
    setSaved(false);
  }

  // Step validation
  const canProceed = (s: number) => {
    if (s === 1) return files.length > 0;
    if (s === 2) return !!settings.channel && !!settings.taste;
    if (s === 3) return !!preview;
    return true;
  };

  const channelLabel: Record<string, string> = {
    instagram_reels: "IG Reels",
    instagram_stories: "IG Stories",
    instagram_feed: "IG Feed",
    event_lp: "イベントLP",
    note: "note",
    line: "LINE",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">コンテンツ一覧</h2>
        <button
          onClick={() => { setWizardOpen(!wizardOpen); if (!wizardOpen) resetWizard(); }}
          className={`px-4 py-2 rounded-md text-sm font-medium ${wizardOpen ? "bg-gray-200 text-gray-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}
        >
          {wizardOpen ? "閉じる" : "+ 新規コンテンツ作成"}
        </button>
      </div>

      {/* Wizard */}
      {wizardOpen && (
        <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
          {/* Stepper */}
          <div className="flex border-b border-gray-200">
            {STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => { if (s.id <= step || canProceed(s.id - 1)) setStep(s.id); }}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors ${
                  step === s.id
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : s.id < step
                    ? "border-green-500 text-green-600 bg-green-50"
                    : "border-transparent text-gray-400"
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s.id ? "bg-blue-600 text-white" : s.id < step ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {s.id < step ? "✓" : s.icon}
                </span>
                {s.label}
              </button>
            ))}
          </div>

          {/* Step content */}
          <div className="p-6">
            {step === 1 && <StepFiles folder={folder} setFolder={setFolder} files={files} setFiles={setFiles} />}
            {step === 2 && (
              <StepRequirements
                files={files}
                settings={settings}
                setSettings={setSettings}
                promptVersions={promptVersions}
                aiAnalysis={aiAnalysis}
                setAiAnalysis={setAiAnalysis}
                onAnalyze={handleAnalyze}
                analyzing={analyzing}
              />
            )}
            {step === 3 && <StepPreview preview={preview} onRegenerate={handleGenerate} generating={generating} />}
            {step === 4 && <StepSavePublish preview={preview} onSave={handleSave} onPublish={handlePublish} saving={saving} saved={saved} />}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className={`px-4 py-2 rounded-md text-sm ${step === 1 ? "text-gray-300" : "text-gray-700 hover:bg-gray-200"}`}
            >
              ← 戻る
            </button>
            <span className="text-xs text-gray-400">Step {step} / {STEPS.length}</span>
            {step < 3 && (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed(step)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${!canProceed(step) ? "bg-gray-200 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                次へ →
              </button>
            )}
            {step === 2 && (
              <button
                onClick={handleGenerate}
                disabled={generating || !canProceed(2)}
                className={`px-6 py-2 rounded-md text-sm font-medium ${generating || !canProceed(2) ? "bg-gray-200 text-gray-400" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
              >
                {generating ? "生成中..." : "生成してプレビュー →"}
              </button>
            )}
            {step === 3 && (
              <button
                onClick={() => setStep(4)}
                disabled={!preview}
                className={`px-4 py-2 rounded-md text-sm font-medium ${!preview ? "bg-gray-200 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                保存・配信へ →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content list */}
      {contents.map((c) => {
        const cvs = variants.filter((v) => v.content_id === c.content_id);
        return (
          <div key={c.content_id} className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{c.title}</h3>
              <span className="text-xs font-mono text-gray-400">{c.content_id} v{c.version}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{c.summary}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {c.target_channels.map((ch) => (
                <span key={ch} className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700">{channelLabel[ch] ?? ch}</span>
              ))}
              <span className="px-2 py-0.5 text-xs rounded bg-yellow-50 text-yellow-700">{c.objective}</span>
              <span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700">{c.funnel_stage}</span>
            </div>
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Key Messages</h4>
              {c.key_messages.map((km, i) => (
                <div key={i} className="text-sm mb-1">
                  <span>{km.claim}</span>
                  <span className="text-xs text-gray-400 ml-2">[{km.evidence.map((e) => e.source).join(", ")}]</span>
                </div>
              ))}
            </div>
            {cvs.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Channel Variants</h4>
                <div className="space-y-1">
                  {cvs.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-xs">{channelLabel[v.channel] ?? v.channel}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        v.status === "approved" ? "bg-green-100 text-green-700" :
                        v.status === "published" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{v.status}</span>
                      {v.scheduled_at && <span className="text-xs text-gray-400">予定: {v.scheduled_at}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
