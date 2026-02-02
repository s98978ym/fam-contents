"use client";

import { useState } from "react";
import type { Channel } from "@/types/content_package";

// ---------------------------------------------------------------------------
// Channel metadata
// ---------------------------------------------------------------------------

export type ChannelGroup =
  | "instagram_reels"
  | "instagram_stories"
  | "instagram_feed"
  | "event_lp"
  | "note"
  | "line";

export interface ChannelOption {
  value: ChannelGroup;
  label: string;
  description: string;
}

export const channelOptions: ChannelOption[] = [
  { value: "instagram_reels", label: "Instagram Reels", description: "30〜90秒の縦型動画。Hook→課題→エビデンス→実践→CTA構成" },
  { value: "instagram_stories", label: "Instagram Stories", description: "投票/質問/告知/誘導。3〜5枚のステップ構成" },
  { value: "instagram_feed", label: "Instagram Feed（カルーセル）", description: "5枚構成: 表紙→誤解→理解→実践→CTA" },
  { value: "event_lp", label: "イベントページ（LP）", description: "告知/申込/FAQ/SEO/OG。イベントの全情報を1ページに" },
  { value: "note", label: "note（長文記事）", description: "Markdown記事、タイトル3案、タグ、OG画像テキスト、CTA" },
  { value: "line", label: "LINE公式", description: "配信メッセージ、ステップ配信、リッチメニュー/リッチメッセージ案" },
];

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block mb-3">
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3 mt-5">{children}</h4>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-blue-500 bg-blue-50 rounded-md px-3 py-2 mb-4">{children}</p>;
}

// ---------------------------------------------------------------------------
// Instagram Reels Form
// ---------------------------------------------------------------------------

export function InstagramReelsForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({
    hook: "",
    problem: "",
    evidence: "",
    evidence_source: "",
    practice: "",
    cta: "",
    thumbnail_text: "",
    caption: "",
    hashtags: "",
    bgm_note: "",
    disclaimer: "※個人差があります。具体的な食事計画は専門家にご相談ください。",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ channel: "instagram_reels" as Channel, ...form, hashtags: form.hashtags.split(/[,\s]+/).filter(Boolean) }); }} className="space-y-1">
      <Hint>Reelsは「Hook(3秒)→課題(10秒)→エビデンス(20秒)→実践(15秒)→CTA(7秒)」の流れで構成します。各セクションを埋めてください。</Hint>

      <SectionHeading>1. Hook（冒頭3秒 - 視聴者の目を止める）</SectionHeading>
      <Label hint="例: 「試合前の食事、なんとなくで決めてませんか？」（疑問形や数字が効果的）">フック文</Label>
      <Input value={form.hook} onChange={set("hook")} placeholder="視聴者が思わず止まる一言" required />

      <SectionHeading>2. 課題提示（10秒 - 視聴者の悩みを言語化）</SectionHeading>
      <Label hint="視聴者が抱える課題・よくある誤解を簡潔に">課題・問題提起</Label>
      <Textarea value={form.problem} onChange={set("problem")} rows={2} placeholder="例: 多くの選手が試合前の栄養摂取を軽視しがちです..." required />

      <SectionHeading>3. エビデンス（20秒 - 科学的根拠）</SectionHeading>
      <Label hint="「〜の可能性がある」「〜が示唆されている」等の表現を使ってください。断定NG">エビデンス内容</Label>
      <Textarea value={form.evidence} onChange={set("evidence")} rows={3} placeholder="例: Hawleyらの研究(1997)では、炭水化物ローディングにより筋グリコーゲンが最大2倍になる可能性が示されています" required />
      <Label hint="論文名・著者・年 など">引用元</Label>
      <Input value={form.evidence_source} onChange={set("evidence_source")} placeholder="例: Hawley et al., Sports Med, 1997" required />

      <SectionHeading>4. 実践例（15秒 - 具体的なアクション）</SectionHeading>
      <Label hint="視聴者がすぐ試せる具体的な方法">実践方法</Label>
      <Textarea value={form.practice} onChange={set("practice")} rows={2} placeholder="例: 試合3日前からごはんの量を1.5倍に。パスタやうどんも◎" required />

      <SectionHeading>5. CTA（7秒 - 行動を促す）</SectionHeading>
      <Label hint="プロフィールリンクへの誘導、保存の促し等">CTA文言</Label>
      <Input value={form.cta} onChange={set("cta")} placeholder="例: 詳しくはプロフィールのリンクから！" required />

      <SectionHeading>動画の補足情報</SectionHeading>
      <Label hint="20文字以内。疑問形や数字訴求が効果的">サムネイルテキスト</Label>
      <Input value={form.thumbnail_text} onChange={set("thumbnail_text")} placeholder="例: 試合前72時間で差がつく" maxLength={20} required />

      <Label hint="300文字以内。改行を入れて読みやすく。免責は自動で末尾に追加されます">キャプション</Label>
      <Textarea value={form.caption} onChange={set("caption")} rows={4} placeholder="投稿のキャプション本文" maxLength={300} required />

      <Label hint="カンマ区切りで15個まで。大/中/小のボリューム混合がおすすめ">ハッシュタグ</Label>
      <Input value={form.hashtags} onChange={set("hashtags")} placeholder="#スポーツ栄養, #試合前食事, #カーボローディング" />

      <Label hint="BGMの雰囲気指定（著作権フリー前提）">BGMメモ</Label>
      <Input value={form.bgm_note} onChange={set("bgm_note")} placeholder="例: アップテンポ、やる気が出る系" />

      <SectionHeading>免責事項</SectionHeading>
      <Label hint="キャプション末尾に自動で付与されます">免責文</Label>
      <Textarea value={form.disclaimer} onChange={set("disclaimer")} rows={2} />

      <button type="submit" className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 w-full">Reelsコンテンツを登録</button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Instagram Stories Form
// ---------------------------------------------------------------------------

export function InstagramStoriesForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => void }) {
  const [storyType, setStoryType] = useState<"poll" | "announcement" | "link" | "step">("announcement");
  const [form, setForm] = useState({
    slides: [{ text: "", image_note: "" }, { text: "", image_note: "" }, { text: "", image_note: "" }],
    poll_question: "",
    poll_option1: "",
    poll_option2: "",
    link_url: "",
    link_cta: "",
    countdown_title: "",
    countdown_date: "",
  });

  const updateSlide = (i: number, k: string, v: string) => {
    const slides = [...form.slides];
    slides[i] = { ...slides[i], [k]: v };
    setForm({ ...form, slides });
  };
  const addSlide = () => setForm({ ...form, slides: [...form.slides, { text: "", image_note: "" }] });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ channel: "instagram_stories" as Channel, story_type: storyType, ...form }); }} className="space-y-1">
      <Hint>Storiesは24時間で消える短尺コンテンツ。投票/質問でエンゲージメント獲得、告知でイベント誘導、リンクで外部遷移を促せます。</Hint>

      <SectionHeading>Stories タイプ</SectionHeading>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {([["poll", "投票/質問"], ["announcement", "イベント告知"], ["link", "リンク誘導"], ["step", "ステップ学習"]] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setStoryType(v)} className={`px-3 py-2 rounded-md text-sm border ${storyType === v ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300 hover:bg-gray-50"}`}>{l}</button>
        ))}
      </div>

      {storyType === "poll" && (
        <>
          <Label hint="15文字程度。答えたくなる問いかけ">質問文</Label>
          <Input value={form.poll_question} onChange={(e) => setForm({ ...form, poll_question: e.target.value })} placeholder="例: 試合前に炭水化物、意識してる？" required />
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div><Label>選択肢1</Label><Input value={form.poll_option1} onChange={(e) => setForm({ ...form, poll_option1: e.target.value })} placeholder="してる！" required /></div>
            <div><Label>選択肢2</Label><Input value={form.poll_option2} onChange={(e) => setForm({ ...form, poll_option2: e.target.value })} placeholder="してない..." required /></div>
          </div>
        </>
      )}

      {storyType === "announcement" && (
        <>
          <Label hint="カウントダウンスタンプ用">イベント名</Label>
          <Input value={form.countdown_title} onChange={(e) => setForm({ ...form, countdown_title: e.target.value })} placeholder="例: スポーツ栄養アカデミー 無料体験" required />
          <Label>開催日時</Label>
          <Input type="datetime-local" value={form.countdown_date} onChange={(e) => setForm({ ...form, countdown_date: e.target.value })} required />
        </>
      )}

      {storyType === "link" && (
        <>
          <Label hint="遷移先URL（Reels/Feed/LP/note等）">リンクURL</Label>
          <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." required />
          <Label hint="リンクスタンプに表示する文言">CTA文言</Label>
          <Input value={form.link_cta} onChange={(e) => setForm({ ...form, link_cta: e.target.value })} placeholder="例: 詳しくはこちら" required />
        </>
      )}

      <SectionHeading>スライド構成（{form.slides.length}枚）</SectionHeading>
      <Hint>3〜5枚で1つの学びや告知を構成するのがおすすめです。</Hint>
      {form.slides.map((s, i) => (
        <div key={i} className="bg-gray-50 rounded-md p-3 mb-2">
          <span className="text-xs font-bold text-gray-500">スライド {i + 1}</span>
          <Label hint="スライドに表示するテキスト">テキスト</Label>
          <Textarea value={s.text} onChange={(e) => updateSlide(i, "text", e.target.value)} rows={2} placeholder={`スライド${i + 1}のテキスト`} required />
          <Label hint="使用する画像や背景のメモ">画像メモ</Label>
          <Input value={s.image_note} onChange={(e) => updateSlide(i, "image_note", e.target.value)} placeholder="例: 食事写真、グラフ画像" />
        </div>
      ))}
      {form.slides.length < 5 && (
        <button type="button" onClick={addSlide} className="text-sm text-blue-600 hover:underline">+ スライドを追加</button>
      )}

      <button type="submit" className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 w-full">Storiesコンテンツを登録</button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Instagram Feed (Carousel) Form
// ---------------------------------------------------------------------------

export function InstagramFeedForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({
    slide1_cover: "",
    slide2_misconception: "",
    slide3_truth: "",
    slide3_evidence_source: "",
    slide4_practice: "",
    slide5_cta: "",
    slide5_supervisor: "",
    caption: "",
    hashtags: "",
    disclaimer: "※個人差があります。具体的な食事計画は専門家にご相談ください。",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ channel: "instagram_feed" as Channel, ...form, hashtags: form.hashtags.split(/[,\s]+/).filter(Boolean) }); }} className="space-y-1">
      <Hint>Feedカルーセルは5枚構成: 「表紙(課題提起)→よくある誤解→正しい理解→実践方法→CTA」。保存されやすい「学び系」が効果的です。</Hint>

      <SectionHeading>スライド1: 表紙（課題提起 / 数字フック）</SectionHeading>
      <Label hint="思わずスワイプしたくなるタイトル。数字や疑問形が効果的">表紙テキスト</Label>
      <Input value={form.slide1_cover} onChange={set("slide1_cover")} placeholder="例: 知らないと損する試合前食事の3つのNG" required />

      <SectionHeading>スライド2: よくある誤解</SectionHeading>
      <Label hint="ターゲットが陥りがちな誤解や思い込み">誤解の内容</Label>
      <Textarea value={form.slide2_misconception} onChange={set("slide2_misconception")} rows={2} placeholder="例: 「試合直前にがっつり食べればOK」と思っていませんか？" required />

      <SectionHeading>スライド3: 正しい理解（エビデンス付き）</SectionHeading>
      <Label hint="科学的根拠に基づく正しい情報。「〜の可能性がある」等の表現で">正しい理解</Label>
      <Textarea value={form.slide3_truth} onChange={set("slide3_truth")} rows={3} placeholder="例: 研究では、試合3日前からの段階的な炭水化物摂取が..." required />
      <Label hint="論文名・著者・年">引用元</Label>
      <Input value={form.slide3_evidence_source} onChange={set("slide3_evidence_source")} placeholder="例: Hawley et al., Sports Med, 1997" required />

      <SectionHeading>スライド4: 実践方法</SectionHeading>
      <Label hint="読者がすぐ試せる具体的なアクション">実践ポイント</Label>
      <Textarea value={form.slide4_practice} onChange={set("slide4_practice")} rows={3} placeholder="例: ✅ 3日前から白米を1.5倍に&#10;✅ パスタ・うどんもOK&#10;✅ 脂質は控えめに" required />

      <SectionHeading>スライド5: CTA＋免責＋監修者</SectionHeading>
      <Label hint="行動を促す文言">CTA</Label>
      <Input value={form.slide5_cta} onChange={set("slide5_cta")} placeholder="例: 無料体験はプロフィールのリンクから" required />
      <Label hint="監修者名・肩書">監修者</Label>
      <Input value={form.slide5_supervisor} onChange={set("slide5_supervisor")} placeholder="例: 管理栄養士 田中" />

      <SectionHeading>キャプション・ハッシュタグ</SectionHeading>
      <Label hint="300文字以内">キャプション</Label>
      <Textarea value={form.caption} onChange={set("caption")} rows={4} maxLength={300} required />
      <Label hint="カンマ区切り、最大15個">ハッシュタグ</Label>
      <Input value={form.hashtags} onChange={set("hashtags")} placeholder="#スポーツ栄養, #カルーセル投稿" />

      <SectionHeading>免責事項</SectionHeading>
      <Textarea value={form.disclaimer} onChange={set("disclaimer")} rows={2} />

      <button type="submit" className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 w-full">Feedカルーセルを登録</button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Event LP Form
// ---------------------------------------------------------------------------

export function EventLPForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    event_date: "",
    event_location: "",
    event_audience: "",
    event_price: "",
    cta_text: "今すぐ申し込む",
    benefits: ["", "", ""],
    agenda: "",
    speaker_name: "",
    speaker_title: "",
    speaker_bio: "",
    faqs: [{ q: "", a: "" }, { q: "", a: "" }, { q: "", a: "" }],
    meta_title: "",
    meta_description: "",
    og_text: "",
    disclaimer: "※内容は予告なく変更になる場合があります。",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const setBenefit = (i: number, v: string) => { const b = [...form.benefits]; b[i] = v; setForm({ ...form, benefits: b }); };
  const setFaq = (i: number, k: "q" | "a", v: string) => { const f = [...form.faqs]; f[i] = { ...f[i], [k]: v }; setForm({ ...form, faqs: f }); };
  const addFaq = () => setForm({ ...form, faqs: [...form.faqs, { q: "", a: "" }] });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ channel: "event_lp" as Channel, ...form }); }} className="space-y-1">
      <Hint>イベントLPは「Hero → 価値提案 → アジェンダ → 登壇者 → FAQ → 免責」で構成。申込CVRを最大化する情報設計です。</Hint>

      <SectionHeading>Hero セクション</SectionHeading>
      <Label hint="イベントの魅力が一目で伝わるタイトル">タイトル</Label>
      <Input value={form.title} onChange={set("title")} placeholder="例: スポーツ栄養アカデミー 無料体験セミナー" required />
      <Label hint="タイトルを補足するサブコピー">サブコピー</Label>
      <Input value={form.subtitle} onChange={set("subtitle")} placeholder="例: 科学に基づく栄養戦略で、パフォーマンスを次のレベルへ" required />
      <div className="grid grid-cols-2 gap-3">
        <div><Label>開催日時</Label><Input type="datetime-local" value={form.event_date} onChange={set("event_date")} required /></div>
        <div><Label>開催場所</Label><Input value={form.event_location} onChange={set("event_location")} placeholder="例: オンライン / 東京都渋谷区..." required /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>対象者</Label><Input value={form.event_audience} onChange={set("event_audience")} placeholder="例: アスリート、指導者、栄養に興味のある方" required /></div>
        <div><Label>参加費</Label><Input value={form.event_price} onChange={set("event_price")} placeholder="例: 無料 / 3,000円" required /></div>
      </div>
      <Label>CTA文言（申込ボタン）</Label>
      <Input value={form.cta_text} onChange={set("cta_text")} required />

      <SectionHeading>価値提案（3つのベネフィット）</SectionHeading>
      <Hint>参加者が得られるメリットを3つ。具体的に書くと効果的です。</Hint>
      {form.benefits.map((b, i) => (
        <div key={i}>
          <Label>ベネフィット {i + 1}</Label>
          <Input value={b} onChange={(e) => setBenefit(i, e.target.value)} placeholder={`例: ${["最新のスポーツ栄養学を基礎から学べる", "現役管理栄養士に直接質問できる", "すぐ使える食事プランシートがもらえる"][i]}`} required />
        </div>
      ))}

      <SectionHeading>アジェンダ（タイムテーブル）</SectionHeading>
      <Label hint="時間と内容を記載。1行1項目で">タイムテーブル</Label>
      <Textarea value={form.agenda} onChange={set("agenda")} rows={5} placeholder={"14:00 開会・ご挨拶\n14:10 講義「試合前の栄養戦略」\n15:00 質疑応答\n15:30 閉会"} required />

      <SectionHeading>登壇者情報</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>氏名</Label><Input value={form.speaker_name} onChange={set("speaker_name")} placeholder="田中 太郎" required /></div>
        <div><Label>肩書</Label><Input value={form.speaker_title} onChange={set("speaker_title")} placeholder="管理栄養士 / FAMアカデミー講師" required /></div>
      </div>
      <Label hint="実績や経歴を簡潔に">プロフィール</Label>
      <Textarea value={form.speaker_bio} onChange={set("speaker_bio")} rows={3} placeholder="例: Jリーグ◯◯所属の栄養サポート経験10年..." required />

      <SectionHeading>FAQ（よくある質問）</SectionHeading>
      <Hint>参加検討者の不安を解消する質問を5〜8個。医療的アドバイスは含めないでください。</Hint>
      {form.faqs.map((f, i) => (
        <div key={i} className="bg-gray-50 rounded-md p-3 mb-2">
          <span className="text-xs font-bold text-gray-500">Q{i + 1}</span>
          <Input value={f.q} onChange={(e) => setFaq(i, "q", e.target.value)} placeholder="質問" required className="mb-2" />
          <Textarea value={f.a} onChange={(e) => setFaq(i, "a", e.target.value)} placeholder="回答" rows={2} required />
        </div>
      ))}
      {form.faqs.length < 8 && (
        <button type="button" onClick={addFaq} className="text-sm text-blue-600 hover:underline">+ 質問を追加</button>
      )}

      <SectionHeading>SEO / OG</SectionHeading>
      <Label hint="60文字以内">meta title</Label>
      <Input value={form.meta_title} onChange={set("meta_title")} maxLength={60} placeholder="検索結果に表示されるタイトル" required />
      <Label hint="120文字以内">meta description</Label>
      <Textarea value={form.meta_description} onChange={set("meta_description")} maxLength={120} rows={2} placeholder="検索結果に表示される説明文" required />
      <Label hint="SNSシェア時に表示されるテキスト">OGテキスト</Label>
      <Input value={form.og_text} onChange={set("og_text")} placeholder="SNSでシェアされた時の説明文" required />

      <SectionHeading>免責事項</SectionHeading>
      <Textarea value={form.disclaimer} onChange={set("disclaimer")} rows={2} />

      <button type="submit" className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 w-full">イベントLPを登録</button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// note Form
// ---------------------------------------------------------------------------

export function NoteForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({
    title_option1: "",
    title_option2: "",
    title_option3: "",
    lead: "",
    body_markdown: "",
    citations: [{ text: "", source: "" }],
    tags: "",
    og_text: "",
    cta_label: "",
    cta_url: "",
    sns_summary: "",
    disclaimer: "※本記事の内容は一般的な情報提供を目的としており、個別の医療的アドバイスではありません。",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const setCitation = (i: number, k: "text" | "source", v: string) => {
    const c = [...form.citations];
    c[i] = { ...c[i], [k]: v };
    setForm({ ...form, citations: c });
  };
  const addCitation = () => setForm({ ...form, citations: [...form.citations, { text: "", source: "" }] });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ channel: "note" as Channel, ...form, tags: form.tags.split(/[,\s]+/).filter(Boolean) }); }} className="space-y-1">
      <Hint>noteは長文記事プラットフォーム。見出し構造を明確にし、引用・根拠を丁寧に記載することで信頼性を高めます。</Hint>

      <SectionHeading>タイトル案（3案）</SectionHeading>
      <Hint>数字訴求 / 疑問形 / 宣言形の3パターンがおすすめです。</Hint>
      <Label hint="例: 「試合前72時間で差がつく3つの栄養戦略」">案1（数字訴求）</Label>
      <Input value={form.title_option1} onChange={set("title_option1")} required />
      <Label hint="例: 「あなたの試合前の食事、本当に正しい？」">案2（疑問形）</Label>
      <Input value={form.title_option2} onChange={set("title_option2")} required />
      <Label hint="例: 「カーボローディングの科学が教えるパフォーマンス最大化」">案3（宣言形）</Label>
      <Input value={form.title_option3} onChange={set("title_option3")} required />

      <SectionHeading>リード文</SectionHeading>
      <Label hint="100文字以内。記事の価値を端的に伝える">リード文</Label>
      <Textarea value={form.lead} onChange={set("lead")} rows={2} maxLength={100} placeholder="この記事で得られる価値を端的に" required />

      <SectionHeading>本文（Markdown）</SectionHeading>
      <Label hint="## で見出し（h2）、### で小見出し（h3）。h2は3〜5個程度">本文</Label>
      <Textarea value={form.body_markdown} onChange={set("body_markdown")} rows={12} placeholder={"## はじめに\n\n本文テキスト...\n\n## 見出し2\n\n本文テキスト...\n\n## まとめ\n\n..."} required className="font-mono" />

      <SectionHeading>引用・根拠</SectionHeading>
      <Hint>記事中で引用する研究やデータの出典を記載してください。</Hint>
      {form.citations.map((c, i) => (
        <div key={i} className="bg-gray-50 rounded-md p-3 mb-2">
          <span className="text-xs font-bold text-gray-500">引用 {i + 1}</span>
          <Label>引用テキスト</Label>
          <Textarea value={c.text} onChange={(e) => setCitation(i, "text", e.target.value)} rows={2} placeholder="引用する文章" required />
          <Label>出典</Label>
          <Input value={c.source} onChange={(e) => setCitation(i, "source", e.target.value)} placeholder="例: Hawley et al., Sports Med, 1997" required />
        </div>
      ))}
      <button type="button" onClick={addCitation} className="text-sm text-blue-600 hover:underline">+ 引用を追加</button>

      <SectionHeading>タグ・OG画像</SectionHeading>
      <Label hint="カンマ区切り、5〜10個">タグ</Label>
      <Input value={form.tags} onChange={set("tags")} placeholder="スポーツ栄養, カーボローディング, アスリート" required />
      <Label hint="25文字以内。OG画像に表示するテキスト">OG画像テキスト</Label>
      <Input value={form.og_text} onChange={set("og_text")} maxLength={25} placeholder="例: 試合前72時間の栄養戦略" required />

      <SectionHeading>CTA（記事末尾）</SectionHeading>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>CTA文言</Label><Input value={form.cta_label} onChange={set("cta_label")} placeholder="例: 無料体験に申し込む" required /></div>
        <div><Label>リンクURL</Label><Input value={form.cta_url} onChange={set("cta_url")} placeholder="https://..." required /></div>
      </div>

      <SectionHeading>SNS用要約</SectionHeading>
      <Label hint="140文字以内。Twitter/Xなどでのシェア用">要約文</Label>
      <Textarea value={form.sns_summary} onChange={set("sns_summary")} rows={2} maxLength={140} placeholder="SNSで記事をシェアする際の要約" required />

      <SectionHeading>免責事項</SectionHeading>
      <Textarea value={form.disclaimer} onChange={set("disclaimer")} rows={2} />

      <button type="submit" className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 w-full">note記事を登録</button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// LINE Form
// ---------------------------------------------------------------------------

export function LINEForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => void }) {
  const [deliveryType, setDeliveryType] = useState<"broadcast" | "step" | "richmessage">("broadcast");
  const [form, setForm] = useState({
    segment: "all" as "all" | "b2b_team" | "b2c_subscriber" | "academy_student",
    message_text: "",
    cta_label: "",
    cta_url: "",
    step_messages: [
      { timing: "7日前", content: "" },
      { timing: "3日前", content: "" },
      { timing: "前日", content: "" },
      { timing: "当日", content: "" },
      { timing: "翌日", content: "" },
    ],
    rich_title: "",
    rich_cta: "",
    rich_image_note: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const setStep = (i: number, v: string) => {
    const s = [...form.step_messages];
    s[i] = { ...s[i], content: v };
    setForm({ ...form, step_messages: s });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ channel: "line" as Channel, delivery_type: deliveryType, ...form }); }} className="space-y-1">
      <Hint>LINE公式は開封率が高いチャネル。ブロックされないよう、頻度と内容に注意。絵文字は最大2個まで。</Hint>

      <SectionHeading>配信タイプ</SectionHeading>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {([["broadcast", "一斉配信"], ["step", "ステップ配信"], ["richmessage", "リッチメッセージ"]] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setDeliveryType(v)} className={`px-3 py-2 rounded-md text-sm border ${deliveryType === v ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300 hover:bg-gray-50"}`}>{l}</button>
        ))}
      </div>

      <SectionHeading>ターゲットセグメント</SectionHeading>
      <select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value as typeof form.segment })} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full mb-4">
        <option value="all">全ユーザー</option>
        <option value="b2b_team">B2B（チーム・法人）</option>
        <option value="b2c_subscriber">B2C（サブスク会員）</option>
        <option value="academy_student">アカデミー受講生</option>
      </select>

      {deliveryType === "broadcast" && (
        <>
          <SectionHeading>配信メッセージ</SectionHeading>
          <Label hint="100文字以内。改行は2回まで。絵文字は最大2個">メッセージ本文</Label>
          <Textarea value={form.message_text} onChange={set("message_text")} rows={4} maxLength={100} placeholder={"【NEW】試合前の食事、なんとなくで決めてませんか？\n\n科学的な栄養戦略を学べる無料体験、受付中！"} required />
          <div className="grid grid-cols-2 gap-3">
            <div><Label>CTA文言</Label><Input value={form.cta_label} onChange={set("cta_label")} placeholder="詳細・お申し込みはこちら" required /></div>
            <div><Label>リンクURL（UTM自動付与）</Label><Input value={form.cta_url} onChange={set("cta_url")} placeholder="https://..." required /></div>
          </div>
        </>
      )}

      {deliveryType === "step" && (
        <>
          <SectionHeading>ステップ配信（イベント連動）</SectionHeading>
          <Hint>イベント前後のタイミングで段階的にメッセージを配信します。各ステップの内容を記入してください。</Hint>
          {form.step_messages.map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-md p-3 mb-2">
              <span className="text-xs font-bold text-gray-500">{s.timing}</span>
              <Textarea value={s.content} onChange={(e) => setStep(i, e.target.value)} rows={2} placeholder={[
                "イベント告知＋早期申込メリット",
                "登壇者紹介＋見どころ",
                "リマインダー＋準備事項",
                "会場案内 / 接続URL",
                "お礼＋アンケート＋次回案内",
              ][i]} required />
            </div>
          ))}
        </>
      )}

      {deliveryType === "richmessage" && (
        <>
          <SectionHeading>リッチメッセージ / リッチメニュー</SectionHeading>
          <Label hint="バナーに表示するタイトル">タイトル</Label>
          <Input value={form.rich_title} onChange={set("rich_title")} placeholder="例: スポーツ栄養アカデミー 無料体験" required />
          <Label hint="ボタンに表示する文言">CTA文言</Label>
          <Input value={form.rich_cta} onChange={set("rich_cta")} placeholder="例: 今すぐ申し込む" required />
          <Label hint="バナー画像の指示（1040x1040推奨）">画像メモ</Label>
          <Textarea value={form.rich_image_note} onChange={set("rich_image_note")} rows={3} placeholder="使用する背景画像や色のイメージ、掲載テキスト等" required />
        </>
      )}

      <button type="submit" className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 w-full">LINE配信を登録</button>
    </form>
  );
}
