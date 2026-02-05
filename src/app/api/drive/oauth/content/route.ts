import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET: Get file content using OAuth token
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
  }

  const accessToken = authHeader.substring(7);
  const fileId = req.nextUrl.searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  try {
    // First, get file metadata to determine type
    const metaResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!metaResponse.ok) {
      const error = await metaResponse.json();
      return NextResponse.json(
        { error: error.error?.message || "Failed to get file metadata" },
        { status: metaResponse.status }
      );
    }

    const metadata = await metaResponse.json();
    const mimeType = metadata.mimeType;

    // For Google Docs, export as plain text
    if (mimeType === "application/vnd.google-apps.document") {
      const exportResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!exportResponse.ok) {
        const error = await exportResponse.text();
        return NextResponse.json(
          { error: "Failed to export document", details: error },
          { status: exportResponse.status }
        );
      }

      const content = await exportResponse.text();
      return NextResponse.json({
        id: fileId,
        name: metadata.name,
        mimeType: "text/plain",
        content,
        source: "google_drive" as const,
      });
    }

    // For text files, download directly
    if (mimeType.startsWith("text/") || mimeType === "application/json") {
      const downloadResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!downloadResponse.ok) {
        const error = await downloadResponse.text();
        return NextResponse.json(
          { error: "Failed to download file", details: error },
          { status: downloadResponse.status }
        );
      }

      const content = await downloadResponse.text();
      return NextResponse.json({
        id: fileId,
        name: metadata.name,
        mimeType,
        content,
        source: "google_drive" as const,
      });
    }

    // For other file types, return metadata only
    return NextResponse.json({
      id: fileId,
      name: metadata.name,
      mimeType,
      content: null,
      message: "Content not available for this file type",
      source: "google_drive" as const,
    });
  } catch (error) {
    console.error("[drive/oauth/content] Error:", error);
    return NextResponse.json(
      { error: "Failed to get file content", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
