export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase environment variables are not fully configured.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  console.log("/api/ious/create called");

  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { pi_uid, direction, counterparty, amount, note, due_date } =
    (body as Record<string, unknown>) ?? {};

  const sanitizedPiUid = typeof pi_uid === "string" ? pi_uid.trim() : "";
  const sanitizedDirection = direction === "incoming" || direction === "outgoing" ? direction : "";
  const numericAmount = typeof amount === "number" ? amount : Number(amount);

  if (!sanitizedPiUid || !sanitizedDirection || !Number.isFinite(numericAmount)) {
    return NextResponse.json({ error: "pi_uid, direction, and amount are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ious")
    .insert({
      pi_uid: sanitizedPiUid,
      direction: sanitizedDirection,
      counterparty: typeof counterparty === "string" ? counterparty.trim() : counterparty ?? null,
      amount: numericAmount,
      note: typeof note === "string" ? note.trim() || null : note ?? null,
      due_date: typeof due_date === "string" && due_date.trim() ? due_date : null,
      status: "pending"
    })
    .select()
    .single();

  console.log("/api/ious/create insert result", { data, error });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
