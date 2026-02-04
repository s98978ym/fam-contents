"use client";

import { useState } from "react";
import { useTeam } from "@/contexts/team-context";
import { useCurrentUser } from "@/lib/user_context";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const ICONS: Record<string, string> = {
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  create: "M12 4v16m8-8H4",
  list: "M4 6h16M4 10h16M4 14h16M4 18h16",
  campaign: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z",
  publish: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  prompt: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  team: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  knowledge: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NavLink({ href, children, icon }: { href: string; children: React.ReactNode; icon?: string }) {
  const iconPath = icon ? ICONS[icon] : undefined;
  return (
    <a
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors text-gray-700"
    >
      {iconPath && (
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>
      )}
      {children}
    </a>
  );
}

function NavDivider({ label }: { label: string }) {
  return (
    <div className="mt-4 mb-1 px-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TeamSwitcher
// ---------------------------------------------------------------------------

function TeamSwitcher() {
  const { teams, currentTeamId, currentTeam, setCurrentTeamId } = useTeam();
  const [open, setOpen] = useState(false);

  if (teams.length === 0) {
    return (
      <a href="/teams" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-100 transition-colors border border-dashed border-gray-300">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        チームを作成
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors border border-gray-200 bg-gray-50"
      >
        {currentTeam ? (
          <>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: currentTeam.color }} />
            <span className="truncate font-medium text-gray-700 flex-1 text-left">{currentTeam.name}</span>
          </>
        ) : (
          <>
            <span className="w-3 h-3 rounded-full shrink-0 bg-gray-300" />
            <span className="truncate text-gray-400 flex-1 text-left">全チーム</span>
          </>
        )}
        <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-64 overflow-y-auto">
            {/* All teams option */}
            <button
              onClick={() => { setCurrentTeamId(null); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${!currentTeamId ? "bg-indigo-50" : ""}`}
            >
              <span className="w-3 h-3 rounded-full shrink-0 bg-gray-300" />
              <span className="text-xs text-gray-600 flex-1">全チーム</span>
              {!currentTeamId && <svg className="w-3 h-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </button>
            <div className="border-t border-gray-100 my-1" />
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => { setCurrentTeamId(t.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${currentTeamId === t.id ? "bg-indigo-50" : ""}`}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-xs text-gray-700 flex-1 truncate">{t.name}</span>
                <span className="text-[10px] text-gray-400">{t.members.length}人</span>
                {currentTeamId === t.id && <svg className="w-3 h-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </button>
            ))}
            <div className="border-t border-gray-100 my-1" />
            <a href="/teams" className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors text-indigo-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-medium">チーム管理</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// UserSwitcher
// ---------------------------------------------------------------------------

function UserSwitcher() {
  const { currentUser, setCurrentUser, availableUsers, isLoaded } = useCurrentUser();
  const [open, setOpen] = useState(false);

  if (!isLoaded) return <div className="h-10" />;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors border border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50"
      >
        {currentUser ? (
          <>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold shrink-0">
              {currentUser.slice(-2)}
            </span>
            <span className="truncate font-medium text-gray-700 flex-1 text-left">{currentUser}</span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-gray-500 text-xs shrink-0">
              ?
            </span>
            <span className="truncate text-gray-400 flex-1 text-left">ユーザー選択</span>
          </>
        )}
        <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-64 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              ログインユーザー
            </div>
            {availableUsers.map((user) => (
              <button
                key={user}
                onClick={() => { setCurrentUser(user); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${currentUser === user ? "bg-blue-50" : ""}`}
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs font-bold shrink-0">
                  {user.slice(-2)}
                </span>
                <span className="text-xs text-gray-700 flex-1 truncate">{user}</span>
                {currentUser === user && (
                  <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function Sidebar() {
  return (
    <nav className="w-52 bg-white border-r border-gray-200 p-4 flex flex-col gap-0.5 shrink-0">
      <h1 className="text-lg font-bold mb-3 px-2">FAM Content Ops</h1>

      {/* User switcher */}
      <div className="mb-2">
        <UserSwitcher />
      </div>

      {/* Team switcher */}
      <div className="mb-3">
        <TeamSwitcher />
      </div>

      <NavLink href="/" icon="home">ホーム</NavLink>
      <NavLink href="/knowledge" icon="knowledge">ナレッジ共有</NavLink>
      <NavDivider label="コンテンツ" />
      <NavLink href="/contents" icon="create">コンテンツ生成</NavLink>
      <NavLink href="/contents/list" icon="list">コンテンツ一覧</NavLink>
      <NavDivider label="管理" />
      <NavLink href="/campaigns" icon="campaign">キャンペーン</NavLink>
      <NavLink href="/publish-jobs" icon="publish">配信ジョブ</NavLink>
      <NavDivider label="設定" />
      <NavLink href="/prompt-versions" icon="prompt">プロンプト管理</NavLink>
      <NavLink href="/teams" icon="team">チーム管理</NavLink>
    </nav>
  );
}
