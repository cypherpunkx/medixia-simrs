import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: "Berhasil keluar dari sistem.",
  });

  res.cookies.delete("medixia_simrs_session");
  return res;
}
