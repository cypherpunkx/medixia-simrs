/**
 * Modul Voice Announcer & Synthesizer Antrean Pasien
 * Standar Bahasa Indonesia (id-ID) & Pilihan Karakter Suara (Termasuk Persona Khas Pak Jokowi)
 * Dilengkapi dengan Sintesis Web Audio Chime Ting-Tung RS Indonesia
 */

export type VoiceProfileId = "female_announcer" | "male_announcer" | "jokowi" | "concise";

export interface VoiceProfileConfig {
  id: VoiceProfileId;
  name: string;
  tagline: string;
  icon: string;
  gender: "female" | "male" | "neutral";
  pitch: number;
  rate: number;
  template: (data: {
    spelledQueue: string;
    patientName: string;
    department: string;
    room: string;
    doctor: string;
  }) => string;
}

/**
 * Konfigurasi Karakter & Gaya Suara Panggilan Antrean
 */
export const VOICE_PROFILES: Record<VoiceProfileId, VoiceProfileConfig> = {
  jokowi: {
    id: "jokowi",
    name: "Khas Pak Jokowi (Edisi Khusus)",
    tagline: "Gaya bertutur santun, santai, berjarak ritmis khas Pak Jokowi",
    icon: "🇮🇩",
    gender: "male",
    pitch: 0.85,
    rate: 0.82,
    template: ({ spelledQueue, patientName, department, room }) =>
      `Bapak, Ibu sekalian... ya. Untuk nomor antrean, ${spelledQueue}. Atas nama, ${patientName}. Monggo langsung, silakan menuju ke ${department}, ${room}. Ya, matur nuwun... terima kasih.`,
  },
  female_announcer: {
    id: "female_announcer",
    name: "Petugas Announcer RS (Standar Ramah)",
    tagline: "Suara wanita ramah, artikulasi jernih standar rumah sakit",
    icon: "👩‍💼",
    gender: "female",
    pitch: 1.05,
    rate: 0.88,
    template: ({ spelledQueue, patientName, department, room }) =>
      `Perhatian. Nomor antrean, ${spelledQueue}. Atas nama, ${patientName}. Silakan menuju ke ${department}, ${room}. Terima kasih.`,
  },
  male_announcer: {
    id: "male_announcer",
    name: "Petugas Pelayanan Pria (Bariton Berwibawa)",
    tagline: "Suara pria tegas berwibawa untuk faskes dan poliklinik",
    icon: "👨‍⚕️",
    gender: "male",
    pitch: 0.82,
    rate: 0.90,
    template: ({ spelledQueue, patientName, department, room }) =>
      `Panggilan antrean. Nomor, ${spelledQueue}. Atas nama, ${patientName}. Silakan segera memasuki ${department}, ${room}.`,
  },
  concise: {
    id: "concise",
    name: "Panggilan Cepat / Express",
    tagline: "Format singkat dan padat untuk loket cepat",
    icon: "⚡",
    gender: "neutral",
    pitch: 1.0,
    rate: 1.05,
    template: ({ spelledQueue, department, room }) =>
      `Nomor antrean, ${spelledQueue}, silakan ke ${department}, ${room}.`,
  },
};

/**
 * Mengeja nomor antrean ke dalam pelafalan Bahasa Indonesia natural
 * Contoh: "A-012" -> "A, kosong, satu, dua"
 */
export function formatQueueForSpeech(queueNumber: string): string {
  if (!queueNumber) return "";

  const digitMap: Record<string, string> = {
    "0": "kosong",
    "1": "satu",
    "2": "dua",
    "3": "tiga",
    "4": "empat",
    "5": "lima",
    "6": "enam",
    "7": "tujuh",
    "8": "delapan",
    "9": "sembilan",
  };

  const parts = queueNumber.split("-");
  const prefix = parts[0] ? parts[0].trim().toUpperCase() : "A";
  const numPart = parts[1] || parts[0];

  const spelledDigits = numPart
    .split("")
    .filter((char) => digitMap[char] !== undefined)
    .map((char) => digitMap[char])
    .join(", ");

  if (parts.length > 1) {
    return `${prefix}, ${spelledDigits}`;
  }
  return spelledDigits || queueNumber;
}

/**
 * Memainkan Bunyi Bell Ting-Tung Khas Rumah Sakit Indonesia menggunakan Web Audio API
 */
export function playHospitalChime(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) {
        resolve();
        return;
      }

      const ctx = new AudioContextClass();

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const playTone = (
        freq: number,
        start: number,
        duration: number,
        vol = 0.16
      ) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

        gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.04);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + start + duration
        );

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // 3-Nada Melodi Chime Khas Rumah Sakit Indonesia: E5 -> A5 -> D5
      playTone(659.25, 0.0, 0.42, 0.18);
      playTone(880.0, 0.22, 0.52, 0.15);
      playTone(587.33, 0.5, 0.65, 0.2);

      setTimeout(() => {
        resolve();
      }, 950);
    } catch {
      resolve();
    }
  });
}

/**
 * Mengambil Suara Bahasa Indonesia Terbaik dari Browser
 */
export function findBestIndonesianVoice(
  preferredGender?: "female" | "male" | "neutral"
): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Filter suara Bahasa Indonesia
  const indonesianVoices = voices.filter((v) => {
    const lang = (v.lang || "").toLowerCase();
    const name = (v.name || "").toLowerCase();
    return (
      lang.startsWith("id") ||
      lang.includes("indonesia") ||
      name.includes("indonesia") ||
      name.includes("bahasa") ||
      name.includes("gadis") ||
      name.includes("andika") ||
      name.includes("damayanti") ||
      name.includes("ardi")
    );
  });

  if (indonesianVoices.length === 0) {
    return voices.find((v) => v.default) || voices[0] || null;
  }

  // 2. Jika ada preferensi gender, filter nama suara
  if (preferredGender === "male") {
    const maleVoice = indonesianVoices.find((v) => {
      const name = v.name.toLowerCase();
      return (
        name.includes("male") ||
        name.includes("pria") ||
        name.includes("andika") ||
        name.includes("ardi")
      );
    });
    if (maleVoice) return maleVoice;
  } else if (preferredGender === "female") {
    const femaleVoice = indonesianVoices.find((v) => {
      const name = v.name.toLowerCase();
      return (
        name.includes("female") ||
        name.includes("wanita") ||
        name.includes("gadis") ||
        name.includes("damayanti")
      );
    });
    if (femaleVoice) return femaleVoice;
  }

  return indonesianVoices[0];
}

/**
 * Eksekusi Panggilan Suara Antrean Bahasa Indonesia
 */
export async function speakIndonesianQueueCall(options: {
  queueNumber: string;
  patientName: string;
  department: string;
  room?: string;
  doctor?: string;
  profileId?: VoiceProfileId;
  withChime?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}): Promise<void> {
  const {
    queueNumber,
    patientName,
    department,
    room = "Ruang Pelayanan",
    doctor = "Dokter DPJP",
    profileId = "jokowi",
    withChime = true,
    onStart,
    onEnd,
    onError,
  } = options;

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  // 1. Mainkan Bell Ting-Tung RS terlebih dahulu jika diaktifkan
  if (withChime) {
    await playHospitalChime();
  }

  // 2. Batalkan antrean suara sebelumnya
  window.speechSynthesis.cancel();

  const profile = VOICE_PROFILES[profileId] || VOICE_PROFILES.jokowi;
  const spelledQueue = formatQueueForSpeech(queueNumber);

  const textToSpeak = profile.template({
    spelledQueue,
    patientName,
    department,
    room,
    doctor,
  });

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.lang = "id-ID";
  utterance.pitch = profile.pitch;
  utterance.rate = profile.rate;

  const targetVoice = findBestIndonesianVoice(profile.gender);
  if (targetVoice) {
    utterance.voice = targetVoice;
  }

  utterance.onstart = () => {
    onStart?.();
  };

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = (e) => {
    onError?.(e);
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}
