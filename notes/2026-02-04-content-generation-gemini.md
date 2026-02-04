# コンテンツ生成のGemini API統合

## 何をしたか

コンテンツ生成フローのAI分析・AI生成がモック（ハードコード）だったのを、Gemini API呼び出しに切り替えた。

### 新規作成
- `/api/contents/analyze` — 素材ファイル（議事録・トランスクリプト・写真）をGeminiで分析し、Step1-3の分析結果と方向性を返す
- `/api/contents/generate` — チャネル・素材ファイル・分析結果・テイスト・カスタム指示をコンテキストにしてGeminiでコンテンツ生成

### 修正
- `/api/contents/[id]/generate` — リクエストボディからfiles/taste/customInstructions等を受け取れるよう拡張
- `contents/[id]/page.tsx` — `handleAnalyze`・`handleGenerate`をモック → API呼び出しに切り替え

## 設計判断

- `contents/[id]/page.tsx`はフォルダベースのフローで、contentStoreにコンテンツが存在しない。そのため既存の`/api/contents/[id]/generate`とは別に、スタンドアロンの`/api/contents/generate`を作成した
- モック関数(`generateMockAnalysis`, `generateMockContent`)はAPI呼び出し失敗時のフォールバックとして残した
- 分析APIはtemperature 0.3（正確性重視）、生成APIはtemperature 0.7（創造性重視）

## 次回の注意点

- 生成APIのプロンプトもナレッジ発展と同様に、AI的文体の禁止や`stripMarkdown()`のセーフティネットが必要になる可能性がある（note記事のbody_markdownはMarkdown許可なので除外）
- `source: "gemini" | "simulation"` と `fallback_reason` を全APIで統一的に返すパターンを維持する
