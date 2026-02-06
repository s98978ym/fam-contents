# プロンプト管理リニューアル + AIモデル更新

## 何をしたか

- Gemini APIのモデルを `gemini-2.0-flash`（非推奨・2026年3月31日廃止予定）から `gemini-2.5-flash` に更新
- システムプロンプト管理基盤を新規構築:
  - `SystemPromptConfig` 型を定義（key, prompt, model, temperature, maxOutputTokens等）
  - `systemPromptStore` をインメモリストアに追加（list/getByKey/update）
  - デフォルトプロンプトテンプレートを `system_prompt_defaults.ts` に抽出
  - `/api/system-prompts` API（GET/PUT）を新規作成
- プロンプト管理ページをリニューアル:
  - 「システムプロンプト」タブ: コンテンツ生成（素材分析・コンテンツ生成）とナレッジ共有（ナレッジ発展・ナレッジ抽出）の4つのプロンプトを可視化
  - 各プロンプトのモデル・Temperature・最大トークン数・プロンプト本文を編集可能
  - `{{変数名}}` プレースホルダーで動的データ注入箇所を明示
  - 「カスタムバージョン」タブ: 既存のカスタムプロンプトバージョン機能を維持
- 5つのAPIルートすべてをsystemPromptStoreに接続:
  - `/api/contents/analyze` → content_analyze設定を参照
  - `/api/contents/generate` → content_generate設定を参照
  - `/api/contents/[id]/generate` → content_generate設定を参照
  - `/api/knowledge/proofread` → knowledge_proofread設定を参照
  - `/api/knowledge/extract` → knowledge_extract設定を参照

## ハマったポイント

- プロンプトの構造がAPIルートごとに異なる: コンテンツ生成は条件分岐が多くチャネル別セクションもあるため、単純なテンプレート置換だけでは対応できない。model/temperature/maxOutputTokensはストアから読み込み、プロンプト本文は既存のビルダー関数を維持する方針にした
- `gemini-2.0-flash` の非推奨情報: Webで確認し、2026年3月31日に廃止予定であることを確認。後継は `gemini-2.5-flash`

## 次回の注意点

- プロンプト管理ページでの編集はインメモリストアに保存されるため、サーバー再起動でリセットされる。DB移行時にはsystemPromptConfigsもDB永続化が必要
- プロンプト本文の編集はストアに保存されるが、現状ではAPIルートの `buildXxxPrompt` 関数がプロンプト文生成のメインロジック。将来的にストア内のプロンプトテンプレートを直接使用するようにリファクタ可能
- `content_generate` のプロンプトは `/api/contents/generate` と `/api/contents/[id]/generate` で共有設定。ただし実際のプロンプト構築ロジックは各ルートで異なる（standalone版はfileContents対応あり）
