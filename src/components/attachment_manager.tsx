"use client";

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 60_000) return "たった今";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}分前`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}時間前`;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
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
// File Preview (別ウィンドウで閲覧)
// ---------------------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const VIEWER_STYLE = `*{margin:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f8fafc;color:#334155}
.bar{background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 20px;display:flex;align-items:center;gap:12px}
.bar .name{font-size:14px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar .meta{font-size:11px;color:#94a3b8}
.bar .dl{font-size:12px;color:#6366f1;text-decoration:none;font-weight:500;padding:6px 12px;border:1px solid #c7d2fe;border-radius:6px}
.bar .dl:hover{background:#eef2ff}
.content{display:flex;justify-content:center;align-items:center;min-height:calc(100vh - 53px);padding:20px;background:#1e293b}
.content.light{background:#f8fafc}
.content img{max-width:100%;max-height:calc(100vh - 93px);object-fit:contain;border-radius:4px;box-shadow:0 4px 24px rgba(0,0,0,.3)}
.content video{max-width:100%;max-height:calc(100vh - 93px);border-radius:4px}
.content embed,.content iframe{width:100%;height:calc(100vh - 53px);border:none}
.content pre{width:100%;max-width:900px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:24px;font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-word;overflow:auto;max-height:calc(100vh - 93px)}
.fallback{text-align:center;color:#94a3b8}
.fallback .icon{font-size:64px;margin-bottom:16px}
.fallback .fname{font-size:18px;font-weight:600;color:#475569;margin-bottom:8px}
.fallback .hint{font-size:13px;margin-bottom:20px}
.fallback .btn{display:inline-block;padding:10px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500}
.fallback .btn:hover{background:#4f46e5}
.sheet-tabs{display:flex;gap:0;background:#fff;border-bottom:1px solid #e2e8f0;padding:0 20px;overflow-x:auto}
.sheet-tabs button{padding:8px 16px;font-size:12px;font-weight:500;border:none;background:transparent;color:#64748b;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}
.sheet-tabs button.active{color:#4f46e5;border-bottom-color:#4f46e5;background:#f5f3ff}
.sheet-tabs button:hover{background:#f1f5f9}
.sheet-wrap{overflow:auto;max-height:calc(100vh - 101px);padding:16px}
.sheet-wrap table{border-collapse:collapse;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.sheet-wrap th,.sheet-wrap td{border:1px solid #e2e8f0;padding:6px 10px;font-size:12px;text-align:left;white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis}
.sheet-wrap th{background:#f8fafc;font-weight:600;color:#475569;position:sticky;top:0;z-index:1}
.sheet-wrap td{color:#334155}
.sheet-wrap tr:hover td{background:#f8fafc}`;

function buildBar(name: string, url: string, meta?: string): string {
  return `<div class="bar"><span class="name">${esc(name)}</span>${meta ? `<span class="meta">${esc(meta)}</span>` : ""}<a class="dl" href="${esc(url)}" download="${esc(name)}">ダウンロード</a></div>`;
}

export function openPreview(att: Attachment): void {
  // External URLs: open directly
  if (att.url.startsWith("http")) {
    window.open(att.url, "_blank", "noopener");
    return;
  }

  const mime = att.mimeType || "";
  const meta = [att.added_by, att.size != null ? formatFileSize(att.size) : ""].filter(Boolean).join(" · ");

  if (mime.startsWith("image/")) {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${esc(att.name)}</title><style>${VIEWER_STYLE}</style></head><body>${buildBar(att.name, att.url, meta)}<div class="content"><img src="${esc(att.url)}" alt="${esc(att.name)}"></div></body></html>`);
    w.document.close();
    return;
  }

  if (mime === "application/pdf") {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${esc(att.name)}</title><style>${VIEWER_STYLE}.content{padding:0}</style></head><body>${buildBar(att.name, att.url, meta)}<div class="content light"><embed src="${esc(att.url)}" type="application/pdf"></div></body></html>`);
    w.document.close();
    return;
  }

  if (mime.startsWith("video/")) {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${esc(att.name)}</title><style>${VIEWER_STYLE}</style></head><body>${buildBar(att.name, att.url, meta)}<div class="content"><video src="${esc(att.url)}" controls autoplay></video></div></body></html>`);
    w.document.close();
    return;
  }

  if (mime.startsWith("audio/")) {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${esc(att.name)}</title><style>${VIEWER_STYLE}</style></head><body>${buildBar(att.name, att.url, meta)}<div class="content light"><audio src="${esc(att.url)}" controls autoplay style="width:400px"></audio></div></body></html>`);
    w.document.close();
    return;
  }

  if (mime.startsWith("text/") || mime === "application/json" || mime === "application/xml") {
    fetch(att.url)
      .then((r) => r.text())
      .then((text) => {
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>${esc(att.name)}</title><style>${VIEWER_STYLE}</style></head><body>${buildBar(att.name, att.url, meta)}<div class="content light"><pre>${esc(text)}</pre></div></body></html>`);
        w.document.close();
      });
    return;
  }

  // Spreadsheet files (Excel, CSV, etc.) — parse with SheetJS
  const isSpreadsheet =
    mime.includes("spreadsheet") || mime.includes("excel") || mime === "application/vnd.ms-excel" ||
    mime === "text/csv" || /\.(xlsx?|csv|ods)$/i.test(att.name);
  if (isSpreadsheet) {
    fetch(att.url)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
        const sheetNames = wb.SheetNames;
        const sheetsHtml: Record<string, string> = {};
        for (const name of sheetNames) {
          sheetsHtml[name] = XLSX.utils.sheet_to_html(wb.Sheets[name], { editable: false });
        }
        const w = window.open("", "_blank");
        if (!w) return;
        // Build tab buttons
        const tabs = sheetNames.map((n, i) => `<button class="${i === 0 ? "active" : ""}" onclick="switchSheet('${esc(n).replace(/'/g, "\\'")}',this)">${esc(n)}</button>`).join("");
        // Build sheet content divs
        const sheets = sheetNames.map((n, i) => `<div id="sheet-${i}" class="sheet-wrap" style="${i > 0 ? "display:none" : ""}">${sheetsHtml[n]}</div>`).join("");
        w.document.write(`<!DOCTYPE html><html><head><title>${esc(att.name)}</title><style>${VIEWER_STYLE}</style></head><body>
${buildBar(att.name, att.url, meta)}
${sheetNames.length > 1 ? `<div class="sheet-tabs">${tabs}</div>` : ""}
${sheets}
<script>
function switchSheet(name, btn) {
  var divs = document.querySelectorAll('.sheet-wrap');
  divs.forEach(function(d) { d.style.display = 'none'; });
  var buttons = document.querySelectorAll('.sheet-tabs button');
  buttons.forEach(function(b) { b.className = ''; });
  btn.className = 'active';
  var idx = ${JSON.stringify(sheetNames)}.indexOf(name);
  if (idx >= 0) document.getElementById('sheet-' + idx).style.display = 'block';
}
</script>
</body></html>`);
        w.document.close();
      })
      .catch(() => {
        // If parsing fails, fall back to download
        const fi2 = getFileIcon(mime);
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>${esc(att.name)}</title><style>${VIEWER_STYLE}</style></head><body>${buildBar(att.name, att.url, meta)}<div class="content light"><div class="fallback"><div class="icon">${fi2.icon === "XLS" ? "📊" : "📎"}</div><div class="fname">${esc(att.name)}</div><div class="hint">ファイルの読み込みに失敗しました</div><a class="btn" href="${esc(att.url)}" download="${esc(att.name)}">ダウンロードして開く</a></div></div></body></html>`);
        w.document.close();
      });
    return;
  }

  // Fallback: file info page with download button
  const fi = getFileIcon(mime);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${esc(att.name)}</title><style>${VIEWER_STYLE}</style></head><body>${buildBar(att.name, att.url, meta)}<div class="content light"><div class="fallback"><div class="icon">${fi.icon === "PDF" ? "📄" : fi.icon === "XLS" ? "📊" : fi.icon === "PPT" ? "📽" : fi.icon === "DOC" ? "📝" : "📎"}</div><div class="fname">${esc(att.name)}</div><div class="hint">このファイル形式はブラウザでプレビューできません</div><a class="btn" href="${esc(att.url)}" download="${esc(att.name)}">ダウンロードして開く</a></div></div></body></html>`);
  w.document.close();
}

// ---------------------------------------------------------------------------
// AttachmentList (read-only display with added_by/timestamp)
// ---------------------------------------------------------------------------

export function AttachmentList({ attachments, compact }: { attachments: Attachment[]; compact?: boolean }) {
  if (attachments.length === 0) return null;

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {attachments.map((att) => {
        const fi = getFileIcon(att.mimeType);
        return (
          <button
            key={att.id}
            type="button"
            onClick={() => openPreview(att)}
            className={`w-full flex items-center gap-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group text-left ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}
          >
            <span className={`${fi.color} text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0`}>{fi.icon}</span>
            <span className={`${compact ? "text-xs" : "text-sm"} text-slate-700 group-hover:text-indigo-600 truncate transition-colors`}>{att.name}</span>
            {att.added_by && <span className="text-[10px] text-slate-400 shrink-0">{att.added_by}</span>}
            {att.added_at && <span className="text-[10px] text-slate-400 shrink-0">{formatDate(att.added_at)}</span>}
            <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 ml-auto transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
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
  currentUser,
  hideLabel,
}: {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  compact?: boolean;
  currentUser?: string | null;
  hideLabel?: boolean;
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
        added_by: currentUser || undefined,
        added_at: new Date().toISOString(),
      });
    }
    onChange([...attachments, ...newAtts]);
  }, [attachments, onChange, currentUser]);

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
        added_by: currentUser || undefined,
        added_at: new Date().toISOString(),
      },
    ]);
    setUrlInput("");
    setShowUrlInput(false);
  }, [attachments, onChange, urlInput, currentUser]);

  const remove = useCallback((id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  }, [attachments, onChange]);

  return (
    <div>
      {!hideLabel && (
        <label className={`block font-medium text-gray-700 ${compact ? "text-xs mb-1" : "text-sm mb-1.5"}`}>
          参考資料
        </label>
      )}

      {/* Existing attachments */}
      {attachments.length > 0 && (
        <div className="space-y-1 mb-2">
          {attachments.map((att) => {
            const fi = getFileIcon(att.mimeType);
            return (
              <div key={att.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 group">
                <span className={`${fi.color} text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0`}>{fi.icon}</span>
                <button
                  type="button"
                  onClick={() => openPreview(att)}
                  className="text-xs text-slate-700 hover:text-indigo-600 truncate transition-colors flex-1 text-left"
                  title={att.name}
                >
                  {att.name}
                </button>
                {att.added_by && <span className="text-[10px] text-slate-400 shrink-0">{att.added_by}</span>}
                {att.added_at && <span className="text-[10px] text-slate-400 shrink-0">{formatDate(att.added_at)}</span>}
                <button type="button" onClick={() => openPreview(att)} className="p-0.5 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 transition-colors shrink-0" title="別ウィンドウで開く">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
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
