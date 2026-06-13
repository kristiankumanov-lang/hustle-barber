"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface Props {
  email: string;
}

export default function AdminHeader({ email }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/admin/login");
  }

  const navItems = [
    { href: "/admin", label: "Часове" },
    { href: "/admin/schedule", label: "График" },
    
  ];

  return (
    <header className="border-b border-[#2A2A2A] bg-[#0a0a0a] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <Link
            href="/admin"
            className="text-lg font-semibold whitespace-nowrap"
            style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
          >
            Hustle Barber
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-[#EDE8E0] text-[#111]"
                      : "text-[#7A7570] hover:text-[#EDE8E0] hover:bg-[#1E1E1E]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-xs text-[#4A4845] truncate max-w-[180px]">
            {email}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs text-[#7A7570] hover:text-[#EDE8E0] px-3 py-1.5 rounded-lg border border-[#2A2A2A] hover:border-[#444] transition-all"
          >
            Изход
          </button>
        </div>
      </div>
    </header>
  );
}
