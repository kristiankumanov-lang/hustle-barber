/**
 * /admin/schedule — управление на дни и часови слотове.
 *
 * Server component wrapper. Auth checkът е тук, реалното UI е в
 * ScheduleClient (client component).
 */

import { getCurrentUser } from "@/lib/supabase-server-auth";
import { redirect } from "next/navigation";
import ScheduleClient from "./ScheduleClient";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  return <ScheduleClient />;
}
