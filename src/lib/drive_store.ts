/**
 * Google Drive integration store.
 * Mock implementation — replace with real Google Drive API in production.
 */

export interface DriveFolder {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriveFile {
  id: string;
  folderId: string;
  name: string;
  mimeType: string;
  category: "minutes" | "transcript" | "photo" | "other";
  url: string;
  createdAt: string;
}

// --- Mock data ---

const folders: DriveFolder[] = [
  {
    id: "folder_001",
    name: "spring_academy_2026",
    url: "https://drive.google.com/drive/folders/abc001",
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-02-02T09:00:00Z",
  },
  {
    id: "folder_002",
    name: "carb_loading_campaign",
    url: "https://drive.google.com/drive/folders/abc002",
    createdAt: "2026-01-28T14:00:00Z",
    updatedAt: "2026-02-01T16:30:00Z",
  },
  {
    id: "folder_003",
    name: "event_nutrition_seminar",
    url: "https://drive.google.com/drive/folders/abc003",
    createdAt: "2026-01-20T09:00:00Z",
    updatedAt: "2026-01-31T11:00:00Z",
  },
];

const files: DriveFile[] = [
  // folder_001
  { id: "file_001", folderId: "folder_001", name: "MTG議事録_20260201.docx", mimeType: "application/vnd.google-apps.document", category: "minutes", url: "https://drive.google.com/file/d/f001", createdAt: "2026-02-01T10:30:00Z" },
  { id: "file_002", folderId: "folder_001", name: "企画書_スプリングアカデミー.pdf", mimeType: "application/pdf", category: "other", url: "https://drive.google.com/file/d/f002", createdAt: "2026-02-01T11:00:00Z" },
  { id: "file_003", folderId: "folder_001", name: "transcript_mtg_0201.txt", mimeType: "text/plain", category: "transcript", url: "https://drive.google.com/file/d/f003", createdAt: "2026-02-01T11:30:00Z" },
  { id: "file_004", folderId: "folder_001", name: "photo_academy_01.jpg", mimeType: "image/jpeg", category: "photo", url: "https://drive.google.com/file/d/f004", createdAt: "2026-02-01T12:00:00Z" },
  { id: "file_005", folderId: "folder_001", name: "photo_academy_02.jpg", mimeType: "image/jpeg", category: "photo", url: "https://drive.google.com/file/d/f005", createdAt: "2026-02-01T12:05:00Z" },
  { id: "file_006", folderId: "folder_001", name: "photo_food_sample.png", mimeType: "image/png", category: "photo", url: "https://drive.google.com/file/d/f006", createdAt: "2026-02-02T09:00:00Z" },
  // folder_002
  { id: "file_007", folderId: "folder_002", name: "議事録_カーボローディング企画.docx", mimeType: "application/vnd.google-apps.document", category: "minutes", url: "https://drive.google.com/file/d/f007", createdAt: "2026-01-28T14:30:00Z" },
  { id: "file_008", folderId: "folder_002", name: "transcript_meeting_0128.txt", mimeType: "text/plain", category: "transcript", url: "https://drive.google.com/file/d/f008", createdAt: "2026-01-28T15:00:00Z" },
  { id: "file_009", folderId: "folder_002", name: "evidence_hawley_1997.pdf", mimeType: "application/pdf", category: "other", url: "https://drive.google.com/file/d/f009", createdAt: "2026-01-29T10:00:00Z" },
  { id: "file_010", folderId: "folder_002", name: "photo_carb_meal.jpg", mimeType: "image/jpeg", category: "photo", url: "https://drive.google.com/file/d/f010", createdAt: "2026-02-01T16:30:00Z" },
  // folder_003
  { id: "file_011", folderId: "folder_003", name: "セミナー企画概要.docx", mimeType: "application/vnd.google-apps.document", category: "minutes", url: "https://drive.google.com/file/d/f011", createdAt: "2026-01-20T09:30:00Z" },
  { id: "file_012", folderId: "folder_003", name: "photo_seminar_venue.jpg", mimeType: "image/jpeg", category: "photo", url: "https://drive.google.com/file/d/f012", createdAt: "2026-01-31T11:00:00Z" },
];

let idCounter = 100;

function nextId(prefix: string): string {
  idCounter++;
  return `${prefix}_${String(idCounter).padStart(3, "0")}`;
}

// --- Store ---

export const driveFolderStore = {
  list: () => [...folders].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  get: (id: string) => folders.find((f) => f.id === id),
  create: (name: string) => {
    const now = new Date().toISOString();
    const f: DriveFolder = {
      id: nextId("folder"),
      name,
      url: `https://drive.google.com/drive/folders/${nextId("gd")}`,
      createdAt: now,
      updatedAt: now,
    };
    folders.push(f);
    return f;
  },
};

export const driveFileStore = {
  listByFolder: (folderId: string) => files.filter((f) => f.folderId === folderId),
  create: (data: Omit<DriveFile, "id" | "createdAt">) => {
    const f: DriveFile = {
      ...data,
      id: nextId("file"),
      createdAt: new Date().toISOString(),
    };
    files.push(f);
    // update folder updatedAt
    const folder = folders.find((fd) => fd.id === data.folderId);
    if (folder) folder.updatedAt = f.createdAt;
    return f;
  },
};
