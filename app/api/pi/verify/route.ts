import { NextRequest, NextResponse } from "next/server";

const PI_PROD_API_BASE = "https://api.minepi.com/v2";
const PI_SANDBOX_API_BASE = "https://api.minepi.com/v2";

interface AuthResultPayload {
  accessToken?: string;
  user?: unknown;
}

interface VerifyRequestBody {
  authResult?: AuthResultPayload;
}

function getApiKey() {
  return process.env.PI_API_KEY ?? process.env.NEXT_PUBLIC_PI_API_KEY;
}

function getApiBase() {
  if (process.env.PI_API_BASE_URL) {
    return process.env.PI_API_BASE_URL;
  }

  return process.env.NEXT_PUBLIC_PI_SANDBOX === "true"
    ? PI_SANDBOX_API_BASE
    : PI_PROD_API_BASE;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as VerifyRequestBody | null;

  const accessToken = body?.authResult?.accessToken;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing Pi authentication payload (accessToken)." },
      { status: 400 },
    );
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Server-side Pi API key is not configured." },
      { status: 500 },
    );
  }

  const apiBase = getApiBase();

  try {
    const verificationResponse = await fetch(`${apiBase}/me`, {
      headers: {
        Authorization: `Key ${apiKey}`,
        "X-Auth-Token": accessToken,
      },
    });

    if (!verificationResponse.ok) {
      const errorText = await verificationResponse.text();
      return NextResponse.json(
        {
          error: "Pi authentication verification failed.",
          details: errorText,
        },
        { status: 401 },
      );
    }

    const verifiedUser = await verificationResponse.json();

    return NextResponse.json({ user: verifiedUser }, { status: 200 });
  } catch (error) {
    console.error("Pi verification request failed:", error);
    return NextResponse.json(
      { error: "Unexpected server error during Pi verification." },
      { status: 500 },
    );
  }
}
