"use client";

import { useState } from "react";

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

export default function Header({ businessName }: Props) {
  const [hbOk,   setHbOk]   = useState(true);
  const [logoOk, setLogoOk] = useState(true);

  return (
    <header className="bg-[#0D0D0D] w-full">

      {/* ── Top bar: HB small left · brand name · Est. 2018 ── */}
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
      </div>

      {/* ── Thin separator ───────────────────────────────── */}
      <div className="border-t border-white/[0.06]" />

      {/* ── Moustache logo — primary hero brand anchor ───────
          Compact: max-w-[200px], modest vertical padding.
          Dark background на изображението се слива с header-а —
          изглежда като интегриран emblem, не като пасната снимка.
      ─────────────────────────────────────────────────────── */}
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
