// ---------------------------------------------------------------------------
// Google Drive API クライアント（fetch ベース — サービスアカウント認証）
// ---------------------------------------------------------------------------

import * as crypto from "crypto";

// ---------------------------------------------------------------------------
// 環境変数
// ---------------------------------------------------------------------------

const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

/** Google Drive API が利用可能かどうか */
export const isDriveAvailable = serviceAccountEmail.length > 0 && privateKey.length > 0;

// 起動時のログ出力
if (isDriveAvailable) {
  console.log("[google_drive] Google Drive API: 有効（サービスアカウント設定済み）");
} else {
  console.log("[google_drive] Google Drive API: 無効（環境変数未設定 → シミュレーションモード）");
}

// ---------------------------------------------------------------------------
// JWT 生成（サービスアカウント認証用）
// ---------------------------------------------------------------------------

function base64UrlEncode(data: string | Buffer): string {
  const buffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iss: serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600, // 1時間有効
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signatureInput);
  const signature = sign.sign(privateKey);
  const encodedSignature = base64UrlEncode(signature);

  return `${signatureInput}.${encodedSignature}`;
}

// ---------------------------------------------------------------------------
// アクセストークン取得（キャッシュ付き）
// ---------------------------------------------------------------------------

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // キャッシュが有効なら再利用
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const jwt = createJwt();
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "");
    throw new Error(`Google OAuth ${resp.status}: ${errorText.substring(0, 300)}`);
  }

  const data = await resp.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

// ---------------------------------------------------------------------------
// Google Drive API 呼び出し
// ---------------------------------------------------------------------------

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

async function driveGet<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${DRIVE_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  }

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "");
    throw new Error(`Google Drive API ${resp.status}: ${errorText.substring(0, 300)}`);
  }

  return resp.json();
}

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  parents?: string[];
}

export interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
}

export interface DriveFileContent {
  content: string;
  mimeType: string;
}

// ---------------------------------------------------------------------------
// ファイルカテゴリ判定
// ---------------------------------------------------------------------------

export type FileCategory = "minutes" | "transcript" | "photo" | "other";

export function categorizeFile(file: DriveFile): FileCategory {
  const name = file.name.toLowerCase();
  const mimeType = file.mimeType;

  // 議事録判定
  if (
    name.includes("議事録") ||
    name.includes("mtg") ||
    name.includes("meeting") ||
    name.includes("minutes") ||
    mimeType === "application/vnd.google-apps.document"
  ) {
    return "minutes";
  }

  // 文字起こし判定
  if (
    name.includes("transcript") ||
    name.includes("文字起こし") ||
    name.includes("書き起こし") ||
    (mimeType === "text/plain" && (name.includes("mtg") || name.includes("meeting")))
  ) {
    return "transcript";
  }

  // 写真判定
  if (
    mimeType.startsWith("image/") ||
    name.includes("photo") ||
    name.includes("写真") ||
    name.includes("画像")
  ) {
    return "photo";
  }

  return "other";
}

// ---------------------------------------------------------------------------
// 公開API
// ---------------------------------------------------------------------------

/**
 * Google Drive フォルダ内のファイル一覧を取得
 */
export async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
  if (!isDriveAvailable) {
    throw new Error("Google Drive API credentials not configured");
  }

  const allFiles: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink, createdTime, modifiedTime, size, parents)",
      pageSize: "100",
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const result = await driveGet<DriveFileList>("/files", params);
    allFiles.push(...result.files);
    pageToken = result.nextPageToken;
  } while (pageToken);

  return allFiles;
}

/**
 * Google Drive フォルダのメタデータを取得
 */
export async function getFolderMetadata(folderId: string): Promise<DriveFile> {
  if (!isDriveAvailable) {
    throw new Error("Google Drive API credentials not configured");
  }

  return driveGet<DriveFile>(`/files/${folderId}`, {
    fields: "id, name, mimeType, webViewLink, createdTime, modifiedTime",
  });
}

/**
 * Google Drive ファイルのテキストコンテンツを取得
 * Google Docs/Sheets/Slides はエクスポートしてプレーンテキストで取得
 */
export async function getFileContent(fileId: string, mimeType: string): Promise<DriveFileContent> {
  if (!isDriveAvailable) {
    throw new Error("Google Drive API credentials not configured");
  }

  const token = await getAccessToken();

  // Google Workspace ファイルはエクスポートが必要
  if (mimeType.startsWith("application/vnd.google-apps.")) {
    let exportMimeType = "text/plain";
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      exportMimeType = "text/csv";
    } else if (mimeType === "application/vnd.google-apps.presentation") {
      exportMimeType = "text/plain";
    }

    const url = `${DRIVE_API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => "");
      throw new Error(`Drive export ${resp.status}: ${errorText.substring(0, 300)}`);
    }

    return {
      content: await resp.text(),
      mimeType: exportMimeType,
    };
  }

  // 通常ファイルは直接ダウンロード
  const url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "");
    throw new Error(`Drive download ${resp.status}: ${errorText.substring(0, 300)}`);
  }

  // テキスト系のみ対応（バイナリは別途対応が必要）
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/pdf" // PDFは後でOCR等対応
  ) {
    return {
      content: await resp.text(),
      mimeType,
    };
  }

  throw new Error(`Unsupported file type for content extraction: ${mimeType}`);
}

/**
 * Google Drive フォルダURLからフォルダIDを抽出
 */
export function extractFolderIdFromUrl(url: string): string | null {
  // https://drive.google.com/drive/folders/FOLDER_ID
  // https://drive.google.com/drive/u/0/folders/FOLDER_ID
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Google Drive ファイルURLからファイルIDを抽出
 */
export function extractFileIdFromUrl(url: string): string | null {
  // https://drive.google.com/file/d/FILE_ID/view
  // https://docs.google.com/document/d/FILE_ID/edit
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
