import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET: List files in a folder using OAuth token
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
  }

  const accessToken = authHeader.substring(7);
  const folderId = req.nextUrl.searchParams.get("folderId");

  if (!folderId) {
    return NextResponse.json({ error: "folderId is required" }, { status: 400 });
  }

  try {
    // List files in the folder
    const query = `'${folderId}' in parents and trashed = false`;
    const fields = "files(id,name,mimeType,webViewLink,thumbnailLink,createdTime,size)";
    // Include shared drives support
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime desc&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    console.log("[drive/oauth/files] Fetching files for folderId:", folderId);
    console.log("[drive/oauth/files] Query:", query);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[drive/oauth/files] API error:", error);
      return NextResponse.json(
        {
          error: error.error?.message || "Failed to fetch files",
          details: error.error?.status,
          source: "error" as const,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[drive/oauth/files] Raw response:", JSON.stringify(data));
    console.log("[drive/oauth/files] Files count:", data.files?.length || 0);
    const files = (data.files || []).map((file: Record<string, unknown>) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      category: categorizeFile(file as { name: string; mimeType: string }),
      webViewLink: file.webViewLink,
      thumbnailLink: file.thumbnailLink,
      createdTime: file.createdTime,
      size: file.size,
    }));

    // Categorize files
    const categorized = {
      minutes: files.filter((f: { category: string }) => f.category === "minutes"),
      transcript: files.filter((f: { category: string }) => f.category === "transcript"),
      photo: files.filter((f: { category: string }) => f.category === "photo"),
      other: files.filter((f: { category: string }) => f.category === "other"),
    };

    return NextResponse.json({
      files,
      categorized,
      total: files.length,
      source: "google_drive" as const,
    });
  } catch (error) {
    console.error("[drive/oauth/files] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch files from Drive",
        details: error instanceof Error ? error.message : String(error),
        source: "error" as const,
      },
      { status: 500 }
    );
  }
}

// Categorize file based on name and mime type
function categorizeFile(file: { name: string; mimeType: string }): "minutes" | "transcript" | "photo" | "other" {
  const name = file.name.toLowerCase();
  const mimeType = file.mimeType;

  // Minutes (議事録)
  if (
    name.includes("議事録") ||
    name.includes("mtg") ||
    name.includes("meeting") ||
    mimeType === "application/vnd.google-apps.document"
  ) {
    return "minutes";
  }

  // Transcript (文字起こし)
  if (name.includes("transcript") || name.includes("文字起こし") || name.includes("トランスクリプト")) {
    return "transcript";
  }

  // Photo
  if (
    mimeType.startsWith("image/") ||
    name.includes("photo") ||
    name.includes("写真")
  ) {
    return "photo";
  }

  return "other";
}
