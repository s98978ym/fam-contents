import { NextRequest, NextResponse } from "next/server";
import { isDriveAvailable, listFilesInFolder, categorizeFile, type DriveFile } from "@/lib/google_drive";
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
// GET: フォルダ内のファイル一覧を取得
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { folderId } = await params;

  if (!folderId) {
    return NextResponse.json({ error: "folderId is required" }, { status: 400 });
  }

  // Drive API が利用可能な場合
  if (isDriveAvailable) {
    try {
      console.log(`[drive/folders/${folderId}/files] Fetching from Google Drive API`);
      const driveFiles = await listFilesInFolder(folderId);

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
      console.error(`[drive/folders/${folderId}/files] API error:`, error);
      return NextResponse.json({
        error: "Google Driveからファイル一覧を取得できませんでした",
        details: error instanceof Error ? error.message : String(error),
        source: "error" as const,
        fallback_reason: `API呼び出し失敗: ${error instanceof Error ? error.message : String(error)}`,
      }, { status: 500 });
    }
  }

  // フォールバック: モックデータ
  console.log(`[drive/folders/${folderId}/files] Using mock data`);
  const mockFiles = driveFileStore.listByFolder(folderId);

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
