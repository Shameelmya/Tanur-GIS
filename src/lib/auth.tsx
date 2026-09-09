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

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  firebaseEnabled: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled || !auth || !db) return;
    return onAuthStateChanged(auth, async (fbUser: User | null) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Look up the user's role. First admin must be promoted manually in the
      // Firestore console (see README "Admin setup").
      const ref = doc(db!, "users", fbUser.uid);
      const snap = await getDoc(ref);
      let role: UserRole = "viewer";
      if (snap.exists()) {
        role = (snap.data().role as UserRole) ?? "viewer";
      } else {
        await setDoc(ref, {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          role: "viewer",
          createdAt: Date.now(),
        });
      }
      setUser({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        role,
      });
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async () => {
    if (!auth) return;
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await fbSignOut(auth);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      firebaseEnabled,
      isAdmin: user?.role === "admin",
      signIn,
      signOut,
    }),
    [user, loading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
