export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase-server";

type IouInsert = {
  id?: string | number;
  pi_uid: string;
  direction: "incoming" | "outgoing";
  counterparty?: string | null;
  amount: number;
  note?: string | null;
  due_date?: string | null;
  status?: string;
  created_at?: string;
};

type RequestBody = Partial<Omit<IouInsert, "amount">> & {
  amount?: number | string;
};

export async function POST(request: Request) {
  let body: RequestBody | null = null;

  try {
    body = (await request.json()) as RequestBody | null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const rawPiUid = typeof body?.pi_uid === "string" ? body.pi_uid.trim() : "";
  const direction = body?.direction;
  const counterparty =
    typeof body?.counterparty === "string" && body.counterparty.trim()
      ? body.counterparty.trim()
      : null;
  const rawAmount = body?.amount;
  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : typeof rawAmount === "string"
        ? Number(rawAmount.replace(/,/g, "."))
        : NaN;
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null;
  const due_date = typeof body?.due_date === "string" && body.due_date.trim() ? body.due_date.trim() : null;

  const isGuest = rawPiUid.startsWith("guest:");
  const parsedPiUid = (() => {
    if (!rawPiUid) return "";

    if (isGuest) {
      return rawPiUid.slice("guest:".length).trim();
    }

    return rawPiUid;
  })();

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    !parsedPiUid ||
    !uuidPattern.test(parsedPiUid) ||
    !direction ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !counterparty
  ) {
    return NextResponse.json({ error: "Missing or invalid IOU fields." }, { status: 400 });
  }

  if (direction !== "incoming" && direction !== "outgoing") {
    return NextResponse.json({ error: "Invalid direction value." }, { status: 400 });
  }

  let supabase;

  try {
    supabase = getSupabaseServerClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initialize database client.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const payload: IouInsert = {
    pi_uid: isGuest ? rawPiUid : parsedPiUid,
    direction,
    counterparty,
    amount,
    note,
    due_date,
    status: "pending"
  };

  try {
    const { data, error } = await supabase.from("ious").insert(payload);

    if (error) {
      console.error("Supabase insert error:", error.message, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const inserted = Array.isArray(data) ? (data[0] as Partial<IouInsert> | undefined) : null;
    const created_at = inserted?.created_at ?? new Date().toISOString();
    const response = {
      ...payload,
      ...inserted,
      id: inserted?.id ?? payload.id ?? `${payload.pi_uid}-${created_at}`,
      created_at
    } satisfies IouInsert;

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    console.error("Unexpected IOU create error", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
