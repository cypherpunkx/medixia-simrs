import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SATUSEHAT RME Auth Hub | Portal Integrasi Faskes Kemenkes RI",
  description:
    "Portal Pengembang & Pengujian Autentikasi OAuth 2.0 SATUSEHAT Kementerian Kesehatan RI untuk Rumah Sakit, Klinik, dan Sistem Rekam Medis Elektronik (RME).",
  keywords: [
    "SATUSEHAT",
    "Kemenkes",
    "OAuth 2.0",
    "RME",
    "SIMRS",
    "FHIR HL7 R4",
    "Rekam Medis Elektronik",
    "Healthtech",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
