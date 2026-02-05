# CLAUDE.md

## プロジェクト概要

**FAM Content Ops** — マルチチャネル向けコンテンツ生成・管理システム。
素材（議事録・台本・写真など）をアップロードし、AIで各チャネル向けコンテンツを生成・プレビュー・編集・公開する。ナレッジ共有・チーム管理機能も備える。

### 技術スタック

- **フレームワーク:** Next.js 16.1.6 (App Router) + React 19.2
- **言語:** TypeScript 5.9 (strict mode)
- **スタイリング:** Tailwind CSS 4.1 + PostCSS
- **データストア:** インメモリストア (`src/lib/store.ts`)。DB移行を前提とした設計
- **状態管理:** React Context API (`UserProvider`, `TeamProvider`) + `useState`。外部ライブラリ不使用
- **AI API:** Gemini API (REST直接呼び出し, `gemini-2.0-flash`)。`src/lib/gemini.ts` で共通クライアント提供
- **パッケージマネージャ:** npm

### ディレクトリ構成

```
src/
├── app/                     # Next.js App Router (ページ + APIルート)
│   ├── api/                 # RESTful APIルート
│   │   ├── contents/        #   コンテンツ CRUD + AI分析 + AI生成
│   │   │   ├── analyze/     #     素材ファイルAI分析 (Gemini)
│   │   │   ├── generate/    #     スタンドアロンAI生成 (Gemini)
│   │   │   └── [id]/generate/ #   コンテンツID指定AI生成 (Gemini)
│   │   ├── campaigns/       #   キャンペーン CRUD
│   │   ├── variants/        #   チャネルバリアント一覧
│   │   ├── reviews/         #   レビュー CRUD
│   │   ├── publish-jobs/    #   公開ジョブ CRUD
│   │   ├── metrics/         #   メトリクス取得
│   │   ├── knowledge/       #   ナレッジ共有 CRUD + AIナレッジ発展 + カテゴリ分類
│   │   ├── drive/           #   Google Drive連携 (フォルダ・ファイル)
│   │   ├── health/          #   Gemini接続診断
│   │   ├── audit-logs/      #   監査ログ取得
│   │   └── prompt-versions/ #   プロンプトバージョン管理
│   ├── campaigns/           # キャンペーン管理ページ
│   ├── contents/            # コンテンツ一覧・詳細・生成ページ
│   ├── knowledge/           # ナレッジ共有ページ (QuickPostBox, NewPostForm, AIナレッジ発展)
│   ├── reviews/             # レビュー管理ページ
│   ├── publish-jobs/        # 公開ジョブ管理ページ
│   ├── prompt-versions/     # プロンプトバージョン管理ページ
│   ├── teams/               # チーム管理 + チーム利用状況分析ページ
│   ├── layout.tsx           # ルートレイアウト (TeamProvider, UserProvider, Sidebar)
│   └── page.tsx             # ダッシュボード
├── components/
│   ├── content_wizard.tsx   # メインウィザード (ファイル登録→設定→生成→プレビュー→保存)
│   ├── channel_forms.tsx    # チャネル別フォーム
│   └── sidebar.tsx          # ナビゲーションサイドバー + チーム切替 + ユーザーバッジ
├── contexts/
│   └── team-context.tsx     # チーム管理 Context (CRUD, メンバー, アーカイブ, ゴミ箱)
├── lib/
│   ├── store.ts             # インメモリCRUDストア + 監査ログ
│   ├── gemini.ts            # Gemini API クライアント (REST + プロキシ対応)
│   ├── drive_store.ts       # Google Drive連携モック
│   ├── sample_data.ts       # サンプルデータ
│   └── user_context.tsx     # ユーザー選択 Context (localStorage永続化)
└── types/
    └── content_package.ts   # ドメイン型定義
```

### デプロイ環境

- **ホスティング:** Vercel
- **環境変数:** Vercelダッシュボード（Settings → Environment Variables）で設定
  - `GEMINI_API_KEY` — Gemini API キー（必須: AI機能を有効にするため）
- **注意:** 環境変数を追加・変更した後は**再デプロイが必要**（Vercelは自動反映しない）

### 開発環境のセットアップ

```bash
npm install
npm run dev     # 開発サーバー起動
npm run build   # 本番ビルド
npm run lint    # Next.js組み込みESLint
```

ローカル開発時は `.env.local` で環境変数を設定する。

---

## コーディングルール

### 命名規則

| 対象 | 規則 | 例 |
|------|------|----|
| コンポーネント | PascalCase | `StepFiles`, `ReelsPreview`, `PhoneFrame`, `QuickPostBox` |
| 関数 | camelCase | `categorizeFiles`, `getPromptType`, `handleProofread` |
| 定数 | UPPER_SNAKE_CASE | `CHANNEL_OPTIONS`, `CATEGORY_CONFIG`, `AVATAR_COLORS` |
| 型・インターフェース | PascalCase | `FileEntry`, `KnowledgePost`, `ContentPackage` |
| ファイル (コンポーネント) | snake_case.tsx | `content_wizard.tsx`, `channel_forms.tsx` |
| ファイル (コンテキスト) | snake_case.tsx | `team-context.tsx`, `user_context.tsx` |
| ページ | Next.js規約 (`page.tsx`) | `contents/[id]/page.tsx` |
| APIルート | Next.js規約 (`route.ts`) | `api/knowledge/proofread/route.ts` |

### import文の順序・パスエイリアス

パスエイリアス `@/*` → `./src/*` を使用する。

```typescript
// 1. React/Next.js
import { useState, useEffect, useRef, useCallback } from "react";
import { NextResponse } from "next/server";
import Link from "next/link";

// 2. 内部モジュール (@/ エイリアス)
import { contentStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/user_context";
import { useTeam } from "@/contexts/team-context";
import type { Channel, KnowledgeCategory } from "@/types/content_package";
```

### コンポーネント設計パターン

- クライアントコンポーネントには `"use client"` ディレクティブを先頭に記述
- セクション区切りにコメントブロックを使用:
  ```typescript
  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------
  ```
- ローカルUIヘルパー (`Label`, `Input`, `Textarea`) はファイル内で定義し、再利用
- 状態管理は `useState` フック。グローバル状態ライブラリは不使用
- Context API: `UserProvider` (ユーザー選択), `TeamProvider` (チーム管理)
- localStorage永続化: ユーザー選択 (`fam_current_user`), チームデータ (`fam_teams`)
- フォームの更新パターン:
  ```typescript
  const [form, setForm] = useState({ field1: "", field2: "" });
  const set = (k: string) => (e: ...) => setForm({ ...form, [k]: e.target.value });
  ```

### APIルートのパターン

```typescript
export async function GET() {
  return NextResponse.json(store.list());
}

export async function POST(request: Request) {
  const body = await request.json();
  // バリデーション → 作成 → レスポンス
  return NextResponse.json(result, { status: 201 });
}
```

### スタイリング

Tailwind CSSユーティリティクラスを直接JSXに記述。グローバルCSSは最小限（`globals.css`はTailwind importのみ）。

```jsx
// ボタン
className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
// カード
className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
// グラデーション装飾
className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50"
```

**アニメーション手法:**
- 高さアニメーション: CSS Grid `grid-template-rows: 0fr → 1fr` を使用（`height: auto` はCSS transitionで不可）
- テキストエリア展開: 明示ピクセル高さ（state管理）+ `transition-all duration-300`
- 要素の出現: `transition-opacity` + `opacity-0/100`

### UI言語

UIラベル・プレースホルダー・ヒントテキストはすべて**日本語**でハードコード（i18nライブラリ不使用）。

---

## 主要コンポーネントの設計方針

### `content_wizard.tsx` (~77KB)

マルチステップウィザード。コンテンツ生成の全フローを管理する中核コンポーネント。

| ステップ | コンポーネント | 役割 |
|----------|---------------|------|
| 1. ファイル登録 | `StepFiles` | Google Driveフォルダ入力、ファイルアップロード、カテゴリ分類 |
| 2. 生成設定 | `StepRequirements` | チャネル選択、AI分析、テイスト・文字数・画像設定 |
| 2.5 生成中 | `StepGenerating` | ローディングアニメーション |
| 3. プレビュー | `StepPreview` | チャネル別プレビュー、インライン編集 (contentEditable) |
| 4. 保存・公開 | `StepSavePublish` | 下書き保存、スケジュール公開 |

**チャネル別プレビュー:**
- `ReelsPreview` — iPhoneモックアップ内でReels表示
- `StoriesPreview` — 3〜5枚のスライドカルーセル
- `FeedPreview` — 5枚スライドカルーセル (ナビゲーション付き)
- `LPPreview` — ブラウザフレーム内でLP表示
- `NotePreview` — note.com記事レイアウト
- `LinePreview` — LINEチャットインターフェース

**デバイスフレーム:** `PhoneFrame`, `BrowserFrame`, `LineChatFrame`

### `knowledge/page.tsx` (~71KB)

ナレッジ共有ページ。チーム内の知見を投稿・閲覧・検索する。

| コンポーネント | 役割 |
|---------------|------|
| `QuickPostBox` | フィード上部のカジュアル投稿エリア。CSS Gridアニメーションで展開、AIナレッジ発展対応 |
| `NewPostForm` | 詳細投稿モーダル。タイトル・本文・カテゴリ・タグ・画像、AIナレッジ発展対応 |
| `KnowledgePage` | メインページ。カテゴリフィルタ、検索、スコープ切替（全体/チーム/個人）|

**AIナレッジ発展フロー:**
1. 本文入力 → 「AIで発展」ボタン
2. `/api/knowledge/proofread` でGemini APIを呼び出し、ナレッジ発展 + タグ提案 + カテゴリ自動分類
3. Gemini プロンプトの4ステップ思考プロセス:
   - Step 1: 趣旨の把握（筆者の核心的な主張・気づきを特定）
   - Step 2: 必要な観点の特定（ナレッジとして不足している観点を洗い出す）
   - Step 3: 補強コンテンツの検討（数値・事例・実践ステップ・注意点を追加）
   - Step 4: 発展テキストの生成（元の趣旨を核に補強を組み込む）
4. 縦積み比較表示（元の文章 vs AIが発展）＋タグ・カテゴリ提案パネル
5. 「すべて適用」で本文・タグ・カテゴリを一括適用

**重要: 「校正」ではなく「発展」**
- 目的は文法修正ではなく、短いメモ・気づきをチーム全体で活用できるナレッジに発展させること
- 元の趣旨・主張は絶対に変えない。あくまで「補強・発展」であり「書き換え」ではない
- 元テキストの2〜3倍程度の分量を目安にする

### `channel_forms.tsx` (~34KB)

チャネルごとの入力フォーム。`InstagramReelsForm`, `InstagramStoriesForm`, `InstagramFeedForm`, `EventLPForm`, `NoteForm`, `LINEForm` をエクスポート。

### `sidebar.tsx` (~12KB)

ナビゲーションサイドバー。`TeamSwitcher`（チーム切替UI）、`CurrentUserBadge`（ユーザーバッジ）、各ページへのナビリンクを含む。

### `types/content_package.ts`

ドメインモデルの型定義。主要な型:
- `Channel` — 6チャネル: `instagram_reels`, `instagram_stories`, `instagram_feed`, `event_lp`, `note`, `line`
- `ContentStatus` — `draft`, `review`, `approved`, `published`, `archived`
- `KnowledgeCategory` — `tips`, `howto`, `tool`, `process`, `insight`, `resource`, `announcement`, `other`
- `ContentPackage` — コンテンツ本体（メッセージング、CTA、アセット計画、配信設定）
- `ChannelVariant` — チャネル別出力データ
- `KnowledgePost` / `KnowledgeComment` — ナレッジ投稿・コメント

### `lib/store.ts`

インメモリCRUDストア。全変更操作で監査ログを自動記録。

提供ストア: `contentStore`, `campaignStore`, `variantStore`, `reviewStore`, `publishJobStore`, `metricStore`, `promptVersionStore`, `auditStore`, `knowledgePostStore`, `knowledgeCommentStore`

### `lib/gemini.ts`

Gemini API クライアント。ネイティブ `fetch()` でREST呼び出し（Vercel / Node.js 18+ 対応）。

- `isGeminiAvailable` — APIキー設定有無のフラグ
- `generateText(prompt, options)` — テキスト生成
- `generateJSON<T>(prompt, options)` — JSON モード生成（`responseMimeType: "application/json"`）
- フォールバック設計: API未設定・エラー時はシミュレーションにフォールバック（各APIルートで実装）

### `contexts/team-context.tsx`

チーム管理Context。チーム CRUD、メンバー管理、キャンペーン/コンテンツ割当、アーカイブ、ゴミ箱（保持期間付き）、表示フィルタリング。localStorage永続化。

### `lib/user_context.tsx`

ユーザー選択Context。ユーザー切替、利用可能ユーザーの自動検出（サンプルデータから）、localStorage永続化。

---

## よくあるミスと対策

| ミス | 原因 | 対策 |
|------|------|------|
| CSS `height: auto` トランジション不可 | CSS は `height: Xpx → auto` をアニメーションできない | CSS Grid `grid-template-rows: 0fr → 1fr` を使うか、明示ピクセル値をstateで管理 |
| `max-height` トランジションが不自然 | `max-height: 0 → 600px` だと実コンテンツ高に関係なくタイミングが分散 | CSS Grid `grid-template-rows` を優先。`max-height` は避ける |
| サンプルデータの未来タイムスタンプ | `sample_data.ts` の日付が現在時刻より未来の場合がある | 新規投稿の `created_at` を最新既存投稿 + 1秒に補正 |
| API送信時のフィールド欠落 | `team_id` など必要フィールドの送信忘れ | API呼び出し前にマッピング定数（例: `USER_TEAM_MAP`）でフィールド補完 |
| AI校正の `changes_made` 判定漏れ | テキスト差分のみチェックし、タグ・カテゴリ提案を含めていなかった | `textChanged \|\| hasTags \|\| categoryMeaningful` の3条件をOR |
| 比較UIの全文非表示 | `grid-cols-2` + 固定高さ（`h-28`）で文章が切れる | 縦積み (`space-y-2`) + 自動高さで全文表示 |
| AI機能のコンセプト違い（校正 vs 発展） | ユーザーが求めるAI機能の目的を確認せず、「校正（文法修正）」として実装してしまった。実際は「短いメモをナレッジに発展」だった | AI機能を実装する前に、ユーザーに「AIにどこまで変えてほしいか」（修正/補強/発展/書き換え）を必ず確認する。プロンプトの役割設定（role）を最初に合意する |
| Gemini SDK がプロキシ非対応 | `@google/generative-ai` SDKの内部 `fetch()` は `HTTPS_PROXY` を無視する。プロキシ環境で接続不可 | SDKを使わず `https` モジュール + `https-proxy-agent` でREST直接呼び出しを使う |
| `.env.local` 未作成で API 未接続 | APIキーを `.env.local` に設定しないとフォールバック（シミュレーション）が動作し、一見動いているように見える | `.env.local.example` を用意し、セットアップ手順に記載。`isGeminiAvailable` フラグでログ出力し、フォールバック動作時はコンソールに明示する |
| フォールバックが弱すぎて違いがわからない | regex ベースのシミュレーションが `**` 除去程度しかせず、「変更なし」と誤判定 | フォールバックでも意味のある変換をするか、フォールバック動作中であることをUIに明示する |
| フォールバックが無言で動作しユーザーが混乱 | APIレスポンスにAI/シミュレーションの判別情報がなく、UIも区別しなかった。ユーザーは「AIが壊れている」と認識 | APIレスポンスに必ず `source: "gemini" \| "simulation"` を含める。UIでシミュレーション時は警告バナー、Gemini時は「Gemini」バッジを表示する |
| デプロイ環境を確認せずローカル前提で案内 | Vercel環境のユーザーに `.env.local` とサーバー再起動を案内してしまった | 環境変数の設定案内はデプロイ環境に依存する。UIの警告メッセージも「環境変数を設定してください」のように環境非依存にする。CLAUDE.mdにデプロイ環境を明記する |
| `https` モジュールがVercelで動作不安定 | Node.js `https` + `https-proxy-agent` による低レベルHTTPクライアントがVercelサーバーレス環境で正常動作しなかった | Vercel対応にはネイティブ `fetch()` を使う。`https` モジュールや外部HTTPライブラリは不要 |
| Gemini出力にMarkdown記号が残る | プロンプトで「Markdown除去」と指示してもGeminiは `**太字**` や `# 見出し` を出力することがある | プロンプトだけに頼らず、サーバー側で `stripMarkdown()` を必ず通す。プロンプト指示 + コード強制除去の二重対策 |
| Gemini出力がAI特有の文体になる | 「**概念名:** 説明文」「感情的な繋がり」のようなAI的表現をプロンプトで禁止していなかった | プロンプトに○×の具体例を示して禁止する。抽象語・見出し語形式を明示的にNG例として列挙する。「先輩が口頭で教えるような文体」と指定する |
| 新規AI機能でsource表示を実装し忘れ | `source` フィールドのルールはCLAUDE.mdに既にあったが、コンテンツ分析・生成を新規実装した際にそのルールを適用しなかった。UI上で「完了」と表示されてもGemini/シミュレーションの区別がつかず、ユーザーが「演出だけでは？」と疑った | **新規AI機能を追加する際のチェックリスト**: (1) APIレスポンスに `source` + `fallback_reason` を含める (2) UIにGeminiバッジ/シミュレーション警告を表示 (3) エラー・ネットワーク障害時もsourceを設定。既存ルールの「適用漏れ」を防ぐため、AI機能実装時は必ずフォールバック設計セクションを再読する |
| AI処理のUI演出が「本物感」を出しすぎる | ステップ進行アニメーション＋「完了」バッジで処理が成功したように見えるが、実際はモックデータだった。UIの見た目と実処理の乖離がユーザーの信頼を損なう | AI処理のUI（ローディング・ステップ進行・完了バッジ）には必ずsource表示をセットで実装する。「完了」だけでなく「何で完了したか」を示す。進行演出とsource表示は分離しない |
| AI出力の文体再現が一方向に偏る | 「人間っぽく」→カジュアル寄りの例だけ示した結果、淡々とした入力にもハイテンション出力（「めっちゃ便利じゃない？」）。修正で「元にない表現を足すな」にしたら今度は全部フラット化し、ハイテンション入力も淡々化してしまった | 文体ルールは「分析→忠実再現」の双方向で設計する。○×例は必ず両方向（テンション上げすぎNG + 下げすぎNG）を示す。「〜するな」ではなく「分析結果に従え」と指示する |
| ビルド成功を「実装完了」と誤認 | TypeScriptコンパイルが通ることと、APIが期待通り動作することは別問題。外部API連携では認証・ネットワーク・レスポンス形式など実行時にしか検証できない要素が多い。ビルド成功だけで「完了」と報告し、動作テストを省略した | **「実装完了」の定義を明確化**: ビルド成功は完了の必要条件であって十分条件ではない。外部API連携を含む機能は、必ず (1) APIエンドポイントをcurlで叩いて期待通りのレスポンスを確認 (2) フォールバック動作を確認 (3) UIでsource表示を確認 してから「完了」と報告する |
| 既存ルールの適用範囲を狭く解釈 | `source`表示ルールは「Gemini API 統合ルール」セクションに書かれていたため、Google Drive連携（非AI機能）には適用しなかった。実際には「外部API連携全般」に適用すべきルールだった | ルールの適用範囲を明示する。特定技術（Gemini）に見えるルールでも、本質的には「外部API連携」「フォールバック設計」など汎用的なカテゴリに属する場合がある。新機能実装前に関連しそうなセクションを全て読み直す |
| サーバー専用モジュールのモジュールレベル副作用でVercelクライアントエラー | Next.jsバンドラはサーバー専用ファイル（`src/lib/xxx.ts`）もクライアントバンドルに含めることがある。モジュールのトップレベルで `console.log()` 等を即時実行すると、その時点でNode.js専用API（`crypto` 等）が評価され、クライアント側で `ReferenceError` や `Module not found` が発生する。「サーバーサイド専用」とコメントしてもバンドラは無視する | **モジュールレベルの副作用を排除する**: (1) トップレベルで `console.log()` 等を即時実行しない (2) ログ出力は関数内で遅延実行（lazy initialization）にする (3) `loggedOnce` フラグで初回API呼び出し時のみ出力 (4) Node.js専用import（`crypto`, `fs` 等）を含むファイルは、クライアントから間接的にもインポートされないよう設計する |

---

## 外部API連携ルール（共通）

このセクションのルールは **Gemini API、Google Drive API、その他全ての外部API連携** に適用される。

### 実装完了の定義

外部API連携を含む機能は、以下を **全て満たして初めて「実装完了」** とする:

1. **ビルド成功**: `npm run build` がエラーなく完了
2. **APIエンドポイントの動作テスト**: 開発サーバーを起動し、`curl` で各エンドポイントを叩いて期待通りのレスポンスを確認
3. **フォールバック動作の確認**: 環境変数未設定時に `source: "simulation"` + `fallback_reason` が返されることを確認
4. **エラーハンドリングの確認**: 意図的にエラーを発生させ、`source: "error"` + `fallback_reason` が返されることを確認
5. **UIでのsource表示確認**: フロントエンドで成功/シミュレーション/エラーの各状態が正しく表示されることを確認
6. **サーバーログの確認**: 起動時とAPI呼び出し時に接続状態がログ出力されることを確認

**「ビルドが通った」は完了の必要条件であって十分条件ではない。**

### フォールバック設計（必須）

- 全ての外部API呼び出しは `try-catch` でラップし、エラー時はフォールバック処理を実行
- フォールバック時もレスポンス構造は同一にする（呼び出し元で分岐不要）
- `isXxxAvailable` フラグでAPI利用可否を事前判定し、不要なAPI呼び出しを避ける
- **必須: APIレスポンスに `source` フィールドを含める**。値は `"実際のAPI名"` / `"simulation"` / `"error"`
- **必須: `fallback_reason` フィールドも含める**。シミュレーション時は理由（「環境変数が未設定」等）、エラー時はエラー内容を返す
- **必須: UIでフォールバック動作を明示する**。シミュレーション時は警告バナー（amber）、成功時はAPIバッジ（green）、エラー時はエラー表示（red）
- **必須: 起動時のログ出力**。`[モジュール名] API: 有効/無効` の形式で接続状態を出力
- **必須: API呼び出し時のログ出力**。`[エンドポイント名] Fetching from API` / `[エンドポイント名] Using mock data` の形式

### 新規外部API連携追加時のチェックリスト

新しい外部APIを追加する際は以下を **全て実装してからPR** する:

1. [ ] APIクライアント（`src/lib/xxx.ts`）に `isXxxAvailable` フラグを実装
2. [ ] APIクライアントに起動時のログ出力を実装
3. [ ] APIルートで `source` + `fallback_reason` を全レスポンスに含める
4. [ ] APIルートのcatchブロックでも `source: "error"` + `fallback_reason` を設定
5. [ ] フロントエンドでsource表示（成功バッジ / シミュレーション警告 / エラー表示）を実装
6. [ ] `.env.local.example` に環境変数の設定方法を追記
7. [ ] 「実装完了の定義」の6項目を全て確認

---

## Gemini API 統合ルール

**注意: フォールバック設計・source表示・チェックリストは「外部API連携ルール（共通）」セクションを参照。** このセクションではGemini固有のルールのみ記載。

### 接続方式

- **SDK不使用**: `@google/generative-ai` は使わない。プロキシ環境で動作しないため
- **fetch() ベース**: ネイティブ `fetch()` で `generativelanguage.googleapis.com` に直接リクエスト。`https` モジュールや `https-proxy-agent` は使わない（Vercelサーバーレス環境で問題が起きるため）
- **環境変数**: `GEMINI_API_KEY` を設定（Vercel: ダッシュボード Environment Variables、ローカル: `.env.local`）。未設定時はフォールバック
- **source値**: `"gemini"` / `"simulation"` / `"error"`

### プロンプト設計

- **役割（role）を明確に設定**: 「シニアナレッジエディター」「マルチチャネル運用プロフェッショナル」等
- **思考プロセスを段階的に指示**: Step 1→2→3→4 の構造で、AIの思考を誘導する
- **出力形式をJSON schema で厳密に指定**: `responseMimeType: "application/json"` + プロンプト内にJSON構造を明記
- **temperature の使い分け**: 校正・修正は0.3、発展・生成は0.7
- **禁止事項は○×の具体例で示す**: 「Markdownを使うな」だけでは無視される。`○ 正しい例` / `× 間違った例` を複数並べて明示する
- **AI的文体を明示的に禁止する**: `**見出し語:** 説明文` 形式、抽象語（「感情的な繋がり」「多角的な」等）をNG例として列挙する
- **文体再現は「分析→忠実再現」で設計する**: 固定のトーン（「カジュアルに」「丁寧に」等）を指定するのではなく、入力テキストの文体を分析させ、その結果に忠実に従わせる。○×例は必ず双方向（テンション上げすぎNG + 下げすぎNG）で示す

### 出力の後処理（セーフティネット）

- プロンプトで禁止してもGeminiがMarkdownを出力するケースがある。**サーバー側で必ず `stripMarkdown()` を通す**
- 除去対象: `**太字**`, `*斜体*`, `~~取消線~~`, `# 見出し`, `- 見出し語: 説明文` 形式

---

## Google Drive API 統合ルール

**注意: フォールバック設計・source表示・チェックリストは「外部API連携ルール（共通）」セクションを参照。** このセクションではGoogle Drive固有のルールのみ記載。

### 接続方式

- **サービスアカウント認証**: OAuth 2.0ではなくサービスアカウントを使用（チーム共有フォルダ向け）
- **JWT署名**: Node.js `crypto` モジュールでRS256署名し、アクセストークンを取得
- **fetch() ベース**: ネイティブ `fetch()` で `googleapis.com` に直接リクエスト
- **環境変数**: `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` を設定

### source値

- `"google_drive"`: 実際のGoogle Drive APIからデータ取得
- `"simulation"`: モックデータ（環境変数未設定時）
- `"error"`: API呼び出し失敗
- `"mock"`: フォルダ一覧など、元々モックで返すエンドポイント
- `"local"`: ローカルアップロードファイル

### ファイルカテゴリ自動判定

`categorizeFile()` 関数でファイル名・MIMEタイプから自動判定:
- `minutes`: 議事録（ファイル名に「議事録」「mtg」「meeting」、またはGoogle Docs）
- `transcript`: 文字起こし（ファイル名に「transcript」「文字起こし」）
- `photo`: 写真（画像MIME、ファイル名に「photo」「写真」）
- `other`: その他

### フォルダ共有設定

サービスアカウントでアクセスするには、対象フォルダをサービスアカウントのメールアドレスに共有設定する必要がある。エラー時は「フォルダがサービスアカウントに共有されているか確認してください」とメッセージを返す。

---

## PR作業ルール

- PR完了時に `notes/` ディレクトリに学びを記録すること
- ファイル名: `notes/YYYY-MM-DD-機能名.md`
- 内容:
  - 何をしたか
  - ハマったポイント
  - 次回の注意点
