import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import {
  firebaseConfigured,
  isAdmin,
  loadProgress,
  saveProgress,
  watchAuth,
  logout as fbLogout,
  loginGoogle,
  loginMicrosoft,
  loginEmail,
  registerEmail,
} from "./firebase";
import { useProgress } from "../store/useProgress";

interface AuthValue {
  user: User | null;
  ready: boolean;
  isAdmin: boolean;
  configured: boolean;
  loginGoogle: typeof loginGoogle;
  loginMicrosoft: typeof loginMicrosoft;
  loginEmail: typeof loginEmail;
  registerEmail: typeof registerEmail;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!firebaseConfigured);
  const pushing = useRef(false);

  useEffect(() => {
    return watchAuth(async (u) => {
      setUser(u);
      setReady(true);
      if (u && firebaseConfigured) {
        const remote = await loadProgress(u.uid).catch(() => null);
        const remoteState = remote?.state as Record<string, unknown> | undefined;
        if (remoteState && Array.isArray(remoteState.results) && (remoteState.results as unknown[]).length) {
          useProgress.setState({
            results: remoteState.results as never,
            moduleViewed: (remoteState.moduleViewed ?? {}) as never,
            moduleCompleted: (remoteState.moduleCompleted ?? []) as never,
            cards: (remoteState.cards ?? {}) as never,
            questionStats: (remoteState.questionStats ?? {}) as never,
            answerOverrides: (remoteState.answerOverrides ?? {}) as never,
          });
        } else {
          await pushProgress(u.uid).catch(() => {});
        }
      }
    });
  }, []);

  // safety net: if the auth check does not resolve in time (offline / blocked), continue anyway
  useEffect(() => {
    if (!firebaseConfigured) return;
    const t = setTimeout(() => setReady(true), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const unsub = useProgress.subscribe(async () => {
      const u = user;
      if (!u || pushing.current) return;
      pushing.current = true;
      try {
        await pushProgress(u.uid).catch(() => {});
      } finally {
        pushing.current = false;
      }
    });
    return unsub;
  }, [user]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      isAdmin: isAdmin(user),
      configured: firebaseConfigured,
      loginGoogle,
      loginMicrosoft,
      loginEmail,
      registerEmail,
      logout: fbLogout,
    }),
    [user, ready]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function pushProgress(uid: string) {
  const { results, moduleViewed, moduleCompleted, cards, questionStats, answerOverrides, name } = useProgress.getState();
  return saveProgress(uid, { results, moduleViewed, moduleCompleted, cards, questionStats, answerOverrides, name });
}
