"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Team {
  id: string;
  name: string;
  color: string;
  members: string[];
  /** キャンペーンID一覧 */
  campaign_ids: string[];
  /** コンテンツID一覧 (content_id) */
  content_ids: string[];
}

export interface TrashedTeam {
  team: Team;
  trashedAt: string; // ISO string
}

interface TeamContextValue {
  /** アクティブなチーム一覧 */
  teams: Team[];
  /** アーカイブ済みチーム一覧 */
  archivedTeams: Team[];
  /** ゴミ箱のチーム一覧 */
  trashedTeams: TrashedTeam[];
  currentTeamId: string | null;
  currentTeam: Team | null;
  addTeam: (name: string, color?: string) => Team;
  updateTeam: (id: string, patch: Partial<Omit<Team, "id">>) => void;
  /** チームをアーカイブ */
  archiveTeam: (id: string) => void;
  /** アーカイブから復元 */
  unarchiveTeam: (id: string) => void;
  /** チームをゴミ箱へ移動 */
  trashTeam: (id: string) => void;
  /** ゴミ箱から復元 */
  restoreTeam: (id: string) => void;
  /** ゴミ箱から完全削除 */
  permanentDeleteTeam: (id: string) => void;
  /** ゴミ箱保持日数 (最低30日) */
  trashRetentionDays: number;
  setTrashRetentionDays: (days: number) => void;
  /** ゴミ箱内の残り日数を計算 */
  daysUntilDeletion: (trashedAt: string) => number;
  addMember: (teamId: string, member: string) => void;
  removeMember: (teamId: string, member: string) => void;
  setCurrentTeamId: (id: string | null) => void;
  allMembers: string[];
  currentMembers: string[];
  /** チームにキャンペーンを紐づけ */
  assignCampaign: (campaignId: string, teamId?: string) => void;
  /** チームからキャンペーンを外す */
  unassignCampaign: (campaignId: string) => void;
  /** チームにコンテンツを紐づけ */
  assignContent: (contentId: string, teamId?: string) => void;
  /** チームからコンテンツを外す */
  unassignContent: (contentId: string) => void;
  /** 現在のチームに属するキャンペーンIDセット (null=全表示) */
  visibleCampaignIds: Set<string> | null;
  /** 現在のチームに属するコンテンツIDセット (null=全表示) */
  visibleContentIds: Set<string> | null;
  /** あるキャンペーンが所属するチームを返す */
  getTeamForCampaign: (campaignId: string) => Team | null;
  /** あるコンテンツが所属するチームを返す */
  getTeamForContent: (contentId: string) => Team | null;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY_TEAMS = "fam_teams";
const STORAGE_KEY_CURRENT = "fam_current_team";
const STORAGE_KEY_ARCHIVED = "fam_teams_archived";
const STORAGE_KEY_TRASHED = "fam_teams_trashed";
const STORAGE_KEY_RETENTION = "fam_teams_trash_retention_days";

function migrateTeam(t: Team): Team {
  return { ...t, campaign_ids: t.campaign_ids ?? [], content_ids: t.content_ids ?? [] };
}

function loadTeams(): Team[] {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY_TEAMS) ?? "[]") as Team[]).map(migrateTeam);
  } catch { return []; }
}

function saveTeams(teams: Team[]) {
  localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
}

function loadArchivedTeams(): Team[] {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY_ARCHIVED) ?? "[]") as Team[]).map(migrateTeam);
  } catch { return []; }
}

function saveArchivedTeams(teams: Team[]) {
  localStorage.setItem(STORAGE_KEY_ARCHIVED, JSON.stringify(teams));
}

function loadTrashedTeams(): TrashedTeam[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_TRASHED) ?? "[]") as TrashedTeam[];
  } catch { return []; }
}

function saveTrashedTeams(items: TrashedTeam[]) {
  localStorage.setItem(STORAGE_KEY_TRASHED, JSON.stringify(items));
}

function loadRetentionDays(): number {
  try {
    const v = parseInt(localStorage.getItem(STORAGE_KEY_RETENTION) ?? "30", 10);
    return Math.max(30, v);
  } catch { return 30; }
}

function saveRetentionDays(days: number) {
  localStorage.setItem(STORAGE_KEY_RETENTION, String(Math.max(30, days)));
}

function loadCurrentTeamId(): string | null {
  return localStorage.getItem(STORAGE_KEY_CURRENT) || null;
}

function saveCurrentTeamId(id: string | null) {
  if (id) localStorage.setItem(STORAGE_KEY_CURRENT, id);
  else localStorage.removeItem(STORAGE_KEY_CURRENT);
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const TEAM_COLORS = [
  "#6366f1", "#14b8a6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
  "#f97316", "#64748b",
];

let colorIdx = 0;
function nextColor(): string {
  return TEAM_COLORS[colorIdx++ % TEAM_COLORS.length];
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [archivedTeams, setArchivedTeams] = useState<Team[]>([]);
  const [trashedTeams, setTrashedTeams] = useState<TrashedTeam[]>([]);
  const [trashRetentionDays, setTrashRetentionDaysRaw] = useState(30);
  const [currentTeamId, setCurrentTeamIdRaw] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Calculate days until deletion
  const daysUntilDeletion = useCallback((trashedAt: string) => {
    const diff = trashRetentionDays - Math.floor((Date.now() - new Date(trashedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [trashRetentionDays]);

  useEffect(() => {
    setTeams(loadTeams());
    setArchivedTeams(loadArchivedTeams());
    const retention = loadRetentionDays();
    setTrashRetentionDaysRaw(retention);
    // Load trashed and purge expired
    const trashed = loadTrashedTeams();
    const alive = trashed.filter((t) => {
      const diff = retention - Math.floor((Date.now() - new Date(t.trashedAt).getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0;
    });
    if (alive.length !== trashed.length) saveTrashedTeams(alive);
    setTrashedTeams(alive);
    setCurrentTeamIdRaw(loadCurrentTeamId());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveTeams(teams);
  }, [teams, hydrated]);

  useEffect(() => {
    if (hydrated) saveArchivedTeams(archivedTeams);
  }, [archivedTeams, hydrated]);

  useEffect(() => {
    if (hydrated) saveTrashedTeams(trashedTeams);
  }, [trashedTeams, hydrated]);

  const setCurrentTeamId = useCallback((id: string | null) => {
    setCurrentTeamIdRaw(id);
    saveCurrentTeamId(id);
  }, []);

  const setTrashRetentionDays = useCallback((days: number) => {
    const clamped = Math.max(30, days);
    setTrashRetentionDaysRaw(clamped);
    saveRetentionDays(clamped);
  }, []);

  const currentTeam = teams.find((t) => t.id === currentTeamId) ?? null;

  let nextId = 1;
  const addTeam = useCallback((name: string, color?: string): Team => {
    const id = `team_${Date.now()}_${nextId++}`;
    const t: Team = { id, name, color: color ?? nextColor(), members: [], campaign_ids: [], content_ids: [] };
    setTeams((prev) => [...prev, t]);
    return t;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTeam = useCallback((id: string, patch: Partial<Omit<Team, "id">>) => {
    setTeams((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t));
  }, []);

  // --- Archive / Trash ---

  const archiveTeam = useCallback((id: string) => {
    setTeams((prev) => {
      const team = prev.find((t) => t.id === id);
      if (team) {
        setArchivedTeams((ar) => [...ar, team]);
      }
      return prev.filter((t) => t.id !== id);
    });
    setCurrentTeamIdRaw((prev) => prev === id ? null : prev);
  }, []);

  const unarchiveTeam = useCallback((id: string) => {
    setArchivedTeams((prev) => {
      const team = prev.find((t) => t.id === id);
      if (team) {
        setTeams((ts) => [...ts, team]);
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const trashTeam = useCallback((id: string) => {
    // Find team in active or archived, move to trash
    setTeams((prevTeams) => {
      const team = prevTeams.find((t) => t.id === id);
      if (team) {
        setTrashedTeams((tr) => [...tr, { team, trashedAt: new Date().toISOString() }]);
        return prevTeams.filter((t) => t.id !== id);
      }
      // Not in active teams — check archived
      setArchivedTeams((prevArchived) => {
        const archivedTeam = prevArchived.find((t) => t.id === id);
        if (archivedTeam) {
          setTrashedTeams((tr) => [...tr, { team: archivedTeam, trashedAt: new Date().toISOString() }]);
          return prevArchived.filter((t) => t.id !== id);
        }
        return prevArchived;
      });
      return prevTeams;
    });
    setCurrentTeamIdRaw((prev) => prev === id ? null : prev);
  }, []);

  const restoreTeam = useCallback((id: string) => {
    setTrashedTeams((prev) => {
      const item = prev.find((t) => t.team.id === id);
      if (item) {
        setTeams((ts) => [...ts, item.team]);
      }
      return prev.filter((t) => t.team.id !== id);
    });
  }, []);

  const permanentDeleteTeam = useCallback((id: string) => {
    setTrashedTeams((prev) => prev.filter((t) => t.team.id !== id));
  }, []);

  const addMember = useCallback((teamId: string, member: string) => {
    setTeams((prev) => prev.map((t) =>
      t.id === teamId && !t.members.includes(member) ? { ...t, members: [...t.members, member] } : t
    ));
  }, []);

  const removeMember = useCallback((teamId: string, member: string) => {
    setTeams((prev) => prev.map((t) =>
      t.id === teamId ? { ...t, members: t.members.filter((m) => m !== member) } : t
    ));
  }, []);

  // --- Resource assignment ---
  const assignCampaign = useCallback((campaignId: string, teamId?: string) => {
    const tid = teamId ?? currentTeamId;
    if (!tid) return;
    setTeams((prev) => prev.map((t) => {
      if (t.id !== tid && t.campaign_ids.includes(campaignId)) {
        return { ...t, campaign_ids: t.campaign_ids.filter((c) => c !== campaignId) };
      }
      if (t.id === tid && !t.campaign_ids.includes(campaignId)) {
        return { ...t, campaign_ids: [...t.campaign_ids, campaignId] };
      }
      return t;
    }));
  }, [currentTeamId]);

  const unassignCampaign = useCallback((campaignId: string) => {
    setTeams((prev) => prev.map((t) =>
      t.campaign_ids.includes(campaignId)
        ? { ...t, campaign_ids: t.campaign_ids.filter((c) => c !== campaignId) }
        : t
    ));
  }, []);

  const assignContent = useCallback((contentId: string, teamId?: string) => {
    const tid = teamId ?? currentTeamId;
    if (!tid) return;
    setTeams((prev) => prev.map((t) => {
      if (t.id !== tid && t.content_ids.includes(contentId)) {
        return { ...t, content_ids: t.content_ids.filter((c) => c !== contentId) };
      }
      if (t.id === tid && !t.content_ids.includes(contentId)) {
        return { ...t, content_ids: [...t.content_ids, contentId] };
      }
      return t;
    }));
  }, [currentTeamId]);

  const unassignContent = useCallback((contentId: string) => {
    setTeams((prev) => prev.map((t) =>
      t.content_ids.includes(contentId)
        ? { ...t, content_ids: t.content_ids.filter((c) => c !== contentId) }
        : t
    ));
  }, []);

  // Visible IDs based on current team
  const visibleCampaignIds = currentTeam ? new Set(currentTeam.campaign_ids) : null;
  const visibleContentIds = currentTeam ? new Set(currentTeam.content_ids) : null;

  const getTeamForCampaign = useCallback((campaignId: string): Team | null => {
    return teams.find((t) => t.campaign_ids.includes(campaignId)) ?? null;
  }, [teams]);

  const getTeamForContent = useCallback((contentId: string): Team | null => {
    return teams.find((t) => t.content_ids.includes(contentId)) ?? null;
  }, [teams]);

  const allMembers = [...new Set(teams.flatMap((t) => t.members))].sort();
  const currentMembers = currentTeam ? [...currentTeam.members].sort() : allMembers;

  // Sync to registered_members for backward compat
  useEffect(() => {
    if (hydrated && allMembers.length > 0) {
      try {
        const existing: string[] = JSON.parse(localStorage.getItem("registered_members") ?? "[]");
        const merged = [...new Set([...existing, ...allMembers])].sort();
        localStorage.setItem("registered_members", JSON.stringify(merged));
      } catch { /* */ }
    }
  }, [allMembers, hydrated]);

  return (
    <TeamContext.Provider value={{
      teams, archivedTeams, trashedTeams,
      currentTeamId, currentTeam,
      addTeam, updateTeam,
      archiveTeam, unarchiveTeam,
      trashTeam, restoreTeam, permanentDeleteTeam,
      trashRetentionDays, setTrashRetentionDays, daysUntilDeletion,
      addMember, removeMember,
      setCurrentTeamId,
      allMembers, currentMembers,
      assignCampaign, unassignCampaign,
      assignContent, unassignContent,
      visibleCampaignIds, visibleContentIds,
      getTeamForCampaign, getTeamForContent,
    }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam(): TeamContextValue {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx;
}
