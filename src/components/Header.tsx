"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Props {
  businessName: string;
}

function MustacheFallback({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 200 46" fill="none" className="w-40 h-8" aria-hidden>
        <path d="M100 23C89 23 75 29 61 26C48 23 37 15 24 13C15 11 6 17 6 25C7 33 18 38 32 36C45 34 55 26 70 26C83 26 94 32 100 32" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.75"/>
        <path d="M100 23C111 23 125 29 139 26C152 23 163 15 176 13C185 11 194 17 194 25C193 33 182 38 168 36C155 34 145 26 130 26C117 26 106 32 100 32" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.75"/>
      </svg>
      <p className="text-white text-2xl font-semibold tracking-[0.22em] uppercase"
         style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
        {name || "Hustle Barber"}
      </p>
    </div>
  );
}

/**
 * Хамбургер dropdown menu.
 * Структуриран да е лесно extendable за бъдещи линкове (магазин, галерия и т.н.).
 */
function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close при click извън menu-то
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Меню"
        aria-expanded={open}
        className="w-8 h-8 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/5 transition-colors"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-[#161616] shadow-2xl z-50 overflow-hidden">
          <Link
            href="/admin/login"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-white/40">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>Служители</span>
          </Link>

          {/*
            Място за бъдещи линкове (например):

            <Link href="/shop" className="...">
              <icon /> Магазин
            </Link>

            <Link href="/gallery" className="...">
              <icon /> Галерия
            </Link>
          */}
        </div>
      )}
    </div>
  );
}

export default function Header({ businessName }: Props) {
  const [hbOk,   setHbOk]   = useState(true);
  const [logoOk, setLogoOk] = useState(true);

  return (
    <header className="bg-[#0D0D0D] w-full">

      {/* ── Top bar: HB small left · brand name · Est. 2018 · hamburger ── */}
      <div className="max-w-2xl mx-auto px-6 py-3.5 flex items-center gap-3">

        {/* HB — small, secondary, subtle */}
        <div className="w-8 h-8 rounded-full border border-white/15 bg-[#1A1A1A] overflow-hidden flex-shrink-0 flex items-center justify-center">
          {hbOk ? (
            <img src="/images/hb-monogram.png" alt="HB" width={32} height={32}
              className="w-full h-full object-cover" onError={() => setHbOk(false)} />
          ) : (
            <span className="text-white text-xs font-semibold tracking-wide select-none"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>HB</span>
          )}
        </div>

        <div className="w-px h-5 bg-white/10 flex-shrink-0" />

        <span className="text-white text-[13px] tracking-[0.24em] uppercase flex-1 font-semibold"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
          {businessName || "Hustle Barber"}
        </span>

        <span className="text-white/20 text-[10px] tracking-[0.28em] uppercase hidden sm:block"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}>
          Est. 2018
        </span>

        {/* Hamburger menu — горе вдясно */}
        <HamburgerMenu />
      </div>

      {/* ── Thin separator ───────────────────────────────── */}
      <div className="border-t border-white/[0.06]" />

      {/* ── Moustache logo — primary hero brand anchor ─────── */}
      <div className="flex justify-center pt-4 pb-5">
        {logoOk ? (
          <img
            src="/images/hustle-barber-logo.png"
            alt={businessName || "Hustle Barber"}
            width={200} height={100}
            className="w-[190px] sm:w-[200px] h-auto object-contain"
            onError={() => setLogoOk(false)}
          />
        ) : (
          <MustacheFallback name={businessName} />
        )}
      </div>

    </header>
  );
}
