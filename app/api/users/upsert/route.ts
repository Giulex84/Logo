export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase-server";

type RequestBody = {
  pi_uid?: string;
  pi_username?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody | null;

  const pi_uid = body?.pi_uid?.trim();
  const pi_username = body?.pi_username?.trim();

  if (!pi_uid || !pi_username) {
    return NextResponse.json({ error: "pi_uid and pi_username are required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from("users").upsert(
    {
      pi_uid,
      pi_username
    },
    { onConflict: "pi_uid" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
