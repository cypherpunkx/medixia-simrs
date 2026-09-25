/**
 * Indonesian Regional (Dukcapil / Kemendagri) Kode Wilayah Decoder
 * Digunakan untuk auto-resolve Wilayah (Provinsi, Kota/Kabupaten, Kecamatan),
 * Tanggal Lahir, dan Jenis Kelamin langsung dari 16 digit NIK e-KTP.
 */

export interface ParsedNikInfo {
  isValidFormat: boolean;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  districtCode: string;
  districtName: string;
  birthDate: string; // YYYY-MM-DD
  gender: "male" | "female";
  age: number;
  formattedAddress: string;
}

// 38 Provinsi Indonesia (Kemendagri / BPS Official Codes)
export const PROVINCES: Record<string, string> = {
  "11": "Aceh",
  "12": "Sumatera Utara",
  "13": "Sumatera Barat",
  "14": "Riau",
  "15": "Jambi",
  "16": "Sumatera Selatan",
  "17": "Bengkulu",
  "18": "Lampung",
  "19": "Kepulauan Bangka Belitung",
  "21": "Kepulauan Riau",
  "31": "DKI Jakarta",
  "32": "Jawa Barat",
  "33": "Jawa Tengah",
  "34": "DI Yogyakarta",
  "35": "Jawa Timur",
  "36": "Banten",
  "51": "Bali",
  "52": "Nusa Tenggara Barat",
  "53": "Nusa Tenggara Timur",
  "61": "Kalimantan Barat",
  "62": "Kalimantan Tengah",
  "63": "Kalimantan Selatan",
  "64": "Kalimantan Timur",
  "65": "Kalimantan Utara",
  "71": "Sulawesi Utara",
  "72": "Sulawesi Tengah",
  "73": "Sulawesi Selatan",
  "74": "Sulawesi Tenggara",
  "75": "Gorontalo",
  "76": "Sulawesi Barat",
  "81": "Maluku",
  "82": "Maluku Utara",
  "91": "Papua",
  "92": "Papua Barat",
  "93": "Papua Selatan",
  "94": "Papua Tengah",
  "95": "Papua Pegunungan",
  "96": "Papua Barat Daya",
};

// Kabupaten / Kota Terpopuler & Primer
export const CITIES: Record<string, string> = {
  // DKI Jakarta
  "3101": "Kab. Kepulauan Seribu",
  "3171": "Kota Jakarta Selatan",
  "3172": "Kota Jakarta Timur",
  "3173": "Kota Jakarta Pusat",
  "3174": "Kota Jakarta Barat",
  "3175": "Kota Jakarta Utara",

  // Jawa Barat
  "3201": "Kab. Bogor",
  "3202": "Kab. Sukabumi",
  "3203": "Kab. Cianjur",
  "3204": "Kab. Bandung",
  "3205": "Kab. Garut",
  "3206": "Kab. Tasikmalaya",
  "3207": "Kab. Ciamis",
  "3208": "Kab. Kuningan",
  "3209": "Kab. Cirebon",
  "3210": "Kab. Majalengka",
  "3211": "Kab. Sumedang",
  "3212": "Kab. Indramayu",
  "3213": "Kab. Subang",
  "3214": "Kab. Purwakarta",
  "3215": "Kab. Karawang",
  "3216": "Kab. Bekasi",
  "3217": "Kab. Bandung Barat",
  "3218": "Kab. Pangandaran",
  "3271": "Kota Bogor",
  "3272": "Kota Sukabumi",
  "3273": "Kota Bandung",
  "3274": "Kota Cirebon",
  "3275": "Kota Bekasi",
  "3276": "Kota Depok",
  "3277": "Kota Cimahi",
  "3278": "Kota Tasikmalaya",
  "3279": "Kota Banjar",

  // Banten
  "3601": "Kab. Pandeglang",
  "3602": "Kab. Lebak",
  "3603": "Kab. Tangerang",
  "3604": "Kab. Serang",
  "3671": "Kota Tangerang",
  "3672": "Kota Cilegon",
  "3673": "Kota Serang",
  "3674": "Kota Tangerang Selatan",

  // Jawa Tengah
  "3301": "Kab. Cilacap",
  "3302": "Kab. Banyumas",
  "3303": "Kab. Purbalingga",
  "3304": "Kab. Banjarnegara",
  "3305": "Kab. Kebumen",
  "3306": "Kab. Purworejo",
  "3307": "Kab. Wonosobo",
  "3308": "Kab. Magelang",
  "3309": "Kab. Boyolali",
  "3310": "Kab. Klaten",
  "3311": "Kab. Sukoharjo",
  "3312": "Kab. Wonogiri",
  "3313": "Kab. Karanganyar",
  "3314": "Kab. Sragen",
  "3315": "Kab. Grobogan",
  "3316": "Kab. Blora",
  "3317": "Kab. Rembang",
  "3318": "Kab. Pati",
  "3319": "Kab. Kudus",
  "3320": "Kab. Jepara",
  "3321": "Kab. Demak",
  "3322": "Kab. Semarang",
  "3323": "Kab. Temanggung",
  "3324": "Kab. Kendal",
  "3325": "Kab. Batang",
  "3326": "Kab. Pekalongan",
  "3327": "Kab. Pemalang",
  "3328": "Kab. Tegal",
  "3329": "Kab. Brebes",
  "3371": "Kota Magelang",
  "3372": "Kota Surakarta",
  "3373": "Kota Salatiga",
  "3374": "Kota Semarang",
  "3375": "Kota Pekalongan",
  "3376": "Kota Tegal",

  // DI Yogyakarta
  "3401": "Kab. Kulon Progo",
  "3402": "Kab. Bantul",
  "3403": "Kab. Gunungkidul",
  "3404": "Kab. Sleman",
  "3471": "Kota Yogyakarta",

  // Jawa Timur
  "3501": "Kab. Pacitan",
  "3502": "Kab. Ponorogo",
  "3503": "Kab. Trenggalek",
  "3504": "Kab. Tulungagung",
  "3505": "Kab. Blitar",
  "3506": "Kab. Kediri",
  "3507": "Kab. Malang",
  "3508": "Kab. Lumajang",
  "3509": "Kab. Jember",
  "3510": "Kab. Banyuwangi",
  "3511": "Kab. Bondowoso",
  "3512": "Kab. Situbondo",
  "3513": "Kab. Probolinggo",
  "3514": "Kab. Pasuruan",
  "3515": "Kab. Sidoarjo",
  "3516": "Kab. Mojokerto",
  "3517": "Kab. Jombang",
  "3518": "Kab. Nganjuk",
  "3519": "Kab. Madiun",
  "3520": "Kab. Magetan",
  "3521": "Kab. Ngawi",
  "3522": "Kab. Bojonegoro",
  "3523": "Kab. Tuban",
  "3524": "Kab. Lamongan",
  "3525": "Kab. Gresik",
  "3526": "Kab. Bangkalan",
  "3527": "Kab. Sampang",
  "3528": "Kab. Pamekasan",
  "3529": "Kab. Sumenep",
  "3571": "Kota Kediri",
  "3572": "Kota Blitar",
  "3573": "Kota Malang",
  "3574": "Kota Probolinggo",
  "3575": "Kota Pasuruan",
  "3576": "Kota Mojokerto",
  "3577": "Kota Madiun",
  "3578": "Kota Surabaya",
  "3579": "Kota Batu",

  // Bali & Nusa Tenggara
  "5171": "Kota Denpasar",
  "5103": "Kab. Badung",
  "5271": "Kota Mataram",
  "5371": "Kota Kupang",

  // Sumatera
  "1171": "Kota Banda Aceh",
  "1271": "Kota Medan",
  "1275": "Kota Binjai",
  "1371": "Kota Padang",
  "1471": "Kota Pekanbaru",
  "1571": "Kota Jambi",
  "1671": "Kota Palembang",
  "1871": "Kota Bandar Lampung",
  "2171": "Kota Batam",
  "2172": "Kota Tanjungpinang",

  // Kalimantan
  "6171": "Kota Pontianak",
  "6271": "Kota Palangka Raya",
  "6371": "Kota Banjarmasin",
  "6471": "Kota Balikpapan",
  "6472": "Kota Samarinda",
  "6571": "Kota Tarakan",

  // Sulawesi
  "7171": "Kota Manado",
  "7271": "Kota Palu",
  "7371": "Kota Makassar",
  "7471": "Kota Kendari",
  "7571": "Kota Gorontalo",

  // Papua
  "9171": "Kota Jayapura",
  "9271": "Kota Sorong",
  "9201": "Kab. Sorong",
  "9202": "Kab. Manokwari",
};

// Kecamatan Terpilih (Kamus 6 Digit)
export const DISTRICTS: Record<string, string> = {
  // Kota Bandung (3273)
  "327301": "Kec. Sukasari",
  "327302": "Kec. Coblong",
  "327303": "Kec. Babakan Ciparay",
  "327304": "Kec. Bojongloa Kaler",
  "327305": "Kec. Andir",
  "327306": "Kec. Cicendo",
  "327307": "Kec. Sukajadi",
  "327308": "Kec. Cidadap",
  "327309": "Kec. Bandung Wetan",
  "327310": "Kec. Sumur Bandung",
  "327311": "Kec. Cibeunying Kidul",
  "327312": "Kec. Cibeunying Kaler",
  "327313": "Kec. Kiaracondong",
  "327314": "Kec. Batununggal",
  "327315": "Kec. Lengkong",
  "327316": "Kec. Regol",
  "327317": "Kec. Rancasari",
  "327318": "Kec. Buahbatu",
  "327319": "Kec. Bandung Kidul",
  "327320": "Kec. Arcamanik",
  "327321": "Kec. Antapani",
  "327322": "Kec. Ujungberung",
  "327323": "Kec. Cibiru",
  "327324": "Kec. Panyileukan",
  "327325": "Kec. Gedebage",
  "327326": "Kec. Cinambo",
  "327327": "Kec. Mandalajati",
  "327328": "Kec. Panyileukan",
  "327329": "Kec. Bojongloa Kidul",
  "327330": "Kec. Astanaanyar",

  // DKI Jakarta Selatan (3171)
  "317101": "Kec. Tebet",
  "317102": "Kec. Setiabudi",
  "317103": "Kec. Mampang Prapatan",
  "317104": "Kec. Pasar Minggu",
  "317105": "Kec. Kebayoran Lama",
  "317106": "Kec. Cilandak",
  "317107": "Kec. Kebayoran Baru",
  "317108": "Kec. Pancoran",
  "317109": "Kec. Jagakarsa",
  "317110": "Kec. Pesanggrahan",

  // Kota Sorong (9271)
  "927101": "Kec. Sorong",
  "927102": "Kec. Sorong Barat",
  "927103": "Kec. Sorong Timur",
  "927104": "Kec. Sorong Utara",
  "927105": "Kec. Sorong Kepulauan",
  "927106": "Kec. Sorong Manoi",
  "927107": "Kec. Sorong Kota",
  "927108": "Kec. Klaurung",
  "927109": "Kec. Malaimsimsa",
  "927110": "Kec. Malabutor",

  // Kota Surabaya (3578)
  "357801": "Kec. Karang Pilang",
  "357802": "Kec. Wonocolo",
  "357803": "Kec. Rungkut",
  "357804": "Kec. Wonokromo",
  "357805": "Kec. Sawahan",
  "357806": "Kec. Tegalsari",
  "357807": "Kec. Genteng",
  "357808": "Kec. Gubeng",
  "357809": "Kec. Sukolilo",
  "357810": "Kec. Tambaksari",
};

/**
 * Mendekode Nomor Induk Kependudukan (NIK) 16 digit:
 * - Kode Provinsi (Digit 1-2)
 * - Kode Kab/Kota (Digit 3-4)
 * - Kode Kecamatan (Digit 5-6)
 * - Tanggal Lahir & Jenis Kelamin (Digit 7-12)
 */
export function parseNikToRegion(nik: string): ParsedNikInfo {
  const clean = (nik || "").trim().replace(/\D/g, "");

  if (clean.length < 12) {
    return {
      isValidFormat: false,
      provinceCode: "",
      provinceName: "",
      cityCode: "",
      cityName: "",
      districtCode: "",
      districtName: "",
      birthDate: "",
      gender: "male",
      age: 0,
      formattedAddress: "",
    };
  }

  const provCode = clean.substring(0, 2);
  const cityCode = clean.substring(0, 4);
  const distCode = clean.substring(0, 6);

  const provinceName = PROVINCES[provCode] || "Provinsi Indonesia";
  const cityName = CITIES[cityCode] || (cityCode.startsWith("32") ? "Kabupaten/Kota di Jawa Barat" : "Kabupaten/Kota");
  const districtName = DISTRICTS[distCode] || `Kecamatan (Kode ${distCode.substring(4, 6)})`;

  // Decode tanggal lahir & jenis kelamin
  const rawDay = parseInt(clean.substring(6, 8), 10);
  const isFemale = rawDay > 40;
  const birthDay = isFemale ? rawDay - 40 : rawDay;
  const birthMonth = clean.substring(8, 10);
  const yearSuffix = parseInt(clean.substring(10, 12), 10);

  // Jika tahun suffix > tahun sekarang % 100 (misal > 26), maka abad ke-20 (19xx), jika <= 26 maka abad 21 (20xx)
  const currentYearSuffix = new Date().getFullYear() % 100;
  const fullYear = yearSuffix > currentYearSuffix ? 1900 + yearSuffix : 2000 + yearSuffix;

  const validDay = Math.min(Math.max(birthDay, 1), 31);
  const validMonth = Math.min(Math.max(parseInt(birthMonth, 10), 1), 12);
  const birthDate = `${fullYear}-${String(validMonth).padStart(2, "0")}-${String(validDay).padStart(2, "0")}`;

  // Hitung usia
  const birthDateObj = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const m = today.getMonth() - birthDateObj.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }

  // Format draf alamat wilayah standar
  const formattedAddress = [districtName, cityName, provinceName]
    .filter(Boolean)
    .join(", ");

  return {
    isValidFormat: clean.length === 16,
    provinceCode: provCode,
    provinceName,
    cityCode,
    cityName,
    districtCode: distCode,
    districtName,
    birthDate,
    gender: isFemale ? "female" : "male",
    age: Math.max(0, age),
    formattedAddress,
  };
}
