"use client";

import { useState, useRef, useCallback } from "react";
import type { Attachment } from "@/types/content_package";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _seq = 0;
function nextAttachmentId(): string {
  _seq++;
  return `att_${Date.now()}_${_seq}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MIME_ICON: Record<string, { icon: string; color: string }> = {
  "application/pdf": { icon: "PDF", color: "bg-red-100 text-red-600" },
  "image/": { icon: "IMG", color: "bg-blue-100 text-blue-600" },
  "video/": { icon: "VID", color: "bg-purple-100 text-purple-600" },
  "text/": { icon: "TXT", color: "bg-slate-100 text-slate-600" },
  "application/vnd.openxmlformats": { icon: "DOC", color: "bg-indigo-100 text-indigo-600" },
  "application/msword": { icon: "DOC", color: "bg-indigo-100 text-indigo-600" },
  "application/vnd.ms-excel": { icon: "XLS", color: "bg-green-100 text-green-600" },
  "application/vnd.ms-powerpoint": { icon: "PPT", color: "bg-orange-100 text-orange-600" },
};

function getFileIcon(mimeType?: string): { icon: string; color: string } {
  if (!mimeType) return { icon: "FILE", color: "bg-slate-100 text-slate-500" };
  for (const [key, val] of Object.entries(MIME_ICON)) {
    if (mimeType.startsWith(key)) return val;
  }
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return { icon: "XLS", color: "bg-green-100 text-green-600" };
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return { icon: "PPT", color: "bg-orange-100 text-orange-600" };
  return { icon: "FILE", color: "bg-slate-100 text-slate-500" };
}

function isUrlString(s: string): boolean {
  return /^https?:\/\/.+/i.test(s.trim());
}

// ---------------------------------------------------------------------------
// AttachmentList (read-only display)
// ---------------------------------------------------------------------------

export function AttachmentList({ attachments, compact }: { attachments: Attachment[]; compact?: boolean }) {
  if (attachments.length === 0) return null;

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {attachments.map((att) => {
        const fi = getFileIcon(att.mimeType);
        return (
          <a
            key={att.id}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}
          >
            <span className={`${fi.color} text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0`}>{fi.icon}</span>
            <span className={`${compact ? "text-xs" : "text-sm"} text-slate-700 group-hover:text-indigo-600 truncate transition-colors`}>{att.name}</span>
            {att.size != null && <span className="text-[10px] text-slate-400 shrink-0">{formatFileSize(att.size)}</span>}
            <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 ml-auto transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AttachmentUploader (add / remove attachments)
// ---------------------------------------------------------------------------

export function AttachmentUploader({
  attachments,
  onChange,
  compact,
}: {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  compact?: boolean;
}) {
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newAtts: Attachment[] = [];
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      newAtts.push({
        id: nextAttachmentId(),
        name: file.name,
        url,
        mimeType: file.type || undefined,
        size: file.size,
        added_at: new Date().toISOString(),
      });
    }
    onChange([...attachments, ...newAtts]);
  }, [attachments, onChange]);

  const addUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!isUrlString(trimmed)) return;
    const name = trimmed.split("/").pop()?.split("?")[0] || trimmed;
    onChange([
      ...attachments,
      {
        id: nextAttachmentId(),
        name: decodeURIComponent(name),
        url: trimmed,
        added_at: new Date().toISOString(),
      },
    ]);
    setUrlInput("");
    setShowUrlInput(false);
  }, [attachments, onChange, urlInput]);

  const remove = useCallback((id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  }, [attachments, onChange]);

  return (
    <div>
      <label className={`block font-medium text-gray-700 ${compact ? "text-xs mb-1" : "text-sm mb-1.5"}`}>
        参考資料
      </label>

      {/* Existing attachments */}
      {attachments.length > 0 && (
        <div className="space-y-1 mb-2">
          {attachments.map((att) => {
            const fi = getFileIcon(att.mimeType);
            return (
              <div key={att.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 group">
                <span className={`${fi.color} text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0`}>{fi.icon}</span>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-700 hover:text-indigo-600 truncate transition-colors flex-1"
                  title={att.name}
                >
                  {att.name}
                </a>
                {att.size != null && <span className="text-[10px] text-slate-400 shrink-0">{formatFileSize(att.size)}</span>}
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-0.5 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 transition-colors shrink-0" title="別ウィンドウで開く">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button onClick={() => remove(att.id)} className="p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors shrink-0" title="削除">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer ${
          dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        } ${compact ? "p-2" : "p-3"}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) { addFiles(e.target.files); e.target.value = ""; } }}
        />
        <div className="flex items-center justify-center gap-2">
          <svg className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span className={`${compact ? "text-[11px]" : "text-xs"} text-gray-500`}>
            ファイルをドロップ、またはクリックして添付
          </span>
        </div>
      </div>

      {/* URL input toggle */}
      <div className="mt-1.5">
        {!showUrlInput ? (
          <button
            onClick={() => setShowUrlInput(true)}
            className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium"
          >
            + URLで追加
          </button>
        ) : (
          <div className="flex gap-1.5">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addUrl(); }}
              placeholder="https://..."
              className="flex-1 border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-indigo-300"
              autoFocus
            />
            <button
              onClick={addUrl}
              disabled={!isUrlString(urlInput)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium ${
                isUrlString(urlInput) ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-100 text-slate-400"
              }`}
            >
              追加
            </button>
            <button
              onClick={() => { setShowUrlInput(false); setUrlInput(""); }}
              className="px-1.5 py-1 rounded-md text-[11px] border border-slate-200 hover:bg-slate-50"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
