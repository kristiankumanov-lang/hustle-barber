"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Паролата трябва да е поне ${MIN_PASSWORD_LENGTH} символа.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Паролите не съвпадат.");
      return;
    }

    setIsSubmitting(true);

    // 1. Сменяме паролата
    const { error: pwError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (pwError) {
      setError("Грешка при смяна на парола. Опитай отново.");
      setIsSubmitting(false);
      return;
    }

    // 2. Махаме флага must_change_password (запазваме другите meta полета)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const newMeta = {
      ...(user?.user_metadata ?? {}),
      must_change_password: false,
    };

    const { error: metaError } = await supabase.auth.updateUser({
      data: newMeta,
    });
    if (metaError) {
      // Паролата вече е сменена; флагът обаче остава. Покажи мек warning.
      console.warn("Грешка при изчистване на флага:", metaError.message);
    }

    // 3. Refresh + redirect към dashboard.
    router.refresh();
    router.push("/admin");
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
            Първи вход
          </p>
        </div>

        <div className="p-8 rounded-2xl border border-[#2E2E2E] bg-[#161616] shadow-xl">
          <h2 className="text-xl font-semibold mb-1">Смени паролата</h2>
          <p className="text-sm text-[#7A7570] mb-6">
            При първи вход трябва да зададеш своя собствена парола.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="newPassword"
                className="block text-xs font-medium text-[#7A7570] mb-1.5 tracking-wide uppercase"
              >
                Нова парола
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Поне 8 символа"
                autoComplete="new-password"
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
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-[#7A7570] mb-1.5 tracking-wide uppercase"
              >
                Повтори паролата
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повтори новата парола"
                autoComplete="new-password"
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
              {isSubmitting ? "Запазване..." : "Запази новата парола"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
