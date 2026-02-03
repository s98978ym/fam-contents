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

interface TeamContextValue {
  teams: Team[];
  currentTeamId: string | null;
  currentTeam: Team | null;
  addTeam: (name: string, color?: string) => Team;
  updateTeam: (id: string, patch: Partial<Omit<Team, "id">>) => void;
  deleteTeam: (id: string) => void;
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

function loadTeams(): Team[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_TEAMS) ?? "[]") as Team[];
    // migrate: ensure campaign_ids and content_ids exist
    return raw.map((t) => ({
      ...t,
      campaign_ids: t.campaign_ids ?? [],
      content_ids: t.content_ids ?? [],
    }));
  } catch {
    return [];
  }
}

function saveTeams(teams: Team[]) {
  localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
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
  const [currentTeamId, setCurrentTeamIdRaw] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTeams(loadTeams());
    setCurrentTeamIdRaw(loadCurrentTeamId());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveTeams(teams);
  }, [teams, hydrated]);

  const setCurrentTeamId = useCallback((id: string | null) => {
    setCurrentTeamIdRaw(id);
    saveCurrentTeamId(id);
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

  const deleteTeam = useCallback((id: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== id));
    setCurrentTeamIdRaw((prev) => prev === id ? null : prev);
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
      // Remove from other teams first
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
      teams, currentTeamId, currentTeam,
      addTeam, updateTeam, deleteTeam,
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
