export type PiUser = {
  uid: string;
  username?: string;
};

export function isPiAvailable(): boolean {
  return typeof window !== "undefined" && typeof (window as any).Pi !== "undefined";
}

export async function authenticatePi(): Promise<PiUser | null> {
  if (!isPiAvailable()) return null;

  // @ts-ignore
  const result = await window.Pi.authenticate(["username"], () => {}, () => {});
  return result ?? null;
}
