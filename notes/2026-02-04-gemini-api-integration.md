# Gemini API統合 — AIナレッジ発展・コンテンツ生成

## 何をしたか

### Gemini API クライアント (`src/lib/gemini.ts`)
- ネイティブ `fetch()` でREST呼び出し（SDK不使用、`https` モジュール不使用）
- `generateText`, `generateJSON<T>` の汎用関数を提供
- `isGeminiAvailable` フラグでAPI利用可否を判定
- Vercelサーバーレス環境 + Node.js 18+ の両方で動作

### ナレッジ発展API (`/api/knowledge/proofread`)
- 「校正」から「ナレッジ発展」にコンセプト変更
- 4ステップ思考プロセスのプロンプト設計:
  1. 趣旨の把握（筆者の核心的な主張を特定）
  2. 必要な観点の特定（ナレッジとして不足している観点を洗い出す）
  3. 補強コンテンツの検討（数値・事例・実践ステップ・注意点）
  4. 発展テキストの生成（元の趣旨を核に補強を組み込む）
- JSON モード (`responseMimeType: "application/json"`) で構造化出力
- temperature: 0.7, maxOutputTokens: 4096
- API未設定/エラー時はシミュレーションにフォールバック
- レスポンスに `source: "gemini" | "simulation"` フィールドを追加

### コンテンツ生成API (`/api/contents/[id]/generate`)
- 6チャネル別にsystem_specification.mdの仕様をプロンプトに反映
- Gemini 2.0 Flash モデルでチャネル固有のJSON出力を生成
- フォールバックはスタブデータを返却

### UI変更
- 「AIで校正」→「AIで発展」、「校正後」→「AIが発展」にラベル変更
- Gemini接続時は「Gemini」バッジを表示
- シミュレーション時は黄色の警告バナーで `.env.local` 設定を案内

## ハマったポイント

### 1. SDK がプロキシ環境で動作しない
- `@google/generative-ai` SDK の内部 `fetch()` は `HTTPS_PROXY` を無視する
- 解決: SDKを削除し、`https` モジュール + `https-proxy-agent` でREST直接呼び出しに変更

### 2. コンセプトの取り違え（校正 vs 発展）
- 最初は「AI校正」= 文法・表現の修正と理解して実装
- 実際にユーザーが求めていたのは「短いメモをチームで活用できるナレッジに発展させる」こと
- 教訓: AI機能を実装する前に、「AIにどこまで変えてほしいか」をユーザーに確認する

### 3. フォールバックが目立たない
- APIキー未設定でもシミュレーションが動き、一見正常に見える
- 解決: レスポンスに `source` フィールドを追加し、UIでシミュレーションモードを明示

### 4. Claude Code環境からGemini APIに接続不可
- `generativelanguage.googleapis.com` がリモート環境レベルでブロックされている（403）
- コードは正しいがテスト不可 → ユーザーのローカル環境で動作確認

## 次回の注意点

- `.env.local` に `GEMINI_API_KEY` を設定しないとフォールバック動作になる
- サーバー再起動が必要（`.env.local` 変更後）
- Gemini API のレート制限（無料枠: 15 RPM）に注意
- プロンプトの発展ルールは実運用フィードバックで調整が必要
- AI機能のコンセプトは実装前にユーザーと合意する
