import type { PiNetwork } from "@/lib/pi-sdk";

declare global {
  interface Window {
    Pi?: PiNetwork;
  }
}

export {};
