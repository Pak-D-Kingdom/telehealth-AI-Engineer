import type { Metadata } from "next";
import { Red_Hat_Text } from "next/font/google";
import "./globals.css";

const redHatText = Red_Hat_Text({
  variable: "--font-red-hat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GlucoCare | Edukasi Diabetes & Asisten Virtual",
  description: "Informasi umum diabetes, pencatatan keluhan, deteksi tanda darurat, dan tindak lanjut manusia dengan persetujuan pengguna.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${redHatText.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF8F5] text-[#1A1A1A] font-sans selection:bg-[#153828] selection:text-white">
        {children}
      </body>
    </html>
  );
}
