"use client";

import { useAuth } from "@/lib/auth";

export function Header({
  constituency,
  children,
}: {
  constituency?: Record<string, unknown>;
  children?: React.ReactNode;
}) {
  return (
    <header className="z-30 flex items-center gap-3 border-b border-line bg-white px-3 py-2.5 shadow-sm md:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z" strokeLinejoin="round" />
            <path d="M9 3v16M15 5v16" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold leading-tight text-ink">
            Tanur Constituency GIS
          </h1>
          <p className="truncate text-[11px] leading-tight text-ink-faint">
            Assembly Constituency No.&nbsp;{String(constituency?.number ?? 44)} · Malappuram, Kerala
          </p>
        </div>
      </div>

      <div className="mx-auto hidden max-w-md flex-1 md:block">{children}</div>

      <AuthButton />
    </header>
  );
}

function AuthButton() {
  const { user, loading, firebaseEnabled, isAdmin, signIn, signOut } = useAuth();

  if (!firebaseEnabled) {
    return (
      <span className="hidden shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 sm:inline">
        Demo mode · edits saved locally
      </span>
    );
  }
  if (loading) return <span className="text-xs text-ink-faint">…</span>;

  if (!user) {
    return (
      <button
        onClick={signIn}
        className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="hidden text-right sm:block">
        <span className="block text-xs font-medium leading-tight text-ink">
          {user.displayName ?? user.email}
        </span>
        <span
          className={`block text-[10px] leading-tight ${
            isAdmin ? "text-brand" : "text-ink-faint"
          }`}
        >
          {isAdmin ? "Administrator" : "Viewer"}
        </span>
      </span>
      <button
        onClick={signOut}
        className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-sunken"
      >
        Sign out
      </button>
    </div>
  );
}
