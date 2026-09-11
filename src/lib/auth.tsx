"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, firebaseEnabled } from "./firebase";
import type { AppUser, UserRole } from "./types";

// Simple fixed-password administrator access — works with or without Firebase
// configured, so editing is available immediately. See README "Admin setup".
const ADMIN_PASSWORD = "Navas@2026";
const ADMIN_SESSION_KEY = "tanur-gis:admin-session";

const LOCAL_ADMIN_USER: AppUser = {
  uid: "local-admin",
  email: "admin@tanur-gis.local",
  displayName: "Administrator",
  role: "admin",
};

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  firebaseEnabled: boolean;
  isAdmin: boolean;
  /** True when admin access came from the password login, not Firebase. */
  isLocalAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Returns true and signs the admin in on a correct password. */
  loginWithPassword: (password: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [fbUserState, setFbUserState] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(firebaseEnabled);
  const [localAdmin, setLocalAdmin] = useState(false);

  useEffect(() => {
    try {
      setLocalAdmin(localStorage.getItem(ADMIN_SESSION_KEY) === "1");
    } catch {
      /* private mode / storage blocked */
    }
  }, []);

  useEffect(() => {
    if (!firebaseEnabled || !auth || !db) return;
    return onAuthStateChanged(auth, async (fu: User | null) => {
      if (!fu) {
        setFbUserState(null);
        setLoading(false);
        return;
      }
      // Look up the user's role. First admin must be promoted manually in the
      // Firestore console (see README "Admin setup").
      const ref = doc(db!, "users", fu.uid);
      const snap = await getDoc(ref);
      let role: UserRole = "viewer";
      if (snap.exists()) {
        role = (snap.data().role as UserRole) ?? "viewer";
      } else {
        await setDoc(ref, {
          uid: fu.uid,
          email: fu.email,
          displayName: fu.displayName,
          role: "viewer",
          createdAt: Date.now(),
        });
      }
      setFbUserState({ uid: fu.uid, email: fu.email, displayName: fu.displayName, role });
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async () => {
    if (!auth) return;
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const signOut = useCallback(async () => {
    if (auth) await fbSignOut(auth);
    setLocalAdmin(false);
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const loginWithPassword = useCallback((password: string) => {
    if (password !== ADMIN_PASSWORD) return false;
    setLocalAdmin(true);
    try {
      localStorage.setItem(ADMIN_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    return true;
  }, []);

  const user = fbUserState ?? (localAdmin ? LOCAL_ADMIN_USER : null);
  const isAdmin = fbUserState?.role === "admin" || localAdmin;

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      firebaseEnabled,
      isAdmin,
      isLocalAdmin: localAdmin,
      signIn,
      signOut,
      loginWithPassword,
    }),
    [user, loading, isAdmin, localAdmin, signIn, signOut, loginWithPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
