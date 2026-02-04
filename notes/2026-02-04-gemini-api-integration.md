# Gemini API統合 — AI校正・コンテンツ生成

## 何をしたか

- `@google/generative-ai` パッケージを導入し、Gemini 2.0 Flash モデルと接続
- `src/lib/gemini.ts` に共有クライアントユーティリティを作成（`generateText`, `generateJSON`）
- 校正API (`/api/knowledge/proofread`) を Gemini 連携に書き換え
  - 日本語校正に特化したプロンプト設計（7つの校正ルール）
  - JSON モード (`responseMimeType: "application/json"`) で構造化出力
  - タグ提案・カテゴリ判定もGeminiに一括依頼
- コンテンツ生成API (`/api/contents/[id]/generate`) を Gemini 連携に書き換え
  - 6チャネル別にsystem_specification.mdの仕様をプロンプトに反映
  - チャネル固有のJSON出力形式を指定
- API キー未設定時は従来のシミュレーション（正規表現ベース）にフォールバック

## ハマったポイント

- 旧シミュレーションでは入力テキストに一致する正規表現パターンがなければ「修正なし」を返していた
  - 例: 「ファンが求めているのは…」のような普通の文章は全く校正されない
  - Gemini ならば文脈を理解して Markdown 記号の除去や読みやすさ改善も行える
- Gemini の JSON モード: `generationConfig.responseMimeType` を `"application/json"` に設定するだけで確実にJSON返却される
- `temperature: 0.3` (校正) vs `0.7` (コンテンツ生成) で用途に応じた創造性調整

## 次回の注意点

- `.env.local` に `GEMINI_API_KEY` を設定しないとフォールバック動作になる
- Gemini API のレート制限（無料枠: 15 RPM）に注意。大量のバリアント生成時はシーケンシャル処理
- プロンプトの日本語校正ルールは実運用フィードバックで調整が必要になる可能性がある
- `categorize/route.ts` もGemini対応すると一貫性が向上する
