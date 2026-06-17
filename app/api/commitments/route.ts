import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const { from, text } = body;

  if (!from) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  // salva su DB / file / mock
  console.log("Commitment:", from, text);

  return NextResponse.json({ ok: true });
}
