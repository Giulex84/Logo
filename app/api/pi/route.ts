import { NextRequest, NextResponse } from "next/server";

const PI_API_KEY = process.env.PI_API_KEY!;
const PI_API_URL = "https://api.minepi.com/v2/payments";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, paymentId, txid } = body;

  let url = "";
  let payload: any = {};

  if (action === "approve") {
    url = `${PI_API_URL}/${paymentId}/approve`;
  }

  if (action === "complete") {
    url = `${PI_API_URL}/${paymentId}/complete`;
    payload = { txid };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Key ${PI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: Object.keys(payload).length ? JSON.stringify(payload) : undefined,
  });

  const data = await res.json();
  return NextResponse.json(data);
}
