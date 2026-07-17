import Header from "@/components/Header";
import HomeClient from "@/components/HomeClient";
import { loadInitialBookingData } from "@/lib/queries-server";

/**
 * Server Component — business/services/working-hours/blocked-days се
 * fetch-ват тук (по време на render, на сървъра) вместо в useEffect след
 * hydration. Премахва client-side Supabase waterfall-а за initial load;
 * refetch-ът при връщане към таба (focus/visibility) в useBooking остава
 * client-side, непроменен.
 */
export default async function Home() {
  const initial = await loadInitialBookingData();

  if (initial.loadError) {
    return (
      <div className="min-h-screen bg-[#111111]">
        <Header businessName="" />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-[#888]">{initial.loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111]">
      <Header businessName={initial.businessName} />

      <HomeClient initial={initial} />

      {/* ── Footer ──────────────────────────────── */}
      <footer className="pb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-px w-6 bg-[#2E2E2E]" />
          <div className="w-[5px] h-[5px] rotate-45 bg-[#333]" />
          <div className="h-px w-6 bg-[#2E2E2E]" />
        </div>
        <p className="text-[11px] text-[#444] tracking-[0.22em] uppercase"
           style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
          {initial.businessName || "Hustle Barber"}&nbsp;·&nbsp;{new Date().getFullYear()}
        </p>
        <p className="mt-3 text-[10px] text-[#A8A39A] tracking-wide">
          Powered by{" "}
          <a
            href="https://www.facebook.com/profile.php?id=61590868000717"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            Kumanov AI Studio
          </a>
        </p>
      </footer>
    </div>
  );
}
