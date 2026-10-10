"use client";

import { useCallback, useEffect, useState } from "react";
import { emptyProgress, parseProgress, STORAGE_KEY, type Progress } from "@/lib/progress";

export function useProgress() {
  const [snapshot, setSnapshot] = useState({ data: emptyProgress(), revision: 0 });
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSnapshot({ data: parseProgress(raw), revision: 0 });
    } catch {
      setStorageError("Saved progress could not be loaded. You can keep working and export a backup.");
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      try { setSnapshot({ data: event.newValue ? parseProgress(event.newValue) : emptyProgress(), revision: 0 }); }
      catch { setStorageError("Another tab saved unreadable progress."); }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    if (!ready || snapshot.revision === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.data));
      setStorageError("");
    } catch { setStorageError("Browser storage is unavailable or full. Export a backup to keep your work."); }
  }, [snapshot, ready]);

  const update = useCallback((change: (current: Progress) => Progress) => {
    setSnapshot((current) => ({ data: change(current.data), revision: current.revision + 1 }));
  }, []);

  return { progress: snapshot.data, update, ready, storageError };
}
