"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export function AdminLoginModal({ onClose }: { onClose: () => void }) {
  const { loginWithPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);

  function submit() {
    if (loginWithPassword(password)) {
      onClose();
    } else {
      setError(true);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-black/[0.06] bg-white shadow-panel animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Administrator sign-in
          </h2>
          <button onClick={onClose} className="rounded p-1 text-ink-faint hover:bg-surface-sunken">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-ink-faint">
            Enter the administrator password to edit and add features on the map.
          </p>
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Password</span>
            <div className="mt-1 flex items-center gap-1 rounded-lg border border-line px-2.5 focus-within:border-brand">
              <input
                type={show ? "text" : "password"}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full bg-transparent py-2 text-sm outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="shrink-0 px-1 text-ink-faint hover:text-ink-soft"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.4 10.4 0 0 1 12 5c5 0 9 4 10 7-.4 1.1-1.1 2.3-2.1 3.4M6.2 6.2C4.2 7.5 2.7 9.3 2 12c1 3 5 7 10 7 1.3 0 2.5-.3 3.6-.7" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          {error && <p className="text-xs font-medium text-red-600">Incorrect password. Try again.</p>}
        </div>
        <div className="flex items-center gap-2 border-t border-line px-5 py-3.5">
          <button
            onClick={submit}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Sign in
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-sunken"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
