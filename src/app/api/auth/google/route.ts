import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Google OAuth Configuration
// ---------------------------------------------------------------------------

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

// Check if OAuth is configured
export const isOAuthConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

// Scopes for Drive access
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

// ---------------------------------------------------------------------------
// GET: Check OAuth configuration status
// ---------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json({
    configured: isOAuthConfigured,
    clientId: GOOGLE_CLIENT_ID || null,
    message: isOAuthConfigured
      ? "OAuth is configured"
      : "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set",
  });
}

// ---------------------------------------------------------------------------
// POST: Exchange authorization code for tokens
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (!isOAuthConfigured) {
    return NextResponse.json(
      { error: "OAuth not configured", configured: false },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { code, redirect_uri } = body;

  if (!code) {
    return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirect_uri || `${req.nextUrl.origin}/api/auth/google/callback`,
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error("[auth/google] Token exchange error:", tokens);
      return NextResponse.json(
        { error: tokens.error_description || tokens.error },
        { status: 400 }
      );
    }

    // Get user info
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
      user: {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      },
    });
  } catch (error) {
    console.error("[auth/google] Error:", error);
    return NextResponse.json(
      { error: "Failed to exchange authorization code" },
      { status: 500 }
    );
  }
}
