import { NextRequest, NextResponse } from "next/server";

type MockPaymentStatus =
  | "initialized"
  | "pending_server_approval"
  | "approved"
  | "ready_for_completion"
  | "completed"
  | "cancelled"
  | "error";

interface MockPayment {
  identifier: string;
  status: MockPaymentStatus;
  amount?: number;
  memo?: string;
  updatedAt: string;
  history: string[];
}

interface UpdatePayload {
  identifier?: string;
  amount?: number;
  memo?: string;
  action?: "init" | "approve" | "complete" | "cancel" | "reset";
}

const mockPayments = new Map<string, MockPayment>();

function ensureIdentifier(id?: string) {
  if (!id) {
    throw new Error("Missing payment identifier.");
  }
  return id;
}

function upsertPayment(identifier: string, partial: Partial<MockPayment> & { status: MockPaymentStatus }) {
  const existing = mockPayments.get(identifier);
  const entry: MockPayment = {
    identifier,
    amount: partial.amount ?? existing?.amount,
    memo: partial.memo ?? existing?.memo,
    status: partial.status,
    updatedAt: new Date().toISOString(),
    history: [...(existing?.history ?? []), `${partial.status} @ ${new Date().toISOString()}`]
  };

  mockPayments.set(identifier, entry);
  return entry;
}

export async function GET() {
  return NextResponse.json({ payments: Array.from(mockPayments.values()) });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdatePayload;
    const identifier = ensureIdentifier(body.identifier);
    const action = body.action ?? "init";

    switch (action) {
      case "init": {
        const entry = upsertPayment(identifier, {
          status: "pending_server_approval",
          amount: body.amount,
          memo: body.memo
        });
        return NextResponse.json({ payment: entry });
      }
      case "approve": {
        const entry = upsertPayment(identifier, { status: "approved" });
        return NextResponse.json({ payment: entry });
      }
      case "complete": {
        const entry = upsertPayment(identifier, { status: "completed" });
        return NextResponse.json({ payment: entry });
      }
      case "cancel": {
        const entry = upsertPayment(identifier, { status: "cancelled" });
        return NextResponse.json({ payment: entry });
      }
      case "reset": {
        mockPayments.delete(identifier);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }
  } catch (error) {
    console.error("Mock payment error", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
