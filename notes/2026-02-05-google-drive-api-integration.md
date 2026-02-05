# Google Drive API連携の実装

## 日付
2026-02-05

## 何をしたか

Google Drive APIとの連携を実装した。

### 実装内容
- `src/lib/google_drive.ts`: サービスアカウント認証によるDrive APIクライアント
  - JWT署名によるアクセストークン取得
  - フォルダ内ファイル一覧取得
  - ファイルコンテンツ取得
  - ファイルカテゴリ自動判定
- APIルート: `/api/drive/files`, `/api/drive/folders`, `/api/drive/folders/[folderId]/files`, `/api/drive/files/[fileId]/content`
- フロントエンド: フォルダURL入力→「取得」ボタンでファイル自動取得、source表示

### 技術的決定
- OAuth 2.0ではなくサービスアカウント認証を採用（チーム共有フォルダ向け）
- SDKを使わずネイティブ`fetch()`でREST API直接呼び出し（Vercel対応）
- フォールバック設計: 環境変数未設定時はモックデータを返却

## ハマったポイント

### 1. ビルド成功を「実装完了」と誤認

**問題:** ビルドが通った時点で「完了」と報告し、実際のAPIエンドポイントの動作テストを省略した。

**原因:**
- TypeScriptコンパイルが通ることと、APIが期待通り動作することは別問題
- 外部API連携では認証・ネットワーク・レスポンス形式など実行時にしか検証できない要素が多い

**教訓:**
- **「ビルドが通った」は完了の必要条件であって十分条件ではない**
- 外部API連携を含む機能は、必ずAPIエンドポイントをcurlで叩いて確認してから「完了」と報告する

### 2. 既存ルールの適用範囲を狭く解釈

**問題:** `source`表示ルールは「Gemini API 統合ルール」セクションに書かれていたため、Google Drive連携（非AI機能）には適用しなかった。

**原因:**
- ルールが特定技術（Gemini）のセクションに書かれていたため、他の外部API連携には適用対象外と無意識に判断
- 実際には「外部API連携全般」に適用すべき汎用ルールだった

**教訓:**
- ルールの適用範囲を明示する
- 新機能実装前に関連しそうなセクションを全て読み直す
- CLAUDE.mdに「外部API連携ルール（共通）」セクションを新設し、Gemini/Drive共通のルールを記載

### 3. エラー時の`fallback_reason`欠落

**問題:** エラー時のレスポンスに`source: "error"`は含めたが、`fallback_reason`フィールドが欠落していた。

**原因:**
- 正常系とシミュレーション時のみ`fallback_reason`を意識し、エラー時は見落とした

**対策:**
- 全APIルートでエラー時にも`fallback_reason: "API呼び出し失敗: [エラー内容]"`を追加

### 4. モジュールレベル副作用によるVercelクライアントサイドエラー

**問題:** Vercel本番環境で「Application error: a client-side exception has occurred」が発生。ローカル開発では問題なかった。

**原因:**
- `src/lib/google_drive.ts` のモジュールトップレベルで `console.log()` を即時実行していた
- Next.jsのバンドラは「サーバーサイド専用」とコメントされていてもクライアントバンドルにコードを含めることがある
- モジュールがインポートされた瞬間に Node.js専用API（`crypto`）が評価され、クライアント側でエラー発生

**問題のコード（修正前）:**
```typescript
// モジュール読み込み時に即時実行される
if (isDriveAvailable) {
  console.log("[google_drive] Google Drive API: 有効");
} else {
  console.log("[google_drive] Google Drive API: 無効");
}
```

**修正後のコード:**
```typescript
let loggedOnce = false;

function logConnectionStatus(): void {
  if (loggedOnce) return;
  loggedOnce = true;
  if (isDriveAvailable) {
    console.log("[google_drive] Google Drive API: 有効（サービスアカウント設定済み）");
  } else {
    console.log("[google_drive] Google Drive API: 無効（環境変数未設定 → シミュレーションモード）");
  }
}

// 各API関数の先頭で呼び出す
export async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
  logConnectionStatus();  // ← ここで初めてログ出力
  // ...
}
```

**教訓:**
- **モジュールレベルの副作用（即時実行コード）は避ける**
- ログ出力は関数内で遅延実行（lazy initialization）にする
- `loggedOnce` フラグで初回API呼び出し時のみ出力
- ローカルで動いてもVercelでエラーになるケースがある。デプロイ後の動作確認も必須

### 5. server-onlyパッケージによる根本対策

**問題:** モジュールレベルの副作用を除去しても、`crypto`モジュール自体のインポートがクライアントバンドルに含まれる可能性があった。

**根本原因:**
- Next.jsのバンドラはモジュールグラフを解析する際、実行されないコードパスもバンドルに含めることがある
- コメントで「サーバー専用」と記載してもバンドラは無視する

**対策:**
```bash
npm install server-only
```

```typescript
// google_drive.ts の先頭
import "server-only";
import * as crypto from "crypto";
```

`server-only`パッケージをインポートすると、クライアントサイドでこのモジュールがインポートされた場合にビルドエラーが発生し、問題を早期に検出できる。

## 次回の注意点

### 実装完了の定義（チェックリスト）

外部API連携を含む機能は、以下を全て満たして初めて「実装完了」:

1. [ ] ビルド成功: `npm run build` がエラーなく完了
2. [ ] APIエンドポイントの動作テスト: `curl` で各エンドポイントを叩いて確認
3. [ ] フォールバック動作の確認: `source: "simulation"` + `fallback_reason` を確認
4. [ ] エラーハンドリングの確認: `source: "error"` + `fallback_reason` を確認
5. [ ] UIでのsource表示確認: 成功/シミュレーション/エラーの各状態を確認
6. [ ] サーバーログの確認: 起動時とAPI呼び出し時のログを確認

### 新規外部API連携追加時のチェックリスト

1. [ ] APIクライアントに `isXxxAvailable` フラグを実装
2. [ ] APIクライアントに起動時のログ出力を実装
3. [ ] APIルートで `source` + `fallback_reason` を全レスポンスに含める
4. [ ] APIルートのcatchブロックでも `source: "error"` + `fallback_reason` を設定
5. [ ] フロントエンドでsource表示を実装
6. [ ] `.env.local.example` に環境変数の設定方法を追記
7. [ ] 「実装完了の定義」の6項目を全て確認

## CLAUDE.mdへの反映

以下をCLAUDE.mdに追加した:

1. **「よくあるミスと対策」に3件追加**
   - ビルド成功を「実装完了」と誤認
   - 既存ルールの適用範囲を狭く解釈
   - サーバー専用モジュールのモジュールレベル副作用でVercelクライアントエラー

2. **「外部API連携ルール（共通）」セクションを新設**
   - 実装完了の定義（6項目のチェックリスト）
   - フォールバック設計（必須項目）
   - 新規外部API連携追加時のチェックリスト（7項目）

3. **「Google Drive API 統合ルール」セクションを新設**
   - 接続方式（サービスアカウント認証、JWT署名）
   - source値の定義
   - ファイルカテゴリ自動判定
   - フォルダ共有設定の注意点

4. **「Gemini API 統合ルール」を簡略化**
   - フォールバック設計は共通セクションを参照
   - Gemini固有のルール（プロンプト設計、出力後処理）のみ記載
