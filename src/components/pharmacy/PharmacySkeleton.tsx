"use client";

import React from "react";

/**
 * Skeleton Loader untuk 5 Kartu KPI di bagian atas modul farmasi
 */
export function PharmacyKpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 shadow-2xs space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-20 bg-slate-200 rounded" />
            <div className="h-4 w-7 bg-slate-200 rounded-full" />
          </div>
          <div className="h-6 w-16 bg-slate-300 rounded mt-1.5" />
          <div className="h-2 w-28 bg-slate-200/70 rounded mt-1" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton Loader untuk Tampilan Kartu Alur Resep (Cards View)
 */
export function PharmacyWorklistCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3"
        >
          {/* Top Bar: Pasien & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-36 bg-slate-300 rounded" />
                  <div className="h-3.5 w-20 bg-slate-200 rounded" />
                  <div className="h-4 w-16 bg-slate-100 border border-slate-200 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-24 bg-slate-200/80 rounded" />
                  <div className="h-3 w-32 bg-slate-200/80 rounded" />
                </div>
              </div>
            </div>
            <div className="h-6 w-32 bg-slate-200 rounded-full shrink-0" />
          </div>

          {/* Body: Rincian Obat & Verifikasi */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Box Obat */}
            <div className="md:col-span-7 p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100/60 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-4 w-44 bg-slate-300 rounded" />
                <div className="h-3 w-28 bg-teal-200/70 rounded" />
                <div className="h-3 w-36 bg-slate-200 rounded" />
              </div>
            </div>

            {/* Box Kuantitas & Stok */}
            <div className="md:col-span-5 p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-slate-200 rounded" />
                <div className="h-5 w-24 bg-slate-300 rounded" />
              </div>
              <div className="space-y-1 text-right">
                <div className="h-2.5 w-16 bg-slate-200 rounded ml-auto" />
                <div className="h-4 w-20 bg-slate-200 rounded ml-auto" />
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="h-3 w-40 bg-slate-200 rounded" />
            <div className="h-7 w-36 bg-slate-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton Loader untuk Baris Tabel Antrean Resep (Table View)
 */
export function PharmacyWorklistTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, idx) => (
        <tr key={idx} className="animate-pulse border-b border-slate-100">
          {/* Antrean & RM */}
          <td className="py-3.5 px-3.5 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div className="h-4 w-10 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-300 rounded" />
            </div>
          </td>

          {/* Pasien */}
          <td className="py-3.5 px-3.5 whitespace-nowrap">
            <div className="h-3.5 w-32 bg-slate-300 rounded" />
            <div className="h-2.5 w-24 bg-slate-200 rounded mt-1.5" />
          </td>

          {/* Poli / DPJP */}
          <td className="py-3.5 px-3.5 whitespace-nowrap">
            <div className="h-3.5 w-28 bg-slate-200 rounded" />
            <div className="h-2.5 w-36 bg-slate-100 rounded mt-1.5" />
          </td>

          {/* Obat & KFA */}
          <td className="py-3.5 px-3.5 min-w-[220px]">
            <div className="h-3.5 w-40 bg-slate-300 rounded" />
            <div className="h-2.5 w-24 bg-teal-100 rounded mt-1.5" />
          </td>

          {/* Aturan Pakai */}
          <td className="py-3.5 px-3.5 whitespace-nowrap">
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="h-2.5 w-20 bg-slate-100 rounded mt-1.5" />
          </td>

          {/* Jumlah & Stok */}
          <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
            <div className="h-4 w-16 bg-slate-200 rounded mx-auto" />
            <div className="h-2.5 w-12 bg-slate-100 rounded mx-auto mt-1" />
          </td>

          {/* Status */}
          <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
            <div className="h-5 w-24 bg-slate-200 rounded-full mx-auto" />
          </td>

          {/* Aksi Alur */}
          <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
            <div className="h-7 w-24 bg-slate-200 rounded-lg mx-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

/**
 * Skeleton Loader untuk Baris Tabel Katalog Stok Obat Gudang
 */
export function PharmacyInventoryTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, idx) => (
        <tr key={idx} className="animate-pulse border-b border-slate-100">
          {/* Nama Obat */}
          <td className="py-3 px-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-slate-200 shrink-0" />
              <div className="space-y-1">
                <div className="h-3.5 w-36 sm:w-44 bg-slate-300 rounded" />
                <div className="h-2.5 w-24 bg-slate-200/80 rounded" />
              </div>
            </div>
          </td>

          {/* Kode KFA */}
          <td className="py-3 px-4 whitespace-nowrap">
            <div className="h-4 w-24 bg-teal-100/80 rounded" />
          </td>

          {/* Bentuk & Dosis */}
          <td className="py-3 px-4 whitespace-nowrap">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-2.5 w-14 bg-slate-100 rounded mt-1" />
          </td>

          {/* Kategori */}
          <td className="py-3 px-4 whitespace-nowrap">
            <div className="h-4 w-28 bg-slate-100 border border-slate-200/70 rounded-md" />
          </td>

          {/* Stok Fisik */}
          <td className="py-3 px-4 text-center whitespace-nowrap">
            <div className="h-5 w-14 bg-slate-200 rounded-md mx-auto" />
          </td>

          {/* Status */}
          <td className="py-3 px-4 text-center whitespace-nowrap">
            <div className="h-4 w-12 bg-emerald-100/70 rounded-full mx-auto" />
          </td>

          {/* Harga Satuan */}
          <td className="py-3 px-4 text-right whitespace-nowrap">
            <div className="h-3.5 w-20 bg-slate-200 rounded ml-auto" />
          </td>

          {/* Aksi Manajemen */}
          <td className="py-3 px-4 text-center whitespace-nowrap">
            <div className="flex items-center justify-center gap-1.5">
              <div className="h-7 w-7 bg-slate-100 border border-slate-200 rounded-lg" />
              <div className="h-7 w-7 bg-slate-100 border border-slate-200 rounded-lg" />
              <div className="h-7 w-7 bg-slate-100 border border-slate-200 rounded-lg" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

/**
 * Skeleton Loader untuk Baris Tabel Kartu Mutasi Stok
 */
export function PharmacyMutationsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, idx) => (
        <tr key={idx} className="animate-pulse border-b border-slate-100">
          {/* Waktu Transaksi */}
          <td className="py-3 px-4 whitespace-nowrap">
            <div className="h-3.5 w-24 bg-slate-200 rounded" />
            <div className="h-2.5 w-16 bg-slate-100 rounded mt-1" />
          </td>

          {/* Kode KFA */}
          <td className="py-3 px-4 whitespace-nowrap">
            <div className="h-3.5 w-24 bg-slate-200 font-mono rounded" />
          </td>

          {/* Jenis Transaksi */}
          <td className="py-3 px-4 whitespace-nowrap">
            <div className="h-4 w-28 bg-slate-200 rounded-full" />
          </td>

          {/* Stok Awal */}
          <td className="py-3 px-4 text-center whitespace-nowrap">
            <div className="h-3.5 w-10 bg-slate-200 rounded mx-auto" />
          </td>

          {/* Mutasi */}
          <td className="py-3 px-4 text-center whitespace-nowrap">
            <div className="h-3.5 w-12 bg-slate-200 rounded mx-auto" />
          </td>

          {/* Stok Akhir */}
          <td className="py-3 px-4 text-center whitespace-nowrap">
            <div className="h-3.5 w-10 bg-slate-200 rounded mx-auto" />
          </td>

          {/* Keterangan */}
          <td className="py-3 px-4 min-w-[180px]">
            <div className="h-3 w-44 bg-slate-100 rounded" />
          </td>

          {/* Petugas */}
          <td className="py-3 px-4 whitespace-nowrap">
            <div className="h-3 w-24 bg-slate-200 rounded" />
          </td>
        </tr>
      ))}
    </>
  );
}

/**
 * Shimmer progress bar halus yang muncul di bagian atas tabel saat data sedang disinkronkan kembali di background
 */
export function PharmacyLoadingBar() {
  return (
    <div className="relative w-full h-1 overflow-hidden bg-teal-100/50">
      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600 w-1/3 animate-[shimmer_1.5s_infinite]" />
    </div>
  );
}
