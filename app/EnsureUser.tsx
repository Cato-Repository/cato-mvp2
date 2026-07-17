"use client";

import { useStoreUserEffect } from "@/app/useStoreUserEffect";

export function EnsureUser({ children }: { children: React.ReactNode }) {
  useStoreUserEffect();
  return <>{children}</>;
}
