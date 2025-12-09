type PiAuthScope = "payments" | "username";

export interface PiUser {
  uid: string;
  username: string;
  roles: string[];
}

export interface PiPayment {
  identifier: string;
  user_uid?: string;
  amount?: number;
  memo?: string;
  metadata?: Record<string, unknown>;
}

export type PiAuthResult = {
  accessToken: string;
  user: PiUser;
};

export interface PiVerifiedAuthResponse {
  user: PiUser;
}

export type PiPaymentData = {
  amount: number;
  memo: string;
  metadata?: Record<string, unknown>;
};

export type PiPaymentCallbacks = {
  onReadyForServerApproval: (payment: PiPayment) => void;
  onReadyForServerCompletion: (payment: PiPayment) => void;
  onCancel: (payment?: PiPayment) => void;
  onError: (error: unknown, payment?: PiPayment) => void;
};

export interface PiNetwork {
  authenticate: (
    scopes: PiAuthScope[],
    onIncompletePaymentFound?: (payment: PiPayment) => void
  ) => Promise<PiAuthResult>;
  createPayment: (paymentData: PiPaymentData, callbacks: PiPaymentCallbacks) => Promise<PiPayment>;
  init?: (params: { version: string; appId?: string; sandbox?: boolean }) => void;
}

export function detectPiSdk(): { sdk: PiNetwork | null; isPiBrowser: boolean } {
  if (typeof window === "undefined") {
    return { sdk: null, isPiBrowser: false };
  }

  const sdk = typeof window.Pi !== "undefined" ? (window.Pi as PiNetwork) : null;
  const userAgent = window.navigator?.userAgent ?? "";

  return {
    sdk,
    isPiBrowser: /PiBrowser/i.test(userAgent)
  };
}

export function initializePiSdk(sdk: PiNetwork | null): void {
  if (!sdk?.init) return;

  sdk.init({
    version: "2.0",
    sandbox: true,
    appId: process.env.NEXT_PUBLIC_PI_APP_ID
  });
}

async function ensurePiSdk(): Promise<PiNetwork> {
  const { sdk, isPiBrowser } = detectPiSdk();
  if (sdk) return sdk;

  const reason = isPiBrowser
    ? "Pi Browser is open but the SDK is still loading. Refresh or check your Pi session."
    : "Pi SDK not detected. Open the DApp inside Pi Browser.";
  throw new Error(reason);
}

export async function authenticateWithPi(
  onIncompletePaymentFound?: (payment: PiPayment) => void
): Promise<PiAuthResult> {
  const sdk = await ensurePiSdk();
  return sdk.authenticate(["username", "payments"], onIncompletePaymentFound);
}

export async function verifyPiAuth(authResult: PiAuthResult): Promise<PiVerifiedAuthResponse> {
  const response = await fetch("/api/pi/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ authResult })
  });

  if (!response.ok) {
    let message = "Failed to verify Pi login on the server.";

    try {
      const payload = (await response.json()) as { error?: string; details?: string };

      if (payload?.error) {
        message = payload.details ? `${payload.error}: ${payload.details}` : payload.error;
      }
    } catch {
      // Ignore JSON parse errors and fall back to default message
    }

    throw new Error(message);
  }

  const payload = (await response.json()) as PiVerifiedAuthResponse | null;

  if (!payload?.user) {
    throw new Error("Pi verification response did not include a user payload.");
  }

  return payload;
}

export async function createTestPayment(
  amount: number,
  memo: string,
  callbacks: PiPaymentCallbacks
): Promise<PiPayment> {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0.01;
  const sdk = await ensurePiSdk();

  return sdk.createPayment(
    {
      amount: safeAmount,
      memo,
      metadata: { testPayment: true }
    },
    callbacks
  );
}
