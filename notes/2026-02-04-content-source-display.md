# コンテンツ分析・生成のsource表示追加

## 日付
2026-02-04

## 何をしたか

コンテンツ分析（AIで分析する）と生成（AIで生成する）のUI上に、Gemini/シミュレーションの判別表示を追加した。

### 変更内容

1. **`AnalysisResult` インターフェース拡張**
   - `source?: "gemini" | "simulation"` と `fallback_reason?: string` を追加

2. **`handleAnalyze` の改修**
   - APIレスポンスから `source`, `fallback_reason` を取得して state に反映
   - エラー・ネットワーク障害時も `source: "simulation"` + 理由をセット

3. **分析結果にsource表示**
   - Gemini成功時: 緑色「Gemini」バッジ + 「素材を分析しました」
   - シミュレーション時: amber警告バナー + fallback_reason 表示

4. **`generateSource` state 追加**
   - `handleGenerate` でAPIレスポンスのsourceを追跡

5. **生成プレビュー（Step 3）にsource表示**
   - `StepPreview` の上部にGeminiバッジ or シミュレーション警告を表示

## ハマったポイント

- **既存ルールの適用漏れ**: CLAUDE.mdに「source フィールド必須」のルールがあったのに、新規AI機能（コンテンツ分析・生成）を作った時に適用しなかった。ルールを書くだけでは不十分で、新機能追加時に既存ルールを再読するプロセスが必要
- **UI演出と実処理の乖離**: ステップ進行 + 「完了」バッジで本物っぽく見えるが、裏ではモックデータ。ユーザーに「演出だけでは？」と疑われた。進行アニメーションがあるほど source 表示の重要性が増す

## 次回の注意点

- AI機能を新規実装する前に、CLAUDE.mdの「フォールバック設計」セクションを必ず読む
- source表示はAI処理UIの一部として最初から設計する（後付けにしない）
- ローディングアニメーション・進行演出を実装する場合は、完了後のsource表示をセットで実装する
- CLAUDE.mdにチェックリストを追加済み:
  1. APIレスポンスに `source` + `fallback_reason`
  2. UIにGeminiバッジ / シミュレーション警告
  3. catch ブロックでもsource設定
  4. 進行演出の直後にsource表示
