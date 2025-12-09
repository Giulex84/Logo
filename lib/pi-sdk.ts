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
