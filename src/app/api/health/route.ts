import { NextResponse } from "next/server";
import { isGeminiAvailable } from "@/lib/gemini";

// ---------------------------------------------------------------------------
// Gemini 接続診断エンドポイント
// ---------------------------------------------------------------------------

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const keyPreview = apiKey.length > 4
    ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 2)}`
    : apiKey.length > 0
      ? "***"
      : "(未設定)";

  // Gemini API に軽量テストリクエスト
  let geminiStatus = "unchecked";
  let geminiError = "";

  if (isGeminiAvailable) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash?key=${apiKey}`;
      const resp = await fetch(url);
      if (resp.ok) {
        geminiStatus = "connected";
      } else {
        const body = await resp.text().catch(() => "");
        geminiStatus = "error";
        geminiError = `HTTP ${resp.status}: ${body.substring(0, 200)}`;
      }
    } catch (err) {
      geminiStatus = "error";
      geminiError = err instanceof Error ? err.message : String(err);
    }
  } else {
    geminiStatus = "no_api_key";
  }

  return NextResponse.json({
    gemini: {
      is_available: isGeminiAvailable,
      key_preview: keyPreview,
      status: geminiStatus,
      error: geminiError || undefined,
    },
    env: {
      node_version: process.version,
      vercel: !!process.env.VERCEL,
      vercel_env: process.env.VERCEL_ENV || "(not set)",
    },
  });
}
