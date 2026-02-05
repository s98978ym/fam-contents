import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET: Google Drive連携の設定情報を取得
// ---------------------------------------------------------------------------

export async function GET() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
  const isConfigured = serviceAccountEmail.length > 0 && (process.env.GOOGLE_PRIVATE_KEY ?? "").length > 0;

  return NextResponse.json({
    configured: isConfigured,
    serviceAccountEmail: isConfigured ? serviceAccountEmail : null,
    message: isConfigured
      ? `サービスアカウント（${serviceAccountEmail}）にフォルダを共有してください`
      : "Google Drive連携が設定されていません（シミュレーションモードで動作中）",
  });
}
