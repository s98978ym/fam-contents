"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { sampleCampaigns, sampleVariants } from "@/lib/sample_data";
import type { ChannelVariant, Campaign } from "@/types/content_package";

// ---------------------------------------------------------------------------
// Types & config
// ---------------------------------------------------------------------------

type Objective = "acquisition" | "retention" | "trust" | "recruitment" | "event";

const OBJECTIVE_CONFIG: Record<Objective, { label: string; bar: string; barHover: string; dot: string; text: string; border: string; bg: string; headerBg: string }> = {
  acquisition: { label: "新規獲得",       bar: "bg-indigo-400",  barHover: "bg-indigo-500",  dot: "bg-indigo-500 ring-indigo-200",  text: "text-indigo-600",  border: "border-indigo-200",  bg: "bg-indigo-50",  headerBg: "bg-indigo-500" },
  retention:   { label: "リテンション",   bar: "bg-teal-400",    barHover: "bg-teal-500",    dot: "bg-teal-500 ring-teal-200",      text: "text-teal-600",    border: "border-teal-200",    bg: "bg-teal-50",    headerBg: "bg-teal-500" },
  trust:       { label: "信頼構築",       bar: "bg-violet-400",  barHover: "bg-violet-500",  dot: "bg-violet-500 ring-violet-200",  text: "text-violet-600",  border: "border-violet-200",  bg: "bg-violet-50",  headerBg: "bg-violet-500" },
  recruitment: { label: "採用",           bar: "bg-amber-400",   barHover: "bg-amber-500",   dot: "bg-amber-500 ring-amber-200",    text: "text-amber-600",   border: "border-amber-200",   bg: "bg-amber-50",   headerBg: "bg-amber-500" },
  event:       { label: "イベント",       bar: "bg-rose-400",    barHover: "bg-rose-500",    dot: "bg-rose-500 ring-rose-200",      text: "text-rose-600",    border: "border-rose-200",    bg: "bg-rose-50",    headerBg: "bg-rose-500" },
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  planning:  { label: "準備中", cls: "bg-slate-100 text-slate-500" },
  active:    { label: "実施中", cls: "bg-emerald-50 text-emerald-600" },
  completed: { label: "完了",   cls: "bg-sky-50 text-sky-600" },
};

const CHANNEL_LABEL: Record<string, string> = {
  instagram_reels: "IG Reels",
  instagram_stories: "IG Stories",
  instagram_feed: "IG Feed",
  event_lp: "LP",
  note: "note",
  line: "LINE",
};

const CHANNEL_COLOR: Record<string, string> = {
  instagram_reels: "bg-gradient-to-r from-pink-500 to-purple-500",
  instagram_stories: "bg-gradient-to-r from-orange-400 to-pink-500",
  instagram_feed: "bg-gradient-to-r from-purple-500 to-indigo-500",
  event_lp: "bg-emerald-500",
  note: "bg-slate-700",
  line: "bg-green-500",
};

const VARIANT_STATUS: Record<string, { label: string; cls: string }> = {
  draft:    { label: "下書き",     cls: "text-slate-500 bg-slate-100" },
  review:   { label: "レビュー待ち", cls: "text-amber-600 bg-amber-50" },
  approved: { label: "承認済み",    cls: "text-emerald-600 bg-emerald-50" },
  published:{ label: "配信済み",    cls: "text-sky-600 bg-sky-50" },
};

const WEEK_OPTIONS = [
  { value: 1, label: "1w" },
  { value: 2, label: "2w" },
  { value: 4, label: "4w" },
  { value: 8, label: "8w" },
  { value: 12, label: "12w" },
  { value: 24, label: "24w" },
];

// ---------------------------------------------------------------------------
// Assignee avatar colors & component
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  "bg-rose-500", "bg-sky-500", "bg-amber-500", "bg-emerald-500",
  "bg-violet-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500",
  "bg-lime-500", "bg-fuchsia-500", "bg-teal-500", "bg-red-500",
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function AssigneeAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const color = avatarColor(name);
  const initial = name.slice(0, 1);
  const sizeMap = { sm: "w-6 h-6 text-xs", md: "w-7 h-7 text-sm", lg: "w-8 h-8 text-base" };
  return (
    <span className={`${color} ${sizeMap[size]} rounded-full inline-flex items-center justify-center text-white font-bold shrink-0 ring-1 ring-white`} title={name}>
      {initial}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function fmtDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getVariantSummary(v: { body?: Record<string, unknown> }): string {
  if (!v.body) return "";
  const b = v.body;
  return String(b.hook ?? b.title ?? b.title_option1 ?? b.message_text ?? b.slide1_cover ?? b.countdown_title ?? "").slice(0, 40);
}

// ---------------------------------------------------------------------------
// Popover for timeline dot
// ---------------------------------------------------------------------------

interface DotInfo {
  variant: ChannelVariant;
  campaign: Campaign;
  objective: Objective;
  x: number;
  y: number;
}

function fmtISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function DotPopover({ info, onClose }: { info: DotInfo; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const v = info.variant;
  const cfg = OBJECTIVE_CONFIG[info.objective];
  const vs = VARIANT_STATUS[v.status] ?? VARIANT_STATUS.draft;
  const chColor = CHANNEL_COLOR[v.channel] ?? "bg-slate-500";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
      style={{ left: Math.min(info.x - 136, window.innerWidth - 300), top: info.y + 12 }}
    >
      <div className={`${cfg.headerBg} px-4 py-2 flex items-center justify-between`}>
        <span className="text-white text-xs font-medium truncate">{info.campaign.name}</span>
        <button onClick={onClose} className="text-white/70 hover:text-white ml-2 shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`${chColor} text-white text-[10px] font-semibold px-2 py-0.5 rounded`}>
            {CHANNEL_LABEL[v.channel] ?? v.channel}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${vs.cls}`}>{vs.label}</span>
        </div>
        <p className="text-sm text-slate-800 font-medium leading-snug mb-2">
          {getVariantSummary(v) || "(内容なし)"}
        </p>
        {v.scheduled_at && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>{new Date(v.scheduled_at).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}</span>
          </div>
        )}
        {v.assignee && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
            <AssigneeAvatar name={v.assignee} size="sm" />
            <span>{v.assignee}</span>
          </div>
        )}
        <div className="border-t border-slate-100 pt-2 mt-1">
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
            ドラッグで日程を変更できます
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG Icons (small inline)
// ---------------------------------------------------------------------------

function IconObj({ obj }: { obj: Objective }) {
  const cls = "w-4 h-4";
  switch (obj) {
    case "acquisition": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
    case "retention": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
    case "trust": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
    case "recruitment": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case "event": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
  }
}

// ---------------------------------------------------------------------------
// NewCampaignForm
// ---------------------------------------------------------------------------

function NewCampaignForm({ onSave, onCancel }: { onSave: (data: Omit<Campaign, "id">) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState<Objective>("acquisition");
  const [startDate, setStartDate] = useState(fmtISO(new Date()));
  const [endDate, setEndDate] = useState(fmtISO(addDays(new Date(), 30)));
  const [status, setStatus] = useState<Campaign["status"]>("planning");

  return (
    <div className="bg-white rounded-xl border border-indigo-200 shadow-sm mb-4 p-4">
      <h3 className="text-sm font-bold text-slate-700 mb-3">新規キャンペーン</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="キャンペーン名" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-300" autoFocus />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 mb-1 block">目的</label>
          <select value={objective} onChange={(e) => setObjective(e.target.value as Objective)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none">
            {(Object.entries(OBJECTIVE_CONFIG) as [Objective, typeof OBJECTIVE_CONFIG[Objective]][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 mb-1 block">ステータス</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as Campaign["status"])} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none">
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 mb-1 block">開始日</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 mb-1 block">終了日</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-md text-xs border border-slate-200 hover:bg-slate-50">キャンセル</button>
        <button onClick={() => { if (!name.trim()) return; onSave({ name: name.trim(), objective, start_date: startDate, end_date: endDate, status, content_ids: [] }); }} disabled={!name.trim()} className={`px-3 py-1.5 rounded-md text-xs font-medium ${name.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-100 text-slate-400"}`}>
          追加
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CampaignEditRow (inline edit in expanded header)
// ---------------------------------------------------------------------------

function CampaignEditRow({ camp, onSave, onCancel }: { camp: Campaign; onSave: (patch: Partial<Campaign>) => void; onCancel: () => void }) {
  const [name, setName] = useState(camp.name);
  const [objective, setObjective] = useState(camp.objective);
  const [status, setStatus] = useState(camp.status);
  const [startDate, setStartDate] = useState(camp.start_date);
  const [endDate, setEndDate] = useState(camp.end_date);

  return (
    <div className="flex items-center gap-2 flex-wrap flex-1">
      <input value={name} onChange={(e) => setName(e.target.value)} className="border border-slate-300 rounded px-2 py-1 text-xs w-40 outline-none" />
      <select value={objective} onChange={(e) => setObjective(e.target.value as Objective)} className="border border-slate-300 rounded px-1.5 py-1 text-[10px] outline-none">
        {(Object.entries(OBJECTIVE_CONFIG) as [Objective, typeof OBJECTIVE_CONFIG[Objective]][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <select value={status} onChange={(e) => setStatus(e.target.value as Campaign["status"])} className="border border-slate-300 rounded px-1.5 py-1 text-[10px] outline-none">
        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-slate-300 rounded px-1.5 py-1 text-[10px] outline-none" />
      <span className="text-[10px] text-slate-400">〜</span>
      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-slate-300 rounded px-1.5 py-1 text-[10px] outline-none" />
      <button onClick={() => onSave({ name, objective, status, start_date: startDate, end_date: endDate })} className="px-2 py-1 rounded text-[10px] font-medium bg-indigo-600 text-white hover:bg-indigo-700">保存</button>
      <button onClick={onCancel} className="px-2 py-1 rounded text-[10px] border border-slate-300 hover:bg-slate-50">取消</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VariantLinker (add existing variants to campaign)
// ---------------------------------------------------------------------------

function VariantLinker({ allVariants, linkedContentIds, onLink }: { allVariants: ChannelVariant[]; linkedContentIds: string[]; onLink: (contentId: string) => void }) {
  const [open, setOpen] = useState(false);
  const unlinked = allVariants.filter((v) => !linkedContentIds.includes(v.content_id));
  const uniqueContentIds = [...new Set(unlinked.map((v) => v.content_id))];

  if (uniqueContentIds.length === 0 && !open) return null;

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium">
          + コンテンツを紐づけ
        </button>
      ) : (
        <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-500">未紐づけコンテンツ</span>
            <button onClick={() => setOpen(false)} className="text-[10px] text-slate-400 hover:text-slate-600">閉じる</button>
          </div>
          {uniqueContentIds.length === 0 ? (
            <p className="text-[10px] text-slate-400">紐づけ可能なコンテンツがありません</p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {uniqueContentIds.map((cid) => {
                const sample = unlinked.find((v) => v.content_id === cid)!;
                const chColor = CHANNEL_COLOR[sample.channel] ?? "bg-slate-500";
                return (
                  <button key={cid} onClick={() => { onLink(cid); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white text-left transition-colors">
                    <span className={`${chColor} text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0`}>{CHANNEL_LABEL[sample.channel] ?? sample.channel}</span>
                    <span className="text-[10px] text-slate-600 truncate">{getVariantSummary(sample) || cid}</span>
                    <span className="text-[10px] text-indigo-500 ml-auto shrink-0">+ 追加</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const [weeks, setWeeks] = useState(4);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);
  const [dotInfo, setDotInfo] = useState<DotInfo | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => [...sampleCampaigns]);
  const [variants, setVariants] = useState<ChannelVariant[]>(() => [...sampleVariants]);
  const [assigneeTab, setAssigneeTab] = useState<string>("all");
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const dragRef = useRef<{ variantId: string; timelineEl: HTMLElement; startX: number; tsMs: number; spanMs: number } | null>(null);
  const [dragPct, setDragPct] = useState<{ id: string; pct: number; dateLabel: string } | null>(null);
  const [dndVariant, setDndVariant] = useState<{ contentId: string; fromCampId: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [assigneeDropdown, setAssigneeDropdown] = useState<string | null>(null);
  const [assigneeDdPos, setAssigneeDdPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); }, []);

  // --- Campaign CRUD ---
  let nextId = useRef(100);
  function addCampaign(data: Omit<Campaign, "id">) {
    nextId.current++;
    const c: Campaign = { ...data, id: `camp_new_${nextId.current}` };
    setCampaigns((prev) => [...prev, c]);
    setShowNewForm(false);
    showToast("キャンペーンを追加しました");
    return c;
  }
  function updateCampaign(id: string, patch: Partial<Campaign>) {
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
  }
  function deleteCampaign(id: string) {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    setExpandedCampaign(null);
    showToast("キャンペーンを削除しました");
  }
  function linkVariant(campId: string, contentId: string) {
    setCampaigns((prev) => prev.map((c) => c.id === campId && !c.content_ids.includes(contentId) ? { ...c, content_ids: [...c.content_ids, contentId] } : c));
  }
  function unlinkVariant(campId: string, contentId: string) {
    setCampaigns((prev) => prev.map((c) => c.id === campId ? { ...c, content_ids: c.content_ids.filter((x) => x !== contentId) } : c));
  }
  function moveVariant(fromCampId: string, toCampId: string, contentId: string) {
    if (fromCampId === toCampId) return;
    setCampaigns((prev) => prev.map((c) => {
      if (c.id === fromCampId) return { ...c, content_ids: c.content_ids.filter((x) => x !== contentId) };
      if (c.id === toCampId && !c.content_ids.includes(contentId)) return { ...c, content_ids: [...c.content_ids, contentId] };
      return c;
    }));
    const target = campaigns.find((c) => c.id === toCampId);
    showToast(`「${target?.name}」に移動しました`);
  }

  function updateVariantAssignee(variantId: string, assignee: string | undefined) {
    setVariants((prev) => prev.map((v) => v.id === variantId ? { ...v, assignee } : v));
    // Also persist to localStorage overrides
    try {
      const overrides = JSON.parse(localStorage.getItem("assignee_overrides") ?? "{}");
      if (assignee) { overrides[variantId] = assignee; } else { delete overrides[variantId]; }
      localStorage.setItem("assignee_overrides", JSON.stringify(overrides));
    } catch { /* */ }
    setAssigneeDropdown(null);
    showToast(assignee ? `担当を「${assignee}」に変更しました` : "担当を解除しました");
  }

  const updateVariantDate = useCallback((variantId: string, newDate: Date) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId ? { ...v, scheduled_at: newDate.toISOString() } : v
      )
    );
  }, []);

  const today = useMemo(() => new Date(), []);
  const timelineStart = useMemo(() => startOfWeek(today), [today]);
  const totalDays = weeks * 7;
  const timelineEnd = addDays(timelineStart, totalDays);

  const weekMarkers = useMemo(() => {
    const markers: { date: Date; label: string; offsetPct: number }[] = [];
    for (let i = 0; i <= weeks; i++) {
      const d = addDays(timelineStart, i * 7);
      markers.push({ date: d, label: fmtDate(d), offsetPct: (i * 7 / totalDays) * 100 });
    }
    return markers;
  }, [timelineStart, weeks, totalDays]);

  const grouped = useMemo(() => {
    const map = new Map<Objective, Campaign[]>();
    for (const c of campaigns) {
      const obj = c.objective as Objective;
      if (!map.has(obj)) map.set(obj, []);
      map.get(obj)!.push(c);
    }
    return map;
  }, [campaigns]);

  const [registeredMembers, setRegisteredMembers] = useState<string[]>([]);
  useEffect(() => {
    try { setRegisteredMembers(JSON.parse(localStorage.getItem("registered_members") ?? "[]")); } catch { /* */ }
  }, []);

  const allAssignees = useMemo(() =>
    [...new Set([...registeredMembers, ...variants.map((v) => v.assignee).filter(Boolean) as string[]])].sort()
  , [variants, registeredMembers]);

  function getVariantsForCampaign(contentIds: string[]) {
    return variants.filter((v) => contentIds.includes(v.content_id));
  }

  function getBarStyle(startDate: string, endDate: string) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const tsMs = timelineStart.getTime();
    const teMs = timelineEnd.getTime();
    const spanMs = teMs - tsMs;
    const leftMs = Math.max(s.getTime() - tsMs, 0);
    const rightMs = Math.min(e.getTime() - tsMs, spanMs);
    if (rightMs <= 0 || leftMs >= spanMs) return null;
    return { left: `${(leftMs / spanMs) * 100}%`, width: `${((rightMs - leftMs) / spanMs) * 100}%` };
  }

  function getContentDots(contentIds: string[], campaign: Campaign, objective: Objective) {
    const cvariants = getVariantsForCampaign(contentIds)
      .filter((v) => assigneeTab === "all" || v.assignee === assigneeTab);
    const tsMs = timelineStart.getTime();
    const spanMs = timelineEnd.getTime() - tsMs;
    return cvariants
      .filter((v) => v.scheduled_at)
      .map((v) => {
        const vMs = new Date(v.scheduled_at!).getTime();
        if (vMs < tsMs || vMs > tsMs + spanMs) return null;
        return { offsetPct: ((vMs - tsMs) / spanMs) * 100, variant: v, campaign, objective };
      })
      .filter(Boolean) as { offsetPct: number; variant: ChannelVariant; campaign: Campaign; objective: Objective }[];
  }

  function handleDotClick(e: React.MouseEvent, dot: { variant: ChannelVariant; campaign: Campaign; objective: Objective }) {
    if (dragRef.current) return;
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDotInfo({ variant: dot.variant, campaign: dot.campaign, objective: dot.objective, x: rect.left + rect.width / 2, y: rect.bottom });
  }

  function handleDotDragStart(e: React.MouseEvent, variantId: string, timelineEl: HTMLElement) {
    e.stopPropagation();
    e.preventDefault();
    const tsMs = timelineStart.getTime();
    const spanMs = timelineEnd.getTime() - tsMs;
    dragRef.current = { variantId, timelineEl, startX: e.clientX, tsMs, spanMs };
    setDotInfo(null);

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const rect = dragRef.current.timelineEl.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      const ms = dragRef.current.tsMs + (pct / 100) * dragRef.current.spanMs;
      const d = new Date(ms);
      const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
      setDragPct({ id: variantId, pct, dateLabel });
    }

    function onUp(ev: MouseEvent) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (!dragRef.current) return;
      const rect = dragRef.current.timelineEl.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      const newMs = dragRef.current.tsMs + (pct / 100) * dragRef.current.spanMs;
      updateVariantDate(variantId, new Date(newMs));
      setDragPct(null);
      setTimeout(() => { dragRef.current = null; }, 50);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const todayPct = useMemo(() => {
    const tsMs = timelineStart.getTime();
    const spanMs = timelineEnd.getTime() - tsMs;
    return ((today.getTime() - tsMs) / spanMs) * 100;
  }, [today, timelineStart, timelineEnd]);

  // Count all dots across campaigns
  const totalDots = useMemo(() => {
    let count = 0;
    for (const c of campaigns) {
      count += getVariantsForCampaign(c.content_ids).filter((v) => v.scheduled_at).length;
    }
    return count;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns, variants]);

  return (
    <div>
      {/* Popover */}
      {dotInfo && <DotPopover info={dotInfo} onClose={() => setDotInfo(null)} />}

      {/* Toast */}
      {toast && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">{toast}</div>}

      {/* Assignee dropdown portal (fixed to avoid overflow clip) */}
      {assigneeDropdown && (() => {
        const ddVariant = variants.find((vv) => vv.id === assigneeDropdown);
        if (!ddVariant) return null;
        return (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setAssigneeDropdown(null)} />
            <div
              className="fixed z-[61] bg-white rounded-lg shadow-xl border border-slate-200 py-1 w-44 max-h-56 overflow-y-auto"
              style={{ top: assigneeDdPos.top, right: assigneeDdPos.right }}
            >
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase">担当者を選択</div>
              {allAssignees.map((a) => (
                <button
                  key={a}
                  onClick={() => updateVariantAssignee(ddVariant.id, a)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-slate-50 transition-colors ${ddVariant.assignee === a ? "bg-indigo-50" : ""}`}
                >
                  <AssigneeAvatar name={a} size="sm" />
                  <span className="text-xs text-slate-700">{a}</span>
                  {ddVariant.assignee === a && <svg className="w-3 h-3 text-indigo-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </button>
              ))}
              {ddVariant.assignee && (
                <>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => updateVariantAssignee(ddVariant.id, undefined)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-red-50 transition-colors text-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    <span className="text-xs">担当を解除</span>
                  </button>
                </>
              )}
            </div>
          </>
        );
      })()}

      {/* Drag overlay - shows during D&D with drop zone hints */}
      {dndVariant && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2">
            <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            移動先のキャンペーンにドロップしてください
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">キャンペーン</h2>
          <p className="text-sm text-slate-400">目的別の施策とコンテンツ配信スケジュール</p>
        </div>
        <button onClick={() => setShowNewForm(true)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
          + 新規キャンペーン
        </button>
      </div>

      {/* New campaign form */}
      {showNewForm && (
        <NewCampaignForm
          onSave={(data) => addCampaign(data)}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Timeline                                                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header with operation hints */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">タイムライン</span>
            {/* Operation hints */}
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-indigo-400 inline-flex items-center justify-center"><span className="w-1 h-1 rounded-full bg-white" /></span>
                クリックで詳細 / ドラッグで日程変更
              </span>
              <span className="border-l border-slate-200 pl-3 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                キャンペーンをクリックで展開・編集
              </span>
            </div>
          </div>
          <div className="flex gap-0.5 bg-slate-200/60 rounded-lg p-0.5">
            {WEEK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setWeeks(opt.value); setDotInfo(null); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  weeks === opt.value ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Assignee tabs */}
        {allAssignees.length > 0 && (
          <div className="flex items-center gap-1.5 px-5 py-2 border-b border-slate-100 bg-white">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <button
              onClick={() => { setAssigneeTab("all"); setDotInfo(null); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                assigneeTab === "all" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              全員
            </button>
            {allAssignees.map((a) => (
              <button
                key={a}
                onClick={() => { setAssigneeTab(a); setDotInfo(null); }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                  assigneeTab === a
                    ? "bg-indigo-600 text-white ring-2 ring-indigo-200"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <AssigneeAvatar name={a} size="sm" />
                <span>{a}</span>
              </button>
            ))}
          </div>
        )}

        <div className="px-5 pt-3 pb-4">
          {/* Date labels */}
          <div className="flex items-end">
            <div className="w-52 shrink-0" />
            <div className="flex-1 relative h-4">
              {weekMarkers.map((m, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] font-medium text-slate-400 -translate-x-1/2 tabular-nums"
                  style={{ left: `${m.offsetPct}%` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Ruler */}
          <div className="flex items-center mt-0.5 mb-2">
            <div className="w-52 shrink-0" />
            <div className="flex-1 relative h-px bg-slate-200">
              {weekMarkers.map((m, i) => (
                <div key={i} className="absolute w-px h-1.5 bg-slate-300 -top-px" style={{ left: `${m.offsetPct}%` }} />
              ))}
              {todayPct >= 0 && todayPct <= 100 && (
                <div className="absolute -top-1 flex flex-col items-center" style={{ left: `${todayPct}%` }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          </div>

          {/* Gantt rows */}
          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([objective, campList]) => {
              const cfg = OBJECTIVE_CONFIG[objective];
              return (
                <div key={objective}>
                  {/* Category header */}
                  <div className="flex items-center mb-1">
                    <div className="w-52 shrink-0 flex items-center gap-1.5 pr-3">
                      <span className={cfg.text}><IconObj obj={objective} /></span>
                      <span className={`text-[11px] font-bold ${cfg.text} uppercase tracking-wide`}>{cfg.label}</span>
                    </div>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  {/* Campaigns */}
                  {campList.map((camp) => {
                    const barStyle = getBarStyle(camp.start_date, camp.end_date);
                    const dots = getContentDots(camp.content_ids, camp, objective);
                    const isActive = expandedCampaign === camp.id;
                    const st = STATUS_LABEL[camp.status] ?? STATUS_LABEL.planning;
                    const campVariants = getVariantsForCampaign(camp.content_ids);
                    const isDropTarget = dropTarget === camp.id;
                    const isDropCandidate = dndVariant && dndVariant.fromCampId !== camp.id;
                    return (
                      <div
                        key={camp.id}
                        className={`rounded-lg transition-all ${isDropTarget ? "ring-2 ring-indigo-400 bg-indigo-50/50 shadow-md" : ""} ${isDropCandidate && !isDropTarget ? "ring-1 ring-dashed ring-slate-300 bg-slate-50/30" : ""}`}
                        onDragOver={(e) => { if (dndVariant && dndVariant.fromCampId !== camp.id) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropTarget(camp.id); } }}
                        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget((prev) => prev === camp.id ? null : prev); }}
                        onDrop={(e) => { e.preventDefault(); if (dndVariant) { moveVariant(dndVariant.fromCampId, camp.id, dndVariant.contentId); setDndVariant(null); } setDropTarget(null); }}
                      >
                        <div
                          className={`flex items-center py-1 cursor-pointer group rounded-lg transition-colors ${isActive ? "bg-slate-50" : "hover:bg-slate-50/50"}`}
                          onClick={() => { setExpandedCampaign(isActive ? null : camp.id); setExpandedVariant(null); }}
                        >
                          <div className="w-52 shrink-0 truncate pr-3 pl-6 flex items-center gap-1.5">
                            {/* Hover edit icon */}
                            <span className={`text-xs transition-colors ${isActive ? "text-slate-800 font-medium" : "text-slate-500 group-hover:text-slate-700"}`}>
                              {camp.name}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[9px] rounded-full font-semibold shrink-0 ${st.cls}`}>{st.label}</span>
                            <svg className={`w-3 h-3 text-slate-300 transition-transform shrink-0 ${isActive ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <div className="flex-1 relative h-7" ref={(el) => { if (el) el.dataset.timeline = "1"; }}>
                            {/* Today vertical line */}
                            {todayPct >= 0 && todayPct <= 100 && (
                              <div className="absolute top-0 bottom-0 w-px bg-red-500/10" style={{ left: `${todayPct}%` }} />
                            )}
                            {/* Bar */}
                            {barStyle && (
                              <div
                                className={`absolute top-1.5 h-4 rounded-full transition-colors ${isActive ? cfg.barHover : cfg.bar} ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-90"}`}
                                style={{ left: barStyle.left, width: barStyle.width }}
                              />
                            )}
                            {/* Drop target label */}
                            {isDropTarget && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-20">
                                  ここにドロップ
                                </span>
                              </div>
                            )}
                            {/* Dots */}
                            {dots.map((dot, di) => {
                              const isDragging = dragPct?.id === dot.variant.id;
                              const leftPct = isDragging ? dragPct.pct : dot.offsetPct;
                              const chLabel = CHANNEL_LABEL[dot.variant.channel] ?? dot.variant.channel;
                              const assignee = dot.variant.assignee;
                              return (
                                <div key={di} className="absolute -translate-x-2.5" style={{ left: `${leftPct}%`, top: 0 }}>
                                  {/* Date label while dragging */}
                                  {isDragging && dragPct.dateLabel && (
                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-30 tabular-nums">
                                      {dragPct.dateLabel}
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                                    </div>
                                  )}
                                  <button
                                    className={`w-6 h-6 rounded-full z-10 flex items-center justify-center transition-all ring-2 ring-white hover:ring-4 hover:scale-125 ${cfg.dot} shadow-sm ${isDragging ? "scale-150 ring-4 cursor-grabbing" : "cursor-grab hover:shadow-md"} relative top-0.5`}
                                    onClick={(e) => handleDotClick(e, dot)}
                                    onMouseDown={(e) => {
                                      const timelineEl = (e.currentTarget.parentElement!.parentElement as HTMLElement);
                                      handleDotDragStart(e, dot.variant.id, timelineEl);
                                    }}
                                    title={`${chLabel} — ${getVariantSummary(dot.variant) || "(内容なし)"}${assignee ? `\n担当: ${assignee}` : ""}\nドラッグで日程変更`}
                                  >
                                    {assignee ? (
                                      <span className={`w-full h-full rounded-full flex items-center justify-center text-xs font-bold text-white ${avatarColor(assignee)}`}>
                                        {assignee.slice(0, 1)}
                                      </span>
                                    ) : (
                                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Expanded detail panel */}
                        {isActive && (
                          <div className="ml-6 mr-2 my-1 rounded-lg border border-slate-200 bg-white overflow-hidden" onClick={(e) => { e.stopPropagation(); setAssigneeDropdown(null); }}>
                            {/* Header with edit/delete */}
                            <div className={`px-4 py-2 ${cfg.bg} border-b ${cfg.border} flex items-center justify-between`}>
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {editingCampaign === camp.id ? (
                                  <CampaignEditRow camp={camp} onSave={(patch) => { updateCampaign(camp.id, patch); setEditingCampaign(null); showToast("更新しました"); }} onCancel={() => setEditingCampaign(null)} />
                                ) : (
                                  <>
                                    <span className="text-xs font-semibold text-slate-700">{camp.name}</span>
                                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${st.cls}`}>{st.label}</span>
                                    <span className="text-[10px] text-slate-400 tabular-nums">{camp.start_date} — {camp.end_date}</span>
                                  </>
                                )}
                              </div>
                              {editingCampaign !== camp.id && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => setEditingCampaign(camp.id)} className="p-1.5 rounded-md hover:bg-white/60 text-slate-500 hover:text-indigo-600 transition-colors" title="編集">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                  <button onClick={() => { if (confirm(`「${camp.name}」を削除しますか？`)) deleteCampaign(camp.id); }} className="p-1.5 rounded-md hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors" title="削除">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              {/* Linked variants header with D&D hint */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">コンテンツ ({campVariants.length})</span>
                                {campVariants.length > 0 && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
                                    ドラッグで他キャンペーンへ移動
                                  </span>
                                )}
                              </div>
                              {campVariants.length === 0 ? (
                                <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-lg">
                                  <p className="text-xs text-slate-400 mb-1">紐づけられたコンテンツはありません</p>
                                  <p className="text-[10px] text-slate-300">下の「+ コンテンツを紐づけ」から追加</p>
                                </div>
                              ) : (
                                <div className="space-y-1.5 mb-3">
                                  {campVariants.map((v) => {
                                    const vs = VARIANT_STATUS[v.status] ?? VARIANT_STATUS.draft;
                                    const chColor = CHANNEL_COLOR[v.channel] ?? "bg-slate-500";
                                    const isVarExpanded = expandedVariant === v.id;
                                    const isDndTarget = dndVariant?.contentId === v.content_id;
                                    return (
                                      <div
                                        key={v.id}
                                        draggable
                                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDndVariant({ contentId: v.content_id, fromCampId: camp.id }); }}
                                        onDragEnd={() => { setDndVariant(null); setDropTarget(null); }}
                                        className={`rounded-lg border transition-all overflow-hidden ${isVarExpanded ? "border-slate-300 shadow-sm" : "border-slate-100 hover:border-slate-300"} ${isDndTarget ? "opacity-40 scale-95" : ""} group/card`}
                                      >
                                        <div className={`px-3 py-2 flex items-center justify-between gap-3 cursor-pointer ${isVarExpanded ? "bg-slate-50" : "hover:bg-slate-50/50"}`} onClick={() => setExpandedVariant(isVarExpanded ? null : v.id)}>
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {/* Grip handle - prominent on hover */}
                                            <div className="cursor-grab active:cursor-grabbing shrink-0 p-0.5 rounded hover:bg-slate-200 transition-colors" title="ドラッグで他キャンペーンへ移動">
                                              <svg className="w-3.5 h-3.5 text-slate-300 group-hover/card:text-slate-500 transition-colors" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
                                            </div>
                                            <span className={`${chColor} text-white text-[10px] font-semibold px-2 py-0.5 rounded shrink-0`}>{CHANNEL_LABEL[v.channel] ?? v.channel}</span>
                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 ${vs.cls}`}>{vs.label}</span>
                                            <span className="text-xs text-slate-600 truncate">{getVariantSummary(v) || "(内容なし)"}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {/* Assignee avatar - click to open dropdown */}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (assigneeDropdown === v.id) { setAssigneeDropdown(null); return; }
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                setAssigneeDdPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                                setAssigneeDropdown(v.id);
                                              }}
                                              className="rounded-full hover:ring-2 hover:ring-indigo-300 transition-all"
                                              title={v.assignee ? `担当: ${v.assignee}（クリックで変更）` : "担当者を割り当て"}
                                            >
                                              {v.assignee ? (
                                                <AssigneeAvatar name={v.assignee} size="sm" />
                                              ) : (
                                                <span className="w-6 h-6 rounded-full inline-flex items-center justify-center bg-slate-200 text-slate-400 hover:bg-slate-300 transition-colors shrink-0">
                                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                </span>
                                              )}
                                            </button>
                                            {v.scheduled_at && <span className="text-[10px] text-slate-400 tabular-nums">{new Date(v.scheduled_at).toLocaleDateString("ja-JP")}</span>}
                                            <button onClick={(e) => { e.stopPropagation(); unlinkVariant(camp.id, v.content_id); }} className="p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors" title="紐づけ解除">
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                          </div>
                                        </div>
                                        {isVarExpanded && v.body && (
                                          <div className="px-3 pb-2 border-t border-slate-100 bg-white">
                                            <div className="pt-2 space-y-1">
                                              {Object.entries(v.body).map(([key, val]) => {
                                                if (val == null) return null;
                                                const display = Array.isArray(val) ? val.join(", ") : String(val);
                                                return (<div key={key} className="flex gap-3 text-xs"><span className="text-slate-400 shrink-0 w-24 text-right font-mono">{key}</span><span className="text-slate-700 whitespace-pre-wrap">{display}</span></div>);
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {/* Add variant */}
                              <VariantLinker
                                allVariants={variants}
                                linkedContentIds={camp.content_ids}
                                onLink={(contentId) => linkVariant(camp.id, contentId)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
