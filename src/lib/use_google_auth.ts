"use client";

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

interface GoogleAuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: GoogleUser | null;
  accessToken: string | null;
  error: string | null;
}

interface OAuthConfig {
  clientId: string | null;
  configured: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "fam_google_auth";
const SCOPES = "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

// ---------------------------------------------------------------------------
// Hook: useGoogleAuth
// ---------------------------------------------------------------------------

export function useGoogleAuth() {
  const [state, setState] = useState<GoogleAuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    accessToken: null,
    error: null,
  });
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig | null>(null);
  const [gsiLoaded, setGsiLoaded] = useState(false);

  // Load OAuth config from server
  useEffect(() => {
    fetch("/api/auth/google")
      .then((r) => r.json())
      .then((data) => setOauthConfig(data))
      .catch(() => setOauthConfig({ clientId: null, configured: false }));
  }, []);

  // Load Google Identity Services script
  useEffect(() => {
    if (!oauthConfig?.configured || !oauthConfig.clientId) return;

    // Check if already loaded
    if (window.google?.accounts) {
      setGsiLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiLoaded(true);
    script.onerror = () => setState((s) => ({ ...s, error: "Failed to load Google Sign-In" }));
    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount (other components may use it)
    };
  }, [oauthConfig]);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // Check if token is expired
        if (data.expiresAt && Date.now() < data.expiresAt) {
          setState({
            isLoading: false,
            isAuthenticated: true,
            user: data.user,
            accessToken: data.accessToken,
            error: null,
          });
          return;
        } else {
          // Token expired, try to refresh
          if (data.refreshToken) {
            refreshToken(data.refreshToken);
            return;
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    setState((s) => ({ ...s, isLoading: false }));
  }, []);

  // Refresh token
  const refreshToken = useCallback(async (refreshTokenValue: string) => {
    try {
      const response = await fetch("/api/auth/google/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();

      // Update stored data
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const existingData = JSON.parse(stored);
        const newData = {
          ...existingData,
          accessToken: data.access_token,
          expiresAt: Date.now() + data.expires_in * 1000,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));

        setState({
          isLoading: false,
          isAuthenticated: true,
          user: existingData.user,
          accessToken: data.access_token,
          error: null,
        });
      }
    } catch {
      // Refresh failed, clear session
      localStorage.removeItem(STORAGE_KEY);
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        error: null,
      });
    }
  }, []);

  // Login with popup - using token flow (simpler, no redirect_uri issues)
  const login = useCallback(() => {
    if (!oauthConfig?.clientId || !gsiLoaded) {
      setState((s) => ({ ...s, error: "Google Sign-In not ready" }));
      return;
    }

    // Use token flow - simpler and works without redirect_uri configuration
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: oauthConfig.clientId,
      scope: SCOPES,
      prompt: "select_account", // Always show account chooser
      callback: async (response: { access_token?: string; error?: string; expires_in?: number }) => {
        if (response.error) {
          setState((s) => ({ ...s, error: response.error || "Login failed" }));
          return;
        }

        if (!response.access_token) {
          setState((s) => ({ ...s, error: "No access token received" }));
          return;
        }

        try {
          // Get user info directly with the access token
          const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${response.access_token}` },
          });
          const userInfo = await userInfoResponse.json();

          // Save to localStorage
          const authData = {
            accessToken: response.access_token,
            expiresAt: Date.now() + (response.expires_in || 3600) * 1000,
            user: {
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
            },
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));

          setState({
            isLoading: false,
            isAuthenticated: true,
            user: authData.user,
            accessToken: response.access_token,
            error: null,
          });
        } catch (err) {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : "Login failed",
          }));
        }
      },
    });

    client.requestAccessToken();
  }, [oauthConfig, gsiLoaded]);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      accessToken: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    oauthConfigured: oauthConfig?.configured ?? false,
    clientId: oauthConfig?.clientId ?? null,
    gsiLoaded,
    login,
    logout,
  };
}

// ---------------------------------------------------------------------------
// Google Picker Types (for TypeScript)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: { access_token?: string; error?: string; expires_in?: number }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
      picker: {
        PickerBuilder: new () => GooglePickerBuilder;
        ViewId: {
          FOLDERS: string;
          DOCS: string;
        };
        Action: {
          PICKED: string;
          CANCEL: string;
        };
        DocsView: new () => GoogleDocsView;
      };
    };
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        setToken: (token: { access_token: string }) => void;
      };
    };
  }
}

interface GooglePickerBuilder {
  addView: (view: GoogleDocsView | string) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder;
  setTitle: (title: string) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
}

interface GoogleDocsView {
  setIncludeFolders: (include: boolean) => GoogleDocsView;
  setSelectFolderEnabled: (enabled: boolean) => GoogleDocsView;
  setMimeTypes: (types: string) => GoogleDocsView;
}

interface GooglePickerResponse {
  action: string;
  docs?: Array<{
    id: string;
    name: string;
    mimeType: string;
    url: string;
  }>;
}

export type { GooglePickerResponse };
