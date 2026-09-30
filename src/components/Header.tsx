"use client";

import { useState } from "react";
import type { FeatureCollection } from "geojson";
import { useAuth } from "@/lib/auth";
import { SearchBar } from "@/components/SearchBar";
import { AdminLoginModal } from "@/components/AdminLoginModal";
import type { LayerId, Selection } from "@/lib/types";

export function Header({
  constituency,
  collections,
  onPick,
  onGoToCoordinate,
}: {
  constituency?: Record<string, unknown>;
  collections: Record<LayerId, FeatureCollection>;
  onPick: (s: Selection) => void;
  onGoToCoordinate?: (lat: number, lng: number) => void;
}) {
  const [mobileSearch, setMobileSearch] = useState(false);

  if (mobileSearch) {
    return (
      <header className="z-30 flex items-center gap-2 border-b border-line bg-white px-3 py-2.5 shadow-sm md:hidden">
        <button
          onClick={() => setMobileSearch(false)}
          className="shrink-0 rounded-full p-1.5 text-ink-soft hover:bg-surface-sunken"
          aria-label="Close search"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <div className="flex-1">
          <SearchBar
            key="mobile-search"
            collections={collections}
            onPick={(s) => {
              onPick(s);
              setMobileSearch(false);
            }}
            onGoToCoordinate={(lat, lng) => {
              onGoToCoordinate?.(lat, lng);
              setMobileSearch(false);
            }}
            autoFocus
            placeholder="Search…"
          />
        </div>
      </header>
    );
  }

  return (
    <header className="z-30 flex items-center gap-2 border-b border-line bg-white px-3 py-2.5 shadow-sm md:gap-3 md:px-4">
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

      <div className="mx-auto hidden max-w-md flex-1 md:block">
        <SearchBar collections={collections} onPick={onPick} onGoToCoordinate={onGoToCoordinate} placeholder="Search, or paste Google Maps coordinates…" />
      </div>

      <button
        onClick={() => setMobileSearch(true)}
        className="ml-auto shrink-0 rounded-full p-2 text-ink-soft hover:bg-surface-sunken md:hidden"
        aria-label="Search"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      <AuthButton />
    </header>
  );
}

function AuthButton() {
  const { user, loading, firebaseEnabled, isAdmin, isLocalAdmin, signOut } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (firebaseEnabled && loading) return <span className="text-xs text-ink-faint">…</span>;

  if (isAdmin) {
    return (
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-light px-2.5 py-1.5 text-xs font-semibold text-brand-dark"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          <span className="hidden sm:inline">
            {isLocalAdmin ? "Administrator" : user?.displayName ?? "Administrator"}
          </span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-40 mt-1.5 w-44 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-panel">
            <button
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
              className="block w-full px-3 py-1.5 text-left text-ink-soft hover:bg-surface-sunken"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowLogin(true)}
        className="shrink-0 rounded-full border border-line px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-sunken sm:px-3"
      >
        <span className="sm:hidden">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
        <span className="hidden sm:inline">Admin login</span>
      </button>
      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
