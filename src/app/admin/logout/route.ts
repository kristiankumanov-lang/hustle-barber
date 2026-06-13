/**
 * POST /admin/logout
 * Излиза от системата (изтрива auth cookies) и пренасочва към login.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerAuthClient } from "@/lib/supabase-server-auth";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerAuthClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/admin/login", request.url), {
    status: 303, // POST → GET redirect
  });
}

// Подкрепяме и GET (например ако направим линк „Изход" вместо form-бутон).
// Но за production предпочитай POST, че да не може просто отваряне на линк
// да logout-ва.
export async function GET(request: Request) {
  return POST(request);
}
