import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/lib/db/repositories/user-repo";
import { FacilityRepository } from "@/lib/db/repositories/facility-repo";
import { signSessionToken } from "@/lib/auth/jwt";

// In-memory rate limiting and brute force tracking
interface LoginAttemptRecord {
  count: number;
  lastAttemptTime: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttemptRecord>();

// Clean up stale attempts periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (now - record.lastAttemptTime > 60000 && (!record.lockedUntil || now > record.lockedUntil)) {
      loginAttempts.delete(key);
    }
  }
}, 30000);

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate JSON payload structure
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Format data permintaan tidak valid (Malformed JSON).",
        },
        { status: 400 }
      );
    }

    const { username, password } = body;

    // 2. Data Type & Presence Validation
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Username dan kata sandi wajib diisi dengan benar.",
        },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    // 3. Length Constraints Validation
    if (cleanUsername.length < 2 || cleanUsername.length > 64) {
      return NextResponse.json(
        {
          success: false,
          error: "Panjang username harus antara 2 hingga 64 karakter.",
        },
        { status: 400 }
      );
    }

    if (cleanPassword.length < 1 || cleanPassword.length > 128) {
      return NextResponse.json(
        {
          success: false,
          error: "Panjang kata sandi harus antara 1 hingga 128 karakter.",
        },
        { status: 400 }
      );
    }

    // 4. Rate Limiting & Anti-Brute Force Protection
    const clientIp = req.headers.get("x-forwarded-for") || "local_client";
    const throttleKey = `${clientIp}_${cleanUsername.toLowerCase()}`;
    const now = Date.now();
    const attemptRecord = loginAttempts.get(throttleKey);

    if (attemptRecord) {
      // Check if currently locked out
      if (attemptRecord.lockedUntil && now < attemptRecord.lockedUntil) {
        const remainingSec = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
        return NextResponse.json(
          {
            success: false,
            error: `Terlalu banyak percobaan gagal. Akun/koneksi ditangguhkan sementara selama ${remainingSec} detik.`,
          },
          { status: 429, headers: { "Retry-After": String(remainingSec) } }
        );
      }

      // Rapid multi-click debounce (reject simultaneous hits within 400ms)
      if (now - attemptRecord.lastAttemptTime < 400) {
        return NextResponse.json(
          {
            success: false,
            error: "Permintaan login sedang diproses. Mohon jangan menekan tombol berulang kali.",
          },
          { status: 429 }
        );
      }
    }

    // 5. Authenticate via DB Repository
    const authenticatedUser = await UserRepository.authenticate(cleanUsername, cleanPassword);

    if (!authenticatedUser) {
      // Record failed attempt
      const currentCount = (attemptRecord?.count || 0) + 1;
      const isLocking = currentCount >= 5;
      loginAttempts.set(throttleKey, {
        count: currentCount,
        lastAttemptTime: now,
        lockedUntil: isLocking ? now + 30000 : undefined, // 30s cooldown after 5 failed attempts
      });

      return NextResponse.json(
        {
          success: false,
          error: isLocking
            ? "5 kali percobaan gagal berturut-turut. Akses ditangguhkan 30 detik demi keamanan."
            : "Username atau kata sandi tidak valid. Silakan periksa kembali kredensial Anda.",
        },
        { status: 401 }
      );
    }

    // Reset failed attempts on success
    loginAttempts.delete(throttleKey);

    // 6. Attach facility profile if available
    const targetFacilityId = authenticatedUser.facilityId || "fac-rsud-01";
    const facility = await FacilityRepository.getById(targetFacilityId);

    // Security Guard: Tolak login staf jika faskes sedang dinonaktifkan/diarsipkan
    if (facility && facility.isActive === false && authenticatedUser.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: `Akses Ditolak: Fasilitas kesehatan (${facility.name}) sedang dinonaktifkan / diarsipkan oleh pengelola sistem. Silakan hubungi Tim IT / Vendor Medixia.`,
        },
        { status: 403 }
      );
    }

    const responseData = {
      user: {
        ...authenticatedUser,
        facilityId: targetFacilityId,
        facilityName: facility?.name || authenticatedUser.facilityName || "RS Umum Daerah Sehat Sejahtera",
        facilityType: facility?.type || authenticatedUser.facilityType || "rumah_sakit",
      },
      facility,
    };

    const res = NextResponse.json({
      success: true,
      data: responseData,
      message: `Selamat datang, ${authenticatedUser.name}`,
    });

    // Generate signed JWT session token (HMAC-SHA256)
    const sessionToken = signSessionToken({
      userId: authenticatedUser.id,
      facilityId: targetFacilityId,
      role: authenticatedUser.role,
      username: authenticatedUser.username,
    });

    // Set secure httpOnly session cookie
    res.cookies.set("medixia_simrs_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return res;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan saat memproses login.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
