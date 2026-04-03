import { useState, useEffect, useCallback, useRef } from "react";

const COOLDOWN_MS = 60_000; // 60 seconds — must match server-side constant

/**
 * Manages the Sync Now button cooldown state.
 *
 * - Persists the cooldown expiry in localStorage so it survives page navigations.
 * - Ticks a live countdown (secondsLeft) every second while cooling down.
 * - Exposes `startCooldown()` to arm the timer after a successful sync.
 * - `isOnCooldown` is true while secondsLeft > 0.
 *
 * @param userId  Current user's numeric ID — used to namespace the localStorage key
 *                so different users on the same device don't share a cooldown.
 */
export function useSyncCooldown(userId: number | undefined) {
  const storageKey = userId != null ? `sync_cooldown_${userId}` : null;

  // Derive initial secondsLeft from localStorage on first render
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!storageKey) return 0;
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return 0;
      const expiresAt = parseInt(stored, 10);
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    } catch {
      return 0;
    }
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick the countdown every second while active
  useEffect(() => {
    if (secondsLeft <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          // Clean up localStorage once expired
          if (storageKey) {
            try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [secondsLeft > 0]); // re-run only when cooldown starts/stops

  // Re-sync from localStorage when userId changes (e.g. login/logout)
  useEffect(() => {
    if (!storageKey) {
      setSecondsLeft(0);
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) { setSecondsLeft(0); return; }
      const expiresAt = parseInt(stored, 10);
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
      setSecondsLeft(remaining > 0 ? remaining : 0);
    } catch {
      setSecondsLeft(0);
    }
  }, [storageKey]);

  /** Call this immediately after a successful sync to start the cooldown. */
  const startCooldown = useCallback(() => {
    const expiresAt = Date.now() + COOLDOWN_MS;
    if (storageKey) {
      try { localStorage.setItem(storageKey, String(expiresAt)); } catch { /* ignore */ }
    }
    setSecondsLeft(Math.ceil(COOLDOWN_MS / 1000));
  }, [storageKey]);

  return {
    isOnCooldown: secondsLeft > 0,
    secondsLeft,
    startCooldown,
  };
}
