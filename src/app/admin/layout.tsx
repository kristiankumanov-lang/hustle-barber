/**
 * Общ layout за всички /admin/* страници (БЕЗ login и change-password).
 * Показва header с навигация + logout.
 *
 * Login и change-password страниците имат свой пълноекранен дизайн, та
 * checkваме pathname-а и не показваме header за тях.
 */

import { getCurrentUser } from "@/lib/supabase-server-auth";
import { redirect } from "next/navigation";
import AdminHeader from "./AdminHeader";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Middleware-ът вече прави redirect за неавторизирани, но е безопасно
  // да дублираме проверката тук — defense in depth.
  // Login и change-password страниците ще имат свой по-голям layout —
  // там children-а ще покрие целия viewport, без header.
  // За тях user може да е null (login) или с must_change → пропускаме header.

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#F0EBE3]">
      {user && !user.user_metadata?.must_change_password ? (
        <AdminHeader email={user.email ?? ""} />
      ) : null}
      <main>{children}</main>
    </div>
  );
}
