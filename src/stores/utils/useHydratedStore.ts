"use client";

import { useState, useEffect } from "react";

/**
 * useHydratedStore
 * Mencegah hydration mismatch pada Next.js 15 App Router saat membaca data persist
 * dari sessionStorage / localStorage di Zustand store.
 */
export function useHydratedStore<T, F>(
  store: (callback: (state: T) => unknown) => unknown,
  callback: (state: T) => F
): F | undefined {
  const result = store(callback) as F;
  const [data, setData] = useState<F>();

  useEffect(() => {
    setData(result);
  }, [result]);

  return data;
}
