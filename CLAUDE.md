# CLAUDE.md

## プロジェクト概要

**FAM Content Ops** — マルチチャネル向けコンテンツ生成・管理システム。
素材（議事録・台本・写真など）をアップロードし、AIで各チャネル向けコンテンツを生成・プレビュー・編集・公開する。

### 技術スタック

- **フレームワーク:** Next.js 16 (App Router) + React 19
- **言語:** TypeScript 5 (strict mode)
- **スタイリング:** Tailwind CSS 4 + PostCSS
- **データストア:** インメモリストア (`src/lib/store.ts`)。DB移行を前提とした設計
- **パッケージマネージャ:** npm

### ディレクトリ構成

```
src/
├── app/                  # Next.js App Router (ページ + APIルート)
│   ├── api/              # RESTful APIルート (contents, campaigns, reviews, etc.)
│   ├── campaigns/        # キャンペーン管理ページ
│   ├── contents/         # コンテンツ一覧・詳細ページ
│   ├── reviews/          # レビュー管理
│   ├── publish-jobs/     # 公開ジョブ管理
│   ├── prompt-versions/  # プロンプトバージョン管理
│   ├── layout.tsx        # ルートレイアウト
│   └── page.tsx          # ダッシュボード
├── components/
│   ├── content_wizard.tsx   # メインウィザード (ファイル登録→設定→生成→プレビュー→保存)
│   └── channel_forms.tsx    # チャネル別フォーム
├── lib/
│   ├── store.ts             # インメモリCRUDストア + 監査ログ
│   ├── drive_store.ts       # Google Drive連携
│   └── sample_data.ts       # サンプルデータ
└── types/
    └── content_package.ts   # ドメイン型定義 (Channel, ContentStatus, etc.)
```

### 開発環境のセットアップ

```bash
npm install
npm run dev     # 開発サーバー起動
npm run build   # 本番ビルド
npm run lint    # Next.js組み込みESLint
```

---

## コーディングルール

### 命名規則

| 対象 | 規則 | 例 |
|------|------|----|
| コンポーネント | PascalCase | `StepFiles`, `ReelsPreview`, `PhoneFrame` |
| 関数 | camelCase | `categorizeFiles`, `getPromptType` |
| 定数 | UPPER_SNAKE_CASE | `CHANNEL_OPTIONS`, `TASTE_OPTIONS` |
| 型・インターフェース | PascalCase | `FileEntry`, `GenerationSettings` |
| ファイル (コンポーネント) | snake_case.tsx | `content_wizard.tsx`, `channel_forms.tsx` |
| ページ | Next.js規約 (`page.tsx`) | `contents/[id]/page.tsx` |

### import文の順序・パスエイリアス

パスエイリアス `@/*` → `./src/*` を使用する。

```typescript
// 1. React/Next.js
import { useState } from "react";
import { NextResponse } from "next/server";

// 2. 内部モジュール (@/ エイリアス)
import { contentStore } from "@/lib/store";
import type { Channel } from "@/types/content_package";
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

Tailwind CSSユーティリティクラスを直接JSXに記述。グローバルCSSは最小限。

```jsx
// ボタン
className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
// カード
className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
```

### UI言語

UIラベル・プレースホルダー・ヒントテキストはすべて**日本語**でハードコード（i18nライブラリ不使用）。

---

## 主要コンポーネントの設計方針

### `content_wizard.tsx` (1,317行)

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

### `channel_forms.tsx` (557行)

チャネルごとの入力フォーム。`InstagramReelsForm`, `InstagramStoriesForm`, `InstagramFeedForm`, `EventLPForm`, `NoteForm`, `LINEForm` をエクスポート。

### `types/content_package.ts`

ドメインモデルの型定義。`Channel`, `ContentStatus`, `Objective`, `FunnelStage`, `ContentPackage` など。

### `lib/store.ts`

インメモリCRUDストア。`contentStore`, `campaignStore`, `variantStore`, `reviewStore`, `publishJobStore`, `metricStore`, `promptVersionStore`, `auditStore` を提供。全変更操作で監査ログを自動記録。

---

## よくあるミスと対策

_(今後の開発で得た知見をここに追記していく)_

---

## PR作業ルール

- PR完了時に `notes/` ディレクトリに学びを記録すること
- ファイル名: `notes/YYYY-MM-DD-機能名.md`
- 内容:
  - 何をしたか
  - ハマったポイント
  - 次回の注意点
