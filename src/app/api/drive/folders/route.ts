import { NextResponse } from "next/server";
import { isDriveAvailable, extractFolderIdFromUrl, getFolderMetadata } from "@/lib/google_drive";
import { driveFolderStore } from "@/lib/drive_store";

// ---------------------------------------------------------------------------
// GET: フォルダ一覧（モックのみ — 実際のDriveでは「最近使用したフォルダ」機能が必要）
// ---------------------------------------------------------------------------

export async function GET() {
  // モックデータを返す（実際のDriveには「登録済みフォルダ一覧」の概念がないため）
  const folders = driveFolderStore.list();
  return NextResponse.json({
    folders,
    source: "mock" as const,
    message: "フォルダ一覧はアプリ内登録データから取得しています",
  });
}

// ---------------------------------------------------------------------------
// POST: フォルダを検証・登録
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const body = await req.json();
  const url = body.url?.trim();
  const name = body.name?.trim();

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // URLからフォルダIDを抽出
  const folderId = extractFolderIdFromUrl(url);
  if (!folderId) {
    return NextResponse.json({ error: "Invalid Google Drive folder URL" }, { status: 400 });
  }

  // Drive APIで検証
  if (isDriveAvailable) {
    try {
      const metadata = await getFolderMetadata(folderId);

      // 登録
      const folder = driveFolderStore.create(name || metadata.name);

      return NextResponse.json({
        folder: {
          ...folder,
          id: folderId,
          url,
          name: name || metadata.name,
        },
        driveMetadata: metadata,
        source: "google_drive" as const,
      }, { status: 201 });
    } catch (error) {
      console.error("[drive/folders] API error:", error);
      return NextResponse.json({
        error: "Google Driveへのアクセスに失敗しました。フォルダがサービスアカウントに共有されているか確認してください。",
        details: error instanceof Error ? error.message : String(error),
        source: "error" as const,
        fallback_reason: `API呼び出し失敗: ${error instanceof Error ? error.message : String(error)}`,
      }, { status: 403 });
    }
  }

  // フォールバック: モックで登録
  console.log("[drive/folders] Drive API not configured, using mock");
  const folder = driveFolderStore.create(name || `folder_${folderId.substring(0, 8)}`);

  return NextResponse.json({
    folder: {
      ...folder,
      id: folderId,
      url,
    },
    source: "simulation" as const,
    fallback_reason: "GOOGLE_SERVICE_ACCOUNT_EMAIL または GOOGLE_PRIVATE_KEY が未設定",
  }, { status: 201 });
}
