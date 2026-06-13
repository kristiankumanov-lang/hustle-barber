/**
 * Admin Dashboard — /admin
 * Tabs: Днес | Седмица | История
 */

import { getCurrentUser } from "@/lib/supabase-server-auth";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Middleware-ът ни пази, но дублираме за сигурност.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  return <DashboardClient />;
}
