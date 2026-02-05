import { NextRequest, NextResponse } from "next/server";
import { isDriveAvailable, getFileContent } from "@/lib/google_drive";

// ---------------------------------------------------------------------------
// GET: ファイルのテキストコンテンツを取得
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const mimeType = req.nextUrl.searchParams.get("mimeType") || "text/plain";

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  // Drive API が利用可能な場合
  if (isDriveAvailable) {
    try {
      console.log(`[drive/files/${fileId}/content] Fetching content from Google Drive`);
      const result = await getFileContent(fileId, mimeType);

      return NextResponse.json({
        fileId,
        content: result.content,
        mimeType: result.mimeType,
        source: "google_drive" as const,
      });
    } catch (error) {
      console.error(`[drive/files/${fileId}/content] API error:`, error);
      return NextResponse.json({
        error: "ファイルコンテンツを取得できませんでした",
        details: error instanceof Error ? error.message : String(error),
        source: "error" as const,
      }, { status: 500 });
    }
  }

  // フォールバック: サンプルコンテンツ
  console.log(`[drive/files/${fileId}/content] Using mock content`);

  const mockContent = getMockContent(fileId, mimeType);

  return NextResponse.json({
    fileId,
    content: mockContent,
    mimeType: "text/plain",
    source: "simulation" as const,
    fallback_reason: "GOOGLE_SERVICE_ACCOUNT_EMAIL または GOOGLE_PRIVATE_KEY が未設定",
  });
}

// ---------------------------------------------------------------------------
// モックコンテンツ
// ---------------------------------------------------------------------------

function getMockContent(fileId: string, mimeType: string): string {
  // 議事録風のサンプル
  if (mimeType.includes("document") || fileId.includes("001") || fileId.includes("007") || fileId.includes("011")) {
    return `【会議議事録】

日時: 2026年2月1日 10:00-11:30
参加者: 田中、佐藤、鈴木、高橋

■ 議題1: 春のキャンペーン企画について
- 3月開催予定のスプリングアカデミーの概要を共有
- ターゲット: 新年度を迎える若手アスリート
- 目標参加者数: 50名
- 特典: 早期申込割引、ペア割引

■ 議題2: SNS発信方針
- Instagram中心に展開
- Reels/Stories/Feedの3形式で発信
- 参加者の声を積極的に活用

■ アクションアイテム
- 田中: 会場手配を来週中に確定
- 佐藤: 告知用ビジュアル作成
- 鈴木: LINEキャンペーン設計

次回MTG: 2月8日 14:00`;
  }

  // 文字起こし風のサンプル
  if (mimeType.includes("text") || fileId.includes("003") || fileId.includes("008")) {
    return `[00:00:15] 田中: それでは本日のミーティングを始めましょう。まず春のキャンペーン企画についてです。

[00:00:32] 佐藤: はい、企画書の方準備しました。今回のターゲットは新年度を迎える若手アスリートを想定しています。

[00:01:05] 鈴木: 目標参加者数はどのくらいを想定していますか？

[00:01:12] 佐藤: 50名を目標にしたいと考えています。早期申込割引やペア割引を設けて、なるべく早めに集客したいですね。

[00:01:45] 高橋: SNSの発信方針についても議論しておきたいのですが。

[00:01:52] 田中: そうですね。Instagramを中心に展開しましょう。Reels、Stories、Feedの3形式で。

[00:02:10] 鈴木: 参加者の声を使った投稿も効果的だと思います。`;
  }

  return `サンプルファイルコンテンツ (fileId: ${fileId})

このファイルはモックデータです。
実際のGoogle Drive連携を有効にするには、環境変数を設定してください。`;
}
