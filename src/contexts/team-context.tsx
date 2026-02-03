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
  /** All members across all teams (deduplicated) */
  allMembers: string[];
  /** Members of the current team (or all if no team selected) */
  currentMembers: string[];
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY_TEAMS = "fam_teams";
const STORAGE_KEY_CURRENT = "fam_current_team";

function loadTeams(): Team[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_TEAMS) ?? "[]");
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

  // Hydrate from localStorage
  useEffect(() => {
    setTeams(loadTeams());
    setCurrentTeamIdRaw(loadCurrentTeamId());
    setHydrated(true);
  }, []);

  // Persist teams
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
    const t: Team = { id, name, color: color ?? nextColor(), members: [] };
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

  const allMembers = [...new Set(teams.flatMap((t) => t.members))].sort();
  const currentMembers = currentTeam ? [...currentTeam.members].sort() : allMembers;

  // Also sync to registered_members for backward compat
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
