"use client";

import { useState, useMemo } from "react";
import { sampleCampaigns } from "@/lib/sample_data";
import { sampleVariants } from "@/lib/sample_data";

// ---------------------------------------------------------------------------
// Types & config
// ---------------------------------------------------------------------------

type Objective = "acquisition" | "retention" | "trust" | "recruitment" | "event";

const OBJECTIVE_CONFIG: Record<Objective, { label: string; color: string; icon: string }> = {
  acquisition: { label: "新規獲得", color: "blue", icon: "🎯" },
  retention:   { label: "リテンション", color: "green", icon: "🔄" },
  trust:       { label: "信頼構築", color: "purple", icon: "🛡" },
  recruitment: { label: "採用", color: "orange", icon: "👥" },
  event:       { label: "イベント", color: "pink", icon: "📅" },
};

const OBJECTIVE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; bar: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700",   bar: "bg-blue-400" },
  green:  { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  badge: "bg-green-100 text-green-700",  bar: "bg-green-400" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-700", bar: "bg-purple-400" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-700", bar: "bg-orange-400" },
  pink:   { bg: "bg-pink-50",   border: "border-pink-200",   text: "text-pink-700",   badge: "bg-pink-100 text-pink-700",   bar: "bg-pink-400" },
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  planning:  { label: "準備中", cls: "bg-gray-100 text-gray-600" },
  active:    { label: "実施中", cls: "bg-green-100 text-green-700" },
  completed: { label: "完了", cls: "bg-blue-100 text-blue-700" },
};

const CHANNEL_LABEL: Record<string, string> = {
  instagram_reels: "IG Reels",
  instagram_stories: "IG Stories",
  instagram_feed: "IG Feed",
  event_lp: "LP",
  note: "note",
  line: "LINE",
};

const VARIANT_STATUS: Record<string, { label: string; cls: string }> = {
  draft:            { label: "下書き",     cls: "bg-gray-100 text-gray-600" },
  review_requested: { label: "レビュー待ち", cls: "bg-yellow-100 text-yellow-700" },
  approved:         { label: "承認済み",    cls: "bg-green-100 text-green-700" },
  published:        { label: "配信済み",    cls: "bg-blue-100 text-blue-700" },
};

const WEEK_OPTIONS = [
  { value: 1, label: "1週間" },
  { value: 2, label: "2週間" },
  { value: 4, label: "4週間" },
  { value: 8, label: "8週間" },
  { value: 12, label: "12週間" },
  { value: 24, label: "24週間" },
];

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
  return String(b.hook ?? b.title ?? b.title_option1 ?? b.message_text ?? b.slide1_cover ?? b.countdown_title ?? "").slice(0, 50);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const [weeks, setWeeks] = useState(2);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const timelineStart = useMemo(() => startOfWeek(today), [today]);
  const totalDays = weeks * 7;
  const timelineEnd = addDays(timelineStart, totalDays);

  // Generate week markers
  const weekMarkers = useMemo(() => {
    const markers: { date: Date; label: string; offsetPct: number }[] = [];
    for (let i = 0; i <= weeks; i++) {
      const d = addDays(timelineStart, i * 7);
      markers.push({ date: d, label: fmtDate(d), offsetPct: (i * 7 / totalDays) * 100 });
    }
    return markers;
  }, [timelineStart, weeks, totalDays]);

  // Group campaigns by objective
  const grouped = useMemo(() => {
    const map = new Map<Objective, typeof sampleCampaigns>();
    for (const c of sampleCampaigns) {
      const obj = c.objective as Objective;
      if (!map.has(obj)) map.set(obj, []);
      map.get(obj)!.push(c);
    }
    return map;
  }, []);

  // Get variants for a campaign
  function getVariantsForCampaign(contentIds: string[]) {
    return sampleVariants.filter((v) => contentIds.includes(v.content_id));
  }

  // Calculate bar position for a campaign on timeline
  function getBarStyle(startDate: string, endDate: string) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const tsMs = timelineStart.getTime();
    const teMs = timelineEnd.getTime();
    const spanMs = teMs - tsMs;

    const leftMs = Math.max(s.getTime() - tsMs, 0);
    const rightMs = Math.min(e.getTime() - tsMs, spanMs);
    if (rightMs <= 0 || leftMs >= spanMs) return null;

    return {
      left: `${(leftMs / spanMs) * 100}%`,
      width: `${((rightMs - leftMs) / spanMs) * 100}%`,
    };
  }

  // Get scheduled content dots on timeline for a campaign
  function getContentDots(contentIds: string[]) {
    const variants = getVariantsForCampaign(contentIds);
    const dots: { offsetPct: number; variant: typeof sampleVariants[0] }[] = [];
    const tsMs = timelineStart.getTime();
    const spanMs = timelineEnd.getTime() - tsMs;

    for (const v of variants) {
      if (!v.scheduled_at) continue;
      const vMs = new Date(v.scheduled_at).getTime();
      if (vMs < tsMs || vMs > tsMs + spanMs) continue;
      dots.push({ offsetPct: ((vMs - tsMs) / spanMs) * 100, variant: v });
    }
    return dots;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold">キャンペーン一覧</h2>
      </div>
      <p className="text-sm text-gray-500 mb-5">マーケティング戦略と施策を目的別に確認できます。タイムラインで配信スケジュールを俯瞰できます。</p>

      {/* ----------------------------------------------------------------- */}
      {/* Timeline header                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        {/* Week range selector */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-500">表示期間</span>
          <div className="flex gap-1">
            {WEEK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setWeeks(opt.value)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  weeks === opt.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline ruler */}
        <div className="px-4 py-3">
          <div className="flex items-center mb-1">
            <div className="w-48 shrink-0" />
            <div className="flex-1 relative h-5">
              {weekMarkers.map((m, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] text-gray-400 -translate-x-1/2"
                  style={{ left: `${m.offsetPct}%` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>
          {/* Tick line */}
          <div className="flex items-center">
            <div className="w-48 shrink-0" />
            <div className="flex-1 relative h-px bg-gray-200">
              {weekMarkers.map((m, i) => (
                <div
                  key={i}
                  className="absolute w-px h-2 bg-gray-300 -top-0.5"
                  style={{ left: `${m.offsetPct}%` }}
                />
              ))}
              {/* Today marker */}
              {(() => {
                const tsMs = timelineStart.getTime();
                const spanMs = timelineEnd.getTime() - tsMs;
                const todayPct = ((today.getTime() - tsMs) / spanMs) * 100;
                if (todayPct < 0 || todayPct > 100) return null;
                return (
                  <div
                    className="absolute w-0.5 h-3 bg-red-500 -top-1 rounded"
                    style={{ left: `${todayPct}%` }}
                    title={`今日 ${fmtDate(today)}`}
                  />
                );
              })()}
            </div>
          </div>

          {/* Campaign bars grouped by objective */}
          <div className="mt-3 space-y-4">
            {Array.from(grouped.entries()).map(([objective, campaigns]) => {
              const cfg = OBJECTIVE_CONFIG[objective];
              const colors = OBJECTIVE_COLORS[cfg.color];
              return (
                <div key={objective}>
                  {/* Objective group label */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm">{cfg.icon}</span>
                    <span className={`text-xs font-bold ${colors.text}`}>{cfg.label}</span>
                  </div>

                  {/* Bars */}
                  {campaigns.map((camp) => {
                    const barStyle = getBarStyle(camp.start_date, camp.end_date);
                    const dots = getContentDots(camp.content_ids);
                    return (
                      <div
                        key={camp.id}
                        className="flex items-center mb-1 cursor-pointer group"
                        onClick={() => setExpandedCampaign(expandedCampaign === camp.id ? null : camp.id)}
                      >
                        <div className="w-48 shrink-0 truncate pr-3">
                          <span className="text-xs text-gray-700 group-hover:text-blue-600 transition-colors">
                            {camp.name}
                          </span>
                        </div>
                        <div className="flex-1 relative h-6">
                          {/* Background grid lines */}
                          <div className="absolute inset-0 border-l border-gray-100" />
                          {barStyle && (
                            <div
                              className={`absolute top-1 h-4 rounded ${colors.bar} opacity-80 group-hover:opacity-100 transition-opacity`}
                              style={{ left: barStyle.left, width: barStyle.width }}
                            />
                          )}
                          {/* Content dots */}
                          {dots.map((dot, di) => (
                            <div
                              key={di}
                              className="absolute top-1.5 w-3 h-3 rounded-full bg-white border-2 border-gray-700 -translate-x-1.5 z-10"
                              style={{ left: `${dot.offsetPct}%` }}
                              title={`${CHANNEL_LABEL[dot.variant.channel] ?? dot.variant.channel} - ${new Date(dot.variant.scheduled_at!).toLocaleDateString("ja-JP")}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Campaign cards by objective                                        */}
      {/* ----------------------------------------------------------------- */}
      {Array.from(grouped.entries()).map(([objective, campaigns]) => {
        const cfg = OBJECTIVE_CONFIG[objective];
        const colors = OBJECTIVE_COLORS[cfg.color];

        return (
          <div key={objective} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{cfg.icon}</span>
              <h3 className={`text-sm font-bold ${colors.text}`}>{cfg.label}</h3>
              <span className="text-xs text-gray-400">({campaigns.length}件)</span>
            </div>

            <div className="space-y-2">
              {campaigns.map((camp) => {
                const st = STATUS_LABEL[camp.status] ?? STATUS_LABEL.planning;
                const isExpanded = expandedCampaign === camp.id;
                const variants = getVariantsForCampaign(camp.content_ids);

                return (
                  <div
                    key={camp.id}
                    className={`bg-white rounded-lg border transition-colors ${
                      isExpanded ? `${colors.border} shadow-sm` : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* Card header */}
                    <div
                      className="px-5 py-3 cursor-pointer flex items-center justify-between gap-4"
                      onClick={() => setExpandedCampaign(isExpanded ? null : camp.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-800">{camp.name}</span>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${st.cls}`}>{st.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{camp.start_date} 〜 {camp.end_date}</span>
                          <span>コンテンツ {camp.content_ids.length}件</span>
                          {variants.length > 0 && (
                            <span>配信 {variants.filter((v) => v.scheduled_at).length}件</span>
                          )}
                        </div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Expanded: variants list */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 py-3">
                        {variants.length === 0 ? (
                          <p className="text-sm text-gray-400 py-2">コンテンツがまだ登録されていません。</p>
                        ) : (
                          <div className="space-y-2">
                            {variants.map((v) => {
                              const vs = VARIANT_STATUS[v.status] ?? VARIANT_STATUS.draft;
                              const isVarExpanded = expandedVariant === v.id;
                              return (
                                <div
                                  key={v.id}
                                  className={`rounded-md border transition-colors ${
                                    isVarExpanded ? "border-gray-300 bg-gray-50" : "border-gray-200"
                                  }`}
                                >
                                  <div
                                    className="px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer"
                                    onClick={() => setExpandedVariant(isVarExpanded ? null : v.id)}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="px-2 py-0.5 text-[10px] rounded font-medium bg-blue-50 text-blue-700 shrink-0">
                                        {CHANNEL_LABEL[v.channel] ?? v.channel}
                                      </span>
                                      <span className={`px-2 py-0.5 text-[10px] rounded font-medium shrink-0 ${vs.cls}`}>
                                        {vs.label}
                                      </span>
                                      <span className="text-sm text-gray-700 truncate">
                                        {getVariantSummary(v) || "(内容なし)"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {v.scheduled_at && (
                                        <span className="text-[10px] text-gray-400">
                                          {new Date(v.scheduled_at).toLocaleDateString("ja-JP")}
                                        </span>
                                      )}
                                      <svg
                                        className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isVarExpanded ? "rotate-180" : ""}`}
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </div>

                                  {/* Variant detail */}
                                  {isVarExpanded && v.body && (
                                    <div className="px-4 pb-3 border-t border-gray-200">
                                      <div className="pt-3 space-y-1.5">
                                        {Object.entries(v.body).map(([key, val]) => {
                                          if (val == null) return null;
                                          const display = Array.isArray(val) ? val.join(", ") : String(val);
                                          return (
                                            <div key={key} className="flex gap-2 text-xs">
                                              <span className="text-gray-400 shrink-0 w-28 text-right">{key}</span>
                                              <span className="text-gray-700 whitespace-pre-wrap">{display}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
