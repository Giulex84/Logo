import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase configuration");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

type Direction = "incoming" | "outgoing";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pi_uid, direction, counterparty, amount, note, due_date } = body ?? {};

    if (!pi_uid || !direction || typeof amount !== "number") {
      return NextResponse.json(
        { error: "pi_uid, direction and amount are required" },
        { status: 400 }
      );
    }

    const normalizedDirection: Direction = direction === "incoming" ? "incoming" : "outgoing";

    const { data, error } = await supabase
      .from("ious")
      .insert({
        pi_uid,
        direction: normalizedDirection,
        counterparty: counterparty ?? null,
        amount,
        note: note ?? null,
        due_date: due_date ?? null,
        status: "pending"
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create IOU" },
      { status: 500 }
    );
  }
}
