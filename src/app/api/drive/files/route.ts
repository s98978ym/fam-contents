import { NextRequest, NextResponse } from "next/server";
import { isDriveAvailable, extractFolderIdFromUrl, listFilesInFolder, categorizeFile, type DriveFile } from "@/lib/google_drive";
import { driveFileStore } from "@/lib/drive_store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileWithCategory {
  id: string;
  name: string;
  mimeType: string;
  category: "minutes" | "transcript" | "photo" | "other";
  webViewLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  size?: string;
}

// ---------------------------------------------------------------------------
// GET: フォルダ内のファイル一覧を取得（クエリパラメータ版）
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get("folderId");
  const folderUrl = req.nextUrl.searchParams.get("folderUrl");

  // URLからIDを抽出
  let resolvedFolderId = folderId;
  if (!resolvedFolderId && folderUrl) {
    resolvedFolderId = extractFolderIdFromUrl(folderUrl);
  }

  if (!resolvedFolderId) {
    return NextResponse.json({ error: "folderId or folderUrl is required" }, { status: 400 });
  }

  // Drive API が利用可能な場合
  if (isDriveAvailable) {
    try {
      console.log(`[drive/files] Fetching from Google Drive API for folder: ${resolvedFolderId}`);
      const driveFiles = await listFilesInFolder(resolvedFolderId);

      const files: FileWithCategory[] = driveFiles.map((file: DriveFile) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        category: categorizeFile(file),
        webViewLink: file.webViewLink,
        thumbnailLink: file.thumbnailLink,
        createdTime: file.createdTime,
        size: file.size,
      }));

      // カテゴリ別にグループ化
      const categorized = {
        minutes: files.filter((f) => f.category === "minutes"),
        transcript: files.filter((f) => f.category === "transcript"),
        photo: files.filter((f) => f.category === "photo"),
        other: files.filter((f) => f.category === "other"),
      };

      return NextResponse.json({
        files,
        categorized,
        total: files.length,
        source: "google_drive" as const,
      });
    } catch (error) {
      console.error("[drive/files] API error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 403/404エラーの場合は共有設定の案内を表示
      const isPermissionError = errorMessage.includes("403") || errorMessage.includes("404") || errorMessage.includes("not found");
      const userMessage = isPermissionError
        ? "フォルダにアクセスできません。Google Driveでフォルダをサービスアカウントに共有してください。"
        : "Google Driveからファイル一覧を取得できませんでした";

      return NextResponse.json({
        error: userMessage,
        details: errorMessage,
        source: "error" as const,
        fallback_reason: `API呼び出し失敗: ${errorMessage}`,
        hint: isPermissionError ? "フォルダの「共有」設定からサービスアカウントのメールアドレスを追加してください" : undefined,
      }, { status: 500 });
    }
  }

  // フォールバック: モックデータ
  console.log("[drive/files] Using mock data");
  const mockFiles = driveFileStore.listByFolder(resolvedFolderId);

  const files: FileWithCategory[] = mockFiles.map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    category: f.category,
    webViewLink: f.url,
    createdTime: f.createdAt,
  }));

  const categorized = {
    minutes: files.filter((f) => f.category === "minutes"),
    transcript: files.filter((f) => f.category === "transcript"),
    photo: files.filter((f) => f.category === "photo"),
    other: files.filter((f) => f.category === "other"),
  };

  return NextResponse.json({
    files,
    categorized,
    total: files.length,
    source: "simulation" as const,
    fallback_reason: "GOOGLE_SERVICE_ACCOUNT_EMAIL または GOOGLE_PRIVATE_KEY が未設定",
  });
}

// ---------------------------------------------------------------------------
// POST: ファイル情報を登録（ローカルアップロード用）
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.folderId || !body.name) {
    return NextResponse.json({ error: "folderId and name are required" }, { status: 400 });
  }
  const file = driveFileStore.create({
    folderId: body.folderId,
    name: body.name,
    mimeType: body.mimeType ?? "application/octet-stream",
    category: body.category ?? "other",
    url: body.url ?? "",
  });
  return NextResponse.json({ file, source: "local" as const }, { status: 201 });
}
