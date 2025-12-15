export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase-server";

type RequestBody = {
  pi_uid?: string;
  direction?: "incoming" | "outgoing";
  counterparty?: string;
  amount?: number;
  note?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody | null;

  const pi_uid = body?.pi_uid?.trim();
  const direction = body?.direction;
  const counterparty = body?.counterparty?.trim();
  const amount = typeof body?.amount === "number" ? body.amount : Number(body?.amount);
  const note = body?.note?.trim() || undefined;

  if (!pi_uid || !direction || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Missing or invalid IOU fields." }, { status: 400 });
  }

  if (direction !== "incoming" && direction !== "outgoing") {
    return NextResponse.json({ error: "Invalid direction value." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const payload = {
    pi_uid,
    direction,
    counterparty,
    amount,
    note,
    status: "pending"
  };

  const { data, error } = await supabase
    .from("ious")
    .insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const inserted = Array.isArray(data) ? data[0] : data;
  const fallbackTimestamps = inserted
    ? undefined
    : {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

  return NextResponse.json({ ...payload, ...fallbackTimestamps, ...inserted });
}
