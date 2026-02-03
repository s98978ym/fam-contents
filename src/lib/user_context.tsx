"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  sampleContents,
  sampleVariants,
  sampleReviews,
} from "@/lib/sample_data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserContextValue {
  currentUser: string | null;
  setCurrentUser: (user: string | null) => void;
  availableUsers: string[];
  isLoaded: boolean;
}

// ---------------------------------------------------------------------------
// Get available users from sample data
// ---------------------------------------------------------------------------

function getAvailableUsers(): string[] {
  const set = new Set<string>();
  // Only include users who have content/variants assigned (not just reviewers)
  for (const v of sampleVariants) {
    if (v.assignee) set.add(v.assignee);
  }
  for (const c of sampleContents) {
    if (c.created_by && !c.created_by.startsWith("planner_")) {
      set.add(c.created_by);
    }
  }
  return Array.from(set).sort();
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const UserContext = createContext<UserContextValue | null>(null);

const STORAGE_KEY = "fam_current_user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const availableUsers = getAvailableUsers();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && availableUsers.includes(stored)) {
      setCurrentUserState(stored);
    }
    setIsLoaded(true);
  }, [availableUsers]);

  function setCurrentUser(user: string | null) {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, user);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, availableUsers, isLoaded }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within UserProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// User Selector Modal
// ---------------------------------------------------------------------------

export function UserSelectorModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { currentUser, setCurrentUser, availableUsers } = useCurrentUser();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">ユーザーを選択</h3>
          <p className="text-sm text-gray-500 mt-1">
            担当ベースで表示をフィルタします
          </p>
        </div>
        <div className="p-3 max-h-64 overflow-y-auto">
          {availableUsers.map((user) => (
            <button
              key={user}
              onClick={() => {
                setCurrentUser(user);
                onClose();
              }}
              className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-colors flex items-center gap-3 ${
                currentUser === user
                  ? "bg-blue-50 text-blue-700"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-sm font-bold">
                {user.slice(-2)}
              </span>
              <span className="font-medium">{user}</span>
              {currentUser === user && (
                <span className="ml-auto text-blue-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Current User Badge (for header)
// ---------------------------------------------------------------------------

export function CurrentUserBadge({ onClick }: { onClick: () => void }) {
  const { currentUser, isLoaded } = useCurrentUser();

  if (!isLoaded) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-sm"
    >
      {currentUser ? (
        <>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs font-bold">
            {currentUser.slice(-2)}
          </span>
          <span className="font-medium text-gray-700">{currentUser}</span>
        </>
      ) : (
        <>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-400 text-xs">
            ?
          </span>
          <span className="text-gray-400">ユーザー未選択</span>
        </>
      )}
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
