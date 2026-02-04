"use client";

import { useState } from "react";
import Link from "next/link";
import { useTeam, type Team } from "@/contexts/team-context";

// ---------------------------------------------------------------------------
// Color palette for team picker
// ---------------------------------------------------------------------------

const COLOR_OPTIONS = [
  "#6366f1", "#14b8a6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
  "#f97316", "#64748b", "#0ea5e9", "#d946ef",
];

type ViewMode = "active" | "archived" | "trash";

const RETENTION_OPTIONS = [30, 60, 90, 180, 365];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TeamsPage() {
  const {
    teams, archivedTeams, trashedTeams,
    addTeam, updateTeam,
    archiveTeam, unarchiveTeam,
    trashTeam, restoreTeam, permanentDeleteTeam,
    trashRetentionDays, setTrashRetentionDays, daysUntilDeletion,
    addMember, removeMember, currentTeamId, setCurrentTeamId,
  } = useTeam();

  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [memberInput, setMemberInput] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  function handleAddTeam() {
    if (!newName.trim()) return;
    const t = addTeam(newName.trim(), newColor);
    setShowNewForm(false);
    setNewName("");
    setNewColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
    showToast(`「${t.name}」を作成しました`);
  }

  function handleStartEdit(t: Team) {
    setEditingTeam(t.id);
    setEditName(t.name);
    setEditColor(t.color);
  }

  function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    updateTeam(id, { name: editName.trim(), color: editColor });
    setEditingTeam(null);
    showToast("更新しました");
  }

  function handleAddMember(teamId: string) {
    const name = (memberInput[teamId] ?? "").trim();
    if (!name) return;
    addMember(teamId, name);
    setMemberInput((prev) => ({ ...prev, [teamId]: "" }));
    showToast(`「${name}」を追加しました`);
  }

  const displayTeams = viewMode === "active" ? teams : viewMode === "archived" ? archivedTeams : [];

  return (
    <div className="max-w-2xl">
      {toast && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">チーム管理</h2>
          <p className="text-sm text-slate-400">チームの作成・メンバー管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/teams/analytics"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            利用状況
          </Link>
          {viewMode === "active" && !showNewForm && (
            <button onClick={() => setShowNewForm(true)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
              + 新規チーム
            </button>
          )}
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-200">
        {([
          { key: "active" as ViewMode, label: "アクティブ", count: teams.length },
          { key: "archived" as ViewMode, label: "アーカイブ", count: archivedTeams.length },
          { key: "trash" as ViewMode, label: "ゴミ箱", count: trashedTeams.length },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              viewMode === tab.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs ${viewMode === tab.key ? "text-indigo-500" : "text-slate-400"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* New team form */}
      {showNewForm && viewMode === "active" && (
        <div className="bg-white rounded-xl border border-indigo-200 shadow-sm mb-4 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">新規チーム作成</h3>
          <div className="mb-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="チーム名"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-300"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
            />
          </div>
          <div className="mb-3">
            <label className="text-[10px] text-slate-400 mb-1.5 block">チームカラー</label>
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${newColor === c ? "ring-2 ring-offset-2 ring-indigo-400 scale-110" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowNewForm(false); setNewName(""); }} className="px-3 py-1.5 rounded-md text-xs border border-slate-200 hover:bg-slate-50">キャンセル</button>
            <button onClick={handleAddTeam} disabled={!newName.trim()} className={`px-3 py-1.5 rounded-md text-xs font-medium ${newName.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-100 text-slate-400"}`}>
              作成
            </button>
          </div>
        </div>
      )}

      {/* Trash notice + retention settings */}
      {viewMode === "trash" && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-orange-700">
              ゴミ箱のチームは削除から <strong>{trashRetentionDays}日後</strong> に自動的に完全削除されます。紐づけられたコンテンツも保護されます。
            </p>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <label className="text-[10px] text-orange-600 font-medium">保持日数:</label>
              <select
                value={trashRetentionDays}
                onChange={(e) => setTrashRetentionDays(Number(e.target.value))}
                className="border border-orange-300 rounded px-2 py-1 text-xs outline-none bg-white"
              >
                {RETENTION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}日</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* --- Trash view --- */}
      {viewMode === "trash" && (
        trashedTeams.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <p className="text-sm text-slate-500 mb-1">ゴミ箱は空です</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trashedTeams.map(({ team, trashedAt }) => {
              const remaining = daysUntilDeletion(trashedAt);
              return (
                <div key={team.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden opacity-70">
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderLeft: `4px solid ${team.color}` }}>
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                      <span className="text-sm font-semibold text-slate-700">{team.name}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{team.members.length}人</span>
                      <span className="text-[10px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-medium">
                        あと{remaining}日で完全削除
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { restoreTeam(team.id); showToast(`「${team.name}」を復元しました`); }}
                        className="px-2.5 py-1 rounded-md text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        復元
                      </button>
                      <button
                        onClick={() => { if (confirm(`「${team.name}」を完全に削除しますか？\nこの操作は取り消せません。紐づけデータも失われます。`)) { permanentDeleteTeam(team.id); showToast("完全に削除しました"); } }}
                        className="px-2.5 py-1 rounded-md text-[10px] font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        完全削除
                      </button>
                    </div>
                  </div>
                  {/* Linked resources info */}
                  {(team.campaign_ids.length > 0 || team.content_ids.length > 0) && (
                    <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-3">
                      {team.campaign_ids.length > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" /></svg>
                          キャンペーン {team.campaign_ids.length}件
                        </span>
                      )}
                      {team.content_ids.length > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          コンテンツ {team.content_ids.length}件
                        </span>
                      )}
                      <span className="text-orange-400">（復元するまで保護されます）</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* --- Active / Archived team list --- */}
      {viewMode !== "trash" && (
        displayTeams.length === 0 && !showNewForm ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {viewMode === "active" ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              )}
            </svg>
            <p className="text-sm text-slate-500 mb-1">
              {viewMode === "active" ? "チームがまだありません" : "アーカイブされたチームはありません"}
            </p>
            {viewMode === "active" && (
              <p className="text-xs text-slate-400">「+ 新規チーム」からチームを作成してください</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayTeams.map((team) => {
              const isEditing = editingTeam === team.id;
              const isActive = currentTeamId === team.id;
              const isArchived = viewMode === "archived";
              return (
                <div key={team.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isActive ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"} ${isArchived ? "opacity-70" : ""}`}>
                  {/* Header */}
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderLeft: `4px solid ${team.color}` }}>
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border border-slate-300 rounded px-2 py-1 text-sm outline-none flex-1"
                          onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(team.id)}
                        />
                        <div className="flex gap-1">
                          {COLOR_OPTIONS.map((c) => (
                            <button key={c} onClick={() => setEditColor(c)} className={`w-5 h-5 rounded-full ${editColor === c ? "ring-2 ring-offset-1 ring-indigo-400" : ""}`} style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <button onClick={() => handleSaveEdit(team.id)} className="px-2 py-1 rounded text-[10px] font-medium bg-indigo-600 text-white hover:bg-indigo-700">保存</button>
                        <button onClick={() => setEditingTeam(null)} className="px-2 py-1 rounded text-[10px] border border-slate-300 hover:bg-slate-50">取消</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                          <span className="text-sm font-semibold text-slate-700">{team.name}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{team.members.length}人</span>
                          {isActive && <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">選択中</span>}
                          {isArchived && <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">アーカイブ</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {isArchived ? (
                            <>
                              <button onClick={() => { unarchiveTeam(team.id); showToast(`「${team.name}」を復元しました`); }} className="px-2 py-1 rounded text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 transition-colors">
                                復元
                              </button>
                              <button onClick={() => { trashTeam(team.id); showToast(`「${team.name}」をゴミ箱に移動しました`); }} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="ゴミ箱へ">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </>
                          ) : (
                            <>
                              {!isActive && (
                                <button onClick={() => setCurrentTeamId(team.id)} className="px-2 py-1 rounded text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 transition-colors">
                                  切替
                                </button>
                              )}
                              <button onClick={() => handleStartEdit(team)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors" title="編集">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => { archiveTeam(team.id); showToast(`「${team.name}」をアーカイブしました`); }} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="アーカイブ">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                              </button>
                              <button onClick={() => { trashTeam(team.id); showToast(`「${team.name}」をゴミ箱に移動しました`); }} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="ゴミ箱へ">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Members (active view only) */}
                  {viewMode === "active" && (
                    <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">メンバー</span>
                      </div>

                      {team.members.length === 0 ? (
                        <p className="text-xs text-slate-400 mb-2">メンバーがいません</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {team.members.map((m) => {
                            let h = 0;
                            for (let i = 0; i < m.length; i++) h = ((h << 5) - h + m.charCodeAt(i)) | 0;
                            const colors = ["bg-rose-500", "bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-violet-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500"];
                            const bgCls = colors[Math.abs(h) % colors.length];
                            return (
                              <span key={m} className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                                <span className={`${bgCls} w-5 h-5 rounded-full inline-flex items-center justify-center text-white text-[9px] font-bold`}>
                                  {m.slice(0, 1)}
                                </span>
                                <span className="text-xs text-slate-700">{m}</span>
                                <button onClick={() => { removeMember(team.id, m); showToast(`「${m}」を削除しました`); }} className="ml-0.5 text-slate-300 hover:text-red-500 transition-colors">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input
                          value={memberInput[team.id] ?? ""}
                          onChange={(e) => setMemberInput((prev) => ({ ...prev, [team.id]: e.target.value }))}
                          placeholder="メンバー名を入力"
                          className="flex-1 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-indigo-300"
                          onKeyDown={(e) => e.key === "Enter" && handleAddMember(team.id)}
                        />
                        <button
                          onClick={() => handleAddMember(team.id)}
                          disabled={!(memberInput[team.id] ?? "").trim()}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium ${(memberInput[team.id] ?? "").trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-100 text-slate-400"}`}
                        >
                          追加
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Archived view: show member count + linked resources */}
                  {viewMode === "archived" && (team.campaign_ids.length > 0 || team.content_ids.length > 0 || team.members.length > 0) && (
                    <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-3">
                      {team.members.length > 0 && <span>メンバー {team.members.length}人</span>}
                      {team.campaign_ids.length > 0 && <span>キャンペーン {team.campaign_ids.length}件</span>}
                      {team.content_ids.length > 0 && <span>コンテンツ {team.content_ids.length}件</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
