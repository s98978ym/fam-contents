import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Google OAuth Token Refresh
// ---------------------------------------------------------------------------

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export async function POST(req: NextRequest) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "OAuth not configured" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { refresh_token } = body;

  if (!refresh_token) {
    return NextResponse.json({ error: "Refresh token is required" }, { status: 400 });
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error("[auth/google/refresh] Token refresh error:", tokens);
      return NextResponse.json(
        { error: tokens.error_description || tokens.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
    });
  } catch (error) {
    console.error("[auth/google/refresh] Error:", error);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
