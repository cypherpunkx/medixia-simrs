"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-slate-50">
      <h2 className="text-xl font-extrabold text-slate-900 mb-2">Terjadi Kesalahan Sistem</h2>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        Terjadi kendala saat memuat antarmuka rekam medis. Silakan muat ulang.
      </p>
      <Button onClick={() => reset()} variant="medical">
        Coba Lagi
      </Button>
    </div>
  );
}
