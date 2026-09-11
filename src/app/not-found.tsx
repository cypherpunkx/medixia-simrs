import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-slate-50">
      <h1 className="text-4xl font-extrabold text-slate-900 mb-2">404</h1>
      <h2 className="text-lg font-bold text-slate-700 mb-4">Halaman Tidak Ditemukan</h2>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        Halaman atau rute yang Anda cari tidak tersedia dalam Portal SATUSEHAT RME.
      </p>
      <Button asChild variant="medical">
        <Link href="/">Kembali ke Rekam Medis</Link>
      </Button>
    </div>
  );
}
