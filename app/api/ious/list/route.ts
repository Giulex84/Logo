import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const pi_uid = request.nextUrl.searchParams.get("pi_uid")?.trim();

  if (!pi_uid) {
    return NextResponse.json({ error: "pi_uid is required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("ious")
    .select("*")
    .eq("pi_uid", pi_uid)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
