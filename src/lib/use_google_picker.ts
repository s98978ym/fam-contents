"use client";

import { useState, useCallback, useEffect } from "react";
import type { GooglePickerResponse } from "./use_google_auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PickedFolder {
  id: string;
  name: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Hook: useGooglePicker
// ---------------------------------------------------------------------------

export function useGooglePicker(accessToken: string | null) {
  const [pickerLoaded, setPickerLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Load Google Picker API
  useEffect(() => {
    if (!accessToken) return;

    // Check if already loaded
    if (window.google?.picker) {
      setPickerLoaded(true);
      return;
    }

    // Load gapi first
    const loadGapi = () => {
      return new Promise<void>((resolve) => {
        if (window.gapi) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js";
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    };

    // Load picker
    const loadPicker = async () => {
      await loadGapi();
      window.gapi.load("picker", () => {
        setPickerLoaded(true);
      });
    };

    loadPicker();
  }, [accessToken]);

  // Open picker
  const openPicker = useCallback(
    (onPick: (folder: PickedFolder) => void, onCancel?: () => void) => {
      if (!accessToken || !pickerLoaded || !window.google?.picker) {
        console.error("[useGooglePicker] Picker not ready");
        return;
      }

      setIsOpen(true);

      // Create a DocsView that shows all files + folders
      // User can navigate into folders and see files inside before selecting
      const docsView = new window.google.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true);
      // Note: No setMimeTypes - show all files so user can preview folder contents

      // Build picker
      const picker = new window.google.picker.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(accessToken)
        .setTitle("フォルダを選択（中身を確認してから選択できます）")
        .setCallback((data: GooglePickerResponse) => {
          if (data.action === window.google.picker.Action.PICKED && data.docs?.[0]) {
            const doc = data.docs[0];
            onPick({
              id: doc.id,
              name: doc.name,
              url: doc.url,
            });
          } else if (data.action === window.google.picker.Action.CANCEL) {
            onCancel?.();
          }
          setIsOpen(false);
        })
        .build();

      picker.setVisible(true);
    },
    [accessToken, pickerLoaded]
  );

  return {
    pickerLoaded,
    isOpen,
    openPicker,
  };
}

export type { PickedFolder };
