"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AdminLoginPage() {
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Моля, въведете имейл и парола.");
      return;
    }

    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // Не разкривай дали имейлът съществува — стандартна security практика.
      setError("Грешен имейл или парола.");
      setIsSubmitting(false);
      return;
    }

    // Login успешен → пълна навигация (не client-side push), за да изчакаме
    // auth cookie-то реално да уседне в браузъра преди новата заявка към сървъра.
    window.location.href = "/admin";
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0a] text-[#F0EBE3]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-semibold mb-2"
            style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
          >
            Hustle Barber
          </h1>
          <p className="text-sm text-[#7A7570] uppercase tracking-widest">
            Админ панел
          </p>
        </div>

        <div className="p-8 rounded-2xl border border-[#2E2E2E] bg-[#161616] shadow-xl">
          <h2 className="text-xl font-semibold mb-1">Вход</h2>
          <p className="text-sm text-[#7A7570] mb-6">Само за служители.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#7A7570] mb-1.5 tracking-wide uppercase"
              >
                Имейл
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl border border-[#333330] bg-[#2A2A2A]
                  text-[#EDE8E0] text-sm placeholder:text-[#4A4845]
                  focus:outline-none focus:ring-1 focus:ring-[#EDE8E0]/20 focus:border-[#555]
                  disabled:opacity-50 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#7A7570] mb-1.5 tracking-wide uppercase"
              >
                Парола
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl border border-[#333330] bg-[#2A2A2A]
                  text-[#EDE8E0] text-sm placeholder:text-[#4A4845]
                  focus:outline-none focus:ring-1 focus:ring-[#EDE8E0]/20 focus:border-[#555]
                  disabled:opacity-50 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-red-900/40 bg-red-950/30">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="flex-shrink-0 mt-0.5 text-red-400"
                >
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M8 5v3.5M8 11h.01"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#EDE8E0] text-[#111111] font-semibold
                hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed
                transition-all text-sm tracking-wide shadow-sm"
            >
              {isSubmitting ? "Вход..." : "Влез"}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-[#4A4845] mt-6">
          Hustle Barber · 2026
        </p>
      </div>
    </div>
  );
}
